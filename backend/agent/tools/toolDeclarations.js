export const toolDeclarations = [
    {
        type: "function",
        name: "getFileNameList",
        description:
            "Lists all files and directories recursively beneath a directory in the mounted repository.",
        parameters: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "An absolute directory path inside /workspace."
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
                        "An absolute /workspace search path ending with the file name."
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
            "Reads the complete text content of one repository file without changing it.",
        parameters: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "The absolute path of a file inside /workspace."
                }
            },
            required: ["filePath"],
            additionalProperties: false
        }
    },
    {
        type: "function",
        name: "writeFile",
        description:
            "Appends text to a repository file, creating it when it does not exist. Use ApplyPatch to edit an existing file.",
        parameters: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    description: "The absolute destination path inside /workspace."
                },
                content: {
                    type: "string",
                    description: "The exact text to append to the file."
                }
            },
            required: ["filePath", "content"],
            additionalProperties: false
        }
    },
    {
        type: "function",
        name: "ApplyPatch",
        description:
            "Applies a unified diff from /workspace. Read affected files before preparing the patch. Diff headers must use repository-relative a/ and b/ paths.",
        parameters: {
            type: "object",
            properties: {
                patch: {
                    type: "string",
                    description: "The complete unified diff to apply with patch -p1."
                }
            },
            required: ["patch"],
            additionalProperties: false
        }
    }
];
