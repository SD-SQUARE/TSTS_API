import puppeteer, { Browser, Page } from "puppeteer";
import * as path from "path";
import * as fs from "fs";
import {
  BaseReportConfig,
  TableData,
  IReportGenerator,
} from "../types/report.types.js";
import { ReportTranslationHelper } from "../utils/ReportTranslationHelper.js";
import {
  formatDateForReport,
  formatDateTimeForReport,
} from "../../../utils/DateHelper.js";
import {
  ReportStyleConfig,
  BASE_REPORT_STYLE_CONFIG,
} from "./base.report.config.js";
import { SvgIcons } from "../utils/SvgIcons.js";

/**
 * Base class for generating PDF reports using Puppeteer
 * Puppeteer provides perfect RTL support using HTML/CSS
 */
export abstract class BaseReportGeneratorPuppeteer implements IReportGenerator {
  protected config: BaseReportConfig;
  protected styleConfig: ReportStyleConfig;
  private static browserInstance: Browser | null = null;
  private static logoCache: { citc?: string; university?: string } = {};

  constructor(
    config: BaseReportConfig,
    styleConfig: ReportStyleConfig = BASE_REPORT_STYLE_CONFIG,
  ) {
    this.config = config;
    this.styleConfig = styleConfig;

    // Get language from config
    const lang = this.config.translations?.isRTL ? "ar" : "en";

    // Set footer text from translations if not provided
    if (!this.config.footerText) {
      const translations = ReportTranslationHelper.getCommonTranslations(lang);
      this.config.footerText = translations.footerText;
    }

    // Load logos to cache if not already loaded
    if (!BaseReportGeneratorPuppeteer.logoCache.citc) {
      this.loadLogosToCache();
    }
  }

  /**
   * Load logos to cache (one-time operation)
   */
  private loadLogosToCache(): void {
    const citcLogoPath = path.join(
      process.cwd(),
      "assets",
      "logos",
      "citc-logo.png",
    );
    const universityLogoPath = path.join(
      process.cwd(),
      "assets",
      "logos",
      "university-logo.png",
    );

    try {
      if (fs.existsSync(citcLogoPath)) {
        const citcBuffer = fs.readFileSync(citcLogoPath);
        BaseReportGeneratorPuppeteer.logoCache.citc = `data:image/png;base64,${citcBuffer.toString("base64")}`;
      } else {
        console.warn("[Puppeteer] CITC logo not found at:", citcLogoPath);
      }

      if (fs.existsSync(universityLogoPath)) {
        const uniBuffer = fs.readFileSync(universityLogoPath);
        BaseReportGeneratorPuppeteer.logoCache.university = `data:image/png;base64,${uniBuffer.toString("base64")}`;
      } else {
        console.warn(
          "[Puppeteer] University logo not found at:",
          universityLogoPath,
        );
      }
    } catch (error) {
      console.error("[Puppeteer] Error loading logos:", error);
    }
  }

  /**
   * Get or create browser instance (singleton)
   */
  private static async getBrowser(): Promise<Browser> {
    if (!this.browserInstance) {
      this.browserInstance = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      });
    }
    return this.browserInstance;
  }

  /**
   * Pre-warm browser instance (call on server startup)
   */
  static async warmUp(): Promise<void> {
    console.log("[Puppeteer] Warming up browser...");
    await this.getBrowser();
    console.log("[Puppeteer] Browser ready");
  }

  /**
   * Close browser instance
   */
  static async closeBrowser(): Promise<void> {
    if (this.browserInstance) {
      await this.browserInstance.close();
      this.browserInstance = null;
      console.log("[Puppeteer] Browser closed");
    }
  }

  abstract generate(data: any): Promise<Buffer>;

  /**
   * Generate PDF and stream directly to response
   */
  async generateStream(data: any, res: any): Promise<void> {
    const pdfBuffer = await this.generate(data);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  }

  /**
   * Build HTML content - to be implemented by subclasses
   */
  protected abstract buildHTML(data: any): Promise<string>;

  /**
   * Generate PDF from HTML
   */
  protected async generatePDFFromHTML(html: string): Promise<Buffer> {
    const browser = await BaseReportGeneratorPuppeteer.getBrowser();
    const page = await browser.newPage();

    try {
      // Use domcontentloaded instead of networkidle0 for faster generation
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "0px",
          bottom: "0px",
          left: "0px",
          right: "0px",
        },
        displayHeaderFooter: false, // We use CSS for headers/footers
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Get base CSS styles
   */
  protected getBaseStyles(): string {
    const isRTL = this.config.translations?.isRTL || false;
    const fontsPath = path.join(process.cwd(), "assets", "fonts");
    const cairoRegularPath = path.join(fontsPath, "Cairo-Regular.ttf");
    const cairoBoldPath = path.join(fontsPath, "Cairo-Bold.ttf");

    const s = this.styleConfig; // Shorthand for style config

    // Get font size based on language
    const fontSize =
      typeof s.fonts?.baseSize === "string"
        ? s.fonts.baseSize
        : isRTL
          ? s.fonts?.baseSize?.ar || "8pt"
          : s.fonts?.baseSize?.en || "10pt";

    return `
    @font-face {
      font-family: 'Cairo';
      src: url('file://${cairoRegularPath}') format('truetype');
      font-weight: 400;
      font-style: normal;
    }

    @font-face {
      font-family: 'Cairo';
      src: url('file://${cairoBoldPath}') format('truetype');
      font-weight: 700;
      font-style: normal;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${s.fonts?.family || "Cairo, sans-serif"};
      direction: ${isRTL ? "rtl" : "ltr"};
      font-size: ${fontSize};
      color: #000;
    }

    .page {
      width: ${s.page?.width || "210mm"};
      padding: ${s.page?.padding || "0 40px"};
      margin: 0 auto;
      background: white;
      position: relative;
    }

    .page-content {
      page-break-after: always;
      min-height: ${s.page?.height || "297mm"};
      display: flex;
      flex-direction: column;
    }

    .page-content:last-child {
      page-break-after: auto;
    }

    /* Header */
    .header {
      height: ${s.header?.height || "120px"};
      padding: ${s.header?.padding || "20px 40px"};
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: white;
      direction: ltr; /* Force LTR for header to keep logos fixed */
    }

    .header-logos {
      display: flex;
      justify-content: space-between;
      width: 100%;
      direction: ltr; /* Force LTR to keep logos in same position */
    }

    .unilogo {
      height: ${s.logos?.universityHeight || "100px"};
      width: ${s.logos?.universityWidth || "120px"};
      max-width: ${s.logos?.universityWidth || "120px"};
      object-fit: contain;
      align-self: flex-start;
      align-items: start;
      margin-left: -30px;
      order: 1; /* Always first */
    }

    .citclogo {
      height: ${s.logos?.citcHeight || "80px"};
      width: auto;
      max-width: ${s.logos?.citcWidth || "120px"};
      object-fit: contain;
      order: 3; /* Always last */
    }

    .header-content {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      max-width: calc(100% - 30px);
      width: calc(100% - 30px);
      word-wrap: break-word;
      direction: ${isRTL ? "rtl" : "ltr"}; /* Text follows language direction */
      order: 2; /* Always in middle */
    }

    .header-title {
      font-size: ${s.header?.titleFontSize || "16pt"};
      font-weight: bold;
      color: ${s.header?.titleColor || "#333"};
      margin-bottom: 5px;
      display: inline-block;
      white-space: normal;
      width: calc(100% - 30px);
      margin-left: -30px;   
    }

    .header-subtitle {
      font-size: ${s.header?.subtitleFontSize || "10pt"};
      color: ${s.header?.subtitleColor || "#666"};
      margin-top: 2px;
    }

    .header-subtitle::before {
      content: " ";
    }

    .header-page-number {
      font-size: ${s.header?.pageNumberFontSize || "12pt"};
      color: ${s.header?.pageNumberColor || "#666"};
      margin-top: 5px;
    }

    /* Footer */
    .footer {
      height: ${s.footer?.height || "50px"};
      padding: ${s.footer?.padding || "10px 10px"};
      background: white;
      border-top: ${s.footer?.borderTopWidth || "1px"} solid ${s.footer?.borderTopColor || "#eee"};
    }

    .footer-info {
      display: flex;
      justify-content: space-between;
      font-size: ${s.footer?.infoFontSize || "10pt"};
      color: ${s.footer?.infoColor || "#666"};
      margin-bottom: 5px;
    }

    .footer-datetime {
      display: flex;
      gap: 15px;
      align-items: center;
    }

    .footer-date,
    .footer-time,
    .footer-user {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .footer-date svg,
    .footer-time svg,
    .footer-user svg {
      flex-shrink: 0;
    }

    .footer-text {
      text-align: center;
      font-size: ${s.footer?.textFontSize || "10pt"};
      font-weight: bold;
      color: ${s.footer?.textColor || "#999"};
      margin-top: 5px;
    }

    .footer-info svg {
      vertical-align: middle;
      margin-right: 4px;
      display: inline-block;
    }

    /* Content */
    .content {
      padding: ${s.content?.padding || "10px 0"};
      flex: 1;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      direction: ${isRTL ? "rtl" : "ltr"};
    }

    thead {
      display: table-header-group;
    }

    tbody {
      display: table-row-group;
    }

    tbody tr {
      orphans: 3;
      widows: 3;
    }

    th {
      background-color: ${s.table?.headerBackgroundColor || "#f0f0f0"};
      color: ${s.table?.headerTextColor || "#333"};
      font-weight: bold;
      padding: ${s.table?.headerPadding || "6px 8px"};
      text-align: ${isRTL ? "right" : "left"};
      border: ${s.table?.borderWidth || "0.5px"} solid ${s.table?.borderColor || "#ddd"};
      font-size: 11pt;
    }

    th.center {
      text-align: center;
    }

    td {
      padding: ${s.table?.cellPadding || "5px 8px"};
      border: ${s.table?.borderWidth || "0.5px"} solid ${s.table?.borderColor || "#ddd"};
      text-align: ${isRTL ? "right" : "left"};
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    td.center {
      text-align: center;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    tr:nth-child(even) {
      background-color: ${s.table?.evenRowColor || "#f9f9f9"};
    }

    tr:nth-child(odd) {
      background-color: ${s.table?.oddRowColor || "#ffffff"};
    }

    /* Ensure table doesn't break badly */
    table {
      page-break-inside: avoid;
      page-break-after: avoid;
      margin-bottom: 0;
    }

    /* Repeat table header on each page */
    thead {
      display: table-header-group;
    }

    /* Remove page break divs - not needed anymore */
    .page-break {
      display: none;
    }

    /* Print-specific styles */
    @media print {
      .page {
        margin: 0;
        padding: ${s.page?.padding || "0 40px"};
      }
    }
    `;
  }

  /**
   * Build header HTML
   */
  protected buildHeaderHTML(
    pageNumber: number = 1,
    totalPages: number = 1,
  ): string {
    const isRTL = this.config.translations?.isRTL || false;

    let subtitleHTML = "";
    if (
      this.config.metadata.subtitle &&
      this.config.metadata.subtitle.length > 0
    ) {
      subtitleHTML = this.config.metadata.subtitle
        .map(
          (sub) =>
            `<span class="header-subtitle" style="color: ${sub.color || "#666"}; font-size: ${sub.fontSize || 10}pt;">${sub.text}</span>`,
        )
        .join("");
    }

    // Get page text from translations with language
    const lang = isRTL ? "ar" : "en";
    const pageText = ReportTranslationHelper.getPageText(
      pageNumber,
      totalPages,
      lang,
    );

    // Use cached base64 logos
    const uniLogo = BaseReportGeneratorPuppeteer.logoCache.university;
    const citcLogo = BaseReportGeneratorPuppeteer.logoCache.citc;

    return `
    <div class="header">
      <div class="header-logos">
        ${uniLogo ? `<img src="${uniLogo}" class="unilogo" alt="Uni Logo">` : '<div class="logo "></div>'}
        <div class="header-content">
          <div class="header-title">
            <span>${this.config.metadata.title}</span>
          </div>
          <!-- Subtitle placed under the title -->
          <div>
            ${subtitleHTML}
          </div>
          <div class="header-page-number">(${pageText})</div>
        </div>
        ${citcLogo ? `<img src="${citcLogo}" class="citclogo" alt="CITC Logo">` : '<div class="citclogo"></div>'}
      </div>
    </div>
  `;
  }

  /**
   * Build footer HTML
   */
  protected buildFooterHTML(): string {
    const isRTL = this.config.translations?.isRTL || false;
    const lang = isRTL ? "ar" : "en";
    const translations = this.config.translations || {};
    const generatedByLabel = translations.generatedBy || "generated by";
    const generatedAtLabel = translations.generatedAt || "generated at";

    // Get SVG icons
    const calendarIcon = SvgIcons.calendar();
    const clockIcon = SvgIcons.clock();
    const userIcon = SvgIcons.user();

    // Format date and time using existing functions
    const dateFormatted = formatDateForReport(
      this.config.metadata.generatedAt,
      lang,
    );
    const dateTimeFormatted = formatDateTimeForReport(
      this.config.metadata.generatedAt,
      lang,
    );

    // Extract time from datetime (format is "DD.MM.YYYY HH:MM")
    const timeFormatted = dateTimeFormatted.split(" ")[1] || "";

    const leftContent = isRTL
      ? `<div class="footer-datetime">
          <div class="footer-date">${calendarIcon}<span>${dateFormatted}</span></div>
          <div class="footer-time">${clockIcon}<span>${timeFormatted}</span></div>
        </div>`
      : `<div class="footer-user">${userIcon}<span>${generatedByLabel}: ${this.config.metadata.generatedBy}</span></div>`;

    const rightContent = isRTL
      ? `<div class="footer-user">${userIcon}<span>${generatedByLabel}: ${this.config.metadata.generatedBy}</span></div>`
      : `<div class="footer-datetime">
          <div class="footer-date">${calendarIcon}<span>${dateFormatted}</span></div>
          <div class="footer-time">${clockIcon}<span>${timeFormatted}</span></div>
        </div>`;

    return `
      <div class="footer">
        <div class="footer-info">
          ${leftContent}
          ${rightContent}
        </div>
        ${this.config.footerText ? `<div class="footer-text">${this.config.footerText}</div>` : ""}
      </div>
    `;
  }

  /**
   * Build table HTML - splits into multiple tables to prevent row cutting
   * Returns array of table HTML strings (one per page)
   */
  protected buildTableHTML(
    tableData: TableData,
    rowsPerPage: number = 18,
  ): string[] {
    const isRTL = tableData.isRTL || false;
    // Don't reverse columns - let CSS direction handle it
    const columns = tableData.columns;

    const headerHTML = columns
      .map((col) => {
        const widthStyle = col.width ? ` style="width: ${col.width}px;"` : "";
        return `<th class="${col.alignment || ""}"${widthStyle}>${col.header}</th>`;
      })
      .join("");

    // Split rows into pages
    const pages: any[][] = [];
    for (let i = 0; i < tableData.rows.length; i += rowsPerPage) {
      pages.push(tableData.rows.slice(i, i + rowsPerPage));
    }

    // Build separate table for each page
    return pages.map((pageRows) => {
      const rowsHTML = pageRows
        .map((row) => {
          // Build cells in the same order as columns
          const cellsHTML = columns
            .map((col) => {
              const value =
                row[col.dataKey] !== undefined
                  ? row[col.dataKey].toString()
                  : "";
              const widthStyle = col.width
                ? ` style="width: ${col.width}px;"`
                : "";
              return `<td class="${col.alignment || ""}"${widthStyle}>${value}</td>`;
            })
            .join("");

          return `<tr>${cellsHTML}</tr>`;
        })
        .join("");

      return `
        <table>
          <thead>
            <tr>${headerHTML}</tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      `;
    });
  }
}
