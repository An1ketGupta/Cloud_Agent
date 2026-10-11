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
                        githubUsername: true,
                        repositories: { select: { id: true, fullName: true } }
                    }
                }
            }
        })

        if (!user) {
            return res.status(404).json({
                error: "User not found."
            })
        }

        res.status(200).json({
            user
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({
            error: "Failed to fetch user profile."
        })
    }
}
