import { Request } from "express";
import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { User } from "../../../entities/index.js";
import { audit } from "../../../helpers/auditBuilder.js";
import { GetUsersQuery } from "../../../interfaces/users/IGetUsersQuery.js";
import { toRequester } from "../../../mappers/requester/entityToRequesterMapper.js";
import { userRepository } from "../../../repositories/UserRepository.js";

export const getAllRequestersService = async (
  query: GetUsersQuery,
  lang: "en" | "ar",
  req?: Request
) => {
  const auditLog = audit(req);

  const [users, total] = await userRepository.getAllRequestersWithFilter(
    query,
    lang
  );

  const requesters = await Promise.all(users.map((u) => toRequester(u, lang)));

  const pageIndex = Number(query.page_index ?? 1);
  const pageSize = Number(query.page_size ?? 10);

  auditLog.step(`Fetched ${requesters.length} requesters`);

  return {
    users: requesters,
    meta_: {
      total,
      page_index: pageIndex,
      page_size: pageSize,
    },
  };
};

export const getRequesterByIdService = async (
  id: string,
  lang: "en" | "ar",
  req?: Request,
) => {
  const auditLog = audit(req);

  const userRepo = PostgresDataSource.getRepository(User);

  const userEntity = await userRepo.findOne({
    where: { id },
  });

  if (!userEntity) {
    auditLog.step("Requester entity not found in DB");
    return null;
  }

  const requester = await toRequester(userEntity, lang);

  auditLog.step("Requester found and mapped to response DTO");

  return requester;
};
