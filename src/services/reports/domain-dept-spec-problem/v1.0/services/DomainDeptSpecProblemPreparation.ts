import { t } from "i18next";
import { PostgresDataSource } from "../../../../../database/postgres-data-source.js";
import { Lang } from "../../../../../types/lang.types.js";
import {
  DomainDeptSpecProblemFilter,
  DomainDeptSpecProblemRecord,
} from "../interfaces/index.js";
import { ValidatorsUtils } from "../../../../../utils/validators.utils.js";

export interface PaginatedResult {
  results: DomainDeptSpecProblemRecord[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export class DomainDeptSpecProblemPreparation {
  static validateFilter(
    filter: DomainDeptSpecProblemFilter,
    lang: Lang = "en",
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate date range
    const dateValidation = ValidatorsUtils.validateDateRange(
      filter.startDate,
      filter.endDate,
      lang,
    );
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.errors);
    }

    const uuidFields = [
      {
        key: "specialization",
        label: t("common.specializations", { lng: lang }),
      },
      { key: "domain", label: t("common.domains", { lng: lang }) },
      { key: "department", label: t("common.departments", { lng: lang }) },
      { key: "problem", label: t("common.problems", { lng: lang }) },
    ];

    uuidFields.forEach((field) => {
      const ids = filter.groupedFilters?.[field.key];

      if (ids?.length) {
        const result = ValidatorsUtils.validateUUID(ids, field.label, lang);
        if (!result.isValid) errors.push(...result.errors);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get data from stored procedure.
   * When paginate=true, limit/offset are pushed down to the SP.
   * When paginate=false (PDF/Excel), NULL is passed so the SP returns all rows.
   */
  static async getDomainDeptSpecProblemData(
    filter: DomainDeptSpecProblemFilter,
    language: Lang = "en",
    paginate: boolean = false,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult> {
    const startDate = filter.startDate ? new Date(filter.startDate) : null;
    const endDate = filter.endDate ? new Date(filter.endDate) : null;

    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
    }

    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    const baseParams: any[] = [
      language,
      startDate,
      endDate,
      filter.groupedFilters?.domain ?? null,
      filter.groupedFilters?.department ?? null,
      filter.groupedFilters?.specialization ?? null,
      filter.groupedFilters?.problem ?? null,
    ];

    const na = t("common.not_available", { lng: language });
    const mapRow = (row: any): DomainDeptSpecProblemRecord => ({
      domainId: row.domain_id,
      domain: row.domain_name || na,
      departmentId: row.department_id,
      department: row.department_name || na,
      specializationId: row.specialization_id,
      specialization: row.specialization_name || na,
      problemId: row.problem_id,
      problem: row.problem_name || na,
      ticketCount: parseInt(row.ticket_count, 10),
    });

    if (paginate) {
      const offset = (page - 1) * limit;

      // Paginated query — DB handles limit/offset
      const [rows, countRows] = await Promise.all([
        PostgresDataSource.query(
          `SELECT * FROM get_domain_dept_spec_problem_report($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [...baseParams, limit, offset],
        ),
        // Count query — same SP with no limit/offset, only count
        PostgresDataSource.query(
          `SELECT COUNT(*) FROM get_domain_dept_spec_problem_report($1,$2,$3,$4,$5,$6,$7,NULL,NULL)`,
          baseParams,
        ),
      ]);

      const totalItems = parseInt(countRows[0].count, 10);

      return {
        results: rows.map(mapRow),
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        pageSize: limit,
      };
    }

    // Non-paginated (PDF/Excel) — fetch all rows
    const rawResults = await PostgresDataSource.query(
      `SELECT * FROM get_domain_dept_spec_problem_report($1,$2,$3,$4,$5,$6,$7,NULL,NULL)`,
      baseParams,
    );

    const results = rawResults.map(mapRow);
    return {
      results,
      totalItems: results.length,
      totalPages: 1,
      currentPage: 1,
      pageSize: results.length,
    };
  }

  /**
   * Prepare data for report (PDF/Excel) with rowspan calculation
   * IDs are included so the generator can recalculate rowspans per page
   */
  static prepareForReport(records: DomainDeptSpecProblemRecord[]): Array<{
    domainId: string;
    domain: string;
    domainRowspan: number;
    departmentId: string;
    department: string;
    departmentRowspan: number;
    specializationId: string | null;
    specialization: string;
    specializationRowspan: number;
    problemId: string | null;
    problem: string;
    ticketCount: number;
  }> {
    if (records.length === 0) return [];

    return records.map((record) => ({
      domainId: record.domainId,
      domain: record.domain,
      domainRowspan: 0, // recalculated per-page in the generator
      departmentId: record.departmentId,
      department: record.department,
      departmentRowspan: 0,
      specializationId: record.specializationId,
      specialization: record.specialization,
      specializationRowspan: 0,
      problemId: record.problemId,
      problem: record.problem,
      ticketCount: record.ticketCount,
    }));
  }

  /**
   * Prepare data for view (JSON) - no collapsing for better readability
   */
  static prepareForView(records: DomainDeptSpecProblemRecord[]): Array<{
    domain: string;
    department: string;
    specialization: string;
    problem: string;
    ticketCount: number;
  }> {
    return records.map((record) => ({
      domain: record.domain,
      department: record.department,
      specialization: record.specialization,
      problem: record.problem,
      ticketCount: record.ticketCount,
    }));
  }
}
