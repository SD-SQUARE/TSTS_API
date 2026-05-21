
import { Server, Socket } from "socket.io";
import  logger  from "../utils/logger.js";
import { socketAuth } from "../middleware/socketAuth.js";
import { listening } from "../middleware/listening.js";

export let io: Server;

const HOST = process.env.HOST;
export function initSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
    allowRequest: (_req, callback) => callback(null, true),
  });
  logger.info("[Socket]: initialized");
  logger.info(
    `[Socket]: listening on wss://${HOST}:${
      server.address().port
    }` 
  );

  io.use(socketAuth);
  io.use(listening);

  io.on("connection", (socket: Socket) => {
    logger.info(`New client connected: ${socket.id}`);

    socket.on("connect_error", (err) => {
      logger.error(`Connection error: ${err.message}`);
    });

    socket.on("disconnect", (reason) => {
      logger.info(`Client disconnected: ${socket.id}, Reason: ${reason}`);
    });
    
   socket.on("join_ticket_room", ({ ticketId }: { ticketId: string }) => {
  if (!ticketId) return;
  const ticketRoom = `ticket:${ticketId}`;
  socket.join(ticketRoom);
  logger.info(`Socket ${socket.id} joined room ${ticketRoom}`);
});
  });

}
