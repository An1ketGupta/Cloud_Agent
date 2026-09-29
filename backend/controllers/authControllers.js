import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../clients/prismaClient.js";
import createAccessToken from "../services/createAccessToken.js";
import createRefreshToken from "../services/createRefreshToken.js";
import { clearAuthCookies, setAuthCookies } from "../services/authCookies.js";
import { startGithubRepositorySync } from "../services/githubRepositorySync.js";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

const signUpSchema = z.object({
    email: emailSchema,
    password: z.string().min(8),
    first_name: z.string().trim().min(1),
    last_name: z.string().trim().min(1)
});

const signInSchema = z.object({
    email: emailSchema,
    password: z.string().min(1)
});

export async function signup(req, res) {
    const parsed = signUpSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Enter a valid name, email, and password of at least 8 characters." });
    }

    const { email, password, first_name, last_name } = parsed.data;

    try {
        const existing = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            select: { userId: true }
        });
        if (existing) {
            return res.status(409).json({ error: "An account with this email already exists." });
        }

        await prisma.user.create({
            data: {
                email,
                password: await bcrypt.hash(password, 12),
                first_name,
                last_name
            }
        });

        return res.status(201).json({ message: "Account created. Please sign in." });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ error: "An account with this email already exists." });
        }
        console.error("Signup failed:", error);
        return res.status(500).json({ error: "Could not create your account." });
    }
}

export async function signin(req, res) {
    const parsed = signInSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Enter a valid email and password." });
    }

    const { email, password } = parsed.data;

    try {
        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            include: {
                githubAccount: {
                    select: { id: true, githubAccessToken: true }
                }
            }
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        setAuthCookies(res, createAccessToken(user), createRefreshToken(user));

        if (user.githubAccount) {
            startGithubRepositorySync(user.githubAccount);
        }

        return res.status(200).json({ message: "Signed in." });
    } catch (error) {
        console.error("Signin failed:", error);
        return res.status(500).json({ error: "Could not sign in." });
    }
}

export function signout(_req, res) {
    clearAuthCookies(res);
    return res.status(200).json({ message: "Signed out." });
}
