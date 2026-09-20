import { prisma } from "../clients/prismaClient.js"

export async function MyProfile(req,res){
    const { userId } = req.user

    try {
        const user = await prisma.user.findUnique({
            where : {
                userId : userId
            },
            select: {
                userId: true,
                email: true,
                first_name: true,
                last_name: true,
                githubAccount: {
                    select: {
                        id: true,
                        userId: true,
                        githubUserId: true,
                        githubUsername: true,
                        githubAvatarUrl: true,
                        repositories: true
                    }
                }
            }
        })

        if (!user) {
            return res.status(404).json({
                error: "User not found."
            })
        }

        const profile = {
            ...user,
            githubAccount: user.githubAccount
                ? {
                    ...user.githubAccount,
                    githubUserId: user.githubAccount.githubUserId.toString(),
                    repositories: user.githubAccount.repositories.map((repository) => ({
                        ...repository,
                        githubRepoId: repository.githubRepoId.toString()
                    }))
                }
                : null
        }

        res.status(200).json({
            user: profile
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({
            error: "Failed to fetch user profile."
        })
    }
}
