import { parseDiscoveryArguments } from "../tools/fileDiscovery.js";
import { createFileOperationGuard } from "./fileOperationGuard.js";

const DISCOVERY_TOOLS = new Set(["getFileNameList", "SearchFile"]);
const MAX_DISCOVERY_CALLS = 8;
const MAX_REPEATS = 3;
const examples = {
    getFileNameList: { filePath: ".", limit: 200, offset: 0 },
    SearchFile: { query: "**/*.js", directory: ".", limit: 100, offset: 0 }
};

function stableKey(value) {
    if (!value || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableKey).join(",")}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableKey(value[key])}`).join(",")}}`;
}

export function createDiscoveryGuard({ container, allowedTools, toolExecutor, repositoryInventory }) {
    const fileOperations = createFileOperationGuard({ container, allowedTools, toolExecutor });
    const cache = new Map();
    let discoveryCalls = 0;
    let repeats = 0;
    let disabled = repositoryInventory?.directory === "." && repositoryInventory?.offset === 0
        && repositoryInventory?.nextOffset === null && repositoryInventory?.truncated === false;
    let disabledReason = disabled
        ? "The complete repository file inventory is already supplied in your input. All existing files are listed under repositoryInventory.files; repositoryInventory.directories lists actual directories. Read those exact files and complete the assignment. Do not guess missing directories or repeat discovery."
        : "";
    let ignoredDisabledCalls = 0;

    return {
        get disabled() { return disabled; },
        get disabledReason() { return disabledReason; },
        get availableTools() { return allowedTools.filter((name) => !disabled || !DISCOVERY_TOOLS.has(name)); },
        async execute(call) {
            const discovery = DISCOVERY_TOOLS.has(call.name) && allowedTools.includes(call.name);
            if (discovery && disabled) {
                if (++ignoredDisabledCalls > 2) throw new Error("Agent kept requesting disabled file discovery tools. Read the discovered files or finish with the available evidence.");
                return { isError: true, value: { error: disabledReason } };
            }
            let key;
            let argumentError;
            if (discovery) {
                discoveryCalls++;
                try {
                    const canonical = parseDiscoveryArguments(call.name, call.arguments);
                    if (call.name === "SearchFile" && !canonical.exact) canonical.query = canonical.query.toLowerCase();
                    key = `${call.name}:${stableKey(canonical)}`;
                } catch (error) {
                    argumentError = error;
                    key = `${call.name}:${stableKey(call.arguments)}`;
                }
                if (cache.has(key)) repeats++;
                // Count repeats across intervening searches and reads: alternating
                // a cached root listing with guesses must not reset the guard.
                if (repeats >= MAX_REPEATS || discoveryCalls >= MAX_DISCOVERY_CALLS) {
                    disabled = true;
                    disabledReason = "File discovery is disabled after three repeated calls or the eight-call discovery budget. Read previously returned paths and complete your assignment. Report missing source files instead of continuing to search.";
                }
                if (cache.has(key)) {
                    const previous = cache.get(key);
                    return { ...previous, cached: true, value: { ...previous.value, cached: true,
                        hint: disabled ? "File discovery is now disabled. Read the returned files and finish your assignment."
                            : "This identical query was already answered. Use its files, change query/directory, or advance to nextOffset. Do not repeat it." } };
                }
            }
            // Even a failed patch may have changed files; never reuse pre-patch results.
            if (call.name === "ApplyPatch" && allowedTools.includes(call.name)) {
                cache.clear();
                repeats = 0;
            }
            let response;
            try {
                if (argumentError) throw argumentError;
                response = { value: await fileOperations.execute(call), isError: false };
            } catch (error) {
                if (["FILE_OPERATION_BUDGET", "FILE_OPERATION_RECOVERY_REQUIRED"].includes(error.code)) throw error;
                response = { isError: true, value: { error: error.message,
                    ...(error.code ? { code: error.code, ...error.details } : {}),
                    ...(discovery ? { exampleArguments: examples[call.name], ...error.discovery } : {}) } };
            }
            if (discovery) cache.set(key, response);
            return response;
        }
    };
}
