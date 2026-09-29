import ApplyPatch from "../tools/applyPatch.js";
import { getFileNameList } from "../tools/getFiles.js";
import { ReadFile } from "../tools/readFile.js";
import { SearchFile } from "../tools/searchFile.js";
import { SearchContent } from "../tools/searchContent.js";
import { GitDiff } from "../tools/gitDiff.js";
import { validateExistingPath } from "../tools/repositoryPath.js";
import { z } from "zod";
import path from "node:path";

const pathArgs = z.object({
    filePath: z.string().min(1)
}).strict();

const schemas = {
    getFileNameList: pathArgs,
    SearchFile: pathArgs,
    ReadFile: pathArgs,
    ApplyPatch: z.object({
        patch: z.string().min(1)
    }).strict(),
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

    const args = schema.parse(functionCall.arguments);

    if (args.filePath) {
        const filePath = functionName === "SearchFile"
            ? path.posix.dirname(args.filePath)
            : args.filePath;

        await validateExistingPath(container, filePath);
    }

    const functions = {
        getFileNameList: () => getFileNameList(container, args.filePath),
        SearchFile: () => SearchFile(container, args.filePath),
        ReadFile: () => ReadFile(container, args.filePath),
        ApplyPatch: () => ApplyPatch(container, args.patch),
        SearchContent: () => SearchContent(container, args.query),
        GitDiff: () => GitDiff(container)
    };

    return await functions[functionName]();
}