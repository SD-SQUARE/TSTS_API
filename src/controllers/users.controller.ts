import { Request, Response } from "express";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { User } from "../entities/User.js";
import logger from "../utils/logger.js";

export const createUser = async (req: Request, res: Response) => {

  // res.send("createUser");
  // TODO: REVIEW THIS DEMO 
  const userRepo = PostgresDataSource.getRepository(User);
  const { name, email, password } = req.body;

  const user = userRepo.create({ firstName: name, email, password });
  logger.info(`[server] [user] Creating user ${user.email}`);
  await userRepo.save(user);
  
  return res
    .status(201)
    .json({ message: req.t ? req.t("user_created") : "User created", user });
};  