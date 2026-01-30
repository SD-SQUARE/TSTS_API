import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Ticket } from "../entities/Ticket.js";

export const userTicketsId = async (id: string): Promise<string[]> => {
    const ticketRepo = PostgresDataSource.getRepository(Ticket);
    const tickets = await ticketRepo.find({
        where: { requester: { id } },
        select: { id: true },
    });

    return tickets.map((ticket) => `ticket:${ticket.id}`);
}
