import { PermissionProfileRepo } from "../repositories/PermissionProfileRepo.js";
import { PermissionProfile } from "../entities/PermissionProfile.js";
import logger from "../utils/logger.js";
import { Request, Response } from "express";
import { buildName, buildDescription } from "../utils/handleNamaAndDesc.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { PermissionProfileDto } from "../interfaces/response/PermissionProfileResponse.js";
import { PermissionRepo } from "../repositories/PermissionRepo.js";
import { In } from "typeorm";
import { UsersPermissionsRepo } from "../repositories/UsersPermissionsRepo.js";



const permissionProfileRepo = new PermissionProfileRepo().getRepository();
const permissionRepository = new PermissionRepo().getRepository();

const resolvePermissionEntities = async (permissions: any[]) => {
  const keys = permissions
    .map((permission) => permission?.key)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  const ids = permissions
    .map((permission) => permission?.id)
    .filter((value): value is number => Number.isFinite(Number(value)))
    .map((value) => Number(value));

  const existingPermissions = await permissionRepository.find({
    where: [
      ...(keys.length ? [{ key: In(keys) }] : []),
      ...(ids.length ? [{ id: In(ids) }] : []),
    ],
  });

  const byKey = new Map(existingPermissions.map((permission) => [permission.key, permission]));
  const byId = new Map(existingPermissions.map((permission) => [permission.id, permission]));

  const resolved = [];

  for (const incoming of permissions) {
    let permission =
      (incoming?.key ? byKey.get(incoming.key) : undefined) ??
      (incoming?.id ? byId.get(Number(incoming.id)) : undefined);

    if (!permission && incoming?.name_en && incoming?.name_ar) {
      permission = await permissionRepository
        .createQueryBuilder("permission")
        .where("permission.name->>'en' = :en", { en: incoming.name_en })
        .andWhere("permission.name->>'ar' = :ar", { ar: incoming.name_ar })
        .getOne();
    }

    if (!permission) {
      throw new Error("PERMISSION_NOT_FOUND");
    }

    resolved.push(permission);
  }

  return resolved;
};


export async function getPermissionProfiles(req: Request, res: Response) {
  const {
    page,
    page_size,
    name,
    name_en,
    name_ar,
    description_en,
    description_ar,
    permission_name,
  } = req.query;
  const pageNum = page ? parseInt(page as string, 10) : 1;
  const limitNum = page_size ? parseInt(page_size as string, 10) : 20;
  const filters = {
    search: name as string | undefined,
    name_en: name_en as string | undefined,
    name_ar: name_ar as string | undefined,
    description_en: description_en as string | undefined,
    description_ar: description_ar as string | undefined,
    permission_name: permission_name as string | undefined,
  };
  const result = await PermissionProfile.paginate(
    pageNum,
    limitNum,
    filters,
    permissionProfileRepo,
  );
  logger.info(`Listed permission profiles - Page: ${pageNum}, Limit: ${limitNum}`);
  return res.json(result);
}

export async function getPermissionProfileById(req: Request, res: Response) {
  const { id } = req.params;
  const profile = await permissionProfileRepo.findOne({
    where: { id },
    relations: ["permissions"]
  }
  );
  if (!profile) {
    return res.status(ResponseStatus.NOT_FOUND).json({
      message: req.t ? req.t("permission_profile_not_found") : "Permission profile not found",
    });
  }
  const result: PermissionProfileDto = {
    id: profile.id,
    name_en: profile.name.en,
    name_ar: profile.name.ar,
    description_en: profile.descriptions?.en,
    description_ar: profile.descriptions?.ar,
    permissions: profile.permissions.map((perm) => ({
      key: perm.key,
      name_en: perm.name.en,
      name_ar: perm.name.ar,
    })),
  };
  logger.info(`Fetched permission profile with ID: ${profile.id}`);
  return res.json(result);
}

export async function addPermissionProfile(req: Request, res: Response) {
  const { name_en, name_ar, description_ar, description_en, permissions } = req.body;
  const name = buildName({ en: name_en, ar: name_ar });
  const description = buildDescription({ en: description_en, ar: description_ar });
  if (!name) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: req.t ? req.t("name_invalid") : "Name in both languages is required",
    });
  }
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: req.t
        ? req.t("permissions_required")
        : "Permissions array is required",
    });
  }
  for (const perm of permissions) {
    if (!perm.key && !perm.id && (!perm.name_en || !perm.name_ar)) {
      return res.status(ResponseStatus.BAD_REQUEST).json({
        message: req.t
          ? req.t("permission_name_invalid")
          : "Each permission must reference an existing permission",
      });
    }
  }

  const permissionProfileExists = await permissionProfileRepo
    .createQueryBuilder("p")
    .where("p.name->>'en' = :name_en", { name_en })
    .orWhere("p.name->>'ar' = :name_ar", { name_ar })
    .getOne();

  if (permissionProfileExists) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: req.t
        ? req.t("permission_profile_exists")
        : "Permission profile already exists",
    });
  }

  let permissionEntities;

  try {
    permissionEntities = await resolvePermissionEntities(permissions);
  } catch {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: req.t ? req.t("permissions_invalid") : "Invalid permissions provided",
    });
  }

  const newProfile = permissionProfileRepo.create({
    name,
    descriptions: description,
    permissions: permissionEntities,
  });

  await permissionProfileRepo.save(newProfile);

  logger.info(`Created permission profile with ID: ${newProfile.id}`);

  return res.status(ResponseStatus.CREATED).json({
    is_added: true,
    message: req.t
      ? req.t("permission_profile_created")
      : "Permission profile created successfully",
  });
}

export async function deletePermissionProfile(req: Request, res: Response) {
  const { id } = req.params;
  const profile = await permissionProfileRepo.findOne({ where: { id } });
  if (!profile) {
    return res.status(ResponseStatus.NOT_FOUND).json({
      message: req.t ? req.t("permission_profile_not_found") : "Permission profile not found",
    });
  }
  await permissionProfileRepo.remove(profile);
  logger.info(`Deleted permission profile with ID: ${profile.id}`);
  return res.json({
    is_deleted: true,
    message: req.t
      ? req.t("permission_profile_deleted")
      : "Permission profile deleted successfully",
  });
}

export async function editPermissionProfile(req: Request, res: Response) {
  const { id } = req.params;
  const { name_en, name_ar, description_en, description_ar, permissions } = req.body;

  const profile = await permissionProfileRepo.findOne({
    where: { id },
    relations: ["permissions"],
  });

  if (!profile) {
    return res.status(ResponseStatus.NOT_FOUND).json({
      message: req.t
        ? req.t("permission_profile_not_found")
        : "Permission profile not found",
    });
  }

  const name = buildName({ en: name_en, ar: name_ar });
  const description = buildDescription({ en: description_en, ar: description_ar });

  if (!Array.isArray(permissions)) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: req.t
        ? req.t("permissions_required")
        : "Permissions array is required",
    });
  }

  let permissionEntities: any[] = [];

  try {
    permissionEntities = await resolvePermissionEntities(permissions);
  } catch {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: req.t ? req.t("permissions_invalid") : "Invalid permissions provided",
    });
  }

  profile.name = name as { en: string; ar: string };
  profile.descriptions = description;
  profile.permissions = permissionEntities;

  await permissionProfileRepo.save(profile);

  return res.json({
    is_updated: true,
    message: req.t
      ? req.t("permission_profile_updated")
      : "Permission profile updated successfully",
  });
}
export const getPermissionsOfUser = async (req, res) => {
  const { id } = req.params;
  const name = req.query.name as string | undefined;
  if (!id) {
    logger.info(
      "[server][PermissionProfile][getPermissionsOfUser] Validation failed: user id is required",
    );
    return res.status(ResponseStatus.BAD_REQUEST).json({ message: req.t("user_not_found") });
  }
  const skip = parseInt(req.query.skip as string) || 0;
  const take = parseInt(req.query.take as string) || 10;
  const usersPermissionsRepo = new UsersPermissionsRepo();
  const profiles = await usersPermissionsRepo.getPermissionsOfUser(id, skip, take, name);
  logger.info(
    `[server][PermissionProfile][getPermissionsOfUser] Fetched permissions for user ID: ${id} - Skip: ${skip}, Take: ${take}`,
  );
  return res.status(ResponseStatus.SUCCESS).json( profiles );

};
