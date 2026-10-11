import { parseDiscoveryArguments, repositoryFiles, discoverFiles } from "./fileDiscovery.js";

export async function SearchFile(container, input) {
    const args = parseDiscoveryArguments("SearchFile", typeof input === "string" ? { filePath: input } : input);
    return discoverFiles(await repositoryFiles(container, args.directory), args, true);
}
