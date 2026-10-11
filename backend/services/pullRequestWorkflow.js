import { randomUUID } from "node:crypto";
import { assertNoPublication, lockConversation } from "./conversationPublication.js";
import { githubClient, publicationError, publishTaskPullRequest, safePublicationError,
    suggestedBranch, validatePullRequestInput } from "./taskPullRequest.js";

function id(value) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) throw publicationError("Invalid conversation or task ID.", 400);
    return number;
}

function parseResult(query) {
    try { return JSON.parse(query?.response || "null") || {}; } catch { return {}; }
}

export function createPullRequestHandlers({ db, getContainer, makeGithub = githubClient, publish = publishTaskPullRequest }) {
    async function taskForUser(tx, req) {
        const conversationId = id(req.params.conversationId);
        const taskId = id(req.params.taskId);
        const task = await tx.task.findFirst({
            where: { id: taskId, conversationId, userId: req.user.userId },
            include: { conversation: true, thread: { include: { repository: { include: { githubAccount: true } } } } }
        });
        if (!task?.thread?.repository || task.thread.userId !== req.user.userId ||
            task.thread.repository.githubAccount.userId !== req.user.userId) throw publicationError("Task repository not found.", 404);
        if (task.status !== "completed") throw publicationError("Complete the code run before creating a pull request.");
        if (!task.conversation[0]) throw publicationError("Task changes are unavailable.");
        if (!task.thread.repository.githubAccount.githubAccessToken) throw publicationError("Reconnect your GitHub account before creating a PR.", 403);
        return task;
    }

    return {
        async options(req, res) {
            try {
                const task = await taskForUser(db, req);
                const result = parseResult(task.conversation[0]);
                const repository = task.thread.repository;
                const github = makeGithub(repository);
                const metadata = await github.get("");
                const branches = [];
                for (let page = 1; ; page++) {
                    const batch = await github.get("/branches", { per_page: 100, page });
                    branches.push(...batch.map((branch) => branch.name));
                    if (batch.length < 100) break;
                    if (page >= 20) throw publicationError("Too many repository branches. Reduce the branch list and retry.");
                }
                const title = task.conversation[0].query.trim().replace(/\s+/g, " ").slice(0, 256) || task.thread.title;
                return res.json({ repository: repository.fullName, branches,
                    title, body: result.summary || "", base: result.pullRequest?.base || metadata.default_branch,
                    branch: result.pullRequest?.branch || suggestedBranch(task.conversationId, task.id, title),
                    draft: result.pullRequest?.draft ?? false, pullRequest: result.pullRequest || null });
            } catch (error) {
                const safe = safePublicationError(error);
                return res.status(safe.status).json({ error: safe.message });
            }
        },

        async create(req, res) {
            let claim;
            let claimedResponse;
            let result;
            try {
                const details = validatePullRequestInput(req.body);
                const conversationId = id(req.params.conversationId);
                claim = await db.$transaction(async (tx) => {
                    await lockConversation(tx, conversationId);
                    const task = await taskForUser(tx, req);
                    const query = task.conversation[0];
                    const current = parseResult(query);
                    if (current.pullRequest?.status === "created") return { existing: current.pullRequest };
                    await assertNoPublication(tx, conversationId);
                    const active = await tx.message.findFirst({ where: { conversationId, role: "assistant", status: "pending" } });
                    if (active) throw publicationError("Wait for the current agent response to finish.");
                    const latest = await tx.task.findFirst({ where: { conversationId }, orderBy: { id: "desc" }, select: { id: true } });
                    if (latest?.id !== task.id) throw publicationError("Create a PR from the latest code run so it includes the current workspace changes.");
                    const queries = await tx.query.findMany({ where: { task: { conversationId } }, select: { response: true } });
                    if (queries.some((item) => Object.values(parseResult(item).fileReview?.files || {}).includes("processing"))) {
                        throw publicationError("Wait for the current file review to finish.");
                    }
                    const previous = current.pullRequest;
                    current.pullRequest = { ...details, status: "creating", startedAt: new Date().toISOString(), requestId: randomUUID(),
                        ...(previous?.branch === details.branch && previous?.base === details.base ? { headSha: previous.headSha } : {}) };
                    const response = JSON.stringify(current);
                    const saved = await tx.query.updateMany({ where: { id: query.id, response: query.response }, data: { response } });
                    if (!saved.count) throw publicationError("The task changed. Refresh and try again.");
                    await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
                    return { task, queryId: query.id, result: current, previous, response, details };
                });
                if (claim.existing) return res.json({ pullRequest: claim.existing });
                result = claim.result;
                claimedResponse = claim.response;
                async function save() {
                    const response = JSON.stringify(result);
                    const saved = await db.query.updateMany({ where: { id: claim.queryId, response: claimedResponse }, data: { response } });
                    if (!saved.count) throw publicationError("The publication state changed. Refresh and try again.");
                    claimedResponse = response;
                }
                const { container } = await getContainer({ conversationId, repositoryId: claim.task.thread.repositoryId, userId: req.user.userId });
                const pullRequest = await publish({ container, repository: claim.task.thread.repository,
                    details: claim.details, previous: claim.previous, github: makeGithub(claim.task.thread.repository),
                    onPrepared: async (prepared) => { result.pullRequest = { ...result.pullRequest, ...prepared }; await save(); } });
                result.pullRequest = pullRequest;
                await save();
                return res.status(201).json({ pullRequest });
            } catch (error) {
                const safe = safePublicationError(error);
                if (claimedResponse) {
                    result.pullRequest = { ...result.pullRequest, status: "failed", error: safe.message };
                    await db.query.updateMany({ where: { id: claim.queryId, response: claimedResponse }, data: { response: JSON.stringify(result) } }).catch(() => {});
                }
                return res.status(safe.status).json({ error: safe.message });
            }
        }
    };
}
