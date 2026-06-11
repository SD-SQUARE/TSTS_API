import { DataSource } from "typeorm";
import { Ticket } from "../../../entities/Ticket.js";
import { User } from "../../../entities/User.js";
import { Specialization } from "../../../entities/Specialization.js";
import { Problem } from "../../../entities/problem.js";
import { UserType } from "../../../enums/UserType.enum.js";
import { TicketStatus } from "../../../enums/TicketStatus.enum.js";
import { TicketPriority } from "../../../enums/TicketPriority.enum.js";
import { ticketTemplates } from "./tickets-data-set.js";

// Map common priority names to actual enum values
function mapPriority(priority: string): TicketPriority {
  switch (priority.toUpperCase()) {
    case "CRITICAL":
    case "HIGH":
      return TicketPriority.IMPORTANT_URGENT;
    case "MEDIUM":
      return TicketPriority.IMPORTANT;
    case "LOW":
      return TicketPriority.URGENT;
    default:
      return TicketPriority.NA;
  }
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSubset<T>(arr: T[], maxCount: number): T[] {
  if (arr.length === 0) return [];
  const count = Math.floor(Math.random() * Math.min(maxCount, arr.length)) + 1;
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// const getSeedTicketTimeline = (index: number, status: TicketStatus) => {
//   const now = Date.now();
//   const createdAt = new Date(
//     now - ((index + 1) * 6 * 60 + (index % 11) * 13) * 60 * 1000,
//   );
//   const terminalStatus =
//     status === TicketStatus.CLOSED || status === TicketStatus.RESOLVED;
//   const elapsedMinutes = terminalStatus
//     ? 90 + (index % 16) * 45
//     : 15 + (index % 8) * 20;
//   const intendedModifiedAt = new Date(
//     createdAt.getTime() + elapsedMinutes * 60 * 1000,
//   );
//   const latestAllowedModifiedAt = new Date(now - (index % 5) * 60 * 1000);

//   return {
//     createdAt,
//     modifiedAt:
//       intendedModifiedAt.getTime() > latestAllowedModifiedAt.getTime()
//         ? latestAllowedModifiedAt
//         : intendedModifiedAt,
//   };
// };
const getSeedTicketTimeline = (index: number, status: TicketStatus) => {
  const now = new Date();

  const createdAt = new Date(now);

  createdAt.setFullYear(createdAt.getFullYear() - (index % 3)); // 0-2 years
  createdAt.setMonth(createdAt.getMonth() - (index % 12)); // 0-11 months
  createdAt.setDate(createdAt.getDate() - ((index * 7) % 365)); // up to 364 days
  createdAt.setHours(createdAt.getHours() - (index % 24));
  createdAt.setMinutes(createdAt.getMinutes() - ((index * 13) % 60));

  const terminalStatus =
    status === TicketStatus.CLOSED || status === TicketStatus.RESOLVED;

  const modifiedAt = new Date(createdAt);

  if (terminalStatus) {
    modifiedAt.setDate(modifiedAt.getDate() + ((index % 30) + 1));
  } else {
    modifiedAt.setHours(modifiedAt.getHours() + ((index % 48) + 1));
  }

  if (modifiedAt > now) {
    modifiedAt.setTime(now.getTime());
  }

  return {
    createdAt,
    modifiedAt,
  };
};

export async function seedTickets(
  dataSource: DataSource,
  count = 50,
): Promise<void> {
  const ticketRepo = dataSource.getRepository(Ticket);
  const userRepo = dataSource.getRepository(User);
  const specializationRepo = dataSource.getRepository(Specialization);
  const problemRepo = dataSource.getRepository(Problem);

  console.log("🎫 [TicketsSeed] Starting ticket seeding...");

  // Load requesters with minimal fields
  const requesters = await userRepo
    .createQueryBuilder("u")
    .select(["u.id"])
    .where("u.user_type = :type", { type: UserType.REQUESTER })
    .getMany();

  if (requesters.length === 0) {
    console.warn(
      "⚠️ [TicketsSeed] No requesters found. Please seed users first.",
    );
    return;
  }

  // Load technicians and admins for assignment with minimal fields
  const technicians = await userRepo
    .createQueryBuilder("u")
    .select(["u.id"])
    .where("u.user_type = :type", { type: UserType.TECHNICIAN })
    .getMany();

  const admins = await userRepo
    .createQueryBuilder("u")
    .select(["u.id"])
    .where("u.user_type IN (:...types)", {
      types: [UserType.ADMIN, UserType.SUPER_ADMIN],
    })
    .getMany();

  const assignableUsers = [...technicians, ...admins];

  if (assignableUsers.length === 0) {
    console.warn(
      "⚠️ [TicketsSeed] No technicians or admins found for assignment.",
    );
  }

  // Load specializations with minimal fields
  const specializations = await specializationRepo
    .createQueryBuilder("s")
    .select(["s.id", "s.name"])
    .getMany();

  if (specializations.length === 0) {
    console.warn("⚠️ [TicketsSeed] No specializations found.");
  }

  // Load problems with minimal fields
  const problems = await problemRepo
    .createQueryBuilder("p")
    .select(["p.id", "p.name"])
    .getMany();

  let created = 0;
  const ticketsToCreate = Math.min(count, ticketTemplates.length);

  // Process tickets in batches to reduce memory usage
  const batchSize = 5;
  for (let i = 0; i < ticketsToCreate; i += batchSize) {
    const batchEnd = Math.min(i + batchSize, ticketsToCreate);

    for (let j = i; j < batchEnd; j++) {
      const template = ticketTemplates[j];
      const requester = getRandomItem(requesters);

      // Find specialization
      const specialization = specializations.find((s) =>
        s.name?.en
          ?.toLowerCase()
          .includes(template.specializationName.toLowerCase()),
      );

      // Find problem
      const problem = problems.find((p) =>
        p.name?.en?.toLowerCase().includes(template.problemName.toLowerCase()),
      );

      // Randomly assign technicians/admins based on status
      let assignees: User[] = [];
      if (assignableUsers.length > 0) {
        // Random chance to assign technicians
        const assignmentChance = Math.random();

        if (template.status === TicketStatus.OPEN) {
          // 30% chance to assign someone to OPEN tickets
          if (assignmentChance < 0.3) {
            assignees = getRandomSubset(assignableUsers, 1);
          }
        } else if (template.status === TicketStatus.PENDING) {
          // 50% chance to assign someone to PENDING tickets
          if (assignmentChance < 0.5) {
            assignees = getRandomSubset(assignableUsers, 2);
          }
        } else if (template.status === TicketStatus.IN_PROGRESS) {
          // 90% chance to assign 1-2 people to IN_PROGRESS tickets
          if (assignmentChance < 0.9) {
            assignees = getRandomSubset(assignableUsers, 2);
          }
        } else if (
          template.status === TicketStatus.RESOLVED ||
          template.status === TicketStatus.CLOSED
        ) {
          // Always assign 1-2 people to RESOLVED/CLOSED tickets
          assignees = getRandomSubset(assignableUsers, 2);
        }
      }

      const { createdAt, modifiedAt } = getSeedTicketTimeline(
        j,
        template.status,
      );

      // Create ticket using save instead of insert to handle relations properly
      const ticket = ticketRepo.create({
        title: template.title,
        description: template.description,
        requester: { id: requester.id } as any,
        specialization: specialization
          ? ({ id: specialization.id } as any)
          : null,
        problem: problem ? ({ id: problem.id } as any) : null,
        priority: mapPriority(template.priority),
        status: template.status,
        assigneeList: assignees,
        isOutOfService: false,
        closeCount: template.status === TicketStatus.CLOSED ? 1 : 0,
        createdAt,
        modifiedAt,
      });

      const savedTicket = await ticketRepo.save(ticket);
      await ticketRepo.query(
        `UPDATE tickets SET "createdAt" = $1, "modifiedAt" = $2 WHERE id = $3`,
        [createdAt, modifiedAt, savedTicket.id],
      );

      console.log(
        `✅ [TicketsSeed] Created ticket: ${template.title} (${template.status}) - Assigned: ${assignees.length}`,
      );
      created++;
    }

    // Small delay between batches to help with memory
    if (batchEnd < ticketsToCreate) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(`🎫 [TicketsSeed] Completed: ${created} tickets created`);
}
