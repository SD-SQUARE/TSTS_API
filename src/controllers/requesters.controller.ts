import { Response } from "express";
import {
  mapCreateRequester,
  RequestWithFileAndBody,
} from "../mappers/requester/requesterMapper.js";
import { t } from "i18next";
import {
  createRequesterService,
  deleteRequesterService,
  editRequesterService,
} from "../services/users/requester/requesterCommandService.js";
import { parseGetUsersQuery } from "../interfaces/users/IGetUsersQuery.js";
import {
  getAllRequestersService,
  getRequesterByIdService,
} from "../services/users/requester/requesterQueryService.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { uuidValidationSchema } from "../validation/shared/uuidSchema.js";

export const createRequester = async (
  req: RequestWithFileAndBody,
  res: Response
) => {
  const requesterDto = mapCreateRequester(req);

  const result = await createRequesterService(requesterDto, req.file);
  if (!result.is_added) {
    result.message = t("user_not_created");
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }
  return res.status(ResponseStatus.CREATED).json({
    result,
  });
};

export const getRequestersPaged = async (req, res) => {
  const query = parseGetUsersQuery(req.query);
  const lang = req.language;

  const result = await getAllRequestersService(query, lang);
  return res
    .status(ResponseStatus.SUCCESS)
    .json({ users: result.users, meta_data: result.meta_ });
};

export const getRequesterById = async (req, res) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";
  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_requester_id") });
  }

  const requester = await getRequesterByIdService(id, lang);

  if (!requester || !isValid.success) {
    return res.status(404).json({ message: "Requester not found" });
  }

  return res.status(200).json(requester);
};

export const EditRequester = async (req, res: Response) => {
  const requesterDto = mapCreateRequester(req);
  const id = req.params.id;
  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_edited: false, message: t("user_not_found"), errors: [] });
  }

  const result = await editRequesterService(id, requesterDto, req.file);
  if (!result.is_edited) {
    result.message = t("user_not_edited");
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }
  return res.status(ResponseStatus.SUCCESS).json({
    is_edited: result.is_edited,
    message: t("user_edited"),
  });
};

export const deleteRequester = async (req, res: Response) => {
  const id = req.params.id;
  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_requester_id") });
  }

  const result = await deleteRequesterService(id);
  if (!result.is_deleted) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: result.is_deleted, message: result.message });
  }

  return res.status(ResponseStatus.SUCCESS).json({
    is_deleted: result.is_deleted,
    message: t("user_deleted"),
  });
};
