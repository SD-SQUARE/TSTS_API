import csrf from "csurf";

const CSRF_TOKEN_EXPIRATION_24HR_IN_MS = 24 * 60 * 60 * 1000;

export const csrfMiddleware = csrf({
    cookie: {
    httpOnly: true,
    secure: process.env.PROTOCOL === "https",
    maxAge: CSRF_TOKEN_EXPIRATION_24HR_IN_MS,
    sameSite: "lax",
},
});
