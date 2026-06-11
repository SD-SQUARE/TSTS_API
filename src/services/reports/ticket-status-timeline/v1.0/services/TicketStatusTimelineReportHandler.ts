import {
    IReportHandler,
    ViewReportParams,
    DownloadReportParams,
} from "../../../handlers/IReportHandler.js";
import { PostgresDataSource } from "../../../../../database/postgres-data-source.js";
import { Lang } from "../../../../../types/lang.types.js";
import { PeriodType, ReportTypes } from "../../../types/report.types.js";
import { GenericTabularReportDownload } from "../../../utils/GenericTabularReportDownload.js";
import { TICKET_STATUS_TIMELINE_REPORT_CONFIG } from "../config/report.config.js";

export class TicketStatusTimelineReportHandler implements IReportHandler {
    async view(params: ViewReportParams): Promise<any> {
        const { report, filters, language, periodType, page, limit } = params;

        const whereConditions = ['t."deletedAt" IS NULL'];
        const queryParams: any[] = [];
        let paramIndex = 1;

        if (filters.status) {
            whereConditions.push(`t.status = $${paramIndex}`);
            queryParams.push(filters.status);
            paramIndex++;
        }

        if (filters.startDate) {
            whereConditions.push(`t."createdAt" >= $${paramIndex}`);
            queryParams.push(filters.startDate);
            paramIndex++;
        }

        if (filters.endDate) {
            whereConditions.push(`t."createdAt" <= $${paramIndex}`);
            queryParams.push(filters.endDate);
            paramIndex++;
        }

        const whereClause = whereConditions.join(" AND ");

        const query = `
      SELECT
        t.ticket_number as "ticketNumber",
        t.status,
        t."modifiedAt" as "changedAt",
        ROUND(EXTRACT(EPOCH FROM (t."modifiedAt" - t."createdAt")) / 3600, 2) as duration
      FROM tickets t
      WHERE ${whereClause}
      ORDER BY t."modifiedAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

        const countQuery = `
      SELECT COUNT(*) as total FROM tickets t WHERE ${whereClause}
    `;

        const offset = (page - 1) * limit;
        queryParams.push(limit, offset);

        const [results, countResult] = await Promise.all([
            PostgresDataSource.query(query, queryParams),
            PostgresDataSource.query(countQuery, queryParams.slice(0, -2)),
        ]);

        // Chart: tickets created per period
        const statistics = await this.getStatistics(filters, periodType);

        const total = parseInt(countResult[0]?.total || "0", 10);
        const totalPages = Math.ceil(total / limit);

        const columns = (report.columns || []).map((col) => ({
            key: col.key,
            label: col.label[language as Lang] || col.label.en || col.key,
        }));

        const allRecords = results.map((item: any, index: number) => ({
            index: index + 1 + offset,
            ticketNumber: item.ticketNumber,
            status: item.status,
            changedAt: item.changedAt ? new Date(item.changedAt).toLocaleDateString() : "—",
            duration: item.duration || 0,
        }));

        return {
            id: report.id,
            title: report.title[language as Lang] || report.title.en || "",
            statistics,
            filters: (report.filters || []).map((f) => f.column),
            columns: [{ key: "index", label: "#" }, ...columns],
            records: allRecords,
            meta: { page_size: limit, page_index: page, total, total_pages: totalPages },
        };
    }

    private async getStatistics(filters: any, periodType?: PeriodType) {
        const period = periodType || PeriodType.MONTH;
        let dateFormat: string;
        switch (period) {
            case PeriodType.DAY: dateFormat = "YYYY-MM-DD"; break;
            case PeriodType.YEAR: dateFormat = "YYYY"; break;
            default: dateFormat = "YYYY-MM";
        }

        const conditions = ['t."deletedAt" IS NULL'];
        const params: any[] = [];
        let idx = 1;

        if (filters?.startDate) { conditions.push(`t."createdAt" >= $${idx++}`); params.push(filters.startDate); }
        if (filters?.endDate) { conditions.push(`t."createdAt" <= $${idx++}`); params.push(filters.endDate); }
        if (filters?.status) { conditions.push(`t.status = $${idx++}`); params.push(filters.status); }

        // Chart: tickets modified (status changed) per period
        const rows = await PostgresDataSource.query(`
      SELECT TO_CHAR(t."modifiedAt", '${dateFormat}') as period, COUNT(t.id) as value
      FROM tickets t
      WHERE ${conditions.join(" AND ")}
      GROUP BY period ORDER BY period ASC
    `, params);

        return rows.map((r: any) => ({ period: r.period, value: parseInt(r.value, 10) }));
    }

    async download(params: DownloadReportParams): Promise<void> {
        const { report, filters, language, type, user, res } = params;

        const viewResult = await this.view({
            report, filters, language,
            periodType: PeriodType.MONTH,
            page: 1, limit: 10000,
        });

        const recordsForPdf = viewResult.records.map(({ index: _i, ...rest }: any) => rest);

        return GenericTabularReportDownload.download({
            report, type, language, user, res, filters,
            records: type === ReportTypes.PDF ? recordsForPdf : viewResult.records,
            reportConfig: TICKET_STATUS_TIMELINE_REPORT_CONFIG,
        });
    }
}
