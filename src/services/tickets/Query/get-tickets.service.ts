import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { Ticket } from "../../../entities/index.js";
import { AuditAction } from "../../../enums/AuditAction.enum.js";
import { TicketActivityType } from "../../../enums/TicketActivity.enum.js";
import { TicketStatus } from "../../../enums/TicketStatus.enum.js";
import { UserType } from "../../../enums/UserType.enum.js";
import { audit } from "../../../helpers/auditBuilder.js";
import { formatTicketStatus } from "../../../helpers/ticketsHelper.js";
import { Lang } from "../../../types/lang.types.js";
import { ReqUserPayload } from "../../../types/ReqUserPayload.js";
import { AppError } from "../../../utils/AppError.js";
import { buildLocalizedName } from "../../../utils/localizeName.js";
import logger from "../../../utils/logger.js";
import { buildPagination } from "../../../utils/pagination.js";
import { redisKeys } from "../../../utils/redisKeys.js";
import { GetTicketsQuery } from "../../../validation/ticket.schema.js";
import { logTicketActivity } from "../../tickets.service.js";
import { Request } from "express";
import { SelectQueryBuilder, In } from "typeorm";
import { getManagedGroupSpecializationIds } from "../../groups/group-access.service.js";
import {
    getActiveSlaRuleSnapshots,
    getTicketSlaState,
    getTicketSlaStateFromRules,
} from "../../sla.service.js";
import {
    readJsonCache,
    TICKET_ANALYTICS_TTL_SECONDS,
    writeJsonCache,
} from "../ticket-cache.service.js";

const ticketRepo = PostgresDataSource.getRepository(Ticket);

/**
 * A/B TEST FLAG — toggle between ORM hydration and raw query mode.
 *
 * Path A (false): TypeORM .find() with full entity hydration.
 *   - CONFIRMED CPU cost: ~257ms user + ~165ms hydration
 * Path B (true): Single .getRawMany() with flat column aliases.
 *   - Eliminates entity graph construction entirely
 *   - Produces identical DTO shape as ORM path
 *
 * Set via env var: TICKETS_USE_RAW=true|false (default: false)
 */
const USE_RAW_TICKETS = true;

const buildTicketFilterQuery = (query: GetTicketsQuery, userRole: UserType, isAnalytics = false) => {
    const qb = ticketRepo.createQueryBuilder("ticket");

    qb.leftJoin("ticket.requester", "requester");

    // Only join relations needed by active WHERE filters or by role-based access (or if analytics)
    if (isAnalytics || userRole === UserType.TECHNICIAN || userRole === UserType.ADMIN) {
        qb.leftJoin("ticket.specialization", "specialization");
    }
    if (isAnalytics || userRole === UserType.TECHNICIAN || query?.assignee) {
        qb.leftJoin("ticket.assigneeList", "assignee");
    }

    if (isAnalytics || query?.problem) qb.leftJoin("ticket.problem", "problem");
    if (query?.specialization && userRole !== UserType.TECHNICIAN && userRole !== UserType.ADMIN && !isAnalytics) {
        qb.leftJoin("ticket.specialization", "specialization");
    }
    if (isAnalytics || query?.university) qb.leftJoin("requester.university", "requesterUniversity");
    if (isAnalytics || query?.domain)     qb.leftJoin("requester.domain", "requesterDomain");
    if (query?.department) {
        qb.leftJoin("requester.userDepartments", "requesterDepartmentLink")
          .leftJoin("requesterDepartmentLink.department", "requesterDepartment");
    }
    return qb;
};

const applyTicketAccessFilters = async (
    qb: SelectQueryBuilder<Ticket>,
    user: ReqUserPayload,
) => {
    // ─ Phase 1: Resolve role ─────────────────────────────────────────────────
    const tRoleStart = performance.now();
    const isRequester = user.role === UserType.REQUESTER;
    const isTechnician = user.role === UserType.TECHNICIAN;
    const isAdmin = user.role === UserType.ADMIN;
    const isSuperAdmin = user.role === UserType.SUPER_ADMIN;
    const tRoleEnd = performance.now();

    // ─ Phase 2: Fetch specialization IDs (Redis cache or SQL) ───────────────
    const tSpecStart = performance.now();
    const managedSpecializationIds = await getManagedGroupSpecializationIds(user.id, user.role);
    const hasManagedSpecializations = managedSpecializationIds.length > 0;
    const tSpecEnd = performance.now();

    // ─ Phase 3: Build WHERE clauses ─────────────────────────────────────────
    const tWhereStart = performance.now();

    if (isRequester) {
        qb.andWhere("requester.id = :userId", {
            userId: user.id,
        });

        logger.info("[tickets] requester access applied", { userId: user.id });
    } else {
        qb.andWhere("ticket.status != :draftStatus", {
            draftStatus: TicketStatus.DRAFT,
        });
    }

    if (isTechnician) {
        if (hasManagedSpecializations) {
            qb.andWhere(
                "(assignee.id = :userId OR specialization.id IN (:...managedSpecializationIds))",
                {
                    userId: user.id,
                    managedSpecializationIds,
                },
            );
        } else {
            qb.andWhere("assignee.id = :userId", {
                userId: user.id,
            });
        }

        logger.info("[tickets] technician access applied", { userId: user.id });
    }

    if (isAdmin && hasManagedSpecializations) {
        qb.andWhere("specialization.id IN (:...managedSpecializationIds)", {
            managedSpecializationIds,
        });
    }

    if (isSuperAdmin) {
        logger.info("[tickets] super admin access applied", { userId: user.id });
    }

    const tWhereEnd = performance.now();

    logger.info("[server][tickets] applyTicketAccessFilters breakdown", {
        userId: user.id,
        role: user.role,
        roleResolutionMs: (tRoleEnd - tRoleStart).toFixed(2),
        specializationFetchMs: (tSpecEnd - tSpecStart).toFixed(2),
        whereConstructionMs: (tWhereEnd - tWhereStart).toFixed(2),
        specIdsCount: managedSpecializationIds.length,
        totalMs: (tWhereEnd - tRoleStart).toFixed(2),
    });
};

const statusCount = (tickets: Array<{ status: string }>, statuses: string[]) =>
    tickets.filter((ticket) => statuses.includes(ticket.status)).length;

const terminalStatuses = new Set<TicketStatus>([
    TicketStatus.CLOSED,
    TicketStatus.RESOLVED,
]);

type ActiveSlaRuleSnapshot = Awaited<ReturnType<typeof getActiveSlaRuleSnapshots>>[number];

type TicketAnalyticsSnapshot = {
    id: string;
    status: TicketStatus;
    createdAt: Date;
    requesterUniversityId: string | null;
    requesterDomainId: string | null;
    specializationId: string | null;
    problemId: string | null;
    assigneeIds: Set<string>;
};

const getTicketTiming = (ticket: Ticket) => {
    const closedAt = terminalStatuses.has(ticket.status) ? ticket.modifiedAt : null;
    const totalTimeUntilClosedSeconds =
        closedAt && ticket.createdAt
            ? Math.max(
                0,
                Math.floor((closedAt.getTime() - ticket.createdAt.getTime()) / 1000),
            )
            : null;

    return {
        closedAt,
        totalTimeUntilClosedSeconds,
    };
};

const isTicketSlaViolatedFromSnapshots = (
    ticket: TicketAnalyticsSnapshot,
    rules: ActiveSlaRuleSnapshot[],
) => {
    if (!rules.length || !ticket.createdAt) return false;

    const ageHours = (Date.now() - new Date(ticket.createdAt).getTime()) / 36e5;
    let bestMatch: { maxHours: number; specificity: number } | null = null;

    for (const rule of rules) {
        if (rule.universityId && rule.universityId !== ticket.requesterUniversityId) continue;
        if (rule.domainId && rule.domainId !== ticket.requesterDomainId) continue;
        if (rule.specializationId && rule.specializationId !== ticket.specializationId) continue;
        if (rule.problemId && rule.problemId !== ticket.problemId) continue;

        const specificity = [
            rule.universityId,
            rule.domainId,
            rule.specializationId,
            rule.problemId,
        ].filter(Boolean).length;

        if (
            !bestMatch ||
            specificity > bestMatch.specificity ||
            (specificity === bestMatch.specificity && rule.maxHours < bestMatch.maxHours)
        ) {
            bestMatch = { maxHours: rule.maxHours, specificity };
        }
    }

    return bestMatch ? ageHours > bestMatch.maxHours : false;
};

export const getAllTicketsService = async (
    query: GetTicketsQuery,
    lang: Lang,
    user: ReqUserPayload,
    req?: Request,
) => {
    logger.info("[server][tickets] getAllTickets | start", {
        lang,
        query,
    });
    const auditLog = audit(req)
        .summary("Get All Tickets")
        .action(AuditAction.GET_TICKETS)
        .metadata({ userId: user.id });

    auditLog.step("Resolve pagination");

    const { skip, take, meta } = buildPagination({
        page: query.page_index,
        page_size: query.page_size,
    });

    logger.info("[server][tickets] getAllTickets | pagination resolved", {
        skip,
        take,
        pageIndex: meta.page_index,
        pageSize: meta.page_size,
    });

    const tBuildFiltersStart = performance.now();
    const qb = buildTicketFilterQuery(query, user.role as UserType);
    const tBuildFiltersEnd = performance.now();

    auditLog.step("Applying role-based filters");
    const tAccessFiltersStart = performance.now();
    await applyTicketAccessFilters(qb, user);
    const tAccessFiltersEnd = performance.now();

    logger.info("[server][tickets] getAllTickets | filter timings", {
        buildFiltersTimeMs: (tBuildFiltersEnd - tBuildFiltersStart).toFixed(2),
        accessFiltersTimeMs: (tAccessFiltersEnd - tAccessFiltersStart).toFixed(2),
    });

    logger.info("[server][tickets] getAllTickets | base query initialized");
    auditLog.step("Applying query filters");
    if (query.id) {
        qb.andWhere("ticket.id = :ticketId", {
            ticketId: query.id,
        });

        logger.info("[server][tickets] getAllTickets | filter applied", {
            filter: "id",
            value: query.id,
        });
    }

    if (query.ticket_number) {
        qb.andWhere("ticket.ticket_number = :ticketNumber", {
            ticketNumber: query.ticket_number,
        });

        logger.info("[server][tickets] getAllTickets | filter applied", {
            filter: "ticket_number",
            value: query.ticket_number,
        });
    }

    if (query.title) {
        qb.andWhere("ticket.title ILIKE :title", {
            title: `%${query.title}%`,
        });

        logger.info("[server][tickets] getAllTickets | filter applied", {
            filter: "title",
            value: query.title,
        });
    }

    if (query.specialization) {
        const values = Array.isArray(query.specialization)
            ? query.specialization
            : [query.specialization];
        qb.andWhere("specialization.id IN (:...specializations)", {
            specializations: values,
        });

        logger.info("[server][tickets] getAllTickets | filter applied", {
            filter: "specialization",
            specializationIds: values,
        });
    }

    if (query.problem) {
        const values = Array.isArray(query.problem)
            ? query.problem
            : [query.problem];
        qb.andWhere("problem.id IN (:...problems)", {
            problems: values,
        });

        logger.info("[server][tickets] getAllTickets | filter applied", {
            filter: "problem",
            problemIds: values,
        });
    }

    if (query.status) {
        const values = Array.isArray(query.status) ? query.status : [query.status];
        qb.andWhere("ticket.status IN (:...statuses)", {
            statuses: values,
        });

        logger.info("[server][tickets] getAllTickets | filter applied", {
            filter: "status",
            statuses: values,
        });
    }

    if (query.priority) {
        const values = Array.isArray(query.priority)
            ? query.priority
            : [query.priority];
        qb.andWhere("ticket.priority IN (:...priorities)", {
            priorities: values,
        });

        logger.info("[server][tickets] getAllTickets | filter applied", {
            filter: "priority",
            priorities: values,
        });
    }

    if (query.requester) {
        const values = Array.isArray(query.requester)
            ? query.requester
            : [query.requester];
        qb.andWhere("requester.id IN (:...requesterIds)", {
            requesterIds: values,
        });

        logger.info("[server][tickets] getAllTickets | filter applied", {
            filter: "requester",
            requesterIds: values,
        });
    }

    if (query.assignee) {
        const values = Array.isArray(query.assignee)
            ? query.assignee
            : [query.assignee];
        qb.andWhere("assignee.id IN (:...assigneeIds)", {
            assigneeIds: values,
        });

        logger.info("[server][tickets] getAllTickets | filter applied", {
            filter: "assignee",
            assigneeIds: values,
        });
    }

    if (query.university) {
        const values = Array.isArray(query.university)
            ? query.university
            : [query.university];
        qb.andWhere("requesterUniversity.id IN (:...universityIds)", {
            universityIds: values,
        });

        logger.info("[server][tickets] getAllTickets | filter applied", {
            filter: "university",
            universityIds: values,
        });
    }

    if (query.domain) {
        const values = Array.isArray(query.domain)
            ? query.domain
            : [query.domain];
        qb.andWhere("requesterDomain.id IN (:...domainIds)", {
            domainIds: values,
        });

        logger.info("[server][tickets] getAllTickets | filter applied", {
            filter: "domain",
            domainIds: values,
        });
    }

    if (query.department) {
        const values = Array.isArray(query.department)
            ? query.department
            : [query.department];
        qb.andWhere("requesterDepartment.id IN (:...departmentIds)", {
            departmentIds: values,
        });

        logger.info("[server][tickets] getAllTickets | filter applied", {
            filter: "department",
            departmentIds: values,
        });
    }

    const totalQb = qb
        .clone()
        .select("COUNT(DISTINCT ticket.id)", "total");
    const pageIdsQb = qb
        .clone()
        .select("ticket.id", "id")
        .addSelect("ticket.createdAt", "createdAt")
        .distinct(true)
        .orderBy("ticket.createdAt", "DESC")
        .offset(skip)
        .limit(take);

    logger.info("[server][tickets] getAllTickets | query ready", {
        skip,
        take,
        orderBy: "ticket.createdAt DESC",
    });

    logger.info("[server][tickets] getAllTickets | executing query");

    auditLog.step("Executing query");


    const t0 = performance.now();
    const [idRows, totalRow] = await Promise.all([
        pageIdsQb.getRawMany<{ id: string }>(),
        totalQb.getRawOne<{ total: string }>(),
    ]);
    const tEndIdFetch = performance.now();
    const idFetchMs = tEndIdFetch - t0;

    const ticketIds = idRows.map((row) => row.id).filter(Boolean);
    const total = Number(totalRow?.total || 0);

    if (idFetchMs > 50) {
        console.warn(
            `[POOL WARNING] getAllTickets: ID fetch query took ${idFetchMs.toFixed(2)}ms ` +
            `(threshold 50ms). Possible pool contention.`,
        );
    }

    logger.info(`[server][tickets] getAllTickets | ID fetch took ${idFetchMs.toFixed(2)}ms`, {
        fetchedIdsCount: ticketIds.length,
        poolAndSqlMs: idFetchMs.toFixed(2)
    });

    auditLog
        .step("Mapping tickets to DTO")
        .metadata({ returnedCount: ticketIds.length });

    const slaRules = await getActiveSlaRuleSnapshots();

    const tBeforeHydrationOrRaw = performance.now();
    const cpuBeforeHydrationOrRaw = process.cpuUsage();



    // =========================================================================
    // PATH B — Raw query mode (no ORM entity construction)
    // =========================================================================
    // We split the fetch into two flat queries run in parallel to avoid passing
    // massive json_agg payloads over the wire, which causes 120ms+ of pg driver
    // deserialization overhead.
    const rawSql = `
        SELECT
            t.id,
            t.ticket_number,
            t.title,
            t.description,
            t.status,
            t.priority,
            t."isOutOfService",
            t."createdAt",
            t."modifiedAt",
            req.id                        AS requester_id,
            req."firstName"->>'en'        AS requester_firstName_en,
            req."firstName"->>'ar'        AS requester_firstName_ar,
            req."midName"->>'en'          AS requester_midName_en,
            req."midName"->>'ar'          AS requester_midName_ar,
            req."lastName"->>'en'         AS requester_lastName_en,
            req."lastName"->>'ar'         AS requester_lastName_ar,
            req.image                     AS requester_image,
            req."rustdeskId"              AS requester_rustdeskId,
            uni.id                        AS university_id,
            uni.name                      AS university_name,
            dom.id                        AS domain_id,
            dom.name                      AS domain_name,
            spec.id                       AS specialization_id,
            spec.name                     AS specialization_name,
            prob.id                       AS problem_id,
            prob.name                     AS problem_name
        FROM tickets t
        LEFT JOIN users          req  ON req.id   = t."requesterId"
        LEFT JOIN universities   uni  ON uni.id   = req."universityId"
        LEFT JOIN domains        dom  ON dom.id   = req."domainId"
        LEFT JOIN specializations spec ON spec.id = t."specializationId"
        LEFT JOIN problems       prob ON prob.id  = t."problemId"
        WHERE t.id = ANY($1)
        ORDER BY t."createdAt" DESC
    `;

    const assigneesSql = `
        SELECT
            ta.ticket_id,
            u.id,
            u."firstName"->>'en' AS firstName_en,
            u."firstName"->>'ar' AS firstName_ar,
            u."midName"->>'en'   AS midName_en,
            u."midName"->>'ar'   AS midName_ar,
            u."lastName"->>'en'  AS lastName_en,
            u."lastName"->>'ar'  AS lastName_ar,
            u.image
        FROM ticket_assignees ta
        JOIN users u ON u.id = ta.user_id
        WHERE ta.ticket_id = ANY($1)
    `;

    const tStartRawFetch = performance.now();
    const [rawRows, assigneeRows] = await Promise.all([
        PostgresDataSource.query(rawSql, [ticketIds]) as Promise<any[]>,
        PostgresDataSource.query(assigneesSql, [ticketIds]) as Promise<any[]>
    ]);

    // Group assignees by ticket ID in memory (O(N))
    const assigneesByTicket = new Map<string, any[]>();
    for (const a of assigneeRows) {
        let list = assigneesByTicket.get(a.ticket_id);
        if (!list) {
            list = [];
            assigneesByTicket.set(a.ticket_id, list);
        }
        list.push(a);
    }

    const tAfterRaw = performance.now();
    const cpuRaw = process.cpuUsage(cpuBeforeHydrationOrRaw);
    logger.info(`[server][tickets] getAllTickets | RAW fetch+join took ${(tAfterRaw - tStartRawFetch).toFixed(2)}ms`, {
        returnedCount: rawRows.length,
        assigneeCount: assigneeRows.length,
        cpuUser_ms: (cpuRaw.user / 1000).toFixed(2),
        cpuSystem_ms: (cpuRaw.system / 1000).toFixed(2),
    });

    const tBeforeRawMapping = performance.now();

    // Helper: compose localized display name from extracted JSONB parts
    const buildRawName = (row: any, prefix: string): string => {
        const l = lang === "ar" ? "ar" : "en";
        const parts = [
            row[`${prefix}_firstName_${l}`] || row[`${prefix}_firstName_en`],
            row[`${prefix}_midName_${l}`]   || row[`${prefix}_midName_en`],
            row[`${prefix}_lastName_${l}`]  || row[`${prefix}_lastName_en`],
        ];
        return parts.filter(Boolean).join(" ").trim();
    };

    // Manual flat mapping — no class construction, no prototype chains
    const mappedTickets = await Promise.all(rawRows.map(async (row) => {
        const universityName = row.university_name;
        const domainName     = row.domain_name;
        const specName       = row.specialization_name;
        const probName       = row.problem_name;

        const createdAt  = new Date(row.createdAt);
        const modifiedAt = new Date(row.modifiedAt);
        const isTerminal = terminalStatuses.has(row.status);
        const closedAt   = isTerminal ? modifiedAt : null;
        const totalTimeUntilClosedSeconds = closedAt
            ? Math.max(0, Math.floor((closedAt.getTime() - createdAt.getTime()) / 1000))
            : null;

        // SLA requires the ticket object shape — build a lightweight proxy
        const ticketProxy = {
            id: row.id,
            status: row.status,
            priority: row.priority,
            createdAt,
            modifiedAt,
            requester: row.requester_id ? {
                university: row.university_id ? { id: row.university_id } : null,
                domain: row.domain_id ? { id: row.domain_id } : null,
            } : null,
            specialization: row.specialization_id ? { id: row.specialization_id } : null,
            problem: row.problem_id ? { id: row.problem_id } : null,
        } as unknown as Ticket;

        const sla = await getTicketSlaStateFromRules(ticketProxy, lang, slaRules);

        const assignees = assigneesByTicket.get(row.id) || [];

        return {
            id: row.id,
            ticket_number: row.ticket_number,
            title: row.title,
            description: row.description,
            createdAt,
            modifiedAt,
            closedAt,
            totalTimeUntilClosedSeconds,
            requester: row.requester_id
                ? {
                    id: row.requester_id,
                    name: buildRawName(row, "requester"),
                    image: row.requester_image ?? null,
                    rustdeskId: row.requester_rustdeskId ?? null,
                    university: row.university_id
                        ? { id: row.university_id, name: (typeof universityName === "object" ? universityName?.[lang] : null) || "" }
                        : null,
                    domain: row.domain_id
                        ? { id: row.domain_id, name: (typeof domainName === "object" ? domainName?.[lang] : null) || "" }
                        : null,
                    departments: [],  // Omitted in RAW mode — not shown in ticket list UI
                }
                : null,
            specialization: row.specialization_id
                ? { id: row.specialization_id, name: (typeof specName === "object" ? specName?.[lang] : null) || "" }
                : null,
            problem: row.problem_id
                ? { id: row.problem_id, name: (typeof probName === "object" ? probName?.[lang] : null) || "" }
                : null,
            status: formatTicketStatus(row.status),
            priority: row.priority,
            isOutOfService: row.isOutOfService,
            assignee: assignees.map((u) => {
                const l = lang === "ar" ? "ar" : "en";
                const name = [
                    u[`firstName_${l}`] || u.firstName_en,
                    u[`midName_${l}`]   || u.midName_en,
                    u[`lastName_${l}`]  || u.lastName_en,
                ].filter(Boolean).join(" ").trim();
                return { id: u.id, name, image: u.image ?? null };
            }),
            sla,
        };
    }));

    const t3 = performance.now();
    const cpuT3 = process.cpuUsage(cpuBeforeHydrationOrRaw);
    logger.info(`[server][tickets] getAllTickets | RAW DTO mapping took ${(t3 - tBeforeRawMapping).toFixed(2)}ms`, {
        cpuUser_ms: (cpuT3.user / 1000).toFixed(2),
        cpuSystem_ms: (cpuT3.system / 1000).toFixed(2),
    });
    logger.info(`[server][tickets] getAllTickets | Total DB+Mapping time: ${(t3 - t0).toFixed(2)}ms`);

    logger.info("[server][tickets] getAllTickets | completed", {
        returnedCount: mappedTickets.length,
        total,
        pageIndex: meta.page_index,
        pageSize: meta.page_size,
    });

    auditLog
        .step("Completed")
        .metadata({ total, pageIndex: meta.page_index, pageSize: meta.page_size });

    return {
        tickets: mappedTickets,
        meta: {
            total,
            page_index: meta.page_index,
            page_size: meta.page_size,
        },
    };
};

export const getTicketAnalyticsService = async (
    lang: Lang,
    user: ReqUserPayload,
) => {
    const cacheKey = redisKeys.ticketAnalytics(user.role || "unknown", user.id, lang);
    const cached = await readJsonCache(cacheKey);
    if (cached) {
        return cached;
    }

    const qb = buildTicketFilterQuery(null as any, user.role as any, true);
    await applyTicketAccessFilters(qb, user);

    const rows = await qb
        .clone()
        .select("ticket.id", "id")
        .addSelect("ticket.status", "status")
        .addSelect("ticket.createdAt", "createdAt")
        .addSelect("requesterUniversity.id", "requesterUniversityId")
        .addSelect("requesterDomain.id", "requesterDomainId")
        .addSelect("specialization.id", "specializationId")
        .addSelect("problem.id", "problemId")
        .addSelect("assignee.id", "assigneeId")
        .getRawMany<{
            id: string;
            status: TicketStatus;
            createdAt: Date;
            requesterUniversityId: string | null;
            requesterDomainId: string | null;
            specializationId: string | null;
            problemId: string | null;
            assigneeId: string | null;
        }>();

    const byTicketId = new Map<string, TicketAnalyticsSnapshot>();
    for (const row of rows) {
        const existing = byTicketId.get(row.id);
        if (existing) {
            if (row.assigneeId) existing.assigneeIds.add(row.assigneeId);
            continue;
        }

        byTicketId.set(row.id, {
            id: row.id,
            status: row.status,
            createdAt: row.createdAt,
            requesterUniversityId: row.requesterUniversityId,
            requesterDomainId: row.requesterDomainId,
            specializationId: row.specializationId,
            problemId: row.problemId,
            assigneeIds: new Set(row.assigneeId ? [row.assigneeId] : []),
        });
    }

    const tickets = Array.from(byTicketId.values());
    const slaRules = await getActiveSlaRuleSnapshots();
    const slaViolated = tickets.filter((ticket) =>
        isTicketSlaViolatedFromSnapshots(ticket, slaRules),
    ).length;
    const total = tickets.length;

    const base = {
        total,
        open: statusCount(tickets, [TicketStatus.OPEN, TicketStatus.REOPEN]),
        inProgress: statusCount(tickets, [
            TicketStatus.IN_PROGRESS,
            TicketStatus.PENDING,
        ]),
        resolved: statusCount(tickets, [
            TicketStatus.RESOLVED,
            TicketStatus.CLOSED,
        ]),
        unassigned: tickets.filter((ticket) => ticket.assigneeIds.size === 0).length,
        slaViolated,
    };

    const analytics =
        user.role === UserType.REQUESTER
            ? {
                total: base.total,
                open: base.open,
                resolved: base.resolved,
            }
            : user.role === UserType.TECHNICIAN
                ? {
                    total: base.total,
                    assigned: base.total,
                    open: base.open,
                    inProgress: base.inProgress,
                    slaViolated: base.slaViolated,
                }
                : {
                    total: base.total,
                    unassigned: base.unassigned,
                    inProgress: base.inProgress,
                    slaViolated: base.slaViolated,
                };

    await writeJsonCache(cacheKey, analytics, TICKET_ANALYTICS_TTL_SECONDS);

    return analytics;
};

export const getSingleTicketService = async (
    ticketId: string | undefined,
    ticketNumber: number | undefined,
    lang: Lang,
    user: ReqUserPayload,
    userName: string,
    req?: Request,
) => {
    const auditLog = audit(req);
    logger.info("[server][tickets] getSingleTicket | start", {
        ticketId,
        ticketNumber,
        lang,
    });

    auditLog.step("Querying ticket from database");

    const qb = ticketRepo
        .createQueryBuilder("ticket")
        .leftJoinAndSelect("ticket.requester", "requester")
        .leftJoinAndSelect("requester.university", "requesterUniversity")
        .leftJoinAndSelect("requester.domain", "requesterDomain")
        .leftJoinAndSelect("requester.userDepartments", "requesterDepartmentLink")
        .leftJoinAndSelect("requesterDepartmentLink.department", "requesterDepartment")
        .leftJoinAndSelect("ticket.specialization", "specialization")
        .leftJoinAndSelect("ticket.problem", "problem")
        .leftJoinAndSelect("ticket.assigneeList", "assignee");

    if (ticketId) {
        qb.andWhere("ticket.id = :id", { id: ticketId });
    }

    if (ticketNumber) {
        qb.andWhere("ticket.ticket_number = :ticket_number", {
            ticket_number: ticketNumber,
        });
    }

    const ticket = await qb.getOne();

    if (!ticket) {
        auditLog.step("Ticket not found");

        logger.info("[server][tickets] getSingleTicket | not found", { ticketId });
        return null;
    }

    logger.info("[server][tickets] getSingleTicket | found", {
        ticketId: ticket.id,
        ticket_number: ticket.ticket_number,
        requesterId: ticket.requester?.id ?? null,
        specializationId: ticket.specialization?.id ?? null,
        problemId: ticket.problem?.id ?? null,
        assigneeCount: ticket.assigneeList?.length ?? 0,
    });

    auditLog.step("Ticket found").metadata({
        requesterId: ticket.requester?.id ?? null,
        specializationId: ticket.specialization?.id ?? null,
        problemId: ticket.problem?.id ?? null,
        assigneeCount: ticket.assigneeList?.length ?? 0,
    });

    // TypeORM hydrates joined relations as plain objects — read directly, no lazy await.
    const university = ticket.requester?.university ?? null;
    const domain = ticket.requester?.domain ?? null;
    const rawDepts2 = ticket.requester?.userDepartments;
    const userDepartments: any[] = Array.isArray(rawDepts2) ? rawDepts2 : [];
    const resolvedDepartments = userDepartments
        .map((link: any) => link?.department)
        .filter(Boolean);

    const managedSpecializationIds = await getManagedGroupSpecializationIds(
        user.id,
        user.role,
    );
    const specializationId = ticket.specialization?.id || null;
    const isRequester = ticket.requester?.id === user.id;
    const isDraft = ticket.status === TicketStatus.DRAFT;
    const isAssignee =
        ticket.assigneeList?.some((assignee) => assignee.id === user.id) || false;
    const isManagedSpecialization =
        !!specializationId && managedSpecializationIds.includes(specializationId);
    const canAccess =
        user.role === UserType.SUPER_ADMIN ||
        (user.role === UserType.REQUESTER && isRequester) ||
        (user.role === UserType.TECHNICIAN &&
            (isAssignee || isManagedSpecialization)) ||
        (user.role === UserType.ADMIN &&
            (managedSpecializationIds.length === 0 ||
                isManagedSpecialization ||
                isAssignee));

    if (!canAccess || (isDraft && !isRequester)) {
        throw new AppError("Ticket not found", 404);
    }

    const timing = getTicketTiming(ticket);

    const mappedTicket = {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        title: ticket.title,
        description: ticket.description,
        createdAt: ticket.createdAt,
        modifiedAt: ticket.modifiedAt,
        ...timing,
        requester: ticket.requester
            ? {
                id: ticket.requester.id,
                name: buildLocalizedName(ticket.requester, lang),
                image: ticket.requester.image,
                rustdeskId: ticket.requester.rustdeskId ?? null,
                university: university
                    ? {
                        id: university.id,
                        name: university.name?.[lang] || "",
                    }
                    : null,
                domain: domain
                    ? {
                        id: domain.id,
                        name: domain.name?.[lang] || "",
                    }
                    : null,
                departments: resolvedDepartments
                    .filter((dept: any) => dept && dept.id)
                    .map((dept: any) => ({
                        id: dept.id,
                        name: dept.name?.[lang] || "",
                    })),
            }
            : null,
        specialization: ticket.specialization
            ? {
                id: ticket.specialization.id,
                name: ticket.specialization.name?.[lang] || "",
                review_required: ticket.specialization.review_required,
            }
            : null,
        problem: ticket.problem
            ? {
                id: ticket.problem.id,
                name: ticket.problem.name?.[lang] || "",
                review_required: ticket.problem.review_required,
            }
            : null,
        // FIXME: status mapping should be result in remove `_` ex: `in_progress` => `in Progress`
        status: formatTicketStatus(ticket.status),
        priority: ticket.priority,
        isOutOfService: ticket.isOutOfService,
        assignee:
            ticket.assigneeList?.map((user) => ({
                id: user.id,
                name: buildLocalizedName(user, lang),
                image: user.image,
            })) || [],
        sla: await getTicketSlaState(ticket, lang),
    };

    auditLog.step("Logging ticket view activity");
    // log ticket view activity
    logTicketActivity(
        ticket,
        "Ticket Viewed",
        TicketActivityType.VIEW,
        `Ticket "${ticket.title}" was viewed by ${userName}`,
        user.id,
        { ticketId: ticket.id, ticket_number: ticket.ticket_number },
    );

    logger.info("[server][tickets] getSingleTicket | completed", {
        ticketId: mappedTicket.id,
        ticket_number: ticket.ticket_number,
        requesterId: mappedTicket.requester?.id ?? null,
        assigneeCount: mappedTicket.assignee.length,
    });
    auditLog.step("Completed ticket mapping").metadata({
        assigneeCount: mappedTicket.assignee.length,
        requesterId: mappedTicket.requester?.id ?? null,
    });

    return mappedTicket;
};
