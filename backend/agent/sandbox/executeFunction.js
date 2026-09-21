import ApplyPatch from "../tools/applyPatch.js";
import { getFileNameList } from "../tools/getFiles.js";
import { ReadFile } from "../tools/readFile.js";
import { SearchFile } from "../tools/searchFile.js";
import { writeFile } from "../tools/writeFile.js";

export async function executeFunction(functionCall, container) {
    if (!functionCall || typeof functionCall !== "object") {
        throw new TypeError("A structured function call is required.");
    }

    const { name: functionName, arguments: args } = functionCall;

    if (typeof functionName !== "string" || functionName.length === 0) {
        throw new TypeError("Function name is required.");
    }

    if (args === null || Array.isArray(args) || typeof args !== "object") {
        throw new TypeError(`Arguments for ${functionName} must be a JSON object.`);
    }

    const functions = {
        getFileNameList: () => getFileNameList(container, args.filePath),
        SearchFile: () => SearchFile(container, args.filePath),
        ReadFile: () => ReadFile(container, args.filePath),
        writeFile: () => writeFile(container, args.filePath, args.content),
        ApplyPatch: () => ApplyPatch(container, args.patch)
    };

    const functionToExecute = functions[functionName];

    if (!functionToExecute) {
        throw new Error(`Unknown function: ${functionName}`);
    }

    return await functionToExecute();
}
