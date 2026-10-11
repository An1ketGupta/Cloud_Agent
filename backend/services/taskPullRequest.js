import axios from "axios";
import { randomUUID } from "node:crypto";
import { runContainerExec } from "../agent/sandbox/containerIO.js";
import { GitDiff } from "../agent/tools/gitDiff.js";

export function publicationError(message, status = 409) {
    return Object.assign(new Error(message), { status });
}

export function validBranch(value) {
    return typeof value === "string" && value.length > 0 && value.length <= 200 &&
        !/^[/-]|[/.]$|[\s\x00-\x1f\x7f~^:?*\\\[]|\.\.|@\{|\/\//.test(value) &&
        value !== "@" && value !== "HEAD" &&
        value.split("/").every((part) => !part.startsWith(".") && !part.endsWith(".lock"));
}

export function validatePullRequestInput(input = {}) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const body = typeof input.body === "string" ? input.body : "";
    const base = typeof input.base === "string" ? input.base.trim() : "";
    const branch = typeof input.branch === "string" ? input.branch.trim() : "";
    if (!title || title.length > 256 || /[\r\n\x00]/.test(title)) throw publicationError("Enter a title of at most 256 characters.", 400);
    if (typeof input.body !== "string" || body.length > 60_000 || body.includes("\0")) throw publicationError("Enter a description of at most 60,000 characters.", 400);
    if (!validBranch(base) || !validBranch(branch) || base === branch) throw publicationError("Choose valid, different target and task branch names.", 400);
    if (typeof input.draft !== "boolean") throw publicationError("Choose whether to create a draft pull request.", 400);
    return { title, body, base, branch, draft: input.draft };
}

export function suggestedBranch(conversationId, taskId, title) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "");
    return `cloud-agent/task-${conversationId}-${taskId}${slug ? `-${slug}` : ""}`;
}

export function githubClient(repository, http = axios) {
    if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository.fullName)) throw publicationError("Invalid GitHub repository.", 400);
    const url = `https://api.github.com/repos/${repository.fullName}`;
    const headers = {
        Authorization: `Bearer ${repository.githubAccount.githubAccessToken}`,
        Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10"
    };
    return {
        async get(path, params) { return (await http.get(`${url}${path}`, { headers, params, timeout: 30_000 })).data; },
        async post(path, data) { return (await http.post(`${url}${path}`, data, { headers, timeout: 30_000 })).data; }
    };
}

export function safePublicationError(error) {
    if (error.status) return error;
    const status = error.response?.status;
    if (status === 401) return publicationError("GitHub access expired. Reconnect your GitHub account.", 403);
    if (status === 403) return publicationError("GitHub denied this request. Check repository write permissions, app access, or rate limits.", 403);
    if (status === 404) return publicationError("The repository or target branch is unavailable to your GitHub account.", 404);
    if (status === 422) return publicationError("GitHub could not create this PR. Check the branch names and that there are changes to merge.", 422);
    return publicationError("Could not finish publishing to GitHub. Retry with the same branch to recover any PR already created.", 502);
}

async function findBranch(github, branch) {
    try { return await github.get(`/git/ref/heads/${encodeURIComponent(branch)}`); }
    catch (error) { if (error.response?.status === 404) return null; throw error; }
}

function publicPullRequest(pr, branch, base, headSha) {
    return { status: "created", number: pr.number, url: pr.html_url, branch, base, headSha, draft: pr.draft };
}

// Build the commit with an alternate index. The conversation's HEAD, worktree,
// and review index stay intact, including after a failed GitHub request.
export async function publishTaskPullRequest({ container, repository, details, previous, onPrepared,
    github = githubClient(repository), execute = runContainerExec, readDiff = GitDiff }) {
    const { branch, base, title, body, draft } = details;
    const remote = `https://github.com/${repository.fullName}.git`;
    const authEnv = ["GIT_TERMINAL_PROMPT=0", "GIT_CONFIG_COUNT=1",
        "GIT_CONFIG_KEY_0=http.https://github.com/.extraheader",
        `GIT_CONFIG_VALUE_0=AUTHORIZATION: bearer ${repository.githubAccount.githubAccessToken}`];
    const metadata = await github.get("");
    if (metadata.archived || metadata.permissions?.push === false) throw publicationError("You need write access to an active repository to publish this task.", 403);

    const existing = await findBranch(github, branch);
    let headSha = previous?.branch === branch && previous?.base === base ? previous.headSha : null;
    if (existing) {
        if (!headSha || existing.object?.sha !== headSha) throw publicationError("That task branch already exists. Choose a new branch name; existing branches are never overwritten.");
        const prs = await github.get("/pulls", { state: "all", head: `${repository.fullName.split("/")[0]}:${branch}`, base, per_page: 100 });
        if (prs.length) return publicPullRequest(prs[0], branch, base, headSha);
    } else {
        // GitDiff includes untracked files in the index as intent-to-add.
        const diff = await readDiff(container);
        if (diff.truncated) throw publicationError("The current patch is too large to publish safely.");
        const run = async (args, options = {}, message = "Could not prepare the task commit.") => {
            const result = await execute(container, args, options);
            if (result.exitCode !== 0) throw publicationError(message);
            return result.stdout.trim();
        };
        const patch = await execute(container, ["git", "-c", "core.quotePath=false", "diff", "--binary", "--no-ext-diff", "--no-textconv", "HEAD", "--", "."]);
        if (patch.exitCode !== 0) throw publicationError("Could not read the current task changes.");
        if (!patch.stdout.trim()) throw publicationError("There are no remaining changes to publish.");
        if (Buffer.byteLength(patch.stdout) > 10_000_000) throw publicationError("The current patch is too large to publish safely.");
        const target = await github.get(`/git/ref/heads/${encodeURIComponent(base)}`);
        const baseSha = target.object.sha;
        await run(["git", "fetch", "--no-tags", remote, `refs/heads/${base}`], { env: authEnv, timeoutMs: 180_000 }, "Could not fetch the target branch. Check your GitHub access and retry.");
        const indexPath = `/tmp/cloud-agent-pr-${randomUUID()}.index`;
        const indexEnv = [`GIT_INDEX_FILE=${indexPath}`];
        try {
            await run(["git", "read-tree", baseSha], { env: indexEnv });
            await run(["git", "apply", "--cached", "--whitespace=nowarn", "-"], { env: indexEnv, input: patch.stdout }, "The task changes conflict with the target branch. Update the task or choose its original target branch.");
            const tree = await run(["git", "write-tree"], { env: indexEnv });
            const originalTree = await run(["git", "rev-parse", `${baseSha}^{tree}`]);
            if (tree === originalTree) throw publicationError("These changes are already on the target branch.");
            const username = repository.githubAccount.githubUsername;
            const userId = String(repository.githubAccount.githubUserId);
            headSha = await run(["git", "-c", `user.name=${username}`, "-c", `user.email=${userId}+${username}@users.noreply.github.com`, "commit-tree", tree, "-p", baseSha], { input: `${title}\n` });
            // Persist before pushing, so a network timeout or process restart can
            // safely recover this exact branch instead of publishing twice.
            await onPrepared({ branch, base, headSha });
            await run(["git", "push", `--force-with-lease=refs/heads/${branch}:`, remote, `${headSha}:refs/heads/${branch}`], { env: authEnv, timeoutMs: 180_000 }, "Could not publish the task branch. Check GitHub write access or choose an unused branch name, then retry.");
        } finally {
            await execute(container, ["node", "-e", "const fs=require('node:fs'); for(const p of process.argv.slice(1)) fs.rmSync(p,{force:true});", indexPath, `${indexPath}.lock`]).catch(() => {});
        }
    }
    const pr = await github.post("/pulls", { title, body, head: branch, base, draft });
    return publicPullRequest(pr, branch, base, headSha);
}
