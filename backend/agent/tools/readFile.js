import { runContainerExec } from "../sandbox/containerIO.js";

export async function ReadFile(container, filePath) {
    const result = await runContainerExec(container, ["cat", "--", filePath]);
    if (result.exitCode !== 0) throw new Error(`Failed to read ${filePath}: ${result.stderr}`);
    return {
        success: true,
        output: result.stdout.slice(0, 50_000),
        truncated: result.stdout.length > 50_000
    };
}
