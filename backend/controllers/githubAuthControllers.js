import axios from "axios";
import crypto from "crypto"
import { prisma } from "../clients/prismaClient.js";
import { startGithubRepositorySync } from "../services/githubRepositorySync.js";

export async function AuthorizeGithub(req, res) {
    const random_state = crypto.randomBytes(32).toString("hex");

    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
        state: random_state
    })

    const githubUrl = `https://github.com/login/oauth/authorize?${params.toString()}`

    res.cookie("githubOAuthState", random_state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
    }).redirect(githubUrl)
}

export async function getGithubAccessToken(req, res) {
    const { code } = req.query

    if (!code) {
        return res.status(400).json({
            error: "Authorisation code missing."
        })
    }

    try {
        const response = await axios.post("https://github.com/login/oauth/access_token",
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: process.env.GITHUB_CALLBACK_URL
            },
            {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            })

        const tokenData = await response.data
        const githubAccessToken = tokenData.access_token
        const githubRefreshToken = tokenData.refresh_token

        const githubUser = await axios.get(
            "https://api.github.com/user",
            {
                headers: {
                    Authorization: `Bearer ${githubAccessToken}`,
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2026-03-10"
                }
            }
        );

        const data = githubUser.data

        const githubAccountData = {
            githubUserId : data.id,
            githubUsername: data.login,
            githubAvatarUrl: data.avatar_url,
            githubAccessToken : githubAccessToken,
            githubRefreshToken : githubRefreshToken
        }

        const githubAccount = await prisma.githubAccount.upsert({
            where: {
                userId: req.user.userId
            },
            create: {
                userId : req.user.userId,
                ...githubAccountData
            },
            update: githubAccountData
        })

        startGithubRepositorySync(githubAccount)

        res.json({
            "message": "Authorisation completed.",
            "user" : {
                id: githubAccount.id,
                userId: githubAccount.userId,
                githubUserId: githubAccount.githubUserId.toString(),
                githubUsername: githubAccount.githubUsername,
                githubAvatarUrl: githubAccount.githubAvatarUrl
            },
            "repositorySync": "started"
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({
            "error": "GitHub authorisation failed."
        })
    }
}
