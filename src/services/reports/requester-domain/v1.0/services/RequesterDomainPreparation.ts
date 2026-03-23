import { t } from "i18next";
import { PostgresDataSource } from "../../../../../database/postgres-data-source.js";
import { Lang } from "../../../../../types/lang.types.js";
import {
  RequesterDomainFilter,
  RequesterDomainRecord,
} from "../interfaces/index.js";
import { ValidatorsUtils } from "../../../../../utils/validators.utils.js";

export interface PaginatedResult {
  results: RequesterDomainRecord[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export class RequesterDomainPreparation {
  static validateFilter(
    filter: RequesterDomainFilter,
    language: Lang = "en",
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const dateValidation = ValidatorsUtils.validateDateRange(
      filter.startDate,
      filter.endDate,
      language,
    );
    if (!dateValidation.isValid) errors.push(...dateValidation.errors);

    const uuidFields = [
      { key: "domain", label: t("common.domains", { lng: language }) },
      { key: "user", label: t("common.requesters", { lng: language }) },
    ];

    uuidFields.forEach((field) => {
      const ids =
        filter.groupedFilters?.[
          field.key as keyof typeof filter.groupedFilters
        ];
      if (ids?.length) {
        const result = ValidatorsUtils.validateUUID(ids, field.label, language);
        if (!result.isValid) errors.push(...result.errors);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  static async getData(
    filter: RequesterDomainFilter,
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
      filter.groupedFilters?.user ?? null,
    ];

    const na = t("common.not_available", { lng: language });
    const mapRow = (row: any): RequesterDomainRecord => ({
      requesterId: row.requester_id,
      requesterName: row.requester_name || na,
      domainId: row.domain_id,
      domain: row.domain_name || na,
      ticketCount: parseInt(row.ticket_count, 10),
    });

    if (paginate) {
      const offset = (page - 1) * limit;
      const [rows, countRows] = await Promise.all([
        PostgresDataSource.query(
          `SELECT * FROM get_requester_domain_report($1,$2,$3,$4,$5,$6,$7)`,
          [...baseParams, limit, offset],
        ),
        PostgresDataSource.query(
          `SELECT COUNT(*) FROM get_requester_domain_report($1,$2,$3,$4,$5,NULL,NULL)`,
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

    const rawResults = await PostgresDataSource.query(
      `SELECT * FROM get_requester_domain_report($1,$2,$3,$4,$5,NULL,NULL)`,
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

  static prepareForView(records: RequesterDomainRecord[]) {
    return records.map((r) => ({
      requesterName: r.requesterName,
      domain: r.domain,
      ticketCount: r.ticketCount,
    }));
  }
}
