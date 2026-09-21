export function listTools() {
    return [
        {
            name: "getFileNameList",
            description:
                "Lists all files and directories beneath a directory in the mounted repository. Use this first to inspect the repository structure. The path must be /workspace or a path inside /workspace.",
            arguments: [
                {
                    name: "path",
                    type: "string",
                    required: true,
                    description:
                        "Absolute directory path inside the repository, such as /workspace or /workspace/src."
                }
            ],
            returns: {
                type: "object",
                description:
                    "An object containing a files array and a directories array."
            },
            AgentCallFunctiontrigger:
                'FUNCTION_CALL: getFileNameList({"path":"<absolute workspace directory>"})'
        },
        {
            name: "SearchFile",
            description:
                "Searches for a file by name beneath a repository directory. Use this when you know the file name but do not know its exact location. The path must begin with /workspace.",
            arguments: [
                {
                    name: "filePath",
                    type: "string",
                    required: true,
                    description:
                        "A search directory followed by the file name, such as /workspace/index.js or /workspace/src/config.js."
                }
            ],
            returns: {
                type: "string",
                description: "The matching file path or paths."
            },
            AgentCallFunctiontrigger:
                'FUNCTION_CALL: SearchFile({"filePath":"<absolute workspace path ending with the file name>"})'
        },
        {
            name: "ReadFile",
            description:
                "Reads the complete text content of one repository file without changing it. Use a listing or search tool first when the exact file path is unknown.",
            arguments: [
                {
                    name: "filePath",
                    type: "string",
                    required: true,
                    description:
                        "Absolute path to a file inside /workspace, such as /workspace/src/index.js."
                }
            ],
            returns: {
                type: "string",
                description: "The complete text content of the requested file."
            },
            AgentCallFunctiontrigger:
                'FUNCTION_CALL: ReadFile({"filePath":"<absolute workspace file path>"})'
        },
        {
            name: "writeFile",
            description:
                "Appends text to a repository file, creating the file when it does not exist. It does not replace existing content. Use ApplyPatch instead when editing existing code.",
            arguments: [
                {
                    name: "filePath",
                    type: "string",
                    required: true,
                    description:
                        "Absolute destination path inside /workspace, such as /workspace/src/newFile.js."
                },
                {
                    name: "content",
                    type: "string",
                    required: true,
                    description: "The exact text to append to the file."
                }
            ],
            returns: {
                type: "boolean",
                description: "True when the write succeeds; otherwise false."
            },
            AgentCallFunctiontrigger:
                'FUNCTION_CALL: writeFile({"filePath":"<absolute workspace file path>","content":"<exact text to append>"})'
        },
        {
            name: "ApplyPatch",
            description:
                "Applies a unified diff from the /workspace directory. Use this for precise changes to existing files, and read the affected files before preparing the patch. Diff headers must use repository-relative a/ and b/ paths because the patch is applied with -p1.",
            arguments: [
                {
                    name: "patch",
                    type: "string",
                    required: true,
                    description:
                        "A complete unified diff containing --- a/path and +++ b/path headers and all required hunks. Encode newlines and quotes as valid JSON string escapes."
                }
            ],
            returns: {
                type: "object",
                description:
                    "An object containing a success boolean and the patch command output."
            },
            AgentCallFunctiontrigger:
                'FUNCTION_CALL: ApplyPatch({"patch":"<complete unified diff as a JSON string>"})'
        }
    ];
}

export default listTools;
