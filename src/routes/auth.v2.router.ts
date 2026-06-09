import { Router } from "express";
import { loginV2, getAuthOptions, verifyAuthOptions, loginWithMicrosoft } from "../controllers/auth.v2.controller.js";
import { forgetPasswordController, verifyOtpController, resetPasswordController, logout } from "../controllers/auth.controller.js";
import { auditMiddleware } from "../middleware/audit-middleware.js";
import { webAuthnSessionMiddleware } from "../config/session.js";
const router = Router();

router.use(webAuthnSessionMiddleware);

/**
 * @openapi
 * /api/v2/auth/login:
 *   post:
 *     summary: User login (v2)
 *     description: Authenticate with email and password. Supports trusted device / WebAuthn flow.
 *     tags: [Authentication v2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@tsts.local"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "AdminPass123!"
 *           example:
 *             email: "admin@tsts.local"
 *             password: "AdminPass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             example:
 *               accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               user:
 *                 id: 1
 *                 email: "admin@tsts.local"
 *                 userType: "Admin"
 *       401:
 *         description: Invalid credentials
 */
router.post("/login",auditMiddleware, loginV2);

/**
 * @openapi
 * /api/v2/auth/microsoft:
 *   post:
 *     summary: Microsoft OAuth login
 *     description: Authenticate using Microsoft identity provider
 *     tags: [Authentication v2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 description: OAuth authorization code from Microsoft
 *                 example: "0.ABC123..."
 *           example:
 *             code: "0.ABC123..."
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             example:
 *               accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid Microsoft token
 */
router.post("/microsoft", auditMiddleware, loginWithMicrosoft);

/**
 * @openapi
 * /api/v2/auth/trusted-device/options:
 *   post:
 *     summary: Get trusted device auth options
 *     description: Retrieve WebAuthn authentication options for a trusted device
 *     tags: [Authentication v2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Auth options retrieved
 *       404:
 *         description: User not found
 */
router.post("/trusted-device/options", getAuthOptions);

/**
 * @openapi
 * /api/v2/auth/trusted-device/verify:
 *   post:
 *     summary: Verify trusted device
 *     description: Complete WebAuthn authentication with device response
 *     tags: [Authentication v2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential, email]
 *             properties:
 *               credential:
 *                 type: object
 *                 description: WebAuthn credential response
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Verification failed
 */
router.post("/trusted-device/verify", verifyAuthOptions);

/**
 * @openapi
 * /api/v2/auth/logout:
 *   post:
 *     summary: Logout (v2)
 *     description: Invalidate current session
 *     tags: [Authentication v2]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/logout", logout);

/**
 * @openapi
 * /api/v2/auth/forget-password:
 *   post:
 *     summary: Request password reset
 *     description: Send a password reset OTP to the user email
 *     tags: [Authentication v2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       404:
 *         description: Email not found
 */
router.post("/forget-password", forgetPasswordController);

/**
 * @openapi
 * /api/v2/auth/forget-password/verify-otp:
 *   post:
 *     summary: Verify password reset OTP
 *     description: Validate the OTP sent to the user email
 *     tags: [Authentication v2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified
 *       400:
 *         description: Invalid OTP
 */
router.post("/forget-password/verify-otp", verifyOtpController);

/**
 * @openapi
 * /api/v2/auth/forget-password/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Set a new password after OTP verification
 *     tags: [Authentication v2]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid OTP or weak password
 */
router.post("/forget-password/reset-password", resetPasswordController);

export default router;
