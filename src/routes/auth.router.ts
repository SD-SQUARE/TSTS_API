import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/login", asyncHandler(async(req, res, next) => {
    console.log("login");
    console.log(req);
    console.log(req.language);
    res.send("login");
}));

export default router;
