import { Router } from "express";
import { loginV2, getAuthOptions, verifyAuthOptions } from "../controllers/auth.v2.controller.js";
import { forgetPasswordController, verifyOtpController, resetPasswordController, logout } from "../controllers/auth.controller.js";
import { auditMiddleware } from "../middleware/audit-middleware.js";
import { webAuthnSessionMiddleware } from "../config/session.js";
const router = Router();

router.use(webAuthnSessionMiddleware);
// Login

router.post("/login",auditMiddleware, loginV2);
router.post("/trusted-device/options", getAuthOptions);
router.post("/trusted-device/verify", verifyAuthOptions);

// Logout
router.post("/logout", logout);

// Forget password
router.post("/forget-password", forgetPasswordController);
router.post("/forget-password/verify-otp", verifyOtpController);
router.post("/forget-password/reset-password", resetPasswordController);

export default router;
