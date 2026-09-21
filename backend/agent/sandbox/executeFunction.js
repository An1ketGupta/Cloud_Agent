import ApplyPatch from "../tools/applyPatch.js";
import { getFileNameList } from "../tools/getFiles.js";
import { listTools } from "../tools/listTools.js";
import { ReadFile } from "../tools/readFile.js";
import { SearchFile } from "../tools/searchFile.js";
import { writeFile } from "../tools/writeFile.js";

export async function executeFunction(output, container) {
    if (typeof output !== "string") {
        throw new TypeError("Function output must be a string.");
    }

    const functionCall = output
        .trim()
        .match(/^FUNCTION_CALL:\s*([A-Za-z_$][\w$]*)\s*\(([\s\S]*)\)$/);

    if (!functionCall) {
        throw new Error("Invalid function call format.");
    }

    const [, functionName, serializedArguments] = functionCall;

    let args;
    try {
        args = JSON.parse(serializedArguments);
    } catch (error) {
        throw new Error(`Invalid JSON arguments for ${functionName}.`, {
            cause: error
        });
    }

    if (args === null || Array.isArray(args) || typeof args !== "object") {
        throw new TypeError(`Arguments for ${functionName} must be a JSON object.`);
    }

    const functions = {
        listTools: () => listTools(),
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
