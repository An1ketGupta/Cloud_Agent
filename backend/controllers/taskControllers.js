import { prisma } from "../clients/prismaClient.js";
import { executeContainerCommand } from "../services/containerService.js";
import createAgentContainer from "../services/createAgentContainer.js"

export async function NewTask(req,res){
    const prompt = req.body.prompt
    const repository = req.body.repository

    const agentContainer = await createAgentContainer();
    const githubUser = await prisma.githubAccount.findFirst({
        where : {
            userId : req.user.id
        }
    })

    const githubUsername = githubUser.githubUsername

    const repoLink = `https://github.com/${githubUsername}/${repository}.git`
    await executeContainerCommand(agentContainer, `git clone ${repoLink}`)

    res.json({
        "message" : "hi"
    })
}

export async function continueTask(req,res){

}