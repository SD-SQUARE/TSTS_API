import {
    IReportHandler,
    ViewReportParams,
    DownloadReportParams,
} from "../../../handlers/IReportHandler.js";
import { PostgresDataSource } from "../../../../../database/postgres-data-source.js";
import { Lang } from "../../../../../types/lang.types.js";
import { PeriodType, ReportTypes } from "../../../types/report.types.js";
import { GenericTabularReportDownload } from "../../../utils/GenericTabularReportDownload.js";
import { TECHNICIAN_PERFORMANCE_REPORT_CONFIG } from "../config/report.config.js";

export class TechnicianPerformanceReportHandler implements IReportHandler {
    async view(params: ViewReportParams): Promise<any> {
        const { report, filters, language, periodType, page, limit } = params;

        const whereConditions = ['t."deletedAt" IS NULL', "tech.user_type = 'Technician'"];
        const queryParams: any[] = [];
        let paramIndex = 1;

        if (filters.technician) {
            whereConditions.push(`tech.id = $${paramIndex}`);
            queryParams.push(filters.technician);
            paramIndex++;
        }

        if (filters.specialization) {
            whereConditions.push(`s.id = $${paramIndex}`);
            queryParams.push(filters.specialization);
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

        const fullNameExtract = language === "ar"
            ? `COALESCE(tech."fullName"->>'ar', tech."fullName"->>'en', 'N/A')`
            : `COALESCE(tech."fullName"->>'en', tech."fullName"->>'ar', 'N/A')`;

        const query = `
      SELECT
        ${fullNameExtract} as "technicianName",
        COUNT(DISTINCT t.id) as "assignedTickets",
        COUNT(DISTINCT CASE WHEN t.status IN ('resolved', 'closed') THEN t.id END) as "resolvedTickets",
        ROUND(AVG(
          CASE WHEN t.status IN ('resolved', 'closed')
            THEN EXTRACT(EPOCH FROM (t."modifiedAt" - t."createdAt")) / 3600.0
          END
        ), 2) as "avgResolutionTime",
        ROUND(
          CASE WHEN COUNT(DISTINCT t.id) > 0
            THEN COUNT(DISTINCT CASE WHEN t.status IN ('resolved', 'closed') THEN t.id END)::numeric
                 / COUNT(DISTINCT t.id) * 100
          END, 2
        ) as "resolutionRate"
      FROM tickets t
      INNER JOIN ticket_assignees ta ON t.id = ta.ticket_id
      INNER JOIN users tech ON ta.user_id = tech.id
      LEFT JOIN specializations s ON t."specializationId" = s.id
      WHERE ${whereClause}
      GROUP BY tech.id, tech."fullName"
      ORDER BY "resolvedTickets" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

        const countQuery = `
      SELECT COUNT(DISTINCT tech.id) as total
      FROM tickets t
      INNER JOIN ticket_assignees ta ON t.id = ta.ticket_id
      INNER JOIN users tech ON ta.user_id = tech.id
      WHERE ${whereClause}
    `;

        const offset = (page - 1) * limit;
        queryParams.push(limit, offset);

        const [results, countResult] = await Promise.all([
            PostgresDataSource.query(query, queryParams),
            PostgresDataSource.query(countQuery, queryParams.slice(0, -2)),
        ]);

        // Chart: resolved tickets per period
        const statistics = await this.getStatistics(filters, periodType);

        const total = parseInt(countResult[0]?.total || "0", 10);
        const totalPages = Math.ceil(total / limit);

        const columns = (report.columns || []).map((col) => ({
            key: col.key,
            label: col.label[language as Lang] || col.label.en || col.key,
        }));

        const allRecords = results.map((item: any, index: number) => ({
            index: index + 1 + offset,
            technicianName: item.technicianName || "—",
            assignedTickets: parseInt(item.assignedTickets, 10),
            resolvedTickets: parseInt(item.resolvedTickets, 10),
            avgResolutionTime: item.avgResolutionTime || 0,
            resolutionRate: item.resolutionRate || 0,
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

        // Chart shows resolved tickets per period
        const rows = await PostgresDataSource.query(`
      SELECT
        TO_CHAR(t."createdAt", '${dateFormat}') as period,
        COUNT(DISTINCT CASE WHEN t.status IN ('resolved', 'closed') THEN t.id END) as value
      FROM tickets t
      INNER JOIN ticket_assignees ta ON t.id = ta.ticket_id
      INNER JOIN users tech ON ta.user_id = tech.id
      WHERE ${conditions.join(" AND ")} AND tech.user_type = 'Technician'
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
            reportConfig: TECHNICIAN_PERFORMANCE_REPORT_CONFIG,
        });
    }
}
