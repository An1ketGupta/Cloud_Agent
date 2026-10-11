import path from "node:path";
import { z } from "zod";
import { REPOSITORY_ROOT, runContainerExec } from "../sandbox/containerIO.js";
import { normalizeRepositoryPath, validateExistingPath } from "./repositoryPath.js";

const paging = {
    limit: z.number().int().min(1).max(500).optional(),
    offset: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0)
};
const directory = z.string().max(4096);
export const discoverySchemas = {
    getFileNameList: z.object({ filePath: directory.default("."), ...paging }).strict(),
    SearchFile: z.object({ query: z.string().min(1).max(300), directory: directory.default("."), ...paging }).strict()
};

function normalizeDirectory(value) {
    // /workspace is the sandbox working directory, not a second searchable root.
    const input = value.replaceAll("\\", "/");
    if (/^[a-z]:/i.test(input)) throw new Error("Use a repository-relative directory, not a Windows drive path.");
    const absolute = normalizeRepositoryPath(input === "/workspace" || input === "/workspace/" ? "." : input);
    return path.posix.relative(REPOSITORY_ROOT, absolute) || ".";
}

export function parseDiscoveryArguments(name, input) {
    const args = discoverySchemas[name].parse(input);
    if (name === "getFileNameList") {
        return { filePath: normalizeDirectory(args.filePath), limit: args.limit ?? 200, offset: args.offset };
    }
    const query = args.query.replaceAll("\\", "/");
    if (!query.trim() || query.includes("\0") || query.startsWith("/") || /^[a-z]:/i.test(query) || query.split("/").includes("..")) {
        throw new Error("SearchFile query must be a filename, relative path fragment, or glob such as **/*.js. Use directory to set the search root.");
    }
    return { query, directory: normalizeDirectory(args.directory), limit: args.limit ?? 100, offset: args.offset };
}

function childDirectories(files, directory) {
    const prefix = directory === "." ? "" : `${directory}/`;
    return [...new Set(files.filter((file) => file.startsWith(prefix)).flatMap((file) => {
        const suffix = file.slice(prefix.length);
        return suffix.includes("/") ? [prefix + suffix.split("/")[0]] : [];
    }))].sort();
}

export async function repositoryFiles(container, directory) {
    const [result, deleted] = await Promise.all([
        runContainerExec(container, ["git", "ls-files", "--cached", "--others", "--exclude-standard", "--full-name", "-z"]),
        runContainerExec(container, ["git", "ls-files", "--deleted", "--full-name", "-z"])
    ]);
    if (result.exitCode !== 0) throw new Error(result.stderr || "Unable to list repository files.");
    if (deleted.exitCode !== 0) throw new Error(deleted.stderr || "Unable to check deleted repository files.");
    const deletedFiles = new Set(deleted.stdout.split("\0"));
    const files = [...new Set(result.stdout.split("\0").filter((file) => {
        if (!file || deletedFiles.has(file)) return false;
        try { normalizeRepositoryPath(file); return true; } catch { return false; }
    }))].sort();
    const absolute = normalizeRepositoryPath(directory);
    try {
        await validateExistingPath(container, absolute);
        const type = await runContainerExec(container, ["test", "-d", absolute]);
        if (type.exitCode !== 0) throw new Error(`Expected a directory: ${directory}. Use ReadFile for a file.`);
    } catch (error) {
        error.discovery = {
            repositoryRoot: REPOSITORY_ROOT, availableDirectories: childDirectories(files, "."),
            hint: 'Use getFileNameList({"filePath":"."}) or SearchFile({"query":"name"}). Choose directories returned by the tools; do not guess paths.'
        };
        throw error;
    }
    return files;
}

// Explicit glob grammar: * within a segment, ** across segments, ? one character.
// All other characters are literal, never shell syntax.
function globTokens(query) {
    const tokens = [];
    for (let index = 0; index < query.length; index++) {
        const char = query[index];
        if (char === "*" && query[index + 1] === "*") {
            index++;
            if (query[index + 1] === "/") { tokens.push("**/"); index++; }
            else tokens.push("**");
        } else tokens.push(char);
    }
    return tokens;
}

// Dynamic programming avoids exponential regex backtracking on wildcard-heavy queries.
function matchesGlob(tokens, target) {
    let previous = new Uint8Array(target.length + 1);
    previous[0] = 1;
    for (const token of tokens) {
        const current = new Uint8Array(target.length + 1);
        let reachable = false;
        for (let index = 0; index <= target.length; index++) {
            if (token === "**/") {
                current[index] = previous[index] || (index > 0 && target[index - 1] === "/" && reachable);
                reachable ||= !!previous[index];
            } else if (token === "*" || token === "**") {
                current[index] = previous[index] || (index > 0 && (token === "**" || target[index - 1] !== "/") && current[index - 1]);
            } else if (index > 0) {
                current[index] = previous[index - 1] && (token === "?" ? target[index - 1] !== "/" : target[index - 1] === token);
            }
        }
        previous = current;
    }
    return !!previous[target.length];
}

export function discoverFiles(files, args, search = false) {
    const directory = search ? args.directory : args.filePath;
    const prefix = directory === "." ? "" : `${directory}/`;
    const scoped = files.filter((file) => !prefix || file.startsWith(prefix));
    const glob = search && /[*?]/.test(args.query) ? globTokens(args.query.toLowerCase()) : null;
    const matches = search ? scoped.filter((file) => {
        const relative = file.slice(prefix.length);
        const target = args.query.includes("/") ? relative : path.posix.basename(file);
        return glob ? matchesGlob(glob, target.toLowerCase()) : target.toLowerCase().includes(args.query.toLowerCase());
    }) : scoped;
    const page = matches.slice(args.offset, args.offset + args.limit);
    const nextOffset = args.offset + page.length < matches.length ? args.offset + page.length : null;
    return {
        repositoryRoot: REPOSITORY_ROOT, directory, ...(search ? { query: args.query } : {}),
        files: page, directories: childDirectories(files, directory),
        totalMatches: matches.length, returnedCount: page.length,
        offset: args.offset, limit: args.limit, nextOffset, truncated: nextOffset !== null,
        hint: nextOffset !== null
            ? `More matches remain. Repeat with offset=${nextOffset}, or narrow the directory/query.`
            : matches.length ? "Use these exact repository-relative paths with ReadFile. This query is complete; repeating it will return the same files."
                : "No matches. Change the query or choose a returned directory; repeating this query will not discover more files."
    };
}
