import { Request } from "express";
import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { User } from "../../../entities/index.js";
import { audit } from "../../../helpers/auditBuilder.js";
import { GetUsersQuery } from "../../../interfaces/users/IGetUsersQuery.js";
import { toAdmin } from "../../../mappers/admin/entityToAdminMapper.js";
import { userRepository } from "../../../repositories/UserRepository.js";
import { Lang } from "../../../types/lang.types.js";

export const getAllAdminsService = async (
  query: GetUsersQuery,
  lang: Lang,
  req?: Request,
) => {
  audit(req)
    .metadata({ query })
    .step("Service initiated");

  const [users, total] = await userRepository.getAllAdminsWithFilter(
    query,
    lang,
  );

  audit(req).step("Admins retrieved from repository").metadata({ fetchedCount: users.length });

  const admins = await Promise.all(
    users.filter((u) => u !== null).map((u) => toAdmin(u, lang))
  );

  const pageIndex = Number(query.page_index ?? 1);
  const pageSize = Number(query.page_size ?? 10);

  audit(req).step("Admins mapped to DTOs").metadata({ mappedCount: admins.length });

  return {
    users: admins,
    meta_: {
      total,
      page_index: pageIndex,
      page_size: pageSize,
    },
  };
};

export const getAdminByIdService = async (
  id: string,
  lang: "en" | "ar",
  req?: Request,
) => {
  audit(req)
    .resource("ADMIN", id)
    .metadata({ lang })
    .step("Service initiated");

  const userRepo = PostgresDataSource.getRepository(User);

  const userEntity = await userRepo.findOne({
    where: { id },
  });

  if (!userEntity) {
    audit(req).step("Admin not found in database");
    return null;
  }

  audit(req).step("Admin entity fetched from database");

  const Admin = await toAdmin(userEntity, lang);

  return Admin;
};
