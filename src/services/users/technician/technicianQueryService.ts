import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { User } from "../../../entities/index.js";
import { GetUsersQuery } from "../../../interfaces/users/IGetUsersQuery.js";
import { toTechnician } from "../../../mappers/technician/entityToTechnicianMapper.js";
import { userRepository } from "../../../repositories/UserRepository.js";
import { Lang } from "../../../types/lang.types.js";

export const getAllTechnicianService = async (
  query: GetUsersQuery,
  lang: Lang,
) => {
  const [users, total] = await userRepository.getAllTechniciansWithFilter(
    query,
    lang,
  );

  const technicians = await Promise.all(
    users.map((u) => toTechnician(u, lang)),
  );

  const pageIndex = Number(query.page_index ?? 1);
  const pageSize = Number(query.page_size ?? 10);

  return {
    users: technicians,
    meta_: {
      total,
      page_index: pageIndex,
      page_size: pageSize,
    },
  };
};

export const getTechnicianByIdService = async (id: string, lang: Lang) => {
  const userRepo = PostgresDataSource.getRepository(User);

  const userEntity = await userRepo.findOne({
    where: { id },
  });

  if (!userEntity) {
    return null;
  }

  const technician = await toTechnician(userEntity, lang);

  return technician;
};
