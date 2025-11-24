import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { User } from "../../../entities/index.js";
import { GetUsersQuery } from "../../../interfaces/users/IGetUsersQuery.js";
import { toAdmin } from "../../../mappers/admin/entityToAdminMapper.js";
import { userRepository } from "../../../repositories/UserRepository.js";

export const getAllAdminsService = async (
  query: GetUsersQuery,
  lang: "en" | "ar"
) => {
  const [users, total] = await userRepository.getAllAdminsWithFilter(
    query,
    lang
  );

  const admins = await Promise.all(users.map((u) => toAdmin(u, lang)));

  const pageIndex = Number(query.page_index ?? 1);
  const pageSize = Number(query.page_size ?? 10);

  return {
    users: admins,
    meta_: {
      total,
      page_index: pageIndex,
      page_size: pageSize,
    },
  };
};

export const getAdminByIdService = async (id: string, lang: "en" | "ar") => {
  const userRepo = PostgresDataSource.getRepository(User);

  const userEntity = await userRepo.findOne({
    where: { id },
  });

  if (!userEntity) {
    return null;
  }

  const Admin = await toAdmin(userEntity, lang);

  return Admin;
};
