import { Router } from "express";
import session from "express-session";
import { loginV2, getAuthOptions, verifyAuthOptions } from "../controllers/auth.v2.controller.js";
import { forgetPasswordController, verifyOtpController, resetPasswordController } from "../controllers/auth.controller.js";
import { auditMiddleware } from "../middleware/audit-middleware.js";
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

router.post("/login",auditMiddleware, loginV2);
router.post("/trusted-device/options", getAuthOptions);
router.post("/trusted-device/verify", verifyAuthOptions);


// Forget password
router.post("/forget-password", forgetPasswordController);
router.post("/forget-password/verify-otp", verifyOtpController);
router.post("/forget-password/reset-password", resetPasswordController);

export default router;
