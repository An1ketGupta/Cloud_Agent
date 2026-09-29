import path from "node:path";
import {
    REPOSITORY_ROOT,
    runContainerExec
} from "../sandbox/containerIO.js";
import { normalizeRepositoryPath } from "./repositoryPath.js";

export async function SearchFile(container, filePath) {
    const absolutePath = normalizeRepositoryPath(filePath);

    const directory = path.posix.relative(
        REPOSITORY_ROOT,
        path.posix.dirname(absolutePath)
    );

    const filename = path.posix.basename(absolutePath);

    const result = await runContainerExec(
        container,
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"]
    );

    if (result.exitCode !== 0) {
        throw new Error(
            result.stderr || "Unable to search file names."
        );
    }

    const matches = result.stdout
        .split("\n")
        .filter((file) => {
            return (
                file &&
                (!directory || file.startsWith(`${directory}/`)) &&
                path.posix.basename(file) === filename
            );
        });

    return {
        files: matches.slice(0, 100),
        truncated: matches.length > 100
    };
}