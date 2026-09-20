import jwt from 'jsonwebtoken'

export default function createRefreshToken(user){
    return jwt.sign({
        userId : user.userId,
        email : user.email,
    }, process.env.JWT_REFRESH_SECRET, {
        expiresIn : "15d"
    })
}
