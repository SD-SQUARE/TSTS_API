import { Request, Response } from "express";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { User } from "../entities/User.js";

export const createUser = async (req: Request, res: Response) => {
  const userRepo = PostgresDataSource.getRepository(User);
  const { name, email, password } = req.body;

  const user = userRepo.create({ name, email, password });
  await userRepo.save(user);

  return res
    .status(201)
    .json({ message: req.t ? req.t("user_created") : "User created", user });
};
