import { User } from "../../entities/index.js";
import { getPresignedUrl } from "../../utils/storage.js";

type RequesterDto = {
  id: string;
  image: string | null;
  email: string;
  user_type: string;
  first_name: string | null;
  mid_name: string | null;
  last_name: string | null;
  ssn: string | null;
  university: { id: string; name: string } | null;
  domain: { id: string; name: string } | null;
  departments: { id: string; name: string }[];
  contacts: {
    phones: string[];
    mobiles: string[];
  };
  status: string;
  job: string;
};

export const toRequester = async (
  entity: User,
  lang: "en" | "ar"
): Promise<RequesterDto> => {
  const university = entity.university ? await entity.university : null;
  const domain = entity.domain ? await entity.domain : null;
  const userDepartments = entity.userDepartments
    ? await entity.userDepartments
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
    })
  );

  return {
    id: entity.id,
    image:
      entity.image == null
        ? null
        : await getPresignedUrl(process.env.MINIO_BUCKET, entity.image, 3600),
    email: entity.email,
    user_type: entity.user_type,

    first_name: entity.firstName?.[lang] ?? null,
    mid_name: entity.midName?.[lang] ?? null,
    last_name: entity.lastName?.[lang] ?? null,

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
      (d): d is { id: string; name: string } => d !== null
    ),

    contacts: {
      phones: entity.contacts?.phone ?? [],
      mobiles: entity.contacts?.mobile ?? [],
    },

    status: entity.status,
    job: entity.job?.[lang] ?? "",
  };
};
