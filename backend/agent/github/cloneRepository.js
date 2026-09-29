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

    if (!token) {
        throw new Error("GitHub token not found.");
    }

    const cloneUrl = `https://github.com/${repo.fullName}.git`;

    const result = await runContainerExec(
        container,
        ["git", "clone", cloneUrl, REPOSITORY_ROOT],
        {
            workingDir: "/workspace",
            timeoutMs: 180000,
            env: [
                "GIT_CONFIG_COUNT=1",
                "GIT_CONFIG_KEY_0=http.https://github.com/.extraheader",
                `GIT_CONFIG_VALUE_0=AUTHORIZATION: bearer ${token}`
            ]
        }
    );

    if (result.exitCode !== 0) {
        throw new Error("Failed to clone repository.");
    }

    const files = await runContainerExec(
        container,
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"]
    );

    if (files.exitCode !== 0) {
        throw new Error("Could not read repository files.");
    }

    const fileList = files.stdout.split("\n");

    const hasPackageJson = fileList.some(
        (file) => file === "package.json" || file.endsWith("/package.json")
    );

    if (!hasPackageJson) {
        throw new Error("Repository must contain a package.json file.");
    }

    return {
        repository: repo.fullName,
        root: REPOSITORY_ROOT
    };
}