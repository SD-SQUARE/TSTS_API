import { Request, Response } from "express";
import { t } from "i18next";
import { parseGetUsersQuery } from "../interfaces/users/IGetUsersQuery.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import {
  mapCreateAdmin,
  RequestWithFileAndBody,
} from "../mappers/admin/adminMapper.js";
import {
  createAdminService,
  deleteAdminService,
  editAdminService,
} from "../services/users/admin/adminCommandService.js";
import {
  getAdminByIdService,
  getAllAdminsService,
} from "../services/users/admin/adminQueryService.js";
import { uuidValidationSchema } from "../validation/shared/uuidSchema.js";
import { Lang } from "../types/lang.types.js";
import { audit } from "../helpers/auditBuilder.js";

export const createAdmin = async (req: RequestWithFileAndBody, res: Response) => {
  audit(req as unknown as Request)
    .summary("Create admin request received")
    .action("CREATE_ADMIN")
    .metadata({ body: req.body })
    .step("Request received");

  const adminDto = mapCreateAdmin(req);

  const result = await createAdminService(adminDto, req.file, req);

  if (!result.is_added) {
    audit(req as unknown as Request).step("Admin creation failed").metadata({ errors: result.errors || [] });
    result.message = t("user_not_created");
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }

  audit(req as unknown as Request)
    .resource("USER", adminDto.email)
    .step("Admin created successfully")
    .metadata({ email: adminDto.email });

  return res.status(ResponseStatus.CREATED).json({
    result,
  });
};

export const getAdminsPaged = async (req: Request, res: Response) => {
  audit(req)
    .summary("Fetch paged admins request received")
    .action("RETRIEVE_ADMINS")
    .metadata({ query: req.query })
    .step("Request received");

  const query = parseGetUsersQuery(req.query);
  const lang = req.language as Lang;

  const result = await getAllAdminsService(query, lang, req);

  audit(req)
    .step("Admins fetched successfully")
    .metadata({ totalAdmins: result.meta_.total, page_index: result.meta_.page_index, page_size: result.meta_.page_size });

  return res
    .status(ResponseStatus.SUCCESS)
    .json({ users: result.users, meta_data: result.meta_ });
};

export const getAdminById = async (req: Request, res: Response) => {
  audit(req)
    .summary("Fetch admin by ID request received")
    .action("RETRIEVE_ADMIN_BY_ID");

  const id = req.params.id;
  const lang = req.language as Lang;

  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_admin_id") });
  }

  const admin = await getAdminByIdService(id, lang, req);

  if (!admin || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("user_not_found") });
  }

  return res.status(ResponseStatus.SUCCESS).json(admin);
};

export const EditAdmin = async (req: Request, res: Response) => {
  const adminDto = mapCreateAdmin(req);
  const id = req.params.id;

  audit(req)
    .summary("Edit admin request received")
    .action("EDIT_ADMIN")
    .resource("ADMIN", id)
    .metadata({ body: adminDto });

  const isValid = uuidValidationSchema.safeParse(id);
  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_edited: false, message: t("user_not_found"), errors: [] });
  }

  const result = await editAdminService(id, adminDto, req.file, req);

  if (!result.is_edited) {
    audit(req).step("Admin edit failed").metadata({ errors: result.errors || [] });
    result.message = t("user_not_edited");
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }

  audit(req).step("Admin edited successfully").metadata({ editedUserId: id });

  return res.status(ResponseStatus.SUCCESS).json({
    is_edited: result.is_edited,
    message: t("user_edited"),
  });
};

export const deleteAdmin = async (req: Request, res: Response) => {
  const id = req.params.id;

  audit(req)
    .summary("Delete admin request received")
    .action("DELETE_ADMIN")
    .resource("ADMIN", id);

  const isValid = uuidValidationSchema.safeParse(id);
  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_Admin_id") });
  }

  const result = await deleteAdminService(id, req);

  if (!result.is_deleted) {
    audit(req).step("Admin delete failed").metadata({ message: result.message });
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: result.is_deleted, message: result.message });
  }

  audit(req).step("Admin deleted successfully").metadata({ deletedUserId: id });

  return res.status(ResponseStatus.SUCCESS).json({
    is_deleted: result.is_deleted,
    message: t("user_deleted"),
  });
};
