import { Socket } from "socket.io";
import jwt from "jsonwebtoken";

export const socketAuth = (socket: Socket, next: (err?: any) => void) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization||socket.handshake.query?.token;

    if (!token) {
      return next(new Error("No token provided"));
    }
    const cleanedToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
    const decoded = jwt.verify(cleanedToken, process.env.JWT_SECRET || "SECRET_KEY") as {
      id: string;
    };
    socket.data.user = {
      id: decoded.id,
    };
    return next();
  } catch (err: any) {
    return next(new Error("Authentication failed: " + err.message));
  }
};
