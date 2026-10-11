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
            "Reads up to 50,000 characters of one repository file without changing it.",
        parameters: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "The path of a file inside /workspace/repository."
                }
            },
            required: ["filePath"],
            additionalProperties: false
        }
    },
    {
        type: "function",
        name: "ApplyPatch",
        description:
            "Applies a patch in /workspace/repository. Read affected files first. Prefer *** Begin Patch with *** Add File, *** Update File and @@ sections, or *** Delete File, followed by *** End Patch. Git unified diffs with repository-relative a/ and b/ paths also work.",
        parameters: {
            type: "object",
            properties: {
                patch: {
                    type: "string",
                    description: "The complete ApplyPatch text or Git unified diff to apply."
                }
            },
            required: ["patch"],
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
