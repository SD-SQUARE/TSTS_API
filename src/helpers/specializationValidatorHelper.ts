import { In } from "typeorm";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Specialization } from "../entities/Specialization.js";
import { t } from "i18next";

export type ValidateSpecializationsResult = {
  is_valid: boolean;
  message?: string;
  errors?: { key: string; message: string }[]; // Optional errors array for detailed errors
  specializations?: Specialization[];
};

export const validateExistingSpecializations = async (
  specializationIds?: string[]
): Promise<ValidateSpecializationsResult> => {
  const specializationRepo = PostgresDataSource.getRepository(Specialization);

  // If no specializations are provided, it's valid and empty
  if (!specializationIds || specializationIds.length === 0) {
    return {
      is_valid: true,
      specializations: [],
    };
  }

  const existing = await specializationRepo.findBy({
    id: In(specializationIds),
  });

  // Find missing specializations by comparing provided IDs with existing ones
  const existingIds = new Set(existing.map((spec) => spec.id));
  const missingIds = specializationIds.filter((id) => !existingIds.has(id));

  if (missingIds.length > 0) {
    return {
      is_valid: false,
      message: "some_specializations_do_not_exist",
      errors: [
        {
          key: "specializations",
          message: t("some_specialization_does_not_exist"),
        },
      ],
    };
  }

  // If all specializations are valid, return them
  return {
    is_valid: true,
    specializations: existing,
  };
};
