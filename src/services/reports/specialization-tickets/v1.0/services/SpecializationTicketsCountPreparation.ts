import { Between, In } from "typeorm";
import { FilterUtils } from "../../../utils/FilterUtils.js";
import {
  PaginatedSpecializationTicketData,
  SpecializationTicketDataWithMeta,
  SpecializationTicketsFilter,
} from "../types/index.js";
import { PostgresDataSource } from "../../../../../database/postgres-data-source.js";
import { Lang } from "../../../../../types/lang.types.js";
import { Ticket } from "../../../../../entities/Ticket.js";
import { Specialization } from "../../../../../entities/Specialization.js";
import { ValidatorsUtils } from "../../../../../utils/validators.utils.js";
import { PeriodType } from "../../../types/report.types.js";

export class SpecializationTicketsCountPreparation {
  /**
   * Validate filter before applying
   */
  static validateFilter(filter: SpecializationTicketsFilter): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate date range
    const dateValidation = ValidatorsUtils.validateDateRange(
      filter.startDate,
      filter.endDate,
    );
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.errors);
    }

    // Validate specialization IDs if present
    if (
      filter.groupedFilters &&
      filter.groupedFilters.specialization &&
      filter.groupedFilters.specialization.length > 0
    ) {
      const idsValidation = ValidatorsUtils.validateUUID(
        filter.groupedFilters.specialization,
      );
      if (!idsValidation.isValid) {
        errors.push(...idsValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Prepare data for report (remove metadata fields)
   */
  static prepareForReport(data: SpecializationTicketDataWithMeta[]): Array<{
    specialization: string;
    ticketsCount: number;
  }> {
    return data.map((item) => ({
      specialization: item.specialization,
      ticketsCount: item.ticketsCount,
    }));
  }

  static async getSpecializationTicketsCountData(
    filter?: SpecializationTicketsFilter,
    language: Lang = "en",
    isForView: boolean = true,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedSpecializationTicketData> {
    const ticketRepo = PostgresDataSource.getRepository(Ticket);
    const specializationRepo = PostgresDataSource.getRepository(Specialization);

    // Build query conditions for tickets
    const whereConditions: any = {};

    // Date range filter - only apply if at least one date is provided
    if (filter?.startDate && filter?.endDate) {
      whereConditions.createdAt = Between(
        new Date(filter.startDate),
        new Date(filter.endDate),
      );
    } else if (filter?.startDate) {
      whereConditions.createdAt = Between(
        new Date(filter.startDate),
        new Date(),
      );
    } else if (filter?.endDate) {
      whereConditions.createdAt = Between(
        new Date("1970-01-01"),
        new Date(filter.endDate),
      );
    }

    // Group filters by column (use pre-grouped if available)
    const groupedFilters = filter?.groupedFilters
      ? filter.groupedFilters
      : filter?.filters && filter.filters.length > 0
        ? FilterUtils.groupFiltersByColumn(filter.filters)
        : {};

    // Apply grouped filters
    if (
      groupedFilters.specialization &&
      groupedFilters.specialization.length > 0
    ) {
      whereConditions.specialization = {
        id: In(groupedFilters.specialization),
      };
    }

    // Fetch specializations based on filter
    let specializationWhere: any = {};
    if (
      groupedFilters.specialization &&
      groupedFilters.specialization.length > 0
    ) {
      specializationWhere = { id: In(groupedFilters.specialization) };
    }

    const specializations = await specializationRepo.find({
      where: specializationWhere,
      order: { createdAt: "DESC" },
    });

    // Count tickets for each specialization
    const specializationData: SpecializationTicketDataWithMeta[] = [];

    for (const spec of specializations) {
      const ticketCount = await ticketRepo.count({
        where: {
          ...whereConditions,
          specialization: { id: spec.id },
        },
      });

      // Get the latest ticket date for this specialization
      const latestTicket = await ticketRepo.findOne({
        where: {
          specialization: { id: spec.id },
        },
        order: { createdAt: "DESC" },
      });

      specializationData.push({
        id: spec.id,
        specialization:
          spec.name[language] || spec.name.en || spec.name.ar || "Unknown",
        ticketsCount: ticketCount,
        createdAt: latestTicket?.createdAt || spec.createdAt,
      });
    }

    // Sort by ticket count descending (before pagination)
    specializationData.sort((a, b) => b.ticketsCount - a.ticketsCount);

    // Apply pagination to the sorted data (if isForView is true)
    const totalSpecializations = specializationData.length;
    let paginatedResults: SpecializationTicketDataWithMeta[] = [];

    if (isForView) {
      const offset = (page - 1) * limit;
      paginatedResults = specializationData.slice(offset, offset + limit);
    } else {
      paginatedResults = specializationData;
    }

    return {
      results: paginatedResults,
      totalPages: Math.ceil(totalSpecializations / limit),
      pageSize: limit,
      currentPage: page,
      totalItems: totalSpecializations,
    };
  }

  /**
   * Get time-series statistics based on period type
   */
  static async getTimeSeriesStatistics(
    filter?: SpecializationTicketsFilter,
    periodType: PeriodType = PeriodType.YEAR,
  ): Promise<Array<{ period: string; value: number }>> {
    const repo = PostgresDataSource.getRepository(Ticket);
    const qb = repo.createQueryBuilder("ticket");

    // Apply date filters
    if (filter?.startDate) {
      qb.andWhere("ticket.createdAt >= :startDate", {
        startDate: new Date(filter.startDate),
      });
    }

    if (filter?.endDate) {
      qb.andWhere("ticket.createdAt <= :endDate", {
        endDate: new Date(filter.endDate),
      });
    }

    // Group filters by column (use pre-grouped if available)
    const groupedFilters = filter?.groupedFilters
      ? filter.groupedFilters
      : filter?.filters && filter.filters.length > 0
        ? FilterUtils.groupFiltersByColumn(filter.filters)
        : {};

    // Apply grouped filters
    if (
      groupedFilters.specialization &&
      groupedFilters.specialization.length > 0
    ) {
      qb.andWhere("ticket.specialization IN (:...specializationIds)", {
        specializationIds: groupedFilters.specialization,
      });
    }
    // Add more column filters here as needed

    // Group by period based on periodType
    let dateFormat: string;
    switch (periodType) {
      case "day":
        dateFormat = "YYYY-MM-DD";
        qb.select(`TO_CHAR(ticket.createdAt, '${dateFormat}')`, "period");
        break;
      case "month":
        dateFormat = "YYYY-MM";
        qb.select(`TO_CHAR(ticket.createdAt, '${dateFormat}')`, "period");
        break;
      case "year":
        dateFormat = "YYYY";
        qb.select(`TO_CHAR(ticket.createdAt, '${dateFormat}')`, "period");
        break;
    }

    qb.addSelect("COUNT(ticket.id)", "value")
      .groupBy("period")
      .orderBy("period", "ASC");

    const results = await qb.getRawMany();

    return results.map((row) => ({
      period: row.period,
      value: parseInt(row.value, 10),
    }));
  }
}
