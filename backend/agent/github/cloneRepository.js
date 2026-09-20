import { executeContainerCommand } from "../sandbox/executeCommand.js"

export async function CloneRepository(container, repository, githubUsername) {
    const command = `git clone https://github.com/${githubUsername}/${repository}.git`
    const commandReponse = await executeContainerCommand(container, command)

    // './Outbox_Event/.env.example',
    // './Outbox_Event/src/db/notify.ts',
    // './Outbox_Event/src/db/client.ts',

    return commandReponse;
}