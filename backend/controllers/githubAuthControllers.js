import axios from "axios";
import crypto from "crypto"
import { prisma } from "../clients/prismaClient.js";
import { startGithubRepositorySync } from "../services/githubRepositorySync.js";

export async function AuthorizeGithub(req, res) {
    const random_state = crypto.randomBytes(32).toString("hex");

    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
        state: random_state,
        scope: "repo"
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
    const { code, state } = req.query

    if (!code || !state || state !== req.cookies.githubOAuthState) {
        return res.status(400).json({
            error: "GitHub authorisation could not be verified."
        })
    }
    res.clearCookie("githubOAuthState");

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
        const githubRefreshToken = tokenData.refresh_token || ""
        if (!githubAccessToken) throw new Error("GitHub did not return an access token.");

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

        res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/?github=connected`)

    } catch (error) {
        console.error(error)
        res.status(500).json({
            "error": "GitHub authorisation failed."
        })
    }
}

export async function syncGithub(req, res) {
    const account = await prisma.githubAccount.findUnique({ where: { userId: req.user.userId } });
    if (!account) return res.status(404).json({ error: "Connect GitHub first." });
    startGithubRepositorySync(account);
    res.json({ message: "Repository sync started." });
}
