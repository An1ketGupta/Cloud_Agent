import { prisma } from "../clients/prismaClient.js"
import z from "zod"
import bcrypt from 'bcrypt'
import 'dotenv/config'
import createAccessToken from "../services/createAccessToken.js"
import createRefreshToken from "../services/createRefreshToken.js"
import { startGithubRepositorySync } from "../services/githubRepositorySync.js"

const signUpSchema = z.object({
    email : z.email(),
    password : z.string().min(8),
    first_name : z.string().min(1),
    last_name : z.string().min(1)
})

export async function signup(req,res){
    const data = signUpSchema.safeParse(req.body)

    if(!data.success){
        res.status(400).json({
            "message" : "Invalid Input",
            "errors" : data.error.issues
        })
    }
    console.log(data.data)
    const { email , password , first_name, last_name} = data.data
    
    try {
        const hashedPassword = await bcrypt.hash(password, 5);
        const response = await prisma.user.create({
            data:{
                first_name: first_name,
                last_name : last_name,
                email : email,
                password : hashedPassword
            }
        })
        console.log(response)

        res.status(201).json({
            "message" : "User created successfully."
        })
    } catch (error) {
        res.json({
            "error" : error
        })
    }
}

const loginSchema = z.object({
    email : z.email(),
    password : z.string().min(8)
})

export async function signin(req,res){
    console.log("Hi")
    const data = loginSchema.safeParse(req.body);

    if(!data.success){
        res.json({
            'message' : "Invalid Input",
            "errors" : data.error.issues
        })
    }

    const { email , password } = data.data
    try {
        const user = await prisma.user.findUnique({
            where: {
                email : email
            },
            include: {
                githubAccount: {
                    select: {
                        id: true,
                        githubAccessToken: true
                    }
                }
            }
        })

        if(!user){
            return res.json({
                'error' : "User not found for this email."
            })
        }

        const passwordCheck =await  bcrypt.compare(password, user.password)
        if(passwordCheck != true){
            return res.status(401).json({
                "error" : "Wrong Password."
            })
        }
        
        const accessToken = createAccessToken(user);
        const refreshToken = createRefreshToken(user);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.cookie("accessToken", accessToken, {
            httpOnly : true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 10 * 60 * 1000
        })

        res.status(200).json({
            message: "Login successful",
        });

        if (user.githubAccount) {
            startGithubRepositorySync(user.githubAccount)
        }

        return;

    } catch (error) {
        console.log(error)
        res.json({
            "error" : error
        })
    }
}
