import { Request } from "express";

import { parseArray } from "../../utils/jsonArrayParser.js";
import {
  CreateAdminBody,
  CreateAdminMapped,
} from "../../interfaces/admin/ICreateAdmin.js";

// If you use multer, extend Request to include `file`
export type RequestWithFileAndBody = Request<
  unknown,
  unknown,
  CreateAdminBody
> & {
  file?: Express.Multer.File;
};

function parseIfJson<T>(value: unknown): T | undefined {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return value as T;
}

export function mapCreateAdmin(req: RequestWithFileAndBody): CreateAdminMapped {
  let {
    email,
    password,
    user_type,
    first_name_en,
    mid_name_en,
    last_name_en,
    first_name_ar,
    mid_name_ar,
    last_name_ar,
    ssn,
    university,
    domain,
    departments,
    contacts,
    allowed_specializations,
    permission_profile,
    extra_permissions,
    revoked_permissions,
    job_en,
    job_ar,
  } = req.body;

  departments =
    (Array.isArray(departments)
      ? departments
      : parseIfJson<string[]>(departments) ||
        (typeof departments === "string" ? [departments] : [])) ?? [];

  contacts = (typeof contacts === "object"
    ? contacts
    : parseIfJson<{ phones: string[]; mobiles: string[] }>(contacts)) ?? {
    phones: [],
    mobiles: [],
  };

  return {
    image: req.file,

    email,
    password,
    userType: user_type,

    firstNameEn: first_name_en,
    midNameEn: mid_name_en,
    lastNameEn: last_name_en,

    firstNameAr: first_name_ar,
    midNameAr: mid_name_ar,
    lastNameAr: last_name_ar,

    ssn,

    university,
    domain,

    departments: parseArray(departments),

    phones: parseArray(contacts?.phones),
    mobiles: parseArray(contacts?.mobiles),

    allowedSpecializations: parseArray(allowed_specializations),
    extraPermissions: parseArray(extra_permissions),
    revokedPermissions: parseArray(revoked_permissions),

    permissionProfile: permission_profile,

    jobEn: job_en,
    jobAr: job_ar,
  };
}
