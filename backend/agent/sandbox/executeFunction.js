import ApplyPatch from "../tools/applyPatch.js";
import { getFileNameList } from "../tools/getFiles.js";
import { ReadFile } from "../tools/readFile.js";
import { SearchFile } from "../tools/searchFile.js";
import { SearchContent } from "../tools/searchContent.js";
import { GitDiff } from "../tools/gitDiff.js";
import { validateOperations, FileOperationError } from "../tools/fileOperationsRuntime.js";
import { z } from "zod";
import { discoverySchemas } from "../tools/fileDiscovery.js";

const pathArgs = z.object({
    filePath: z.string().min(1),
    offset: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(50_000).optional()
}).strict();

const schemas = {
    ...discoverySchemas,
    ReadFile: pathArgs,
    ApplyPatch: z.unknown(),
    SearchContent: z.object({
        query: z.string().min(1)
    }).strict(),
    GitDiff: z.object({}).strict()
};

export async function executeFunction(functionCall, container, allowedTools = []) {
    if (!functionCall || typeof functionCall !== "object") {
        throw new TypeError("A structured function call is required.");
    }

    const functionName = functionCall.name;

    if (!functionName) {
        throw new TypeError("Function name is required.");
    }

    if (!allowedTools.includes(functionName)) {
        throw new Error(`Tool ${functionName} is not available to this agent.`);
    }

    const schema = schemas[functionName];

    if (!schema) {
        throw new Error(`Unknown function: ${functionName}`);
    }

    let args;
    try {
        args = schema.parse(functionCall.arguments);
        if (functionName === "ApplyPatch") validateOperations(args);
    } catch (error) {
        if (error instanceof FileOperationError) throw error;
        throw new FileOperationError("INVALID_ARGUMENTS", error.message);
    }

    const functions = {
        getFileNameList: () => getFileNameList(container, args),
        SearchFile: () => SearchFile(container, args),
        ReadFile: () => ReadFile(container, args.filePath, args),
        ApplyPatch: () => ApplyPatch(container, args),
        SearchContent: () => SearchContent(container, args.query),
        GitDiff: () => GitDiff(container)
    };

    return await functions[functionName]();
}
