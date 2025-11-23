import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

import { upload } from "../middleware/upload.js";
import { createRequesterSchema } from "../validation/requester/createRequester.schema.js";
import { validate } from "../validation/zod-middleware.js";
import {
  createRequester,
  deleteRequester,
  EditRequester,
  getRequesterById,
  getRequestersPaged,
} from "../controllers/requesters.controller.js";
import { validateEmailAndSsnMiddleware } from "../middleware/users/conflictForAdd.js";
import { validateEmailEditSsnMiddleware } from "../middleware/users/conflictForEdit.js";

const router = Router();

// requesters
router
  .get("/requesters", asyncHandler(getRequestersPaged))
  .get("/requesters/:id", asyncHandler(getRequesterById));

router.post(
  "/requester",
  upload.single("image"),
  validate(createRequesterSchema),
  validateEmailAndSsnMiddleware,
  asyncHandler(createRequester)
);

router.put(
  "/requester/:id",
  upload.single("image"),
  validate(createRequesterSchema),
  validateEmailEditSsnMiddleware,
  asyncHandler(EditRequester)
);
router.delete("/requester/:id", asyncHandler(deleteRequester));

export default router;
