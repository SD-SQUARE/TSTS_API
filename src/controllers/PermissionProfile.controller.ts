import { PermissionProfileRepo } from "../repositories/PermissionProfileRepo.js";
import { PermissionProfile } from "../entities/PermissionProfile.js";
import logger from "../utils/logger.js";
import { Request, Response } from "express";
import { buildName, buildDescription } from "../utils/handleNamaAndDesc.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { PermissionProfileDto } from "../interfaces/response/PermissionProfileResponse.js";
import { PermissionRepo } from "../repositories/PermissionRepo.js";
import { In } from "typeorm";
import { en } from "zod/locales";
import { UsersPermissionsRepo } from "../repositories/UsersPermissionsRepo.js";



const permissionProfileRepo = new PermissionProfileRepo().getRepository();
const permissionRepository = new PermissionRepo().getRepository();


export async function getPermissionProfiles(req: Request, res: Response) {
  const { page, page_size, name } = req.query;
  const pageNum = page ? parseInt(page as string, 10) : 1;
  const limitNum = page_size ? parseInt(page_size as string, 10) : 20;
  const result = await PermissionProfile.paginate(
    pageNum,
    limitNum,
    name as string | undefined,
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
  const { name_en, name_ar, description_ar, description_en, permissionIds } = req.body;
  const name = buildName({ en: name_en, ar: name_ar });
  const description = buildDescription({ en: description_en, ar: description_ar });
  if (!name) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: req.t
        ? req.t("name_invalid")
        : "Name in both languages is required",
    });
  }
  if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: req.t
        ? req.t("permissionIds_required")
        : "PermissionIds is required",
    });
  }
  const isValidIds = permissionIds.every(
    (id: any) => typeof id === "number" && id > 0
  );

  if (!isValidIds) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: req.t
        ? req.t("permissionIds_invalid")
        : "Each permission must have a valid ID",
    });
  }
  const existing = await permissionProfileRepo
    .createQueryBuilder("p")
    .where("LOWER(p.name->>'en') = LOWER(:name_en)", { name_en })
    .orWhere("LOWER(p.name->>'ar') = LOWER(:name_ar)", { name_ar })
    .getOne();
  if (existing) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: req.t
        ? req.t("permission_profile_exists")
        : "Permission profile already exists",
    });
  }
  const permissions = await permissionRepository.find({
    where: { id: In(permissionIds) },
  });
  if (permissions.length !== permissionIds.length) {
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message: req.t
        ? req.t("permissions_invalid")
        : "Invalid permissions provided",
    });
  }
  const newProfile = permissionProfileRepo.create({
    name,
    descriptions: description,
    permissions,
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

  const permissionEntities: any[] = [];

  for (const p of permissions) {
    let permission;

    if (p.key) {
      permission = await permissionRepository.findOne({
        where: { key: p.key },
      });
    }
    if (!permission) {
      permission = await permissionRepository
        .createQueryBuilder("permission")
        .where("permission.name->>'en' = :en", { en: p.name_en })
        .andWhere("permission.name->>'ar' = :ar", { ar: p.name_ar })
        .getOne();
    }

    if (permission) {
      if (!permission.key) {
        permission.key = `perm-${String(permission.id).padStart(3, "0")}`;
      }

      permission.name = {
        en: p.name_en,
        ar: p.name_ar,
      };

      permission = await permissionRepository.save(permission);
    } else {
      permission = permissionRepository.create({
        name: {
          en: p.name_en,
          ar: p.name_ar,
        },
      });
      permission = await permissionRepository.save(permission);
      permission.key = `perm-${String(permission.id).padStart(3, "0")}`;
      permission = await permissionRepository.save(permission);
    }

    permissionEntities.push(permission);
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