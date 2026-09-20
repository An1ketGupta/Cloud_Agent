import jwt from 'jsonwebtoken'

export default function createAccessToken(user){
    return jwt.sign({
        userId : user.userId,
        email : user.email,
    }, process.env.JWT_ACCESS_SECRET, {
        expiresIn : "1h"
    })
}