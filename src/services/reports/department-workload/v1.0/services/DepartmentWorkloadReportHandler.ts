import {
    IReportHandler,
    ViewReportParams,
    DownloadReportParams,
} from "../../../handlers/IReportHandler.js";
import { PostgresDataSource } from "../../../../../database/postgres-data-source.js";
import { Lang } from "../../../../../types/lang.types.js";
import { PeriodType, ReportTypes } from "../../../types/report.types.js";
import { GenericTabularReportDownload } from "../../../utils/GenericTabularReportDownload.js";
import { DEPARTMENT_WORKLOAD_REPORT_CONFIG } from "../config/report.config.js";

export class DepartmentWorkloadReportHandler implements IReportHandler {
    async view(params: ViewReportParams): Promise<any> {
        const { report, filters, language, periodType, page, limit } = params;

        const whereConditions = ['t."deletedAt" IS NULL'];
        const queryParams: any[] = [];
        let paramIndex = 1;

        if (filters.department) {
            whereConditions.push(`dept.id = $${paramIndex}`);
            queryParams.push(filters.department);
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
        dept.name as department,
        COUNT(DISTINCT CASE WHEN t.status IN ('open', 're_open') THEN t.id END) as "openTickets",
        COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as "inProgressTickets",
        COUNT(DISTINCT CASE WHEN t.status IN ('resolved', 'closed') THEN t.id END) as "resolvedTickets",
        ROUND(AVG(
          CASE WHEN t.status IN ('resolved', 'closed')
            THEN EXTRACT(EPOCH FROM (t."modifiedAt" - t."createdAt")) / 3600.0
          END
        ), 2) as "avgHandlingTime"
      FROM tickets t
      INNER JOIN users u ON t."requesterId" = u.id
      INNER JOIN user_departments ud ON u.id = ud."userId"
      INNER JOIN departments dept ON ud."departmentId" = dept.id
      WHERE ${whereClause}
      GROUP BY dept.id, dept.name
      ORDER BY "openTickets" DESC, "inProgressTickets" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

        const countQuery = `
      SELECT COUNT(DISTINCT dept.id) as total
      FROM tickets t
      INNER JOIN users u ON t."requesterId" = u.id
      INNER JOIN user_departments ud ON u.id = ud."userId"
      INNER JOIN departments dept ON ud."departmentId" = dept.id
      WHERE ${whereClause}
    `;

        const offset = (page - 1) * limit;
        queryParams.push(limit, offset);

        const [results, countResult] = await Promise.all([
            PostgresDataSource.query(query, queryParams),
            PostgresDataSource.query(countQuery, queryParams.slice(0, -2)),
        ]);

        // Chart: tickets per department over time
        const statistics = await this.getStatistics(filters, periodType);

        const total = parseInt(countResult[0]?.total || "0", 10);
        const totalPages = Math.ceil(total / limit);

        const columns = (report.columns || []).map((col) => ({
            key: col.key,
            label: col.label[language as Lang] || col.label.en || col.key,
        }));

        const allRecords = results.map((item: any, index: number) => ({
            index: index + 1 + offset,
            department: item.department
                ? (item.department[language as Lang] || item.department.en || JSON.stringify(item.department))
                : "—",
            openTickets: parseInt(item.openTickets, 10),
            inProgressTickets: parseInt(item.inProgressTickets, 10),
            resolvedTickets: parseInt(item.resolvedTickets, 10),
            avgHandlingTime: item.avgHandlingTime || 0,
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

        // For department workload, show open vs resolved tickets per period
        const rows = await PostgresDataSource.query(`
      SELECT
        TO_CHAR(t."createdAt", '${dateFormat}') as period,
        COUNT(t.id) as value
      FROM tickets t
      INNER JOIN users u ON t."requesterId" = u.id
      INNER JOIN user_departments ud ON u.id = ud."userId"
      INNER JOIN departments dept ON ud."departmentId" = dept.id
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
            reportConfig: DEPARTMENT_WORKLOAD_REPORT_CONFIG,
        });
    }
}
