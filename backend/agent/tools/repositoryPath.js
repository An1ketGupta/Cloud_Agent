import path from "node:path";
import {
    REPOSITORY_ROOT,
    runContainerExec
} from "../sandbox/containerIO.js";

export function normalizeRepositoryPath(filePath) {
    if (typeof filePath !== "string" || filePath.includes("\0")) {
        throw new TypeError("A repository path is required.");
    }

    if (filePath.split("/").includes("..")) {
        throw new Error("Parent-directory paths are not allowed.");
    }

    const absolutePath = path.posix.resolve(
        REPOSITORY_ROOT,
        filePath
    );

    if (
        absolutePath !== REPOSITORY_ROOT &&
        !absolutePath.startsWith(`${REPOSITORY_ROOT}/`)
    ) {
        throw new Error(
            `Path must remain inside the cloned repository: ${JSON.stringify(filePath)}`
        );
    }

    const parts = path.posix
        .relative(REPOSITORY_ROOT, absolutePath)
        .split("/");

    if (parts.includes(".git") || parts.includes("node_modules")) {
        throw new Error("This repository path is not available to agents.");
    }

    return absolutePath;
}

export async function validateExistingPath(container, filePath) {
    const absolutePath = normalizeRepositoryPath(filePath);

    const symlink = await runContainerExec(
        container,
        ["test", "-L", absolutePath]
    );

    if (symlink.exitCode === 0) {
        throw new Error("Symlink paths are not available to agents.");
    }

    const result = await runContainerExec(
        container,
        ["realpath", "-e", "--", absolutePath]
    );

    if (result.exitCode !== 0) {
        throw new Error(`Repository path does not exist: ${filePath}`);
    }

    const resolvedPath = result.stdout.trim();

    if (
        resolvedPath !== REPOSITORY_ROOT &&
        !resolvedPath.startsWith(`${REPOSITORY_ROOT}/`)
    ) {
        throw new Error(
            "Repository path resolves outside the cloned repository."
        );
    }

    return absolutePath;
}
