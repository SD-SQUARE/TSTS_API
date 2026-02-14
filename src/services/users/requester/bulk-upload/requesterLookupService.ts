import { PostgresDataSource } from "../../../../database/postgres-data-source.js";
import { University } from "../../../../entities/University.js";
import { Domain } from "../../../../entities/Domain.js";
import { Department } from "../../../../entities/Department.js";
import { Specialization } from "../../../../entities/Specialization.js";
import logger from "../../../../utils/logger.js";

export const findUniversityByName = async (
  name: string,
): Promise<string | null> => {
  if (!name || name.trim() === "") return null;

  const universityRepo = PostgresDataSource.getRepository(University);

  const university = await universityRepo
    .createQueryBuilder("u")
    .where("u.name->>'ar' = :name OR u.name->>'en' = :name", {
      name: name.trim(),
    })
    .getOne();

  if (university) {
    logger.info(
      `[requester-lookup] Found university: ${name} -> ${university.id}`,
    );
    return university.id;
  }

  logger.warn(`[requester-lookup] University not found: ${name}`);
  return null;
};

export const findDomainByName = async (
  name: string,
  universityId?: string,
): Promise<string | null> => {
  if (!name || name.trim() === "") return null;

  const domainRepo = PostgresDataSource.getRepository(Domain);

  const query = domainRepo
    .createQueryBuilder("d")
    .leftJoinAndSelect("d.university", "u")
    .where("d.name->>'ar' = :name OR d.name->>'en' = :name", {
      name: name.trim(),
    });

  if (universityId) {
    query.andWhere("u.id = :universityId", { universityId });
  }

  const domain = await query.getOne();

  if (domain) {
    logger.info(`[requester-lookup] Found domain: ${name} -> ${domain.id}`);
    return domain.id;
  }

  logger.warn(
    `[requester-lookup] Domain not found: ${name}${universityId ? ` (university: ${universityId})` : ""}`,
  );
  return null;
};

export const findDepartmentByName = async (
  name: string,
  domainId?: string,
): Promise<string | null> => {
  if (!name || name.trim() === "") return null;

  const departmentRepo = PostgresDataSource.getRepository(Department);

  const query = departmentRepo
    .createQueryBuilder("dept")
    .leftJoinAndSelect("dept.domain", "d")
    .where("dept.name->>'ar' = :name OR dept.name->>'en' = :name", {
      name: name.trim(),
    });

  if (domainId) {
    query.andWhere("d.id = :domainId", { domainId });
  }

  const department = await query.getOne();

  if (department) {
    logger.info(
      `[requester-lookup] Found department: ${name} -> ${department.id}`,
    );
    return department.id;
  }

  logger.warn(
    `[requester-lookup] Department not found: ${name}${domainId ? ` (domain: ${domainId})` : ""}`,
  );
  return null;
};

export const findSpecializationByName = async (
  name: string,
): Promise<string | null> => {
  if (!name || name.trim() === "") return null;

  const specializationRepo = PostgresDataSource.getRepository(Specialization);

  const specialization = await specializationRepo
    .createQueryBuilder("s")
    .where("s.name->>'ar' = :name OR s.name->>'en' = :name", {
      name: name.trim(),
    })
    .getOne();

  if (specialization) {
    logger.info(
      `[requester-lookup] Found specialization: ${name} -> ${specialization.id}`,
    );
    return specialization.id;
  }

  logger.warn(`[requester-lookup] Specialization not found: ${name}`);
  return null;
};

export const findSpecializationsByNames = async (
  names: string[],
): Promise<string[]> => {
  const ids: string[] = [];

  for (const name of names) {
    if (name && name.trim() !== "") {
      const id = await findSpecializationByName(name);
      if (id) {
        ids.push(id);
      }
    }
  }

  return ids;
};
