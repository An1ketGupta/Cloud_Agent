import { normalizeRepositoryPath } from "../agent/tools/repositoryPath.js";
import { runContainerExec } from "../agent/sandbox/containerIO.js";

export function splitFilePatches(patch = "") {
    const files = new Map();
    for (const section of patch.match(/^diff --git .*?(?=^diff --git |$(?![\s\S]))/gms) || []) {
        const marker = section.match(/^\+\+\+ b\/([^\r\n]+)$/m);
        const deleted = section.includes("+++ /dev/null");
        const oldMarker = section.match(/^--- a\/([^\r\n]+)$/m);
        const path = deleted ? oldMarker?.[1] : marker?.[1];
        if (!path || path.startsWith('"') || path.includes("\n")) continue;
        normalizeRepositoryPath(path);
        files.set(path, section.endsWith("\n") ? section : `${section}\n`);
    }
    return files;
}

export function createFileReview(beforePatch, afterPatch) {
    const before = splitFilePatches(beforePatch);
    const after = splitFilePatches(afterPatch);
    const paths = new Set([...before.keys(), ...after.keys()]);
    const files = Object.create(null);
    for (const path of paths) {
        if (before.get(path) !== after.get(path)) files[path] = "pending";
    }
    const revertedPaths = Object.keys(files).filter((path) => before.has(path) && !after.has(path));
    const displayPatch = afterPatch + revertedPaths.map((path) => before.get(path)).join("");
    return { beforePatch, afterPatch, displayPatch, revertedPaths, files };
}

export async function restoreFileBeforeRun(container, beforePatch, afterPatch, execute = runContainerExec) {
    if (!afterPatch) {
        if (!beforePatch) return;
        const restored = await execute(container, ["git", "apply", "-"], { input: beforePatch });
        if (restored.exitCode !== 0) throw new Error("Could not restore the file's earlier changes.");
        return;
    }
    const reverse = await execute(container, ["git", "apply", "--reverse", "--check", "-"], { input: afterPatch });
    if (reverse.exitCode !== 0) throw new Error("The file can no longer be restored safely.");
    const removed = await execute(container, ["git", "apply", "--reverse", "-"], { input: afterPatch });
    if (removed.exitCode !== 0) throw new Error("Could not remove this run's file changes.");
    if (!beforePatch) return;
    const restored = await execute(container, ["git", "apply", "-"], { input: beforePatch });
    if (restored.exitCode !== 0) {
        await execute(container, ["git", "apply", "-"], { input: afterPatch }).catch(() => {});
        throw new Error("Could not restore the file's earlier changes.");
    }
}
