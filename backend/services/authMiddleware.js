import jwt from 'jsonwebtoken'

export function AuthMiddleWare(req, res, next) {
    const accessToken = req.cookies.accessToken
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
    catch {
        return res.status(401).json({
            error: "Authentication failed"
        });
    }
}
