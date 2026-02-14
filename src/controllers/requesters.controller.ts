import { Request, Response } from "express";
import {
  mapCreateRequester,
  RequestWithFileAndBody,
} from "../mappers/requester/requesterMapper.js";
import { t } from "i18next";
import {
  createRequesterService,
  deleteRequesterService,
  editRequesterService,
} from "../services/users/requester/requesterCommandService.js";
import { parseGetUsersQuery } from "../interfaces/users/IGetUsersQuery.js";
import {
  getAllRequestersService,
  getRequesterByIdService,
} from "../services/users/requester/requesterQueryService.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { uuidValidationSchema } from "../validation/shared/uuidSchema.js";
import logger from "../utils/logger.js";
import archiver from "archiver";
import { generateRequesterTemplateService } from "../services/users/requester/bulk-upload/requesterTemplateService.js";
import { validateRequesterExcelFiles } from "../services/users/requester/bulk-upload/requesterBulkValidationService.js";
import { bulkUploadRequestersService } from "../services/users/requester/bulk-upload/requesterBulkUploadService.js";

export const createRequester = async (
  req: RequestWithFileAndBody,
  res: Response,
) => {
  const requesterDto = mapCreateRequester(req);
  const result = await createRequesterService(requesterDto, req.file);
  if (!result.is_added) {
    result.message = t("user_not_created");
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }
  return res.status(ResponseStatus.CREATED).json({
    result,
  });
};

export const getRequestersPaged = async (req, res) => {
  const query = parseGetUsersQuery(req.query);
  const lang = req.language;

  const result = await getAllRequestersService(query, lang);
  return res
    .status(ResponseStatus.SUCCESS)
    .json({ users: result.users, meta_data: result.meta_ });
};

export const getRequesterById = async (req, res) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";
  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_requester_id") });
  }

  const requester = await getRequesterByIdService(id, lang);

  if (!requester || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: "Requester not found" });
  }

  return res.status(ResponseStatus.SUCCESS).json(requester);
};

export const EditRequester = async (req, res: Response) => {
  const requesterDto = mapCreateRequester(req);
  const id = req.params.id;
  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_edited: false, message: t("user_not_found"), errors: [] });
  }

  const result = await editRequesterService(id, requesterDto, req.file);
  if (!result.is_edited) {
    result.message = t("user_not_edited");
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }
  return res.status(ResponseStatus.SUCCESS).json({
    is_edited: result.is_edited,
    message: t("user_edited"),
  });
};

export const deleteRequester = async (req, res: Response) => {
  const id = req.params.id;
  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_requester_id") });
  }

  const result = await deleteRequesterService(id);
  if (!result.is_deleted) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: result.is_deleted, message: result.message });
  }

  return res.status(ResponseStatus.SUCCESS).json({
    is_deleted: result.is_deleted,
    message: t("user_deleted"),
  });
};

export const downloadRequesterTemplate = async (
  req: Request,
  res: Response,
) => {
  try {
    logger.info("[requester-template] Template download requested");

    const workbook = await generateRequesterTemplateService();

    // Generate filename with current date and time
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5); // Format: YYYY-MM-DDTHH-MM-SS
    const filename = `requester_import_template_${timestamp}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    await workbook.xlsx.write(res);
    res.end();

    logger.info(
      `[requester-template] Template downloaded successfully: ${filename}`,
    );
  } catch (error) {
    logger.error(
      `[requester-template] Error generating template: ${error.message}`,
    );
    return res.status(ResponseStatus.INTERNAL_SERVER_ERROR).json({
      message: t("template_generation_failed"),
      error: error.message,
    });
  }
};

export const bulkUploadRequesters = async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(ResponseStatus.BAD_REQUEST).json({
        message: t("files_required"),
      });
    }

    logger.info(
      `[bulk-upload] Bulk upload requested for ${req.files.length} files`,
    );

    // Step 1: Validate all files
    const validationResults = await validateRequesterExcelFiles(req.files);

    // Step 2: Check if there are any validation errors
    const hasValidationErrors = validationResults.some((r) => r.hasErrors);

    if (hasValidationErrors) {
      logger.warn(`[bulk-upload] Validation errors found in uploaded files`);

      // Count total errors
      const totalErrors = validationResults.reduce(
        (sum, r) => sum + r.errors.length,
        0,
      );
      const totalInvalidRows = validationResults.reduce(
        (sum, r) => sum + r.invalidRowCount,
        0,
      );

      // Create ZIP file with error details
      const filesWithErrors = validationResults.filter(
        (r) => r.hasErrors && r.errorFileBuffer,
      );

      const archive = archiver("zip", { zlib: { level: 9 } });

      // Set 400 status and headers
      res.status(ResponseStatus.BAD_REQUEST);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=validation_errors.zip",
      );
      
      // Add custom headers with error information
      res.setHeader("X-Validation-Error", "true");
      res.setHeader("X-Total-Files", validationResults.length.toString());
      res.setHeader("X-Total-Errors", totalErrors.toString());
      res.setHeader("X-Total-Invalid-Rows", totalInvalidRows.toString());
      res.setHeader(
        "X-Error-Message",
        encodeURIComponent(t("bulk_upload_validation_failed")),
      );

      archive.pipe(res);

      // Add error files (only containing invalid rows)
      filesWithErrors.forEach((result) => {
        const filename = result.filename.replace(/\.xlsx$/, "_errors.xlsx");
        archive.append(result.errorFileBuffer!, { name: filename });
      });

      // Add validation summary JSON
      const summary = {
        message: t("bulk_upload_validation_failed"),
        totalFiles: validationResults.length,
        totalErrors,
        totalInvalidRows,
        details: validationResults.map((r) => ({
          filename: r.filename,
          hasErrors: r.hasErrors,
          validRowCount: r.validRowCount,
          invalidRowCount: r.invalidRowCount,
          totalRowCount: r.totalRowCount,
          errors: r.errors,
        })),
      };

      archive.append(JSON.stringify(summary, null, 2), {
        name: "validation_summary.json",
      });

      await archive.finalize();
      return;
    }

    // Step 3: Collect all valid data from all files
    const allValidData = validationResults.flatMap((r) => r.validData);

    logger.info(
      `[bulk-upload] Found ${allValidData.length} valid records to upload`,
    );

    // Step 4: Bulk upload to database
    const uploadResult = await bulkUploadRequestersService(allValidData);

    // All data was valid and uploaded successfully
    return res.status(ResponseStatus.SUCCESS).json({
      message: t("bulk_upload_complete"),
      totalProcessed: uploadResult.totalProcessed,
      successCount: uploadResult.successCount,
      failureCount: uploadResult.failureCount,
      errors: uploadResult.errors,
    });
  } catch (error) {
    logger.error(`[bulk-upload] Error during bulk upload: ${error.message}`);
    return res.status(ResponseStatus.INTERNAL_SERVER_ERROR).json({
      message: t("bulk_upload_failed"),
      error: error.message,
    });
  }
};
