import { runContainerExec } from "../sandbox/containerIO.js";
import {
    normalizeRepositoryPath,
    validateExistingPath,
    validateNearestExistingParent
} from "./repositoryPath.js";

function fullFileDiff(file, before, after, deleted = false) {
    const lines = (value) => value.endsWith("\n") ? value.slice(0, -1).split("\n") : value.split("\n");
    const oldLines = before === "" ? [] : lines(before);
    const newLines = after === "" ? [] : lines(after);
    const oldBody = oldLines.map((line) => `-${line}`).join("\n");
    const newBody = newLines.map((line) => `+${line}`).join("\n");
    const oldEnding = before && !before.endsWith("\n") ? "\n\\ No newline at end of file" : "";
    const newEnding = after && !after.endsWith("\n") ? "\n\\ No newline at end of file" : "";
    const body = [oldBody && `${oldBody}${oldEnding}`, newBody && `${newBody}${newEnding}`].filter(Boolean).join("\n");
    return `diff --git a/${file} b/${file}\n${deleted ? "deleted file mode 100644\n" : ""}--- a/${file}\n+++ ${deleted ? "/dev/null" : `b/${file}`}\n@@ -${oldLines.length ? 1 : 0},${oldLines.length} +${newLines.length ? 1 : 0},${newLines.length} @@\n${body}\n`;
}

function applyUpdate(file, before, sections) {
    const crlf = before.includes("\r\n");
    const normalized = before.replace(/\r\n/g, "\n");
    const original = normalized.endsWith("\n") ? normalized.slice(0, -1).split("\n") : normalized.split("\n");
    const current = before === "" ? [] : original;
    let cursor = 0;
    for (const section of sections) {
        if (section.anchor) {
            const anchor = current.findIndex((line, index) => index >= cursor && line === section.anchor);
            if (anchor < 0) throw new Error(`Update anchor not found in ${file}: ${section.anchor}`);
            cursor = anchor + 1;
        }
        const oldLines = section.lines.filter((line) => line[0] !== "+").map((line) => line.slice(1));
        const replacement = section.lines.filter((line) => line[0] !== "-").map((line) => line.slice(1));
        let start = cursor;
        if (oldLines.length) {
            start = -1;
            for (let index = cursor; index <= current.length - oldLines.length; index++) {
                if (oldLines.every((line, offset) => current[index + offset] === line)) {
                    start = index;
                    break;
                }
            }
            if (start < 0) throw new Error(`Update context not found in ${file}. Read the current file and retry.`);
        }
        current.splice(start, oldLines.length, ...replacement);
        cursor = start + replacement.length;
    }
    const after = current.length ? `${current.join("\n")}${before.endsWith("\n") || before === "" ? "\n" : ""}` : "";
    return crlf ? after.replace(/\n/g, "\r\n") : after;
}

export async function preparePatch(input, readFile) {
    let patch = input;
    const fence = patch.match(/^```(?:diff|patch)?\s*\n([\s\S]*?)\n```$/i);
    if (fence) patch = fence[1];

    if (patch.trimStart().startsWith("*** Begin Patch")) {
        const lines = patch.trim().split(/\r?\n/);
        const end = lines.indexOf("*** End Patch");
        if (end >= 0) lines.length = end + 1;
        else lines.push("*** End Patch");

        const files = [];
        for (let i = 1; i < lines.length - 1;) {
            const match = lines[i].match(/^\*\*\* (Add|Update|Delete) File: (.+)$/);
            if (!match) throw new Error(`Unsupported ApplyPatch directive: ${lines[i]}`);
            const [, action, file] = match;
            normalizeRepositoryPath(file);
            if (file.startsWith("/") || file.startsWith("a/") || file.startsWith("b/")) {
                throw new Error(`ApplyPatch paths must be repository-relative without a/ or b/: ${file}`);
            }
            i++;
            if (action === "Add") {
                const content = [];
                while (i < lines.length - 1 && !lines[i].startsWith("*** ")) {
                    if (!lines[i].startsWith("+")) throw new Error("Each added file line must begin with +.");
                    content.push(lines[i++]);
                }
                if (!content.length) throw new Error("An added file needs at least one content line.");
                files.push(`diff --git a/${file} b/${file}\nnew file mode 100644\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${content.length} @@\n${content.join("\n")}`);
                continue;
            }
            if (!readFile) throw new Error("A file reader is required for Update File and Delete File patches.");
            const before = await readFile(file);
            if (action === "Delete") {
                if (lines[i] && !lines[i].startsWith("*** ")) throw new Error("Delete File must not contain patch lines.");
                files.push(fullFileDiff(file, before, "", true).replace(/\n$/, ""));
                continue;
            }
            const sections = [];
            let section;
            while (i < lines.length - 1 && !/^\*\*\* (?:Add|Update|Delete) File: /.test(lines[i])) {
                const line = lines[i++];
                if (line === "*** End of File") continue;
                if (line === "@@" || line.startsWith("@@ ")) {
                    section = { anchor: line === "@@" ? "" : line.slice(3), lines: [] };
                    sections.push(section);
                } else if (section && /^[ +\-]/.test(line)) {
                    section.lines.push(line);
                } else {
                    throw new Error(`Invalid Update File line in ${file}: ${line}`);
                }
            }
            if (!sections.length || sections.some((item) => !item.lines.length)) throw new Error(`Update File needs a nonempty @@ section: ${file}`);
            files.push(fullFileDiff(file, before, applyUpdate(file, before, sections)).replace(/\n$/, ""));
        }
        return `${files.join("\n")}\n`;
    }

    if (!/^diff --git /m.test(patch)) {
        const markers = [...patch.matchAll(/^(---|\+\+\+) ([^\r\n]+)$/gm)];
        if (markers.length === 2 && markers[0][1] === "---" && markers[1][1] === "+++") {
            const oldPath = markers[0][2].replace(/^a\//, "");
            const newPath = markers[1][2].replace(/^b\//, "");
            const file = oldPath === "/dev/null" ? newPath : oldPath;
            if (newPath !== "/dev/null" && file !== newPath) {
                throw new Error("Unified diff file paths must match.");
            }
            patch = patch.replace(/^--- [^\r\n]+$/m, `--- ${oldPath === "/dev/null" ? oldPath : `a/${oldPath}`}`)
                .replace(/^\+\+\+ [^\r\n]+$/m, `+++ ${newPath === "/dev/null" ? newPath : `b/${newPath}`}`);
            patch = `diff --git a/${file} b/${file}\n${patch}`;
        } else {
            throw new Error("Patch needs diff --git a/path b/path headers, --- and +++ file markers, and @@ hunks. For new files, *** Begin Patch with *** Add File is also accepted.");
        }
    }

    return patch.endsWith("\n") ? patch : `${patch}\n`;
}

export default async function ApplyPatch(container, patch) {
    if (
        typeof patch !== "string" ||
        patch.length === 0 ||
        patch.length > 250_000
    ) {
        throw new Error("Patch must be a nonempty unified diff under 250 KB.");
    }

    patch = await preparePatch(patch, async (file) => {
        const target = await validateExistingPath(container, file);
        const result = await runContainerExec(container, ["cat", "--", target]);
        if (result.exitCode !== 0) throw new Error(`Could not read ${file}: ${result.stderr}`);
        return result.stdout;
    });

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
        ["git", "apply", "--check", "--recount", "--verbose", "-"],
        { input: patch }
    );

    if (check.exitCode !== 0) {
        throw new Error(
            `Patch cannot be applied (git exit ${check.exitCode}): ${check.stderr.trim() || check.stdout.trim() || "check hunk context and file paths against the current repository"}`
        );
    }

    const result = await runContainerExec(
        container,
        ["git", "apply", "--recount", "-"],
        { input: patch }
    );

    if (result.exitCode !== 0) {
        throw new Error(
            `Patch failed (git exit ${result.exitCode}): ${result.stderr.trim() || result.stdout.trim() || "check the current file contents and retry with a fresh diff"}`
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
