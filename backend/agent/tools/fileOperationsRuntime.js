// Self-contained: this module is also executed inside existing Node.js agent containers.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const MAX_BATCH_BYTES = 250_000;
const MAX_FILE_BYTES = 1_000_000;

export class FileOperationError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.code = code;
        this.details = details;
    }
}

function fail(code, message, details) { throw new FileOperationError(code, message, details); }
export function revision(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function keys(value, allowed) { return object(value) && Object.keys(value).every((key) => allowed.includes(key)); }
function validText(value) {
    return typeof value === "string" && !value.includes("\0") && value.isWellFormed();
}

export function validateFilePath(value) {
    if (typeof value !== "string" || !value || value.length > 4096 || /[\\\x00-\x1f\x7f]/.test(value)
        || path.posix.isAbsolute(value) || /^[a-z]:/i.test(value)
        || value.split("/").some((part) => !part || [".", "..", ".git", "node_modules"].includes(part))) {
        fail("INVALID_PATH", "Use a repository-relative file path with / separators; traversal and protected directories are forbidden.", { path: value });
    }
    return value;
}

export function validateOperations(input) {
    if (!keys(input, ["operations", "requestId"]) || !Array.isArray(input.operations) || !input.operations.length || input.operations.length > 50) {
        fail("INVALID_OPERATIONS", "ApplyPatch requires {operations: [...]} with 1-50 create, update, or delete operations. Diff text is unsupported.");
    }
    if (input.requestId !== undefined && (typeof input.requestId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(input.requestId))) fail("INVALID_REQUEST_ID", "Optional requestId must be 1-128 letters, digits, dots, underscores, colons, or hyphens.");
    if (Buffer.byteLength(JSON.stringify(input)) > MAX_BATCH_BYTES) fail("BATCH_TOO_LARGE", "The complete JSON batch must be at most 250,000 UTF-8 bytes.");
    const seen = new Set();
    return input.operations.map((operation, operationIndex) => {
        const details = { operationIndex, path: operation?.path };
        if (!object(operation) || !["create", "update", "delete"].includes(operation.type)) fail("INVALID_OPERATIONS", "Operation type must be create, update, or delete.", details);
        const file = validateFilePath(operation.path);
        if (seen.has(file)) fail("DUPLICATE_PATH", "Combine all edits for a file into one operation.", details);
        // A batch cannot create a file where another operation needs a directory.
        for (const previous of seen) {
            if (file.startsWith(`${previous}/`) || previous.startsWith(`${file}/`)) fail("CONFLICTING_PATHS", "Batch file paths cannot be ancestors of one another.", details);
        }
        seen.add(file);
        if (operation.type === "create") {
            if (!keys(operation, ["type", "path", "content"]) || !validText(operation.content)) fail("INVALID_OPERATIONS", "create requires only type, path, and UTF-8 text content (empty content is allowed).", details);
            return { type: "create", path: file, content: operation.content };
        }
        if (!/^[a-f0-9]{64}$/.test(operation.revision ?? "")) fail("INVALID_REVISION", "Copy the full revision returned by ReadFile.", { ...details, recovery: "ReadFile" });
        if (operation.type === "delete") {
            if (!keys(operation, ["type", "path", "revision"])) fail("INVALID_OPERATIONS", "delete requires only type, path, and revision.", details);
            return { type: "delete", path: file, revision: operation.revision };
        }
        if (!keys(operation, ["type", "path", "revision", "edits"]) || !Array.isArray(operation.edits) || !operation.edits.length || operation.edits.length > 100) fail("INVALID_OPERATIONS", "update requires type, path, revision, and 1-100 edits.", details);
        const edits = operation.edits.map((edit, editIndex) => {
            if (!keys(edit, ["before", "after"]) || !validText(edit.before) || !edit.before.length || !validText(edit.after)) fail("INVALID_EDIT", "Each edit requires a nonempty before string and an after string. Include surrounding text for insertions.", { ...details, editIndex });
            return { before: edit.before, after: edit.after };
        });
        return { type: "update", path: file, revision: operation.revision, edits };
    });
}

function statIfPresent(file) {
    try { return fs.lstatSync(file); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function targetPath(root, file) {
    validateFilePath(file);
    let current = root;
    const parts = file.split("/");
    for (let index = 0; index < parts.length; index++) {
        current = path.join(current, parts[index]);
        const stat = statIfPresent(current);
        if (stat?.isSymbolicLink()) fail("SYMLINK_PATH", "File operations cannot follow symlinks.", { path: file });
        if (stat && (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) fail("INVALID_FILE_TYPE", "Expected a regular file and directory parents.", { path: file });
    }
    return current;
}

function snapshot(root, file) {
    const target = targetPath(root, file);
    const stat = statIfPresent(target);
    if (!stat) return { target, bytes: null, revision: null, mode: 0o644 };
    if (stat.size > MAX_FILE_BYTES) fail("FILE_TOO_LARGE", "File operations support files up to 1,000,000 bytes.", { path: file });
    const bytes = fs.readFileSync(target);
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
    catch { fail("BINARY_FILE", "Only valid UTF-8 text files are supported.", { path: file }); }
    if (text.includes("\0")) fail("BINARY_FILE", "Binary files are unsupported.", { path: file });
    return { target, bytes, text, revision: revision(bytes), mode: stat.mode & 0o777 };
}

function textLines(text) {
    const lines = text.split("\n");
    if (text.endsWith("\n")) lines.pop();
    let offset = 0;
    return lines.map((line, index) => {
        const entry = { text: line, start: offset, end: offset + line.length, line: index + 1 };
        offset += line.length + 1;
        return entry;
    });
}

function commonIndent(lines) {
    const nonblank = lines.filter((line) => /\S/.test(line));
    let prefix = nonblank[0]?.match(/^[ \t]*/)[0] ?? "";
    for (const line of nonblank.slice(1)) {
        while (!line.startsWith(prefix)) prefix = prefix.slice(0, -1);
    }
    return prefix;
}

function reindent(text, from, to) {
    const lines = text.split("\n");
    if (lines.some((line) => /\S/.test(line) && !line.startsWith(from))) return null;
    return lines.map((line) => /\S/.test(line) ? to + line.slice(from.length) : line).join("\n");
}

function whitespaceMatches(lines, before, after, strategy) {
    const pattern = textLines(before).map((line) => line.text);
    if (!pattern.some((line) => /\S/.test(line))) return [];
    const trailing = (line) => line.replace(/[ \t]+$/, "");
    const patternIndent = commonIndent(pattern);
    const matches = [];
    const anchor = pattern.findIndex((line) => /\S/.test(line));
    for (let index = 0; index <= lines.length - pattern.length; index++) {
        const anchorText = lines[index + anchor].text;
        if (strategy === "trailing-whitespace" && trailing(anchorText) !== trailing(pattern[anchor])) continue;
        if (strategy === "indentation" && trailing(anchorText).replace(/^[ \t]+/, "") !== trailing(pattern[anchor]).replace(/^[ \t]+/, "")) continue;
        const window = lines.slice(index, index + pattern.length);
        const sourceIndent = strategy === "indentation" ? commonIndent(window.map((line) => line.text)) : "";
        const matchesLine = (line, position) => {
            if (strategy === "trailing-whitespace") return trailing(line.text) === trailing(pattern[position]);
            if (!/\S/.test(line.text) && !/\S/.test(pattern[position])) return true;
            return trailing(line.text).slice(sourceIndent.length) === trailing(pattern[position]).slice(patternIndent.length);
        };
        if (!window.every(matchesLine)) continue;
        const last = window.at(-1);
        // A requested final newline must actually exist, including at EOF.
        if (before.endsWith("\n") && index + pattern.length === lines.length && !lines.hasFinalNewline) continue;
        const replacement = strategy === "indentation" ? reindent(after, patternIndent, sourceIndent) : after;
        if (replacement === null) continue;
        matches.push({ start: window[0].start, end: last.end + (before.endsWith("\n") ? 1 : 0), after: replacement, strategy });
        if (matches.length === 2) break;
    }
    return matches;
}

function boundedText(value, limit = 4000) {
    return { text: value.slice(0, limit), truncated: value.length > limit };
}

function tokens(text) {
    return new Set(text.slice(0, 4000).match(/[\p{L}\p{N}_$]+|[^\s\p{L}\p{N}_$]/gu) ?? []);
}

function similarCode(lines, before) {
    const search = tokens(before);
    if (!search.size) return [];
    const height = Math.min(textLines(before).length, 40);
    const candidates = [];
    // Rank individual lines first; score only a bounded number of block windows.
    const ranked = lines.map((line, index) => {
        const words = tokens(line.text);
        const shared = [...words].filter((word) => search.has(word)).length;
        return { index, score: shared / Math.max(1, words.size + search.size - shared) };
    }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);
    const starts = new Set(ranked.flatMap(({ index }) => [index, Math.max(0, index - height + 1)]));
    for (const start of starts) {
        const window = lines.slice(start, start + height);
        const content = window.map((line) => line.text).join("\n");
        const words = tokens(content);
        const shared = [...words].filter((word) => search.has(word)).length;
        const score = shared / Math.max(1, words.size + search.size - shared);
        if (score < 0.3) continue;
        candidates.push({ startLine: start + 1, endLine: window.at(-1).line, offset: window[0].start,
            ...boundedText(content, 2000), similarity: Number(score.toFixed(3)) });
    }
    return candidates.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
}

export function replaceText(text, edits, details = {}, onMatch = () => {}) {
    // Match every edit against the original snapshot, not prior edits' output.
    // Map normalized offsets back to the original so untouched mixed line endings survive.
    const normalized = text.replace(/\r\n/g, "\n");
    const lines = textLines(normalized);
    lines.hasFinalNewline = normalized.endsWith("\n");
    const offsets = [0];
    for (let index = 0; index < text.length; index++) {
        if (text[index] === "\r" && text[index + 1] === "\n") index++;
        offsets.push(index + 1);
    }
    const changes = edits.map((edit, editIndex) => {
        const before = edit.before.replace(/\r\n/g, "\n");
        const replacement = edit.after.replace(/\r\n/g, "\n");
        if (!before.length) fail("INVALID_EDIT", "before must be nonempty; include surrounding code for insertions.", { ...details, editIndex });
        const failureDetails = () => ({ ...details, editIndex, recovery: "ReadFile", applied: false,
            failedEdit: { before: boundedText(edit.before), after: boundedText(edit.after) },
            candidates: similarCode(lines, before).map((candidate) => ({ ...candidate, offset: offsets[candidate.offset] })),
            attemptedStrategies: ["exact", "trailing-whitespace", "indentation"] });
        let start = normalized.indexOf(before);
        let match;
        if (start >= 0) {
            if (normalized.indexOf(before, start + 1) >= 0) fail("AMBIGUOUS_MATCH", "before text matches more than once. Include more surrounding code.", failureDetails());
            match = { start, end: start + before.length, after: replacement, strategy: "exact" };
        } else {
            for (const strategy of ["trailing-whitespace", "indentation"]) {
                const matches = whitespaceMatches(lines, before, replacement, strategy);
                if (matches.length > 1) fail("AMBIGUOUS_MATCH", `Multiple blocks match using ${strategy}. Include more surrounding code.`, failureDetails());
                if (matches.length === 1) { match = matches[0]; break; }
            }
        }
        if (!match) fail("TEXT_NOT_FOUND", "Exact and whitespace-tolerant matching failed. Use the current file and suggested code to correct this edit; suggestions have not been applied.", failureDetails());
        start = match.start;
        const original = text.slice(offsets[start], offsets[match.end]);
        const crlf = original.includes("\r\n") || (!original.includes("\n") && text.includes("\r\n"));
        const after = match.after.replace(/\n/g, crlf ? "\r\n" : "\n");
        onMatch({ editIndex, strategy: match.strategy, startLine: normalized.slice(0, start).split("\n").length });
        return { start: offsets[start], end: offsets[match.end], after, editIndex };
    }).sort((a, b) => a.start - b.start);
    for (let index = 1; index < changes.length; index++) {
        if (changes[index].start < changes[index - 1].end) fail("OVERLAPPING_EDITS", "Edits overlap. Combine them into one before/after replacement.", { ...details, editIndex: changes[index].editIndex });
    }
    let output = text;
    for (const change of changes.reverse()) output = output.slice(0, change.start) + change.after + output.slice(change.end);
    return output;
}

function git(root, args, allowedCodes = [0]) {
    // check-ignore already accepts literal filenames and rejects pathspec magic.
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8", env: { ...process.env, GIT_LITERAL_PATHSPECS: args[0] === "check-ignore" ? "0" : "1" }, timeout: 10_000, maxBuffer: 2_000_000 });
    if (result.error || !allowedCodes.includes(result.status)) fail("GIT_FAILED", result.error?.message || result.stderr.trim() || `git exited ${result.status}`, { exitCode: result.status, stderr: result.stderr, stdout: result.stdout });
    return result;
}

function writeAtomic(target, bytes, mode, temporaryFiles) {
    const temporary = path.join(path.dirname(target), `.cloud-agent-${randomUUID()}.tmp`);
    temporaryFiles.add(temporary);
    fs.writeFileSync(temporary, bytes, { flag: "wx", mode });
    fs.chmodSync(temporary, mode);
    fs.renameSync(temporary, target);
    temporaryFiles.delete(temporary);
}

function readPage(root, request) {
    const file = snapshot(root, request.filePath);
    if (!file.bytes) fail("FILE_NOT_FOUND", "Repository file does not exist.", { path: request.filePath });
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 50_000;
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 50_000 || offset > file.text.length) fail("INVALID_RANGE", "ReadFile needs a valid character offset and limit of 1-50,000.");
    let end = Math.min(file.text.length, offset + limit);
    if (end < file.text.length && /[\uD800-\uDBFF]/.test(file.text[end - 1])) end--;
    if (end === offset && end < file.text.length) end += 2;
    return { success: true, path: request.filePath, output: file.text.slice(offset, end), revision: file.revision,
        offset, nextOffset: end < file.text.length ? end : null, totalCharacters: file.text.length, truncated: end < file.text.length };
}

export function executeFileRequest(repositoryRoot, request, { onCommit = () => {} } = {}) {
    const root = fs.realpathSync(repositoryRoot);
    // State lives inside the real Git directory, inaccessible through agent file tools.
    const gitDirectory = git(root, ["rev-parse", "--absolute-git-dir"]).stdout.trim();
    const state = path.join(gitDirectory, "cloud-agent-file-operations");
    fs.mkdirSync(state, { recursive: true });
    const lock = path.join(state, "lock");
    try { fs.mkdirSync(lock); }
    catch (error) { if (error.code === "EEXIST") fail("REPOSITORY_BUSY", "Another operation or an interrupted transaction holds the repository lock. Do not retry file writes blindly."); throw error; }
    let keepLock = false;
    const temporaryFiles = new Set();
    const createdDirectories = [];
    const committed = [];
    let indexBefore;
    let indexTarget;
    let receipt;
    let receiptWritten = false;
    try {
        if (request.action === "read") return readPage(root, request);
        if (request.action === "diff") {
            // Adding '.' with -N also stages deletions, hiding them from git diff.
            const untracked = git(root, ["ls-files", "--others", "--exclude-standard", "-z"]).stdout.split("\0").filter(Boolean);
            for (let offset = 0; offset < untracked.length; offset += 100) git(root, ["add", "-N", "--", ...untracked.slice(offset, offset + 100)]);
            // Git writes the full diff to protected state; read only a bounded
            // prefix so large repositories return truncated:true, not ENOBUFS.
            const output = path.join(lock, "review.diff");
            git(root, ["-c", "core.quotePath=false", "diff", "--no-ext-diff", "--no-textconv", "--no-renames", `--output=${output}`, "--", "."]);
            const size = fs.statSync(output).size;
            const buffer = Buffer.alloc(Math.min(size, 400_000));
            const descriptor = fs.openSync(output, "r");
            try { fs.readSync(descriptor, buffer, 0, buffer.length, 0); }
            finally { fs.closeSync(descriptor); }
            const patch = buffer.toString("utf8");
            return { patch: patch.slice(0, 100_000), truncated: size > buffer.length || patch.length > 100_000 };
        }
        if (request.action !== "apply") fail("INVALID_OPERATIONS", "Unknown file operation action.");
        const operations = validateOperations(request.input);
        const fingerprint = revision(JSON.stringify({ operations }));
        const requestId = request.input.requestId === undefined ? fingerprint : revision(`request:${request.input.requestId}`);
        receipt = path.join(state, `${requestId}.json`);
        if (statIfPresent(receipt)) {
            const previous = JSON.parse(fs.readFileSync(receipt, "utf8"));
            if (previous.fingerprint !== fingerprint) fail("REQUEST_ID_CONFLICT", "This requestId belongs to a different batch. Use a new requestId for a new operation.");
            if (previous.states.every((item) => snapshot(root, item.path).revision === item.revision)) return { ...previous.result, replayed: true };
            const changed = previous.states.find((item) => snapshot(root, item.path).revision !== item.revision);
            fail("REPLAY_CONFLICT", "This batch was already applied, but its files have since changed. Read current files and submit a new batch with a fresh requestId.", { path: changed.path, recovery: "ReadFile" });
        }
        const prepared = operations.map((operation, operationIndex) => {
            const details = { operationIndex, path: operation.path };
            const before = snapshot(root, operation.path);
            if (operation.type === "create" && before.bytes !== null) fail("FILE_EXISTS", "create cannot overwrite an existing file. Read it and use update.", { ...details, recovery: "ReadFile" });
            if (operation.type !== "create" && before.bytes === null) fail("FILE_NOT_FOUND", "Read an existing file before updating or deleting it.", { ...details, recovery: "ReadFile" });
            if (operation.type !== "create" && before.revision !== operation.revision) fail("STALE_REVISION", "The file changed since it was read. Read it again before retrying.", { ...details, recovery: "ReadFile", currentRevision: before.revision });
            if (operation.type === "create" && git(root, ["check-ignore", "--", operation.path], [0, 1]).status === 0) fail("IGNORED_PATH", "New files must be visible in the repository review diff.", details);
            const matches = [];
            const text = operation.type === "delete" ? null : operation.type === "create" ? operation.content
                : replaceText(before.text, operation.edits, { ...details, currentRevision: before.revision }, (match) => matches.push(match));
            const after = text === null ? null : Buffer.from(text);
            if (after && after.length > MAX_FILE_BYTES) fail("FILE_TOO_LARGE", "Resulting file exceeds 1,000,000 bytes.", details);
            return { operation, operationIndex, before, after, matches, afterRevision: after === null ? null : revision(after) };
        });
        indexTarget = path.join(gitDirectory, "index");
        indexBefore = statIfPresent(indexTarget) ? fs.readFileSync(indexTarget) : null;
        // Retain originals and a journal for diagnosis if the process is interrupted.
        fs.writeFileSync(path.join(lock, "journal.json"), JSON.stringify(prepared.map((item) => ({ path: item.operation.path, before: item.before.bytes?.toString("base64") ?? null, mode: item.before.mode, afterRevision: item.afterRevision }))));
        if (indexBefore) fs.writeFileSync(path.join(lock, "index.before"), indexBefore);
        for (const item of prepared) {
            if (item.after === null) continue;
            let parent = path.dirname(item.before.target);
            const missing = [];
            while (!statIfPresent(parent)) { missing.push(parent); parent = path.dirname(parent); }
            for (const directory of missing.reverse()) { fs.mkdirSync(directory); createdDirectories.push(directory); }
            targetPath(root, item.operation.path);
            item.staged = path.join(path.dirname(item.before.target), `.cloud-agent-${randomUUID()}.tmp`);
            temporaryFiles.add(item.staged);
            fs.writeFileSync(item.staged, item.after, { flag: "wx", mode: item.before.mode });
            fs.chmodSync(item.staged, item.before.mode);
        }
        // Recheck every snapshot after staging and immediately before each mutation.
        for (const item of prepared) {
            if (snapshot(root, item.operation.path).revision !== item.before.revision) fail("STALE_REVISION", "A file changed while staging this batch. Read current files.", { path: item.operation.path, operationIndex: item.operationIndex, recovery: "ReadFile" });
        }
        for (const item of prepared) {
            if (snapshot(root, item.operation.path).revision !== item.before.revision) fail("STALE_REVISION", "A file changed before commit. Read current files.", { path: item.operation.path, operationIndex: item.operationIndex, recovery: "ReadFile" });
            if (item.after === null) fs.unlinkSync(item.before.target);
            else { fs.renameSync(item.staged, item.before.target); temporaryFiles.delete(item.staged); }
            committed.push(item);
            onCommit(item.operationIndex);
        }
        const createdFiles = prepared.filter((item) => item.operation.type === "create").map((item) => item.operation.path);
        if (createdFiles.length) git(root, ["add", "-N", "--", ...createdFiles]);
        for (const item of prepared) {
            if (snapshot(root, item.operation.path).revision !== item.afterRevision) fail("VERIFY_FAILED", "Written file did not match the intended result.", { path: item.operation.path });
        }
        const states = prepared.map((item) => ({ path: item.operation.path, revision: item.afterRevision }));
        const result = { success: true, requestId, files: states.map((item) => item.path), revisions: Object.fromEntries(states.map((item) => [item.path, item.revision])),
            matches: prepared.flatMap((item) => item.matches.map((match) => ({ path: item.operation.path, ...match }))), replayed: false };
        writeAtomic(receipt, Buffer.from(JSON.stringify({ fingerprint, result, states })), 0o600, temporaryFiles);
        receiptWritten = true;
        return result;
    } catch (error) {
        const rollbackErrors = [];
        for (const item of committed.reverse()) {
            try {
                // Do not clobber unrelated changes made outside the repository lock.
                if (snapshot(root, item.operation.path).revision !== item.afterRevision) throw new Error(`Concurrent changes prevent rollback of ${item.operation.path}`);
                if (item.before.bytes === null) fs.unlinkSync(item.before.target);
                else writeAtomic(item.before.target, item.before.bytes, item.before.mode, temporaryFiles);
            } catch (rollbackError) { rollbackErrors.push(rollbackError.message); }
        }
        if (committed.length && indexTarget) {
            try { if (indexBefore === null) fs.rmSync(indexTarget, { force: true }); else writeAtomic(indexTarget, indexBefore, 0o644, temporaryFiles); }
            catch (rollbackError) { rollbackErrors.push(rollbackError.message); }
        }
        if (receiptWritten) fs.rmSync(receipt, { force: true });
        if (rollbackErrors.length) {
            keepLock = true;
            fail("ROLLBACK_FAILED", "The batch failed and rollback needs recovery. Further file operations are blocked; the journal contains original contents.", { cause: error.message, rollbackErrors });
        }
        if (error instanceof FileOperationError) throw error;
        fail("FILE_OPERATION_FAILED", error.message, { rolledBack: committed.length > 0 });
    } finally {
        for (const file of temporaryFiles) { try { fs.unlinkSync(file); } catch {} }
        for (const directory of createdDirectories.reverse()) { try { fs.rmdirSync(directory); } catch {} }
        if (!keepLock) fs.rmSync(lock, { recursive: true, force: true });
    }
}
