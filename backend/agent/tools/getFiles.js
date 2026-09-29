import path from "node:path";
import { REPOSITORY_ROOT, runContainerExec } from "../sandbox/containerIO.js";
import { normalizeRepositoryPath } from "./repositoryPath.js";

export async function getFileNameList(container, filePath) {
    const directory = normalizeRepositoryPath(filePath);

    const result = await runContainerExec(
        container,
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"]
    );

    if (result.exitCode !== 0) {
        throw new Error(result.stderr || "Unable to list files.");
    }

    const prefix = path.posix.relative(
        REPOSITORY_ROOT,
        directory
    );

    const files = result.stdout
        .split("\n")
        .filter(Boolean)
        .filter((file) => {
            return !prefix || file.startsWith(`${prefix}/`);
        });

    return {
        files: files.slice(0, 500),
        truncated: files.length > 500
    };
}