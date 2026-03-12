import i18next from "../../../config/i18n.js";
import { formatNumber } from "../../../utils/NumberHelper.js";

export class ReportTranslationHelper {
  /**
   * Get common report translations for a specific language
   */
  static getCommonTranslations(lang?: string) {
    const language = lang || i18next.language || "en";
    const isRTL = language === "ar";

    let footerText = i18next.t("report_common.footer_text", { lng: language });

    // Format any numbers in footer text for Arabic
    if (isRTL && footerText) {
      // Replace all sequences of digits with Arabic numerals
      footerText = footerText.replace(/\d+/g, (match) =>
        formatNumber(match, true),
      );
    }

    return {
      generatedBy: i18next.t("report_common.generated_by", { lng: language }),
      generatedAt: i18next.t("report_common.generated_at", { lng: language }),
      footerText: footerText,
      filterFrom: i18next.t("report_common.filter_from", { lng: language }),
      filterTo: i18next.t("report_common.filter_to", { lng: language }),
      isRTL: isRTL,
    };
  }

  /**
   * Get page number text
   */
  static getPageText(current: number, total: number, lang?: string): string {
    const language = lang || i18next.language || "en";
    const isRTL = language === "ar";

    // Format numbers based on language
    const currentFormatted = formatNumber(current, isRTL);
    const totalFormatted = formatNumber(total, isRTL);

    return i18next.t("report_common.page_of", {
      current: currentFormatted,
      total: totalFormatted,
      lng: language,
    });
  }

  /**
   * Get showing records text
   */
  static getShowingRecordsText(
    filtered: number,
    total: number,
    lang?: string,
  ): string {
    const language = lang || i18next.language || "en";
    return i18next.t("report_common.showing_records", {
      filtered,
      total,
      lng: language,
    });
  }

  /**
   * Check if current language is RTL (Right-to-Left)
   */
  static isRTL(lang?: string): boolean {
    const language = lang || i18next.language || "en";
    return language === "ar";
  }
}
