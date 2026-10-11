import { parseDiscoveryArguments, repositoryFiles, discoverFiles } from "./fileDiscovery.js";

export async function getFileNameList(container, input = {}) {
    const args = parseDiscoveryArguments("getFileNameList", input);
    return discoverFiles(await repositoryFiles(container, args.filePath), args);
}
