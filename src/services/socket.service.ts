import { io } from "../config/socket.js";

export function notificationMessage(eventName: string, data: any): void {
  if (!io) {
    console.error("Socket IO instance not initialized");
    return;
  }

  io.to("broadcast").emit(eventName, data);
  console.log(`[Socket.IO] Broadcast message sent for event '${eventName}'`);
}

export function notificationUser(eventName: string, data: any): void {
    if (!data?.userId) {
      return;
    }

    const userRoom = `user:${data.userId}`;
    if (data.ticketId) {
      const ticketRoom = `ticket:${data.ticketId}`;
      io.to(userRoom).socketsJoin(ticketRoom);

      io.to(ticketRoom).emit(eventName,data);
      console.log(`[Socket.IO] User ${data.userId} assigned to ${ticketRoom}`);
      return;
    }
    io.to(userRoom).emit(eventName,data);

    console.log(`[Socket.IO] Notification sent to ${userRoom}`);
}

export function notificationTicket(eventName: string, data: any): void {
    const ticketId = data?.ticketId;
    if (!ticketId) {
      console.error("ticket() error: data.ticketId is required");
      return;
    }
    const ticketRoom = `ticket:${ticketId}`;
    io.to(ticketRoom).emit(eventName, data);
    console.log(`[Socket.IO] Event '${eventName}' emitted to ${ticketRoom}`);
}


