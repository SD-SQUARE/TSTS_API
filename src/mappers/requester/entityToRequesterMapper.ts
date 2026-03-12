import { User } from "../../entities/index.js";
import { getPresignedUrl } from "../../utils/storage.js";

type RequesterDto = {
  id: string;
  image: string | null;
  email: string;
  user_type: string;

  first_name_en: string | null;
  first_name_ar: string | null;

  mid_name_en: string | null;
  mid_name_ar: string | null;

  last_name_en: string | null;
  last_name_ar: string | null;

  full_name_en: string | null;
  full_name_ar: string | null;

  ssn: string | null;
  university: { id: string; name: string } | null;
  domain: { id: string; name: string } | null;
  departments: { id: string; name: string }[];
  specializations: { id: string; name: string }[];
  contacts: {
    phones: string[];
    mobiles: string[];
  };
  status: string;

  job_ar: string;
  job_en: string;
};

export const toRequester = async (
  entity: User,
  lang: "en" | "ar",
): Promise<RequesterDto> => {
  const university = entity.university ? await entity.university : null;
  const domain = entity.domain ? await entity.domain : null;
  const userDepartments = entity.userDepartments
    ? await entity.userDepartments
    : [];
  const userspecializations = entity.allowedSpecializations
    ? await entity.allowedSpecializations
    : [];

  // 2) for each userDepartment, load department (lazy) and map it
  const departments = await Promise.all(
    userDepartments.map(async (ud) => {
      const dept = ud.department ? await ud.department : null;

      if (!dept) {
        return null;
      }

      return {
        id: dept.id,
        name: dept.name?.[lang], // dept.name is { en, ar }
      };
    }),
  );

  const specializations = await Promise.all(
    userspecializations.map(async (us) => {
      const spec = us.specialization ? await us.specialization : null;

      if (!spec) {
        return null;
      }

      return {
        id: spec.id,
        name: spec.name?.[lang],
      };
    }),
  );

  return {
    id: entity.id,
    image:
      entity.image == null
        ? null
        : await getPresignedUrl(process.env.MINIO_BUCKET, entity.image, 3600),
    email: entity.email,
    user_type: entity.user_type,

    first_name_en: entity.firstName.en ?? null,
    first_name_ar: entity.firstName.ar ?? null,

    mid_name_en: entity.midName.en ?? null,
    mid_name_ar: entity.midName.ar ?? null,

    last_name_en: entity.lastName.en ?? null,
    last_name_ar: entity.lastName.ar ?? null,

    full_name_en: entity.fullName?.en ?? null,
    full_name_ar: entity.fullName?.ar ?? null,

    ssn: entity.ssn ?? null,

    university: university
      ? {
          id: university.id,
          name: university.name?.[lang],
        }
      : null,

    domain: domain
      ? {
          id: domain.id,
          name: domain.name?.[lang],
        }
      : null,

    departments: departments.filter(
      (d): d is { id: string; name: string } => d !== null,
    ),

    specializations: specializations,

    contacts: {
      phones: entity.contacts?.phone ?? [],
      mobiles: entity.contacts?.mobile ?? [],
    },

    status: entity.status,

    job_ar: entity.job.ar ?? "",
    job_en: entity.job.en ?? "",
  };
};
