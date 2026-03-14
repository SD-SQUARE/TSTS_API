import { BaseReportGeneratorPuppeteer } from "../../../base/BaseReportGeneratorPuppeteer.js";
import { BaseReportConfig } from "../../../types/report.types.js";
import { DOMAIN_DEPT_SPEC_PROBLEM_REPORT_CONFIG } from "../config/report.config.js";
import { PostgresDataSource } from "../../../../../database/postgres-data-source.js";
import { Report } from "../../../../../entities/Report.js";
import { ReportHandler } from "../../../../../enums/ReportHandler.enum.js";
import { mergeReportStyleConfig } from "../../../base/base.report.config.js";
import { formatNumber } from "../../../../../utils/NumberHelper.js";

export class DomainDeptSpecProblemReportV1Generic extends BaseReportGeneratorPuppeteer {
  private reportData: Report | null = null;

  constructor(config: BaseReportConfig) {
    const mergedStyleConfig = mergeReportStyleConfig(
      DOMAIN_DEPT_SPEC_PROBLEM_REPORT_CONFIG.styleConfig
    );
    super(config, mergedStyleConfig);
  }

  private async loadReportData(): Promise<void> {
    if (this.reportData) return;

    const reportRepo = PostgresDataSource.getRepository(Report);
    this.reportData = await reportRepo.findOne({
      where: { handler: ReportHandler.DOMAIN_DEPT_SPEC_PROBLEM },
    });

    if (!this.reportData) {
      throw new Error(
        `Report with handler ${ReportHandler.DOMAIN_DEPT_SPEC_PROBLEM} not found in database`
      );
    }
  }

  async generate(input: any[] | { data: any[] }): Promise<Buffer> {
    const landscape = DOMAIN_DEPT_SPEC_PROBLEM_REPORT_CONFIG.landscape ?? false;
    const html = await this.buildHTML(input);
    return this.generatePDFFromHTML(html, landscape);
  }

  protected async buildHTML(input: any[] | { data: any[] }): Promise<string> {
    await this.loadReportData();

    const data = Array.isArray(input) ? input : input.data;
    const translations = this.config.translations || {};
    const isRTL = translations.isRTL || false;
    const currentLang = isRTL ? "ar" : "en";

    // Get column labels from database
    const dbColumns = this.reportData!.columns || [];
    const getColumnLabel = (key: string): string => {
      const column = dbColumns.find((col) => col.key === key);
      if (column && column.label) {
        return (
          column.label[currentLang as "en" | "ar"] || column.label.en || key
        );
      }
      return key;
    };

    const rowsPerPage =
      typeof DOMAIN_DEPT_SPEC_PROBLEM_REPORT_CONFIG.rowsPerPage === "number"
        ? DOMAIN_DEPT_SPEC_PROBLEM_REPORT_CONFIG.rowsPerPage
        : isRTL
          ? DOMAIN_DEPT_SPEC_PROBLEM_REPORT_CONFIG.rowsPerPage.ar
          : DOMAIN_DEPT_SPEC_PROBLEM_REPORT_CONFIG.rowsPerPage.en;

    const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));

    // Build table HTML with rowspan support
    const tablesHTML = this.buildTableHTMLWithRowspan(
      data,
      getColumnLabel,
      isRTL,
      rowsPerPage
    );

    // Always render at least one page (even if empty)
    const pagesToRender = tablesHTML.length > 0 ? tablesHTML : [""];

    // Build pages
    const pagesHTML = pagesToRender
      .map((tableHTML, index) => {
        const pageNumber = index + 1;
        return `
        <div class="page-content">
          ${this.buildHeaderHTML(pageNumber, totalPages)}
          <div class="content">
            ${tableHTML}
          </div>
          ${this.buildFooterHTML()}
        </div>
      `;
      })
      .join("");

    return `
    <!DOCTYPE html>
    <html lang="${isRTL ? "ar" : "en"}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        ${this.getBaseStyles(DOMAIN_DEPT_SPEC_PROBLEM_REPORT_CONFIG.landscape ?? false)}
      </style>
    </head>
    <body>
      <div class="page">
        ${pagesHTML}
      </div>
    </body>
    </html>
  `;
  }

  private buildTableHTMLWithRowspan(
    data: any[],
    getColumnLabel: (key: string) => string,
    isRTL: boolean,
    rowsPerPage: number
  ): string[] {
    const config = DOMAIN_DEPT_SPEC_PROBLEM_REPORT_CONFIG;
    const naText = isRTL ? "غير متاح" : "N/A";

    // Build header
    const headerHTML = `
      <tr>
        <th class="center" style="width: ${config.indexColumnWidth || 50}px;">${config.indexColumnHeader || "#"}</th>
        <th style="width: ${config.columnWidths?.domain || 200}px;">${getColumnLabel("domain")}</th>
        <th style="width: ${config.columnWidths?.department || 180}px;">${getColumnLabel("department")}</th>
        <th style="width: ${config.columnWidths?.specialization || 160}px;">${getColumnLabel("specialization")}</th>
        <th style="width: ${config.columnWidths?.problem || 160}px;">${getColumnLabel("problem")}</th>
        <th class="center" style="width: ${config.columnWidths?.ticketCount || 100}px;">${getColumnLabel("ticketCount")}</th>
      </tr>
    `;

    // Split data into pages
    const pages: any[][] = [];
    for (let i = 0; i < data.length; i += rowsPerPage) {
      pages.push(data.slice(i, i + rowsPerPage));
    }

    // If no data, return a single page with the header and an empty-state row
    if (pages.length === 0) {
      const noDataText = isRTL ? "لا توجد بيانات" : "No data available";
      return [`
        <table>
          <thead>${headerHTML}</thead>
          <tbody>
            <tr>
              <td colspan="6" class="center" style="padding: 20px; color: #999;">${noDataText}</td>
            </tr>
          </tbody>
        </table>
      `];
    }

    return pages.map((pageData, pageIndex) => {
      // Recalculate rowspans for this page only
      const pageDataWithRowspan = this.recalculateRowspansForPage(pageData);
      
      const rowsHTML = pageDataWithRowspan
        .map((row, rowIndex) => {
          // Calculate global index (across all pages)
          const globalIndex = pageIndex * rowsPerPage + rowIndex + (config.indexStartOffset || 1);
          const indexValue = formatNumber(globalIndex, isRTL);

          let cells = `<td class="center">${indexValue}</td>`;

          // Domain cell with rowspan
          if (row.domainRowspan > 0) {
            cells += `<td rowspan="${row.domainRowspan}">${row.domain || naText}</td>`;
          }

          // Department cell with rowspan
          if (row.departmentRowspan > 0) {
            cells += `<td rowspan="${row.departmentRowspan}">${row.department || naText}</td>`;
          }

          // Specialization cell with rowspan
          if (row.specializationRowspan > 0) {
            cells += `<td rowspan="${row.specializationRowspan}">${row.specialization || naText}</td>`;
          }

          // Problem and ticket count always shown
          cells += `<td>${row.problem || naText}</td>`;
          cells += `<td class="center">${formatNumber(row.ticketCount, isRTL)}</td>`;

          return `<tr>${cells}</tr>`;
        })
        .join("");

      return `
        <table>
          <thead>
            ${headerHTML}
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      `;
    });
  }

  /**
   * Recalculate rowspans for a single page
   * This prevents rowspan from crossing page boundaries
   */
  private recalculateRowspansForPage(pageData: any[]): any[] {
    if (pageData.length === 0) return [];

    const result: any[] = [];

    for (let i = 0; i < pageData.length; i++) {
      const current = pageData[i];
      let domainRowspan = 1;
      let departmentRowspan = 1;
      let specializationRowspan = 1;

      // Count consecutive rows with same domain ID (within this page only)
      for (let j = i + 1; j < pageData.length; j++) {
        if (pageData[j].domainId === current.domainId) {
          domainRowspan++;
        } else {
          break;
        }
      }

      // Count consecutive rows with same domain + department ID (within this page only)
      for (let j = i + 1; j < pageData.length; j++) {
        if (
          pageData[j].domainId === current.domainId &&
          pageData[j].departmentId === current.departmentId
        ) {
          departmentRowspan++;
        } else {
          break;
        }
      }

      // Count consecutive rows with same domain + department + specialization ID (within this page only)
      for (let j = i + 1; j < pageData.length; j++) {
        if (
          pageData[j].domainId === current.domainId &&
          pageData[j].departmentId === current.departmentId &&
          (pageData[j].specializationId || "null") ===
            (current.specializationId || "null")
        ) {
          specializationRowspan++;
        } else {
          break;
        }
      }

      // Determine if this is the first occurrence in the page (based on IDs, not values)
      const isFirstDomain =
        i === 0 ||
        pageData[i - 1].domainId !== current.domainId;
      
      const isFirstDepartment =
        i === 0 ||
        pageData[i - 1].domainId !== current.domainId ||
        pageData[i - 1].departmentId !== current.departmentId;
      
      const isFirstSpecialization =
        i === 0 ||
        pageData[i - 1].domainId !== current.domainId ||
        pageData[i - 1].departmentId !== current.departmentId ||
        (pageData[i - 1].specializationId || "null") !==
          (current.specializationId || "null");

      result.push({
        ...current,
        domainRowspan: isFirstDomain ? domainRowspan : 0,
        departmentRowspan: isFirstDepartment ? departmentRowspan : 0,
        specializationRowspan: isFirstSpecialization ? specializationRowspan : 0,
      });
    }

    return result;
  }
}
