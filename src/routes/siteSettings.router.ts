import { Router } from "express";
import {
  createAllowedEmailDomainController,
  deleteAllowedEmailDomainController,
  getSiteSettingsController,
  listAllowedEmailDomainsController,
  updateAllowedEmailDomainController,
  updateSiteLogoController,
  updateSiteSettingsController,
} from "../controllers/siteSettings.controller.js";
import { upload } from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router
  .get("/", asyncHandler(getSiteSettingsController))
  .patch("/", asyncHandler(updateSiteSettingsController))
  .patch("/logo", upload.single("logo"), asyncHandler(updateSiteLogoController))
  .get("/email-domains", asyncHandler(listAllowedEmailDomainsController))
  .post("/email-domains", asyncHandler(createAllowedEmailDomainController))
  .put("/email-domains/:id", asyncHandler(updateAllowedEmailDomainController))
  .delete("/email-domains/:id", asyncHandler(deleteAllowedEmailDomainController));

export default router;
