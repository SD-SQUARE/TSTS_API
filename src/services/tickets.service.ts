import { Ticket } from "../entities/Ticket.js";
import { User } from "../entities/User.js";
import { Media } from "../entities/Media.js";
import { TicketStatus } from "../enums/TicketStatus.enum.js";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { uploadFilesWithUniqueKey } from "../helpers/ImagesHelper.js";
import { UserType } from "../enums/UserType.enum.js";
import { IMAGE_PATHS } from "../constants/imagePathes.js";
import { Specialization } from "../entities/Specialization.js";
import { t } from "i18next";

const ticketRepo = PostgresDataSource.getRepository(Ticket);
const userRepo = PostgresDataSource.getRepository(User);
const mediaRepo = PostgresDataSource.getRepository(Media);
const specializationRepo = PostgresDataSource.getRepository(Specialization);

export const createTicket = async (dto, files) => {
  const { title, description, requester, specialization } = dto;

  // validate requester exists
  const requesterUser = await userRepo.findOne({
    where: { id: requester },
  });

  if (!requesterUser) {
    return {
      is_added: false,
      message: t("requester_not_found"),
      errors: [{ key: "requester", message: "Requester does not exist" }],
    };
  }

  if (specialization) {
    const assignedSpecialization = await specializationRepo.findOne({
      where: { id: specialization },
    });

    if (!assignedSpecialization) {
      return {
        is_added: false,
        message: t("specialization_not_found"),
        errors: [
          { key: "specialization", message: "specialization does not exist" },
        ],
      };
    }
  }

  // auto-assign admins if no specialization
  let assignedUsers = [];
  if (!specialization) {
    assignedUsers = await userRepo.find({
      where: { user_type: UserType.ADMIN },
    });
  }

  const ticket = ticketRepo.create({
    title,
    description,
    requester: requesterUser,
    specialization: specialization ? { id: specialization } : null,
    status: TicketStatus.OPEN,
    assigneeList: assignedUsers,
  });

  const savedTicket = await ticketRepo.save(ticket);

  // upload media
  if (files && files.length > 0) {
    for (const file of files) {
      const key = await uploadFilesWithUniqueKey(
        IMAGE_PATHS.TicketMedia,
        requesterUser.id,
        file
      );

      const media = mediaRepo.create({
        name: file.originalname,
        url: key,
        mime: file.mimetype,
        ticket: savedTicket,
      });

      await mediaRepo.save(media);
    }
  }

  // // emit WebSocket
  // global.io.emit("ticket:update", {
  //   type: "created",
  //   ticketId: savedTicket.id,
  // });

  return {
    is_added: true,
    message: "ticket_created",
    errors: [],
  };
};
