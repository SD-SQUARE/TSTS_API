import { TokenHelper } from "../../../../../helpers/TokenHelper.js";
import { Lang } from "../../../../../types/lang.types.js";
import { formatDateForReport } from "../../../../../utils/DateHelper.js";
import { DownloadReportParams } from "../../../handlers/IReportHandler.js";
import { BaseReportConfig } from "../../../index.js";
import { ReportTranslationHelper } from "../../../utils/ReportTranslationHelper.js";
import { RequesterDomainPreparation } from "./RequesterDomainPreparation.js";
import { REQUESTER_DOMAIN_REPORT_CONFIG } from "../config/report.config.js";
import { GenericReportGeneratorPuppeteer } from "../../../base/GenericReportGeneratorPuppeteer.js";

export class RequesterDomainReportPdf {
  async downloadPDF(params: DownloadReportParams): Promise<void> {
    const { report, filters, language, user, res } = params;

    const validation = RequesterDomainPreparation.validateFilter(filters, language as Lang);
    if (!validation.isValid) {
      throw new Error(`Invalid filters: ${JSON.stringify(validation.errors)}`);
    }

    const filteredData = await RequesterDomainPreparation.getData(
      filters,
      language as Lang,
      false,
    );

    const reportData = RequesterDomainPreparation.prepareForView(filteredData.results);
    const translations = ReportTranslationHelper.getCommonTranslations(language);

    const generatedBy =
      language === "ar"
        ? TokenHelper.getUserFromReqUser(user).fullNameAr
        : TokenHelper.getUserFromReqUser(user).fullNameEn;

    const reportTitle = report.title[language as Lang] || report.title.en || "Report";
    let reportSubtitle: Array<{ text: string; fontSize?: number; color?: string }> | undefined;

    if (filters?.startDate || filters?.endDate) {
      const parts: string[] = [];
      if (filters.startDate) parts.push(`${translations.filterFrom}: ${formatDateForReport(filters.startDate, language)}`);
      if (filters.endDate) parts.push(`${translations.filterTo}: ${formatDateForReport(filters.endDate, language)}`);
      reportSubtitle = [{ text: parts.join(" - "), fontSize: 10, color: "#666666" }];
    }

    const baseConfig: BaseReportConfig = {
      metadata: {
        title: reportTitle,
        subtitle: reportSubtitle,
        generatedBy,
        generatedAt: new Date(),
        pageNumber: 1,
        totalPages: 1,
      },
      translations: { ...translations, isRTL: language === "ar" },
    };

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="report-${report.handler}-${Date.now()}.pdf"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    const generator = new GenericReportGeneratorPuppeteer(baseConfig, REQUESTER_DOMAIN_REPORT_CONFIG);
    await generator.generateStream({ data: reportData }, res);
  }
}
