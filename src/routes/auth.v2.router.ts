import { Router } from "express";
import session from "express-session";
import { loginV2, getAuthOptions, verifyAuthOptions } from "../controllers/auth.v2.controller.js";
const router = Router();

router.use(
  session({
    name: "webauthn-session",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // true in production with HTTPS
      maxAge: 5 * 60 * 1000, // 5 minutes
    },
  })
);
// Login
router.post("/login", loginV2);
router.post("/trusted-device/options", getAuthOptions);
router.post("/trusted-device/verify", verifyAuthOptions);


export default router;
