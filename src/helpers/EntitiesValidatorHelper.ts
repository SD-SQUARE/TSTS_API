import { In } from "typeorm";
import { Department, Domain, University } from "../entities/index.js";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { t } from "i18next";

// Repos
const uniRepo = PostgresDataSource.getRepository(University);
const domainRepo = PostgresDataSource.getRepository(Domain);
const departmentRepo = PostgresDataSource.getRepository(Department);

export type ValidateRequesterEntitiesResult = {
  is_valid: boolean;
  message?: string;
  university?: University;
  domain?: Domain;
  departments?: Department[];
  errors: { key: string; message: string }[];
};

/**
 * Validate university, domain, and departments in one place.
 *
 * - Returns `is_valid: false` + `message` if any problem.
 * - Returns `is_valid: true` + actual entities if all good.
 */
export const validateEntities = async (
  universityId: string,
  domainId: string,
  departmentIds?: string[]
): Promise<ValidateRequesterEntitiesResult> => {
  const [university, domain, departments] = await Promise.all([
    uniRepo.findOneBy({ id: universityId }),
    domainRepo.findOneBy({ id: domainId }),
    departmentIds && departmentIds.length > 0
      ? departmentRepo.findBy({ id: In(departmentIds) })
      : Promise.resolve([] as Department[]),
  ]);

  // Initialize errors array to collect validation issues
  const errors: { key: string; message: string }[] = [];
  const result: ValidateRequesterEntitiesResult = {
    is_valid: true,
    errors: [],
  };

  const uniExists = !!university;
  const domainExists = !!domain;

  // Check for university validity
  if (!uniExists) {
    result.is_valid = false;
    errors.push({ key: "university", message: t("university_not_found") });
  }

  // Check for domain validity
  if (!domainExists) {
    result.is_valid = false;
    errors.push({ key: "domain", message: t("domain_not_found") });
  }

  // ---- 2) Departments validation ----
  if (departmentIds && departmentIds.length > 0) {
    if (departments.length !== departmentIds.length) {
      result.is_valid = false;
      errors.push({ key: "departments", message: t("departments_not_found") });
    }
  }

  // If there were any validation errors, return them
  if (!result.is_valid) {
    result.message = "invalid_entities"; // General message for invalid entities
    return { is_valid: result.is_valid, message: result.message, errors };
  }

  // If all entities are valid, return them
  return {
    is_valid: true,
    university: university!, // Non-null here by logic
    domain: domain!, // Non-null here by logic
    departments: departments ?? [], // [] if none provided
    errors,
  };
};
