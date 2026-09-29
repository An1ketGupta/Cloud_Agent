import { runContainerExec } from "../sandbox/containerIO.js";

export async function SearchContent(container, query) {
    if (typeof query !== "string" || !query.trim() || query.length > 200) {
        throw new Error("Search query must contain 1 to 200 characters.");
    }
    const result = await runContainerExec(container, ["git", "grep", "-n", "-I", "-F", "--", query]);
    if (result.exitCode > 1) {
        throw new Error(result.stderr || "Repository search failed.");
    }
    return { matches: result.stdout.slice(0, 30_000), truncated: result.stdout.length > 30_000 };
}
