import { Router } from "express";
import { CustomFormController } from "../controllers/CustomFormController.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../validation/zod-middleware.js";
import {
  createCustomFormSchema,
  createCustomFormShareLinkSchema,
  customFormListSchema,
  duplicateCustomFormSchema,
  updateCustomFormSchema,
} from "../validation/customForm.schema.js";

const router = Router();

router.get("/public/:token", asyncHandler(CustomFormController.getByToken));
router.post(
  "/public/:token/submit",
  asyncHandler(CustomFormController.submitPublic),
);

router.use(authMiddleware);

router.post(
  "/",
  validate(createCustomFormSchema),
  asyncHandler(CustomFormController.create),
);
router.get("/", validate(customFormListSchema), asyncHandler(CustomFormController.list));
router.get("/:id", asyncHandler(CustomFormController.getOne));
router.put(
  "/:id",
  validate(updateCustomFormSchema),
  asyncHandler(CustomFormController.update),
);
router.delete("/:id", asyncHandler(CustomFormController.delete));

router.post("/:id/submit", asyncHandler(CustomFormController.submit));
router.post(
  "/:id/duplicate",
  validate(duplicateCustomFormSchema),
  asyncHandler(CustomFormController.duplicateToTicket),
);
router.post(
  "/:id/share-link",
  validate(createCustomFormShareLinkSchema),
  asyncHandler(CustomFormController.createShareLink),
);
router.get("/:id/responses", asyncHandler(CustomFormController.getResponses));
router.get(
  "/:id/responses/export",
  asyncHandler(CustomFormController.exportResponses),
);

export default router;
