const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
};

export function setAuthCookies(res, accessToken, refreshToken) {
    res.cookie("accessToken", accessToken, {
        ...baseOptions,
        maxAge: 60 * 60 * 1000
    });
    res.cookie("refreshToken", refreshToken, {
        ...baseOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

export function setAccessCookie(res, accessToken) {
    res.cookie("accessToken", accessToken, {
        ...baseOptions,
        maxAge: 60 * 60 * 1000
    });
}

export function clearAuthCookies(res) {
    res.clearCookie("accessToken", baseOptions);
    res.clearCookie("refreshToken", baseOptions);
}
