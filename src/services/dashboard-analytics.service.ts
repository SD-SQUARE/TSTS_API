import { Between, IsNull, In } from "typeorm";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Ticket } from "../entities/Ticket.js";
import { TicketStatus } from "../enums/TicketStatus.enum.js";
import { getActiveSlaRuleSnapshots, getTicketSlaStateFromRules } from "./sla.service.js";

export interface DashboardAnalytics {
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    inProgressTickets: number;
    pendingTickets: number;
    resolvedTickets: number;
    avgResolutionTimeHours: number;
    slaCompliance: number;
    slaViolated: number;
    ticketsCreatedToday: number;
    ticketsResolvedToday: number;
}

export class DashboardAnalyticsService {
    /**
     * Get comprehensive dashboard analytics
     */
    static async getDashboardAnalytics(
        startDate?: string,
        endDate?: string,
    ): Promise<DashboardAnalytics> {
        const ticketRepo = PostgresDataSource.getRepository(Ticket);

        // Set default date range if not provided (current year)
        const start = startDate
            ? new Date(startDate)
            : new Date(new Date().getFullYear(), 0, 1);
        const end = endDate
            ? new Date(endDate)
            : new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        const dateRange = Between(start, end);

        // Today's date range
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        const todayRange = Between(todayStart, todayEnd);

        // Parallel queries for better performance
        const [
            totalTickets,
            openTickets,
            closedTickets,
            inProgressTickets,
            pendingTickets,
            resolvedTickets,
            ticketsCreatedToday,
            ticketsResolvedToday,
            ticketsWithSLA,
        ] = await Promise.all([
            // Total tickets in date range
            ticketRepo.count({
                where: {
                    createdAt: dateRange,
                    deletedAt: IsNull(),
                },
            }),

            // Open tickets
            ticketRepo.count({
                where: {
                    status: In([TicketStatus.OPEN, TicketStatus.REOPEN]),
                    createdAt: dateRange,
                    deletedAt: IsNull(),
                },
            }),

            // Closed tickets
            ticketRepo.count({
                where: {
                    status: TicketStatus.CLOSED,
                    createdAt: dateRange,
                    deletedAt: IsNull(),
                },
            }),

            // In progress tickets
            ticketRepo.count({
                where: {
                    status: TicketStatus.IN_PROGRESS,
                    createdAt: dateRange,
                    deletedAt: IsNull(),
                },
            }),

            // Pending tickets
            ticketRepo.count({
                where: {
                    status: TicketStatus.PENDING,
                    createdAt: dateRange,
                    deletedAt: IsNull(),
                },
            }),

            // Resolved tickets
            ticketRepo.count({
                where: {
                    status: TicketStatus.RESOLVED,
                    createdAt: dateRange,
                    deletedAt: IsNull(),
                },
            }),

            // Tickets created today
            ticketRepo.count({
                where: {
                    createdAt: todayRange,
                    deletedAt: IsNull(),
                },
            }),

            // Tickets resolved today
            ticketRepo.count({
                where: {
                    status: In([TicketStatus.RESOLVED, TicketStatus.CLOSED]),
                    modifiedAt: todayRange,
                    deletedAt: IsNull(),
                },
            }),

            // Tickets with SLA data for compliance calculation
            ticketRepo
                .createQueryBuilder("ticket")
                .leftJoinAndSelect("ticket.requester", "requester")
                .leftJoinAndSelect("requester.university", "university")
                .leftJoinAndSelect("requester.domain", "domain")
                .leftJoinAndSelect("ticket.specialization", "specialization")
                .leftJoinAndSelect("ticket.problem", "problem")
                .where("ticket.createdAt BETWEEN :start AND :end", { start, end })
                .andWhere("ticket.deletedAt IS NULL")
                .andWhere("ticket.status NOT IN (:...closedStatuses)", {
                    closedStatuses: [TicketStatus.CLOSED, TicketStatus.RESOLVED],
                })
                .getMany(),
        ]);

        // Calculate SLA metrics by checking each ticket against SLA rules
        const slaRules = await getActiveSlaRuleSnapshots();
        const slaStates = await Promise.all(
            ticketsWithSLA.map((ticket) => getTicketSlaStateFromRules(ticket, "en", slaRules))
        );

        const slaViolated = slaStates.filter((state) => state.violated).length;
        const totalWithSLA = ticketsWithSLA.length;
        const slaCompliance =
            totalWithSLA > 0
                ? Math.round(((totalWithSLA - slaViolated) / totalWithSLA) * 100)
                : 100;

        // Calculate average resolution time
        // Note: totalTimeUntilClosedSeconds is a computed field, not stored in DB
        // We need to calculate it from createdAt and modifiedAt for closed/resolved tickets
        const resolvedTicketsWithTime = await ticketRepo
            .createQueryBuilder("ticket")
            .select("AVG(EXTRACT(EPOCH FROM (ticket.modifiedAt - ticket.createdAt)))", "avgSeconds")
            .where("ticket.status IN (:...statuses)", {
                statuses: [TicketStatus.RESOLVED, TicketStatus.CLOSED],
            })
            .andWhere("ticket.createdAt BETWEEN :start AND :end", { start, end })
            .andWhere("ticket.deletedAt IS NULL")
            .andWhere("ticket.modifiedAt IS NOT NULL")
            .andWhere("ticket.createdAt IS NOT NULL")
            .getRawOne();

        const avgResolutionTimeHours = resolvedTicketsWithTime?.avgSeconds
            ? Math.round(parseFloat(resolvedTicketsWithTime.avgSeconds) / 3600)
            : 0;

        return {
            totalTickets,
            openTickets,
            closedTickets,
            inProgressTickets,
            pendingTickets,
            resolvedTickets,
            avgResolutionTimeHours,
            slaCompliance,
            slaViolated,
            ticketsCreatedToday,
            ticketsResolvedToday,
        };
    }
}
