import { runFileOperation } from "../sandbox/fileOperations.js";

export async function GitDiff(container) {
    return runFileOperation(container, { action: "diff" });
}
