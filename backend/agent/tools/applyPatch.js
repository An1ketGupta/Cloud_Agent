import { validateOperations } from "./fileOperationsRuntime.js";
import { runFileOperation } from "../sandbox/fileOperations.js";

export default async function ApplyPatch(container, input) {
    const operations = validateOperations(input);
    return runFileOperation(container, { action: "apply", input: { operations, ...(input.requestId === undefined ? {} : { requestId: input.requestId }) } });
}
