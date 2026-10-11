export const FILE_OPERATION_INSTRUCTIONS = `ApplyPatch accepts structured JSON operations, never diff text or patch delimiters.
Read each existing file first with ReadFile; copy its revision unchanged into update/delete operations. ReadFile returns a full-file SHA-256 revision even for a page. If truncated, use nextOffset to read more; never reconstruct a file from a truncated page.
Batch related files in one call: ApplyPatch({"operations":[{"type":"update","path":"script.js","revision":"<revision from ReadFile>","edits":[{"before":"const loading = false;","after":"let loading = false;"}]},{"type":"create","path":"utils.js","content":"export const enabled = true;\\n"}]}).
create requires type, path, content; empty files are allowed. update requires type, path, revision, edits. delete requires type, path, revision.
All paths must be repository-relative with / separators. Supply one operation per file. Every before string must be nonempty, copied from the original file, and unique; include surrounding code to disambiguate or insert text. Edits within a file match the same original snapshot and cannot overlap. Use after:"" to remove a block. Do not include line numbers or diff +/- prefixes.
Existing line endings are preserved. Batch JSON is limited to 250,000 UTF-8 bytes, 50 operations, and 100 edits per update; each file is limited to 1,000,000 bytes.
Failures include code, path, operationIndex, editIndex when applicable, and recovery instructions. After STALE_REVISION, TEXT_NOT_FOUND, AMBIGUOUS_MATCH, or REPLAY_CONFLICT, read the affected file before submitting a corrected batch. Do not repeat an unchanged failed request. Repeating an already successful batch returns replayed:true if the files still match its result. For a new intentional batch with identical operations after a replay conflict, supply a fresh optional requestId; reuse it unchanged for retries of that batch.
Review GitDiff before completing the assignment. Stop and report the error if the file operation failure budget is exhausted or recovery is required.`;

const pagination = {
    limit: { type: "integer", minimum: 1, maximum: 500, description: "Maximum files in this page (1-500)." },
    offset: { type: "integer", minimum: 0, description: "Start at 0; use the previous result's nextOffset for another page." }
};

export const FILE_DISCOVERY_INSTRUCTIONS = `Repository file tools accept JSON objects, not shell commands.
The repository root is /workspace/repository; prefer repository-relative paths. Never guess a layout such as backend/src.
When repositoryInventory is supplied in your input, start with that inventory. If truncated is false and nextOffset is null, it already contains every file; read relevant paths without further filename discovery.
Otherwise list the repository once: getFileNameList({"filePath":"."}). The result lists files recursively and immediate child directories.
List an observed directory: getFileNameList({"filePath":"src","limit":200,"offset":0}).
Find a filename or fragment anywhere: SearchFile({"query":"package.json"}) or SearchFile({"query":"controller"}).
Find a glob: SearchFile({"query":"**/*.js","directory":"."}). Supported glob syntax is *, **, and ?; other characters are literal. Search is case-insensitive.
Search within an observed directory: SearchFile({"query":"*.jsx","directory":"frontend"}). A query containing / matches paths relative to directory.
Results contain repository-relative files, directories, totalMatches, nextOffset, and truncated. Read returned paths with ReadFile({"filePath":"src/index.js"}).
Entries in files are file paths, even if their names are frontend or backend without extensions. Only directories contains directory paths. An empty directories array means no child directories were discovered. A complete three-file listing will not reveal extra files if searched again.
If nextOffset is not null, change offset to that value to get another page. If there are no matches, change the query or directory. If a directory is missing, use availableDirectories from the error.
Do not repeat identical discovery calls: results are cached until ApplyPatch, and repeated calls or excessive discovery disable these tools for the rest of this role. Once you locate relevant files, read them and complete your assignment.`;

export const toolDeclarations = [
    {
        type: "function",
        name: "getFileNameList",
        description:
            'Recursively lists tracked and non-ignored untracked repository files, with child directories and pagination. Start with {"filePath":"."}; reuse returned paths. Do not repeat a completed page.',
        parameters: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "Repository-relative directory, e.g. . or src. Defaults to . (repository root). Never guess a directory."
                },
                ...pagination
            },
            required: [],
            additionalProperties: false
        }
    },
    {
        type: "function",
        name: "SearchFile",
        description:
            'Finds repository files by case-insensitive filename/path fragment or glob (*, **, ?). Example: {"query":"**/*.js","directory":"."}. Returns paths for ReadFile, match count, and pagination; no matches means change the query.',
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Filename/fragment such as package.json or controller, or glob such as **/*.jsx. No shell commands or absolute paths."
                },
                directory: {
                    type: "string",
                    description: "Repository-relative search directory. Defaults to . (search the whole repository)."
                },
                ...pagination
            },
            required: ["query"],
            additionalProperties: false
        }
    },
    {
        type: "function",
        name: "ReadFile",
        description:
            "Reads a page of UTF-8 repository text and returns its full-file revision for update/delete operations. Use nextOffset for subsequent pages.",
        parameters: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "Repository-relative file path, e.g. src/index.js."
                },
                offset: { type: "integer", minimum: 0, description: "Character offset; start at 0 and use nextOffset to read another page." },
                limit: { type: "integer", minimum: 1, maximum: 50000, description: "Page size in characters; defaults to 50000." }
            },
            required: ["filePath"],
            additionalProperties: false
        }
    },
    {
        type: "function",
        name: "ApplyPatch",
        description:
            "Applies a validated batch of structured create/update/delete file operations. Read existing files first and copy their revisions. Exact before/after replacements must match uniquely. Diff text is unsupported. Identical successful requests are replay-safe.",
        parameters: {
            type: "object",
            properties: {
                operations: {
                    type: "array", minItems: 1, maxItems: 50,
                    description: "One operation per path. create: type/path/content; update: type/path/revision/edits; delete: type/path/revision. Include only fields required for that type.",
                    items: {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["create", "update", "delete"] },
                            path: { type: "string", description: "Repository-relative path with / separators." },
                            content: { type: "string", description: "create only: complete new file text, including desired final newline." },
                            revision: { type: "string", description: "update/delete only: full revision copied from ReadFile." },
                            edits: {
                                type: "array", minItems: 1, maxItems: 100,
                                description: "update only: nonoverlapping replacements matching the original file.",
                                items: {
                                    type: "object",
                                    properties: {
                                        before: { type: "string", minLength: 1, description: "Exact unique text from the original file. Include context for insertions or repeated code." },
                                        after: { type: "string", description: "Replacement text; empty string removes the matched block." }
                                    },
                                    required: ["before", "after"], additionalProperties: false
                                }
                            }
                        },
                        required: ["type", "path"], additionalProperties: false
                    }
                },
                requestId: { type: "string", maxLength: 128, description: "Optional unique batch identifier for intentional repeated operations. Reuse unchanged on retries; use a fresh identifier for a new batch." }
            },
            required: ["operations"],
            additionalProperties: false
        }
    },
    {
        type: "function",
        name: "SearchContent",
        description: "Searches tracked repository text for a literal string and returns matching lines.",
        parameters: {
            type: "object",
            properties: { query: { type: "string", description: "Literal text to find." } },
            required: ["query"],
            additionalProperties: false
        }
    },
    {
        type: "function",
        name: "GitDiff",
        description: "Returns the current uncommitted repository patch without changing files.",
        parameters: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false
        }
    }
];
