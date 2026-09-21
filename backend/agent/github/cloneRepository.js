import { tryCatch } from "bullmq";
import { prisma } from "../../clients/prismaClient.js";
import { executeContainerCommand } from "../sandbox/executeCommand.js"

export async function cloneRepository(container, repoName, userId) {
    try {
        tryCatch
        const githubAccount = await prisma.githubAccount.findFirst({
            where:{
                userId: userId
            }
        })

        if(!githubAccount){
            return {
                complete : false,
                message : "Github Account not found."
            }
        }

        const command = `git clone https://github.com/${githubAccount.githubUsername}/${repoName}.git`
        const commandReponse = await executeContainerCommand(container, command)
    
        // './Outbox_Event/.env.example',
        // './Outbox_Event/src/db/notify.ts',
        // './Outbox_Event/src/db/client.ts',
        return {
            complete: true,
            message : commandReponse
        };

    } catch (error) {
        return {
            error : error
        }
    }
}