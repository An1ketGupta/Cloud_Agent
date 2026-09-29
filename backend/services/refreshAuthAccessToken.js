import jwt from 'jsonwebtoken'
import { prisma } from '../clients/prismaClient.js';
import createAccessToken from './createAccessToken.js';
import { clearAuthCookies, setAccessCookie } from './authCookies.js';

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
        if (!user) {
            clearAuthCookies(res);
            return res.status(401).json({ error: "Session expired." });
        }
        setAccessCookie(res, createAccessToken(user));
        return res.status(200).json({ message: "Session refreshed." });

    } catch (error) {
        clearAuthCookies(res);
        return res.status(401).json({ error: "Session expired." });
    }
}
