import { Request, Response } from "express";
import { createGroup } from "../services/groups.service.js";
import { AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";
import { createGroupSchema } from "../validation/group.schema.js";

export const addGroup = async (req: Request, res: Response) => {
  const t = req.t;

  logger.info("[server][groups][controller] Add group request received");

  const validated = createGroupSchema(t).safeParse(req.body);
  if (!validated.success) {
    logger.info(
      "[server][groups][controller] Validation failed: " +
        validated.error.issues.map((e) => e.message).join(", ")
    );
    throw new AppError(validated.error.issues[0].message, 400);
  }

  const result = await createGroup(validated.data, t);

  logger.info(
    `[server][groups][controller] Group created successfully id=${result.id}`
  );

  return res.status(200).json({
    is_added: true,
    message: t("group_added_successfully"),
    errors: [],
  });
};
