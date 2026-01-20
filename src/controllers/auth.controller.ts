import { Request, Response } from "express";
import {
  forgetPassword,
  generateCsrfForUser,
  getRefreshTokenById,
  loginUser,
  logoutUser,
  resetPassword,
  verifyOtp,
} from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";
import { t } from "i18next";

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Call service layer
  const result = await loginUser(email, password);

  // Set cookie
  res.cookie("refresh_token", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  // Return response
  return res.status(200).json({
    access_token: result.accessToken,
    email: result.email,
    permissions: result.permissions,
  });
};

export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;

  if (!refreshToken) {
    throw new AppError(t("not_token"), 400);
  }

  await logoutUser(refreshToken);

  // Clear cookie on client
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json({ message: "Logged out successfully" });
};

export const getCsrfToken = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError(t("not_token"), 401);
  }

  const accessToken = authHeader.split(" ")[1];
  const csrfToken = await generateCsrfForUser(accessToken);

  // Set CSRF token in secure cookie
  res.header("XSRF-TOKEN", csrfToken);

  return res.status(200).send();
};

export const refreshToken = async (req: Request, res: Response) => {
  const userId = req.params.id;
  if (!userId) throw new AppError(t("invalid_input"), 400);

  const refreshToken = await getRefreshTokenById(userId);

  // Set refresh token in HTTP-only cookie
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return res.status(200).json({ token: refreshToken });
};

export const forgetPasswordController = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new AppError(t("email_required"), 400);

  const { oid } = await forgetPassword(email);

  return res.status(200).json({ oid });
};

export const verifyOtpController = async (req: Request, res: Response) => {
  try {
    const { otp, oid } = req.body;

    if (!otp || !oid) throw new AppError(t("invalid_input"), 400);

    const reset_token = await verifyOtp(oid, otp);

    return res.status(200).json({ reset_token });
  } catch (err: any) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const { reset_token, password } = req.body;

    const result = await resetPassword(reset_token, password);

    return res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};
