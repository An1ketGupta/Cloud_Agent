import { FileOperationError, validateOperations } from "./fileOperationsRuntime.js";

export const FILE_MUTATION_TOOLS = ["CreateFile", "EditFile", "DeleteFile", "ApplyPatch"];

// Every editor uses the same revision checks, transaction, and replay protection.
export function fileMutationInput(name, args) {
    if (name === "ApplyPatch") return args;
    if (!args || typeof args !== "object" || Array.isArray(args)) {
        throw new FileOperationError("INVALID_ARGUMENTS", `${name} requires a JSON object.`);
    }
    const types = { CreateFile: "create", EditFile: "update", DeleteFile: "delete" };
    const type = types[name];
    if (!type) throw new FileOperationError("INVALID_ARGUMENTS", `Unknown file mutation tool: ${name}`);
    const fields = { CreateFile: ["path", "content"], EditFile: ["path", "revision", "edits"], DeleteFile: ["path", "revision"] }[name];
    if (Object.keys(args).some((field) => ![...fields, "requestId"].includes(field))) {
        throw new FileOperationError("INVALID_ARGUMENTS", `${name} accepts only ${fields.join(", ")} and optional requestId. Do not supply type.`, { path: args.path });
    }
    const { requestId, ...operation } = args;
    const input = { operations: [{ ...operation, type }], ...(requestId === undefined ? {} : { requestId }) };
    validateOperations(input);
    return input;
}
