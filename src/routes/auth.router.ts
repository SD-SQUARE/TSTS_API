import { Router } from "express";
import {
  getCsrfToken,
  login,
  logout,
  refreshToken,
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


export default router;
