import csrf from "csurf";
import { Request, Response, NextFunction } from "express";
import { hasApiKeyHeader } from "../services/api-keys.service.js";

const CSRF_TOKEN_EXPIRATION_24HR_IN_MS = 24 * 60 * 60 * 1000;

const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.PROTOCOL === "https",
        maxAge: CSRF_TOKEN_EXPIRATION_24HR_IN_MS,
        sameSite: "lax",
    },
});

// Routes that use Bearer token auth and don't need CSRF protection
const CSRF_EXCLUDED_PATHS = [
    "/api/v1/ai-assistant/chat",
    "/api/v1/ai-assistant/create-ticket",
    "/api/v1/ai-assistant/health",
    "/api/v1/desktop/register-device",
];

const isExcludedPath = (requestPath: string) =>
    CSRF_EXCLUDED_PATHS.some((path) => (
        requestPath.startsWith(path) ||
        requestPath.startsWith(path.replace(/^\/api/, ""))
    ));

const hasBearerToken = (req: Request) =>
    typeof req.headers.authorization === "string" &&
    req.headers.authorization.toLowerCase().startsWith("bearer ");

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (isExcludedPath(req.path) || hasBearerToken(req) || hasApiKeyHeader(req)) {
        return next();
    }

    return csrfProtection(req, res, next);
};
