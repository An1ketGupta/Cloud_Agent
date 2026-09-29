import { runContainerExec } from "../sandbox/containerIO.js";
import {
    normalizeRepositoryPath,
    validateExistingPath,
    validateNearestExistingParent
} from "./repositoryPath.js";

export default async function ApplyPatch(container, patch) {
    if (
        typeof patch !== "string" ||
        patch.length === 0 ||
        patch.length > 250_000
    ) {
        throw new Error("Patch must be a nonempty unified diff under 250 KB.");
    }

    if (
        /^(?:GIT binary patch|Binary files |(?:new file|deleted file|old|new) mode 120000|rename (?:from|to) |copy (?:from|to) )/m.test(patch)
    ) {
        throw new Error(
            "Binary files, symlinks, renames, and copies are not supported."
        );
    }

    const headers = [
        ...patch.matchAll(
            /^diff --git a\/([^\r\n]+) b\/([^\r\n]+)$/gm
        )
    ];

    if (headers.length === 0) {
        throw new Error("Patch must contain standard diff --git headers.");
    }

    const markers = [
        ...patch.matchAll(/^(---|\+\+\+) ([^\r\n]+)$/gm)
    ];

    if (markers.length !== headers.length * 2) {
        throw new Error("Patch has missing or unexpected file markers.");
    }

    for (const header of headers) {
        const oldPath = header[1];
        const newPath = header[2];

        if (oldPath !== newPath || oldPath.startsWith('"')) {
            throw new Error(
                "Patch paths must be matching, unquoted repository paths."
            );
        }

        const target = normalizeRepositoryPath(oldPath);

        const existing = await runContainerExec(
            container,
            ["test", "-e", target]
        );

        if (existing.exitCode === 0) {
            await validateExistingPath(container, target);
        } else {
            const symlink = await runContainerExec(
                container,
                ["test", "-L", target]
            );

            if (symlink.exitCode === 0) {
                throw new Error("Patch cannot change a symlink.");
            }

            await validateNearestExistingParent(container, target);
        }
    }

    for (let i = 0; i < headers.length; i++) {
        const oldMarker = markers[i * 2];
        const newMarker = markers[i * 2 + 1];

        const correctOldPath =
            oldMarker[2] === "/dev/null" ||
            oldMarker[2] === `a/${headers[i][1]}`;

        const correctNewPath =
            newMarker[2] === "/dev/null" ||
            newMarker[2] === `b/${headers[i][2]}`;

        if (
            oldMarker[1] !== "---" ||
            newMarker[1] !== "+++" ||
            !correctOldPath ||
            !correctNewPath
        ) {
            throw new Error(
                "Patch file markers do not match their diff headers."
            );
        }
    }

    const check = await runContainerExec(
        container,
        ["git", "apply", "--check", "-"],
        { input: patch }
    );

    if (check.exitCode !== 0) {
        throw new Error(
            `Patch cannot be applied: ${check.stderr || check.stdout}`
        );
    }

    const result = await runContainerExec(
        container,
        ["git", "apply", "-"],
        { input: patch }
    );

    if (result.exitCode !== 0) {
        throw new Error(
            `Patch failed: ${result.stderr || result.stdout}`
        );
    }

    const intent = await runContainerExec(
        container,
        ["git", "add", "-N", "--", "."]
    );

    if (intent.exitCode !== 0) {
        throw new Error(
            `Patch applied, but new files could not be included in the final diff: ${intent.stderr}`
        );
    }

    return {
        success: true,
        files: headers.map((header) => header[1])
    };
}