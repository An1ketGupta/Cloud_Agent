import { executeContainerCommand } from "../sandbox/executeCommand.js"
import { getFileNameList } from "../tools/getFileandDirectoryList.js";

export async function CloneRepository(container, repository, githubUsername){
    const command = `git clone https://github.com/${githubUsername}/${repository}.git`
    const commandReponse = await executeContainerCommand(container, command)
    return commandReponse;
}