import jwt from 'jsonwebtoken'

export async function AuthMiddleWare(req, res, next) {
    const accessToken = await req.cookies.accessToken
    if (!accessToken) {
        return res.status(401).json({
            error: "Platform atuhentication failed"
        });
    }

    try {
        const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET)
        req.user = decoded;
        return next();
    }
    catch (error) {
        console.log("Hi there")
        return res.status(401).json({
            error: "Authentication failed"
        });
    }
}