import jwt from 'jsonwebtoken'
import { prisma } from '../clients/prismaClient.js';
import createAccessToken from './createAccessToken.js';

export async function refreshAuthAccessToken(req,res){
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken){
        return res.status(401).json({
            message: "Invalid or expired refresh token"
        });
    }
    
    try {
        const verified = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
        const { userId } = verified
        
        const user = await prisma.user.findUnique({
            where : {
                userId : userId
            }
        })
        const accessToken = createAccessToken(user)
        req.user = verified
        
        res.cookie("accessToken", accessToken, {
            httpOnly : true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 10 * 60 * 1000
        })
        
        req.user = verified

        res.status(201).json({
            message : "Successfully refreshed access-token"
        })

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired refresh token"
        });
    }
}