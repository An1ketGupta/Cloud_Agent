import { runFileOperation } from "../sandbox/fileOperations.js";

export async function ReadFile(container, filePath, { offset = 0, limit = 50_000 } = {}) {
    return runFileOperation(container, { action: "read", filePath, offset, limit });
}
