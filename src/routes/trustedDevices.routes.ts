import { Router } from "express";
import {
  listTrustedDevices,
  getRegisterOptions,
  verifyAndCreateDevice,
  removeTrustedDevice,
} from "../controllers/trustedDevices.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import session from "express-session";

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
router.use(authMiddleware);

router.get("/", asyncHandler(listTrustedDevices));
router.post("/options",asyncHandler( getRegisterOptions));
router.post("/verify",asyncHandler( verifyAndCreateDevice));
router.delete("/:id",asyncHandler( removeTrustedDevice));

export default router;
