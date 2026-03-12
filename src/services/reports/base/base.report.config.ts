/**
 * Base Report Configuration
 * Default values for all reports - can be overridden by individual report configs
 */

export interface ReportStyleConfig {
  // Table styling
  table?: {
    cellPadding?: string; // e.g., "6px 8px"
    headerPadding?: string;
    borderWidth?: string;
    borderColor?: string;
    headerBackgroundColor?: string;
    headerTextColor?: string;
    evenRowColor?: string;
    oddRowColor?: string;
  };

  // Page layout
  page?: {
    padding?: string; // e.g., "0 40px"
    width?: string; // e.g., "210mm"
    height?: string; // e.g., "297mm" (A4 height)
  };

  // Header styling
  header?: {
    height?: string; // e.g., "120px"
    padding?: string;
    titleFontSize?: string;
    titleColor?: string;
    subtitleFontSize?: string;
    subtitleColor?: string;
    pageNumberFontSize?: string;
    pageNumberColor?: string;
  };

  // Footer styling
  footer?: {
    height?: string; // e.g., "50px"
    padding?: string;
    borderTopWidth?: string;
    borderTopColor?: string;
    infoFontSize?: string;
    infoColor?: string;
    textFontSize?: string;
    textColor?: string;
  };

  // Content area
  content?: {
    padding?: string;
  };

  // Logo sizing
  logos?: {
    universityHeight?: string;
    universityWidth?: string;
    citcHeight?: string;
    citcWidth?: string;
  };

  // Font settings
  fonts?: {
    family?: string;
    baseSize?: string | { en: string; ar: string }; // Support different sizes per language
  };
}

/**
 * Default base configuration for all reports
 */
export const BASE_REPORT_STYLE_CONFIG: ReportStyleConfig = {
  table: {
    cellPadding: "3px 3px",
    headerPadding: "6px 8px",
    borderWidth: "0.5px",
    borderColor: "#ddd",
    headerBackgroundColor: "#f9f9f9",
    headerTextColor: "#333",
    evenRowColor: "#f9f9f9",
    oddRowColor: "#ffffff",
  },

  page: {
    padding: "0 40px",
    width: "210mm",
    height: "297mm", // A4 height
  },

  header: {
    height: "120px",
    padding: "40px 0px",
    titleFontSize: "16pt",
    titleColor: "#333",
    subtitleFontSize: "10pt",
    subtitleColor: "#666",
    pageNumberFontSize: "12pt",
    pageNumberColor: "#666",
  },

  footer: {
    height: "55px",
    padding: "10px 10px",
    borderTopWidth: "1px",
    borderTopColor: "#eee",
    infoFontSize: "10pt",
    infoColor: "#666",
    textFontSize: "10pt",
    textColor: "#999",
  },

  content: {
    padding: "10px 0",
  },

  logos: {
    universityHeight: "100px",
    universityWidth: "120px",
    citcHeight: "80px",
    citcWidth: "120px",
  },

  fonts: {
    family: "Cairo, sans-serif",
    baseSize: {
      en: "10pt",
      ar: "9pt",
    },
  },
};

/**
 * Merge report-specific config with base config
 * Report config overrides base config
 */
export function mergeReportStyleConfig(
  reportConfig?: ReportStyleConfig,
): ReportStyleConfig {
  if (!reportConfig) return BASE_REPORT_STYLE_CONFIG;

  return {
    table: { ...BASE_REPORT_STYLE_CONFIG.table, ...reportConfig.table },
    page: { ...BASE_REPORT_STYLE_CONFIG.page, ...reportConfig.page },
    header: { ...BASE_REPORT_STYLE_CONFIG.header, ...reportConfig.header },
    footer: { ...BASE_REPORT_STYLE_CONFIG.footer, ...reportConfig.footer },
    content: { ...BASE_REPORT_STYLE_CONFIG.content, ...reportConfig.content },
    logos: { ...BASE_REPORT_STYLE_CONFIG.logos, ...reportConfig.logos },
    fonts: { ...BASE_REPORT_STYLE_CONFIG.fonts, ...reportConfig.fonts },
  };
}
