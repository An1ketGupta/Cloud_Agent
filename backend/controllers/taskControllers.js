import { prisma } from "../clients/prismaClient.js";
import { executeContainerCommand } from "../agent/sandbox/executeCommand.js";
import createAgentContainer from "../services/createAgentContainer.js"
import { CloneRepository } from "../agent/github/cloneRepository.js";

export async function NewTask(req,res){
    const repository = req.body.repository

    const agentContainer = await createAgentContainer();
    const githubUser = await prisma.githubAccount.findFirst({
        where : {
            userId : req.user.id
        }
    })

    if(!githubUser){
        return res.status(401).json({
            'message' : "Github User not found"
        })
    }

    const githubUsername = githubUser.githubUsername
    const repoCloneResponse = await CloneRepository(agentContainer, repository, githubUsername)

    if(repoCloneResponse.exitCode == 0){
        return res.json({
            "message" : "Cloning successful."
        })
    }
    else{
        res.json({
            "message" : repoCloneResponse.exitCode
        })
    }
}

export async function continueTask(req,res){

}