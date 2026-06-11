import ExcelJS from "exceljs";
import { Lang } from "../../../types/lang.types.js";
import { ReportTypes } from "../types/report.types.js";
import { TokenHelper } from "../../../helpers/TokenHelper.js";
import { formatDateForReport } from "../../../utils/DateHelper.js";
import { ReportTranslationHelper } from "../utils/ReportTranslationHelper.js";
import { GenericReportGeneratorPuppeteer } from "../base/GenericReportGeneratorPuppeteer.js";
import { BaseReportConfig } from "../types/report.types.js";
import { GenericReportConfig } from "../base/GenericReportGeneratorPuppeteer.js";

export interface TabularDownloadParams {
    report: any;
    records: Record<string, any>[];
    type: ReportTypes;
    language: Lang;
    user: any;
    res: any;
    filters?: any;
    reportConfig: GenericReportConfig;
}

export class GenericTabularReportDownload {
    static async download(params: TabularDownloadParams): Promise<void> {
        const { type } = params;

        if (type === ReportTypes.PDF) {
            return this.downloadPDF(params);
        } else if (type === ReportTypes.EXCEL) {
            return this.downloadExcel(params);
        } else {
            throw new Error(`Unsupported report type: ${type}`);
        }
    }

    // ─── PDF using the same GenericReportGeneratorPuppeteer as existing reports ──

    static async downloadPDF(params: TabularDownloadParams): Promise<void> {
        const { report, records, language, user, res, filters, reportConfig } = params;

        const translations = ReportTranslationHelper.getCommonTranslations(language);

        const generatedBy = user
            ? (language === "ar"
                ? TokenHelper.getUserFromReqUser(user).fullNameAr
                : TokenHelper.getUserFromReqUser(user).fullNameEn)
            : "";

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

        const generator = new GenericReportGeneratorPuppeteer(baseConfig, reportConfig);
        await generator.generateStream({ data: records }, res);
    }

    // ─── Excel using ExcelJS (same library as the rest of the codebase) ──────────

    static async downloadExcel(params: TabularDownloadParams): Promise<void> {
        const { report, records, language, res, reportConfig } = params;

        const reportTitle = (report.title[language as Lang] || report.title.en || "Report").substring(0, 31);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "TSTS";
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet(reportTitle);

        // Build columns from reportConfig columnMappings + widths
        const mappings = reportConfig.columnMappings || {};
        const widths = reportConfig.columnWidths || {};
        const alignments = reportConfig.columnAlignments || {};

        // Get column keys from first record (skip 'index' - we add it separately)
        const dataKeys = records.length > 0
            ? Object.keys(records[0]).filter(k => k !== 'index')
            : Object.keys(mappings).filter(k => k !== 'index');

        // Build ExcelJS column definitions
        const excelColumns: Partial<ExcelJS.Column>[] = [];

        // Index column
        if (reportConfig.showIndex !== false) {
            excelColumns.push({ header: reportConfig.indexColumnHeader || "#", key: "index", width: 8 });
        }

        // Data columns
        dataKeys.forEach(key => {
            excelColumns.push({
                header: key, // will be overridden by header row styling
                key,
                width: widths[key] ? Math.round(widths[key] / 7) : 20,
            });
        });

        worksheet.columns = excelColumns;

        // We need the translated column labels from the report entity
        // Use the column mappings to get labels from the report's columns array
        const reportColumns: Record<string, string> = {};
        if (report.columns) {
            for (const col of report.columns) {
                reportColumns[col.key] = col.label[language as Lang] || col.label.en || col.key;
            }
        }

        // Override header row with translated labels
        const headerRow = worksheet.getRow(1);
        let colIdx = 1;
        if (reportConfig.showIndex !== false) {
            headerRow.getCell(colIdx++).value = reportConfig.indexColumnHeader || "#";
        }
        dataKeys.forEach(key => {
            headerRow.getCell(colIdx++).value = reportColumns[key] || key;
        });

        // Style header row
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A6FA5" } };
        headerRow.alignment = { horizontal: "center", vertical: "middle" };
        headerRow.height = 24;

        // Add data rows
        records.forEach((record, i) => {
            const rowValues: any[] = [];
            if (reportConfig.showIndex !== false) {
                rowValues.push(record.index ?? i + 1);
            }
            dataKeys.forEach(key => rowValues.push(record[key] ?? ""));

            const row = worksheet.addRow(rowValues);

            // Alternating row color
            if (i % 2 === 1) {
                row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F7FA" } };
            }
            row.alignment = { vertical: "middle" };

            // Apply column alignments
            let cellIdx = reportConfig.showIndex !== false ? 2 : 1;
            dataKeys.forEach(key => {
                const align = alignments[key];
                if (align) {
                    row.getCell(cellIdx).alignment = { horizontal: align, vertical: "middle" };
                }
                cellIdx++;
            });
        });

        // Apply borders to all cells
        worksheet.eachRow(row => {
            row.eachCell(cell => {
                cell.border = {
                    top: { style: "thin", color: { argb: "FFDDDDDD" } },
                    left: { style: "thin", color: { argb: "FFDDDDDD" } },
                    bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
                    right: { style: "thin", color: { argb: "FFDDDDDD" } },
                };
            });
        });

        const filename = `report-${report.handler}-${Date.now()}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

        await workbook.xlsx.write(res);
        res.end();
    }
}
