export const toolDeclarations = [
    {
        type: "function",
        name: "getFileNameList",
        description:
            "Lists tracked and untracked repository files beneath a directory, excluding ignored files.",
        parameters: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "A directory path inside /workspace/repository."
                }
            },
            required: ["filePath"],
            additionalProperties: false
        }
    },
    {
        type: "function",
        name: "SearchFile",
        description:
            "Searches for a file by name beneath a repository directory.",
        parameters: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description:
                        "A /workspace/repository search path ending with the file name."
                }
            },
            required: ["filePath"],
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
            "Applies a Git unified diff in /workspace/repository. Read affected files first. Diff headers must use repository-relative a/ and b/ paths.",
        parameters: {
            type: "object",
            properties: {
                patch: {
                    type: "string",
                    description: "The complete Git unified diff to apply."
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
