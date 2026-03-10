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
  const { page, limit, name } = req.query;
  const pageNum = page ? parseInt(page as string, 10) : 1;
  const limitNum = limit ? parseInt(limit as string, 10) : 20;
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
    if (!perm.name_en || !perm.name_ar) {
      return res.status(ResponseStatus.BAD_REQUEST).json({
        message: req.t
          ? req.t("permission_name_invalid")
          : "Each permission must have name_en and name_ar",
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

  const newProfile = permissionProfileRepo.create({
    name,
    descriptions: description,
    permissions: permissions.map((perm: any) => ({
      name: {
        en: perm.name_en,
        ar: perm.name_ar,
      },
    })),
  });

  await permissionProfileRepo.save(newProfile);

  for (const perm of newProfile.permissions) {
    perm.key = `perm-${String(perm.id).padStart(3, "0")}`;
  }

await permissionRepository.save(newProfile.permissions);

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
      message: req.t ? req.t("permission_profile_not_found") : "Permission profile not found",
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

  const permissionKeys = permissions.map((p: any) => p?.key);

  const permissionEntities = await permissionRepository.find({
    where: { key: In(permissionKeys) },
  });

  if (permissionEntities.length !== permissionKeys.length) {
     const  newPermission= permissions.map((p: any) => 
     {
      if(Object.hasOwn(p, "key") && p.key) {
        return p.key;
      }else{
        p.key = `perm-${String(p.id).padStart(3, "0")}`;
        
        return `perm-${String(p.id).padStart(3, "0")}`;
      }
    }
    );
  }

  for (const perm of permissionEntities) {
    const inputPerm = permissions.find((p: any) => p.key === perm.key);

    if (inputPerm) {
      perm.name = {
        en: inputPerm.name_en,
        ar: inputPerm.name_ar,
      };
    }
  }

  await permissionRepository.save(permissionEntities);

  profile.name = name as { en: string; ar: string };
  profile.descriptions = description;

  profile.permissions = permissionEntities;

  await permissionProfileRepo.save(profile);

  return res.json({
    is_updated: true,
    message: req.t ? req.t("permission_profile_updated") : "Permission profile updated successfully",
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