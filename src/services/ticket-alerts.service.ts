import { IsNull } from "typeorm";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Specialization, Ticket, User } from "../entities/index.js";
import { TicketStatus } from "../enums/TicketStatus.enum.js";
import { UserType } from "../enums/UserType.enum.js";
import { NotificationType } from "../enums/NotificationType.enum.js";
import { createNotification } from "./notification.service.js";
import { getOrCreateSiteSettings } from "./site-settings.service.js";
import logger from "../utils/logger.js";

const ticketRepo = PostgresDataSource.getRepository(Ticket);
const specializationRepo = PostgresDataSource.getRepository(Specialization);
const userRepo = PostgresDataSource.getRepository(User);

const ACTIVE_UNASSIGNED_STATUSES = [
  TicketStatus.OPEN,
  TicketStatus.REOPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.PENDING,
  TicketStatus.OUT_OF_SERVICE,
];

const getEscalationRecipients = async (ticket: Ticket) => {
  const specializationId = ticket.specialization?.id;

  if (specializationId) {
    const specialization = await specializationRepo.findOne({
      where: { id: specializationId },
      relations: [
        "groupSpecializations",
        "groupSpecializations.group",
        "groupSpecializations.group.heads",
        "groupSpecializations.group.heads.user",
        "groupSpecializations.group.teams",
        "groupSpecializations.group.teams.leads",
        "groupSpecializations.group.teams.leads.user",
      ],
    } as any);

    const groupLinks = specialization?.groupSpecializations || [];
    const ids = groupLinks.flatMap((link: any) => {
      const group = link.group;
      return [
        ...(group?.heads || []).map((head: any) => head.user?.id),
        ...(group?.teams || []).flatMap((team: any) =>
          (team.leads || []).map((lead: any) => lead.user?.id),
        ),
      ];
    });

    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length) {
      return unique;
    }
  }

  const fallbackAdmins = await userRepo.find({
    where: [
      { user_type: UserType.ADMIN, deletedAt: IsNull() },
      { user_type: UserType.SUPER_ADMIN, deletedAt: IsNull() },
    ] as any,
    select: ["id"],
  });

  return fallbackAdmins.map((user) => user.id);
};

export const scanUnassignedTicketsForAlerts = async () => {
  const settings = await getOrCreateSiteSettings();
  const thresholdMinutes = Math.max(1, settings.unassignedTicketAlertMinutes || 60);
  const thresholdDate = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  const tickets = await ticketRepo
    .createQueryBuilder("ticket")
    .leftJoinAndSelect("ticket.specialization", "specialization")
    .where("ticket.deletedAt IS NULL")
    .andWhere("ticket.status IN (:...statuses)", {
      statuses: ACTIVE_UNASSIGNED_STATUSES,
    })
    .andWhere("ticket.createdAt <= :thresholdDate", { thresholdDate })
    .andWhere(
      `(ticket."unassignedAlertedAt" IS NULL OR ticket."unassignedAlertedAt" <= :thresholdDate)`,
      { thresholdDate },
    )
    .andWhere(
      `NOT EXISTS (
        SELECT 1 FROM "ticket_assignees" ta
        WHERE ta."ticket_id" = ticket.id
      )`,
    )
    .take(25)
    .getMany();

  for (const ticket of tickets) {
    const recipients = await getEscalationRecipients(ticket);
    if (!recipients.length) {
      continue;
    }

    await createNotification(
      NotificationType.TICKET,
      `Ticket #${ticket.ticket_number} is still unassigned`,
      `Ticket "${ticket.title}" has been unassigned for more than ${thresholdMinutes} minutes.`,
      recipients,
      { ticketId: ticket.id },
    );

    ticket.unassignedAlertedAt = new Date();
    await ticketRepo.save(ticket);
  }

  if (tickets.length) {
    logger.info("[ticket-alerts] unassigned ticket scan completed", {
      alertedTickets: tickets.length,
      thresholdMinutes,
    });
  }
};

export const startUnassignedTicketAlertScheduler = () => {
  const intervalMs = Number(process.env.UNASSIGNED_TICKET_ALERT_SCAN_MS || 60000);

  setInterval(() => {
    scanUnassignedTicketsForAlerts().catch((error) => {
      logger.warn("[ticket-alerts] scan failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, Math.max(30000, intervalMs));
};
