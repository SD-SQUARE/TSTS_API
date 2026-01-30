import { Socket } from "socket.io";
import { userTicketsId } from "../helpers/userTicketListener.Helper.js";

export const listening = async (socket: Socket, next: (err?: any) => void) => {
  try {
    const userId = socket.data.user?.id;
    if (!userId) {
      return next(new Error("User ID missing in socket.data.user"));
    }
    const roomName = `user:${userId}`;
    const broadcastRoom = "broadcast";
    const ticketRooms = await userTicketsId(userId);
    ticketRooms.forEach(room => socket.join(room));
    socket.join(roomName);
    socket.join(broadcastRoom);
    const joinedRooms = Array.from(socket.rooms);
    console.log(`[Socket.IO] User ${userId} connected and joined rooms: ${joinedRooms.join(", ")}`);
    socket.data.rooms = joinedRooms;
    next();

  } catch (error) {
    next(new Error("Failed to create user room"));
  }
};
