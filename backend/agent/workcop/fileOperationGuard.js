import { createHash } from "node:crypto";
import { FileOperationError, validateFilePath } from "../tools/fileOperationsRuntime.js";
import { FILE_MUTATION_TOOLS } from "../tools/fileMutation.js";

function canonical(value) {
    if (!value || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

const READ_RECOVERY = new Set(["STALE_REVISION", "TEXT_NOT_FOUND", "AMBIGUOUS_MATCH", "REPLAY_CONFLICT", "INVALID_REVISION", "FILE_EXISTS"]);
const FATAL_ERRORS = new Set(["ROLLBACK_FAILED", "REPOSITORY_BUSY", "CONTAINER_EXEC_FAILED"]);

export function createFileOperationBudget(maxTotalFailures = 24) {
    return { totalFailures: 0, maxTotalFailures, failuresByFile: new Map() };
}

export function createFileOperationGuard({ container, allowedTools, toolExecutor, maxFailures = 4,
    budget = createFileOperationBudget() }) {
    const failedRequests = new Map();
    const needsRead = new Set();
    const knownRevisions = new Map();
    const failuresByFile = budget.failuresByFile ??= new Map();

    function forgetFailures(paths) {
        for (const [key, failed] of failedRequests) {
            if (failed.paths.some((path) => paths.includes(path))) failedRequests.delete(key);
        }
    }

    function recordRead(value) {
        if (!value?.success || typeof value.path !== "string" || !/^[a-f0-9]{64}$/.test(value.revision ?? "")) return;
        if (knownRevisions.has(value.path) && knownRevisions.get(value.path) !== value.revision) forgetFailures([value.path]);
        knownRevisions.set(value.path, value.revision);
        needsRead.delete(value.path);
    }

    async function recover(path, details) {
        try {
            validateFilePath(path);
            if (!allowedTools.includes("ReadFile")) return { status: "unavailable", error: "ReadFile is not available to this role." };
            // Prefer a suggested location when the failure was outside the first page.
            const offset = Math.max(0, (details.candidates?.[0]?.offset ?? 0) - 1000);
            const value = await toolExecutor({ name: "ReadFile", arguments: { filePath: path, offset, limit: 12_000 } }, container, allowedTools);
            if (!value?.success || value.path !== path || !/^[a-f0-9]{64}$/.test(value.revision ?? "")) {
                return { status: "failed", error: "ReadFile returned no valid current file revision." };
            }
            recordRead(value);
            return { status: "read", file: value,
                instruction: "The backend reread this file. Copy its current revision and correct the failed edit using this text or the candidate snippets. Candidates are suggestions; nothing in the failed batch was applied. Resubmit all still-needed operations in that failed batch, but do not repeat successful earlier calls. Follow nextOffset if the required code is outside this page." };
        } catch (error) {
            if (FATAL_ERRORS.has(error.code)) throw new FileOperationError("FILE_OPERATION_RECOVERY_REQUIRED", error.message, { causeCode: error.code, ...error.details });
            return { status: "failed", code: error.code, error: error.message };
        }
    }

    function budgetError(scope, path, cause) {
        return new FileOperationError("FILE_OPERATION_BUDGET", scope === "task"
            ? `File edits reached the task limit of ${budget.maxTotalFailures} failed write attempts.`
            : `File edits failed ${maxFailures} consecutive times for ${path}.`,
        { ...cause?.details, scope, path, causeCode: cause?.code, totalFailures: budget.totalFailures,
            failuresRemaining: Math.max(0, maxFailures - (failuresByFile.get(path) ?? 0)),
            totalFailuresRemaining: Math.max(0, budget.maxTotalFailures - budget.totalFailures) });
    }

    return {
        async execute(call) {
            if (!FILE_MUTATION_TOOLS.includes(call.name) || !allowedTools.includes(call.name)) {
                try {
                    const value = await toolExecutor(call, container, allowedTools);
                    if (call.name === "ReadFile") recordRead(value);
                    return value;
                } catch (error) {
                    if (FATAL_ERRORS.has(error.code)) throw new FileOperationError("FILE_OPERATION_RECOVERY_REQUIRED", error.message, { causeCode: error.code, ...error.details });
                    throw error;
                }
            }
            const operations = call.name === "ApplyPatch" ? call.arguments?.operations : [call.arguments];
            const paths = Array.isArray(operations) ? operations.map((operation) => operation?.path).filter((path) => typeof path === "string") : [];
            if (budget.totalFailures >= budget.maxTotalFailures) throw budgetError("task");
            const exhausted = paths.find((path) => (failuresByFile.get(path) ?? 0) >= maxFailures);
            if (exhausted) throw budgetError("file", exhausted);
            const fingerprint = createHash("sha256").update(canonical({ name: call.name, arguments: call.arguments })).digest("hex");
            if (failedRequests.has(fingerprint)) {
                const failed = failedRequests.get(fingerprint);
                throw new FileOperationError("REPEATED_FAILED_OPERATION", "This unchanged request already failed. Use the supplied recovery text to correct it. No write was attempted.",
                    { ...failed.details, previousCode: failed.code, writeAttempted: false });
            }
            for (const path of paths.filter((path) => needsRead.has(path))) {
                const recovery = await recover(path, {});
                if (recovery.status !== "read") throw new FileOperationError("READ_REQUIRED", "Current file contents could not be read. Read the file before retrying. No write was attempted.",
                    { path, recovery, writeAttempted: false });
            }
            try {
                const value = await toolExecutor(call, container, allowedTools);
                if (value?.success) {
                    const changed = value.files ?? paths;
                    for (const path of changed) failuresByFile.delete(path);
                    forgetFailures(changed);
                    for (const [path, revision] of Object.entries(value.revisions ?? {})) knownRevisions.set(path, revision);
                }
                return value;
            } catch (error) {
                if (FATAL_ERRORS.has(error.code)) throw new FileOperationError("FILE_OPERATION_RECOVERY_REQUIRED", error.message, { causeCode: error.code, ...error.details });
                // Guard-only rejections do not spend a write attempt.
                if (["READ_REQUIRED", "REPEATED_FAILED_OPERATION"].includes(error.code)) throw error;
                budget.totalFailures++;
                const path = error.details?.path ?? paths[0] ?? "<invalid request>";
                const failures = (failuresByFile.get(path) ?? 0) + 1;
                failuresByFile.set(path, failures);
                let recovery;
                if (READ_RECOVERY.has(error.code) && error.details?.path) {
                    needsRead.add(path);
                    recovery = await recover(path, error.details);
                }
                const operation = Array.isArray(operations) ? operations[error.details?.operationIndex ?? 0] : undefined;
                const edit = operation?.edits?.[error.details?.editIndex ?? 0];
                error.details = { ...error.details, path,
                    ...(edit && !error.details?.failedEdit ? { failedEdit: {
                        before: { text: typeof edit.before === "string" ? edit.before.slice(0, 4000) : null, truncated: edit.before?.length > 4000 },
                        after: { text: typeof edit.after === "string" ? edit.after.slice(0, 4000) : null, truncated: edit.after?.length > 4000 }
                    } } : {}),
                    ...(recovery ? { recovery, currentRevision: recovery.file?.revision ?? error.details?.currentRevision } : {}),
                    failuresRemaining: Math.max(0, maxFailures - failures),
                    totalFailuresRemaining: Math.max(0, budget.maxTotalFailures - budget.totalFailures) };
                failedRequests.set(fingerprint, { code: error.code, paths, details: error.details });
                if (budget.totalFailures >= budget.maxTotalFailures) throw budgetError("task", path, error);
                if (failures >= maxFailures) throw budgetError("file", path, error);
                throw error;
            }
        }
    };
}
