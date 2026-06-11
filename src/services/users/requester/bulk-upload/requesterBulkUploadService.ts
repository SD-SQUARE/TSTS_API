import { PostgresDataSource } from "../../../../database/postgres-data-source.js";
import { User } from "../../../../entities/User.js";
import { UserDepartment } from "../../../../entities/UserDepartment.js";
import { AllowedSpecialization } from "../../../../entities/AllowedSpecialization.js";
import { UserType } from "../../../../enums/UserType.enum.js";
import { UserStatus } from "../../../../enums/UserStatus.enum.js";
import logger from "../../../../utils/logger.js";

interface BulkUploadResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}

interface ValidRequesterData {
  firstName: { en: string; ar: string };
  midName: { en: string; ar: string };
  lastName: { en: string; ar: string };
  email: string;
  ssn: string;
  university: string;
  universityName: string;
  domain: string;
  domainName: string;
  department: string;
  departmentName: string;
  contacts: string;
  job: { en: string; ar: string };
  specializations: string[];
  specializationNames: string[];
  rowNumber: number;
}

export const bulkUploadRequestersService = async (
  validData: ValidRequesterData[],
): Promise<BulkUploadResult> => {
  logger.info(
    `[bulk-upload] Starting bulk upload for ${validData.length} requesters`,
  );

  const result: BulkUploadResult = {
    totalProcessed: 0,
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  // Get repositories
  const userRepo = PostgresDataSource.getRepository(User);
  const userDepartmentsRepo = PostgresDataSource.getRepository(UserDepartment);
  const allowedSpecializationsRepo = PostgresDataSource.getRepository(
    AllowedSpecialization,
  );

  // Process each requester
  for (const data of validData) {
    result.totalProcessed++;

    try {
      logger.info(
        `[bulk-upload] Processing row ${data.rowNumber}: ${data.email}`,
      );

      // Contacts is now a single phone number (already cleaned and validated)
      const contactNumbers = data.contacts ? [data.contacts] : [];

      // Create user entity
      const user = userRepo.create({
        email: data.email,
        password: "null",
        firstName: data.firstName,
        midName: data.midName,
        lastName: data.lastName,
        fullName: {
          en: `${data.firstName.en} ${data.lastName.en}`,
          ar: `${data.firstName.ar} ${data.lastName.ar}`,
        },
        ssn: data.ssn,
        user_type: UserType.REQUESTER,
        status: UserStatus.ACTIVE,
        job: data.job,
        contacts: {
          mobile: contactNumbers,
          phone: [],
        },
        university: { id: data.university } as any,
        domain: { id: data.domain } as any,
      });

      // Save user
      const savedUser = await userRepo.save(user);
      logger.info(`[bulk-upload] Created user: ${savedUser.email}`);

      // Save user department
      if (data.department) {
        const userDepartment = userDepartmentsRepo.create({
          user: savedUser,
          department: { id: data.department } as any,
        });
        await userDepartmentsRepo.save(userDepartment);
      }

      // Save allowed specializations
      if (data.specializations && data.specializations.length > 0) {
        const allowedSpecs = data.specializations.map((specId) =>
          allowedSpecializationsRepo.create({
            user: savedUser,
            specialization: { id: specId } as any,
          }),
        );
        await allowedSpecializationsRepo.save(allowedSpecs);
        logger.info(
          `[bulk-upload] Added ${allowedSpecs.length} specializations for ${savedUser.email}`,
        );
      }

      result.successCount++;
      logger.info(
        `[bulk-upload] Successfully created requester: ${data.email}`,
      );
    } catch (error) {
      result.failureCount++;
      const errorMessage = error.message || "خطأ غير معروف";
      logger.error(
        `[bulk-upload] Failed to create requester at row ${data.rowNumber}: ${errorMessage}`,
      );

      result.errors.push({
        row: data.rowNumber,
        email: data.email,
        error: errorMessage,
      });
    }
  }

  logger.info(
    `[bulk-upload] Bulk upload complete: ${result.successCount} success, ${result.failureCount} failures`,
  );
  return result;
};
