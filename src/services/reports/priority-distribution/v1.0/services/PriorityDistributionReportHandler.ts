import {
    IReportHandler,
    ViewReportParams,
    DownloadReportParams,
} from "../../../handlers/IReportHandler.js";
import { PostgresDataSource } from "../../../../../database/postgres-data-source.js";
import { Lang } from "../../../../../types/lang.types.js";
import { PeriodType, ReportTypes } from "../../../types/report.types.js";
import { GenericTabularReportDownload } from "../../../utils/GenericTabularReportDownload.js";
import { PRIORITY_DISTRIBUTION_REPORT_CONFIG } from "../config/report.config.js";

export class PriorityDistributionReportHandler implements IReportHandler {
    async view(params: ViewReportParams): Promise<any> {
        const { report, filters, language, periodType, page, limit } = params;

        const whereConditions = ['t."deletedAt" IS NULL'];
        const queryParams: any[] = [];
        let paramIndex = 1;

        if (filters.priority) {
            whereConditions.push(`t.priority = $${paramIndex}`);
            queryParams.push(filters.priority);
            paramIndex++;
        }

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
      WITH total_count AS (
        SELECT COUNT(*) as total FROM tickets WHERE "deletedAt" IS NULL
      )
      SELECT
        t.priority,
        COUNT(t.id) as "ticketCount",
        ROUND(AVG(
          CASE WHEN t.status IN ('resolved', 'closed')
            THEN EXTRACT(EPOCH FROM (t."modifiedAt" - t."createdAt")) / 3600.0
          END
        ), 2) as "avgResolutionTime",
        ROUND((COUNT(t.id)::numeric / NULLIF((SELECT total FROM total_count), 0) * 100), 2) as percentage
      FROM tickets t
      WHERE ${whereClause}
      GROUP BY t.priority
      ORDER BY
        CASE t.priority
          WHEN 'important/urgent' THEN 1
          WHEN 'important' THEN 2
          WHEN 'urgent' THEN 3
          WHEN 'NA' THEN 4
          ELSE 5
        END
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

        const countQuery = `
      SELECT COUNT(DISTINCT t.priority) as total
      FROM tickets t
      WHERE ${whereClause}
    `;

        const offset = (page - 1) * limit;
        queryParams.push(limit, offset);

        const [results, countResult] = await Promise.all([
            PostgresDataSource.query(query, queryParams),
            PostgresDataSource.query(countQuery, queryParams.slice(0, -2)),
        ]);

        // Chart: ticket count per priority (as a bar-like time series)
        const statistics = await this.getStatistics(filters, periodType);

        const total = parseInt(countResult[0]?.total || "0", 10);
        const totalPages = Math.ceil(total / limit);

        const columns = (report.columns || []).map((col) => ({
            key: col.key,
            label: col.label[language as Lang] || col.label.en || col.key,
        }));

        const allRecords = results.map((item: any, index: number) => ({
            index: index + 1 + offset,
            priority: item.priority || "—",
            ticketCount: parseInt(item.ticketCount, 10),
            avgResolutionTime: item.avgResolutionTime || 0,
            percentage: parseFloat(item.percentage) || 0,
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

        // Chart: tickets per period grouped by priority level
        const rows = await PostgresDataSource.query(`
      SELECT TO_CHAR(t."createdAt", '${dateFormat}') as period, COUNT(t.id) as value
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
            reportConfig: PRIORITY_DISTRIBUTION_REPORT_CONFIG,
        });
    }
}
