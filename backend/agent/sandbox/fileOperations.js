import { readFile } from "node:fs/promises";
import { runContainerExec, REPOSITORY_ROOT } from "./containerIO.js";
import { FileOperationError } from "../tools/fileOperationsRuntime.js";

let helperSource;
async function containerProgram() {
    helperSource ??= readFile(new URL("../tools/fileOperationsRuntime.js", import.meta.url), "utf8");
    return `${await helperSource}
let chunks = [];
let size = 0;
let handled = false;
function finish(result) {
    process.stdout.write(JSON.stringify(result), () => process.exit(result.ok ? 0 : 1));
}
process.stdin.on("data", (chunk) => {
    if (handled) return;
    chunks.push(chunk);
    size += chunk.length;
    if (size > 260000) {
        handled = true;
        return finish({ok: false, error: {code: "BATCH_TOO_LARGE", message: "Input exceeds the transport limit."}});
    }
    const input = Buffer.concat(chunks);
    const end = input.indexOf(10);
    if (end < 0) return;
    handled = true;
    process.stdin.pause();
    try {
        const value = executeFileRequest(process.cwd(), JSON.parse(input.subarray(0, end).toString("utf8")));
        finish({ok: true, value});
    } catch (error) {
        finish({ok: false, error: {code: error.code || "FILE_OPERATION_FAILED", message: error.message, ...error.details}});
    }
});
process.stdin.on("end", () => {
    if (!handled) finish({ok: false, error: {code: "INCOMPLETE_INPUT", message: "Expected a newline-terminated JSON request."}});
});`;
}

export async function runFileOperation(container, request) {
    // JSON escapes embedded newlines. Framing avoids closing Docker's duplex
    // connection before the helper's output has been consumed.
    let result;
    try {
        result = await runContainerExec(container, ["node", "--input-type=module", "-e", await containerProgram()], {
            input: `${JSON.stringify(request)}\n`, closeStdin: false, workingDir: REPOSITORY_ROOT
        });
    } catch (error) {
        throw new FileOperationError("CONTAINER_EXEC_FAILED", `File helper execution failed: ${error.message}`);
    }
    let response;
    try { response = JSON.parse(result.stdout); }
    catch {
        throw new FileOperationError("CONTAINER_EXEC_FAILED", "The file helper returned no valid result.", {
            exitCode: result.exitCode, stderr: result.stderr, stdout: result.stdout.slice(0, 2000)
        });
    }
    if (!response.ok) {
        const { code, message, ...details } = response.error;
        throw new FileOperationError(code, message, details);
    }
    if (result.exitCode !== 0) throw new FileOperationError("CONTAINER_EXEC_FAILED", result.stderr || "File helper exited unsuccessfully.", { exitCode: result.exitCode });
    return response.value;
}
