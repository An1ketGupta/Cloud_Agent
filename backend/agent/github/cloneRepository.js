import { prisma } from "../../clients/prismaClient.js";
import { REPOSITORY_ROOT, runContainerExec } from "../sandbox/containerIO.js";

export async function cloneRepository(container, repositoryId, userId) {
    const repo = await prisma.githubRepository.findFirst({
        where: {
            id: repositoryId,
            githubAccount: {
                userId
            }
        },
        include: {
            githubAccount: true
        }
    });

    if (!repo) {
        throw new Error("Repository not found.");
    }

    const token = repo.githubAccount.githubAccessToken;

    if (repo.private && !token) {
        throw new Error("GitHub token not found.");
    }

    const cloneUrl = repo.cloneUrl || `https://github.com/${repo.fullName}.git`;

    const result = await runContainerExec(
        container,
        ["git", "clone", cloneUrl, REPOSITORY_ROOT],
        {
            workingDir: "/workspace",
            timeoutMs: 180000,
            env: repo.private ? [
                "GIT_CONFIG_COUNT=1",
                "GIT_CONFIG_KEY_0=http.https://github.com/.extraheader",
                `GIT_CONFIG_VALUE_0=AUTHORIZATION: bearer ${token}`
            ] : undefined
        }
    );

    if (result.exitCode !== 0) {
        throw new Error("Failed to clone repository.");
    }

    const files = await runContainerExec(container, ["git", "rev-parse", "--is-inside-work-tree"]);
    if (files.exitCode !== 0 || files.stdout.trim() !== "true") {
        throw new Error("The repository was not cloned into the container.");
    }

    return {
        repository: repo.fullName,
        root: REPOSITORY_ROOT
    };
}
