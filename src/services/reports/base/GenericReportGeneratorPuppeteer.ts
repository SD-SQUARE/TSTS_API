import { BaseReportGeneratorPuppeteer } from "./BaseReportGeneratorPuppeteer.js";
import { BaseReportConfig, TableData } from "../types/report.types.js";
import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { Report } from "../../../entities/Report.js";
import { ReportHandler } from "../../../enums/ReportHandler.enum.js";
import {
  ReportStyleConfig,
  mergeReportStyleConfig,
} from "./base.report.config.js";
import { formatNumber } from "../../../utils/NumberHelper.js";

export interface GenericReportConfig {
  reportHandler: ReportHandler;
  rowsPerPage: number | { en: number; ar: number }; // Support different rows per page for each language
  indexColumnHeader?: string;
  indexColumnWidth?: number;
  indexStartOffset?: number;
  showIndex?: boolean;
  columnMappings?: Record<string, string>; // Map data keys to column keys in DB
  columnWidths?: Record<string, number>; // Map data keys to column widths in pixels
  columnAlignments?: Record<string, "left" | "center" | "right">; // Map data keys to alignments
  styleConfig?: ReportStyleConfig; // Custom styling that overrides base config
}

/**
 * Generic configurable report generator
 * Can be used for any report by providing configuration
 */
export class GenericReportGeneratorPuppeteer extends BaseReportGeneratorPuppeteer {
  private reportData: Report | null = null;
  private reportConfig: GenericReportConfig;

  constructor(config: BaseReportConfig, reportConfig: GenericReportConfig) {
    // Merge style config with base config
    const mergedStyleConfig = mergeReportStyleConfig(reportConfig.styleConfig);

    super(config, mergedStyleConfig);
    this.reportConfig = reportConfig;
  }

  /**
   * Load report configuration from database
   */
  private async loadReportData(): Promise<void> {
    if (this.reportData) return;

    const reportRepo = PostgresDataSource.getRepository(Report);
    this.reportData = await reportRepo.findOne({
      where: { handler: this.reportConfig.reportHandler },
    });

    if (!this.reportData) {
      throw new Error(
        `Report with handler ${this.reportConfig.reportHandler} not found in database`,
      );
    }
  }

  async generate(input: any[] | { data: any[] }): Promise<Buffer> {
    const html = await this.buildHTML(input);
    return this.generatePDFFromHTML(html);
  }

  protected async buildHTML(input: any[] | { data: any[] }): Promise<string> {
    // Load report data from database
    await this.loadReportData();

    // Support both array and object with data property
    const data = Array.isArray(input) ? input : input.data;

    // Get translations from config
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

    // Build table columns
    const tableColumns: any[] = [];

    // Add index column if enabled
    if (this.reportConfig.showIndex !== false) {
      tableColumns.push({
        header:
          this.reportConfig.indexColumnHeader ||
          translations.columnIndex ||
          "#",
        dataKey: "index",
        width: this.reportConfig.indexColumnWidth,
        alignment: "center",
      });
    }

    // Add data columns from first row keys
    if (data.length > 0) {
      const firstRow = data[0];
      Object.keys(firstRow).forEach((key) => {
        // Map the key if mapping exists
        const mappedKey = this.reportConfig.columnMappings?.[key] || key;

        // Get width from config or undefined for auto
        const width = this.reportConfig.columnWidths?.[key];

        // Get alignment from config or default based on RTL
        const alignment =
          this.reportConfig.columnAlignments?.[key] ||
          (isRTL ? "right" : "left");

        tableColumns.push({
          header: getColumnLabel(mappedKey),
          dataKey: key,
          width: width,
          alignment: alignment,
        });
      });
    }

    // Prepare table data with formatted numbers for Arabic
    const tableData: TableData = {
      columns: tableColumns,
      rows: data.map((item, index) => {
        const row: Record<string, any> = {};
        
        // Add index if enabled
        if (this.reportConfig.showIndex !== false) {
          const indexValue = index + (this.reportConfig.indexStartOffset || 1);
          row.index = formatNumber(indexValue, isRTL);
        }
        
        // Add data columns with formatted numbers
        Object.keys(item).forEach((key) => {
          const value = item[key];
          // Format numbers for Arabic
          if (typeof value === 'number') {
            row[key] = formatNumber(value, isRTL);
          } else if (typeof value === 'string' && !isNaN(Number(value))) {
            // If it's a numeric string, format it
            row[key] = formatNumber(value, isRTL);
          } else {
            row[key] = value;
          }
        });
        
        return row;
      }),
      isRTL: isRTL,
    };

    // Calculate total pages based on language
    const rowsPerPage = typeof this.reportConfig.rowsPerPage === 'number'
      ? this.reportConfig.rowsPerPage
      : isRTL
        ? this.reportConfig.rowsPerPage.ar
        : this.reportConfig.rowsPerPage.en;
    const totalPages = Math.ceil(data.length / rowsPerPage);

    // Build table HTML for each page
    const tablesHTML = this.buildTableHTML(tableData, rowsPerPage);

    // Build pages
    const pagesHTML = tablesHTML
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

    // Build HTML
    return `
    <!DOCTYPE html>
    <html lang="${isRTL ? "ar" : "en"}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        ${this.getBaseStyles()}
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
}
