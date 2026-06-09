import { Router } from "express";
import {
  getCsrfToken,
  login,
  logout,
  refreshToken,
} from "../controllers/auth.controller.js";

const router = Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate a user with email and password, returns JWT tokens
 *     tags: [Authentication]
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
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass123!"
 *           example:
 *             email: "user@example.com"
 *             password: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken:
 *                   type: string
 *                   example: "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     userType:
 *                       type: string
 *                       enum: [Requester, Admin, Technician, SuperAdmin]
 *                       example: "Admin"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             example:
 *               message: "Invalid email or password"
 *               statusCode: 401
 */
router.post("/login", login);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Invalidate the current user session and refresh token
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             example:
 *               message: "Logged out successfully"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.post("/logout", logout);

/**
 * @openapi
 * /api/v1/auth/csrf-token:
 *   get:
 *     summary: Get CSRF token
 *     description: Retrieve a CSRF token for form submissions
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: CSRF token retrieved
 *         content:
 *           application/json:
 *             example:
 *               csrfToken: "abc123csrf456token"
 */
router.get("/csrf-token", getCsrfToken);

/**
 * @openapi
 * /api/v1/auth/refresh-token/{id}:
 *   get:
 *     summary: Refresh access token
 *     description: Obtain a new access token using a refresh token
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             example:
 *               accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               refreshToken: "bmV3IHJlZnJlc2ggdG9rZW4..."
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/refresh-token/:id", refreshToken);

export default router;
