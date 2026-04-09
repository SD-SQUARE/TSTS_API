import { Router } from "express";
import {
  listTrustedDevices,
  getRegisterOptions,
  verifyAndCreateDevice,
  removeTrustedDevice,
  adminListTrustedDevices,
  deleteTrustedDevice,
} from "../controllers/trustedDevices.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { webAuthnSessionMiddleware } from "../config/session.js";

const router = Router();

router.use(webAuthnSessionMiddleware);
router.use(authMiddleware);

router.get("/", asyncHandler(listTrustedDevices));
router.post("/options",asyncHandler( getRegisterOptions));
router.post("/verify",asyncHandler( verifyAndCreateDevice));
router.delete("/:id",asyncHandler( removeTrustedDevice));

router.get("/admin-view", adminListTrustedDevices);
router.delete("/admin-view/:id", deleteTrustedDevice);

export default router;
