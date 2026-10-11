import { createHash } from "node:crypto";
import { FileOperationError } from "../tools/fileOperationsRuntime.js";

function canonical(value) {
    if (!value || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

const READ_RECOVERY = new Set(["STALE_REVISION", "TEXT_NOT_FOUND", "AMBIGUOUS_MATCH", "REPLAY_CONFLICT"]);
const FATAL_ERRORS = new Set(["ROLLBACK_FAILED", "REPOSITORY_BUSY", "CONTAINER_EXEC_FAILED"]);

export function createFileOperationGuard({ container, allowedTools, toolExecutor, maxFailures = 4 }) {
    const failedRequests = new Set();
    const needsRead = new Set();
    let failures = 0;
    return {
        async execute(call) {
            if (call.name !== "ApplyPatch" || !allowedTools.includes(call.name)) {
                try {
                    const value = await toolExecutor(call, container, allowedTools);
                    if (call.name === "ReadFile" && value.success) needsRead.delete(value.path ?? call.arguments?.filePath);
                    return value;
                } catch (error) {
                    if (FATAL_ERRORS.has(error.code)) throw new FileOperationError("FILE_OPERATION_RECOVERY_REQUIRED", error.message, { causeCode: error.code, ...error.details });
                    throw error;
                }
            }
            if (failures >= maxFailures) throw new FileOperationError("FILE_OPERATION_BUDGET", "File operation failure budget exhausted. Stop this role and report the errors.");
            const fingerprint = createHash("sha256").update(canonical(call.arguments) ?? "undefined").digest("hex");
            try {
                if (failedRequests.has(fingerprint)) throw new FileOperationError("REPEATED_FAILED_OPERATION", "This unchanged request already failed. Read the affected files and correct the operations.", { recovery: "ReadFile" });
                const blocked = Array.isArray(call.arguments?.operations) ? call.arguments.operations.find((operation) => needsRead.has(operation?.path)) : null;
                if (blocked) throw new FileOperationError("READ_REQUIRED", "Read the affected file after the previous conflict before retrying.", { path: blocked.path, recovery: "ReadFile" });
                return await toolExecutor(call, container, allowedTools);
            } catch (error) {
                failures++;
                // A READ_REQUIRED request may be valid after the required read.
                if (error.code !== "READ_REQUIRED") failedRequests.add(fingerprint);
                if (READ_RECOVERY.has(error.code) && error.details?.path) needsRead.add(error.details.path);
                if (FATAL_ERRORS.has(error.code)) throw new FileOperationError("FILE_OPERATION_RECOVERY_REQUIRED", error.message, { causeCode: error.code, ...error.details });
                if (failures >= maxFailures) throw new FileOperationError("FILE_OPERATION_BUDGET", `File operations failed ${maxFailures} times; last error: ${error.message}`, { causeCode: error.code, ...error.details });
                error.details = { ...error.details, failuresRemaining: maxFailures - failures };
                throw error;
            }
        }
    };
}
