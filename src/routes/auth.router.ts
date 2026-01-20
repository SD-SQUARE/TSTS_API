import { Router } from "express";
import {
  forgetPasswordController,
  getCsrfToken,
  login,
  logout,
  refreshToken,
  resetPasswordController,
  verifyOtpController,
} from "../controllers/auth.controller.js";

const router = Router();

// Login
router.post("/login", login);

// Logout
router.post("/logout", logout);

// CSRF token
router.get("/csrf-token", getCsrfToken);

// Refresh token
router.get("/refresh-token/:id", refreshToken);

// Forget password
router.post("/forget-password", forgetPasswordController);
router.post("/forget-password/verify-otp", verifyOtpController);
router.post("/forget-password/reset-password", resetPasswordController);

export default router;
