import { getAllDomains,getDomainById,createDomain,updateDomain,deleteDomain } from "../controllers/Domains.controller.js";
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.get("/",asyncHandler( getAllDomains));
router.post("/",asyncHandler( createDomain));
router.get("/:id",asyncHandler( getDomainById));
router.put("/:id",asyncHandler(updateDomain) );
router.delete("/:id",asyncHandler( deleteDomain));
export default router;
