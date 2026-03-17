import { TokenHelper } from "../../../../../helpers/TokenHelper.js";
import { Lang } from "../../../../../types/lang.types.js";
import { formatDateForReport } from "../../../../../utils/DateHelper.js";
import { ReportFactory, ReportType } from "../../../factory/ReportFactory.js";
import { DownloadReportParams } from "../../../handlers/IReportHandler.js";
import { BaseReportConfig } from "../../../index.js";
import { ReportTranslationHelper } from "../../../utils/ReportTranslationHelper.js";
import { SpecializationTicketsCountPreparation } from "./SpecializationTicketsCountPreparation.js";

export class SpecializationTicketsReportPdf {
  async downloadPDF(params: DownloadReportParams): Promise<void> {
    const { report, filters, language, user, res } = params;

    // Validate filters
    const validation =
      SpecializationTicketsCountPreparation.validateFilter(filters);
    if (!validation.isValid) {
      throw new Error(`Invalid filters: ${JSON.stringify(validation.errors)}`);
    }

    // Fetch data
    const filteredData =
      await SpecializationTicketsCountPreparation.getSpecializationTicketsCountData(
        filters,
        language as Lang,
        false,
      );

    if (filteredData.results.length === 0) {
      // Continue with empty data — generate an empty report
    }

    // Prepare data for report
    const reportData = SpecializationTicketsCountPreparation.prepareForReport(
      filteredData.results,
    );

    // Get translations
    const translations =
      ReportTranslationHelper.getCommonTranslations(language);

    const generatedBy =
      language === "ar"
        ? TokenHelper.getUserFromReqUser(user).fullNameAr
        : TokenHelper.getUserFromReqUser(user).fullNameEn;

    // Get title from database
    const reportTitle =
      report.title[language as Lang] || report.title.en || "Report";
    let reportSubtitle:
      | Array<{ text: string; fontSize?: number; color?: string }>
      | undefined = undefined;

    // Add date range as subtitle if filters are provided
    if (filters?.startDate || filters?.endDate) {
      const dateParts: string[] = [];

      if (filters?.startDate) {
        const startDateFormatted = formatDateForReport(
          filters.startDate,
          language,
        );
        dateParts.push(`${translations.filterFrom}: ${startDateFormatted}`);
      }

      if (filters?.endDate) {
        const endDateFormatted = formatDateForReport(filters.endDate, language);
        dateParts.push(`${translations.filterTo}: ${endDateFormatted}`);
      }

      reportSubtitle = [
        { text: dateParts.join(" - "), fontSize: 10, color: "#666666" },
      ];
    }

    const BaseConfig: BaseReportConfig = {
      metadata: {
        title: reportTitle,
        subtitle: reportSubtitle,
        generatedBy: generatedBy,
        generatedAt: new Date(),
        pageNumber: 1,
        totalPages: 1,
      },
      translations: {
        ...translations,
        isRTL: language === "ar",
      },
    };

    const reportInput = { data: reportData, filterMetadata: {} };

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-${report.handler}-${Date.now()}.pdf"`,
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    // Generate PDF
    const reportGenerator = ReportFactory.createReport(
      ReportType.SPECIALIZATION_TICKETS,
      BaseConfig,
    );
    await reportGenerator.generateStream(reportInput, res);
  }
}
