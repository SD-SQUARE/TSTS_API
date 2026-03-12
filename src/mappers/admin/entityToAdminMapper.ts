import { User } from "../../entities/index.js";
import { fetchAllAdminsGroupsAsHeadsService } from "../../services/users/profile/profileQueryService.js";
import { Lang } from "../../types/lang.types.js";
import { getPresignedUrl } from "../../utils/storage.js";
import { GroupDto } from "../groups/toGroupDto.js";

type AdminDto = {
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
  specializations: { id: string; name: string }[];

  contacts: {
    phones: string[];
    mobiles: string[];
  };
  status: string;

  job_ar: string;
  job_en: string;

  groups: GroupDto[];
};

export const toAdmin = async (entity: User, lang: Lang): Promise<AdminDto> => {
  const university = entity.university ? await entity.university : null;
  const domain = entity.domain ? await entity.domain : null;
  const userspecializations = entity.allowedSpecializations
    ? await entity.allowedSpecializations
    : [];

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

    specializations: specializations,

    contacts: {
      phones: entity.contacts?.phone ?? [],
      mobiles: entity.contacts?.mobile ?? [],
    },

    status: entity.status,

    job_ar: entity.job.ar ?? "",
    job_en: entity.job.en ?? "",

    groups: await fetchAllAdminsGroupsAsHeadsService(entity.id, lang),
  };
};
