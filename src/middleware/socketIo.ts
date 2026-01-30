import { Request, Response, NextFunction } from "express";
import { Server } from "socket.io";

export function socketIoMiddleware(io: Server) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).io = io;
    next();
  };
}
