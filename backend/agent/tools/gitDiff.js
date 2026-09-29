import { runContainerExec } from "../sandbox/containerIO.js";

export async function GitDiff(container) {
    const result = await runContainerExec(container, ["git", "diff", "--no-ext-diff", "--", "."]);
    if (result.exitCode !== 0) {
        throw new Error(result.stderr || "Unable to read repository diff.");
    }
    return { patch: result.stdout.slice(0, 100_000), truncated: result.stdout.length > 100_000 };
}
