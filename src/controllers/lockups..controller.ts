import { Request, Response, NextFunction } from "express";
import { getUsersLockupService } from "../services/lockups.service.js";
import { UserType } from "../enums/UserType.enum.js";

export const getAllUsersLockup = async (req: Request, res: Response) => {
  const data = await getUsersLockupService(req.query);
  res.status(200).json(data);
};

const createUserTypeController = (userType: UserType) => {
  return async (req: Request, res: Response) => {
    const data = await getUsersLockupService({
      ...req.query,
      user_type: userType,
    });
    return res.status(200).json(data);
  };
};

export const getRequestersLockup = createUserTypeController(UserType.REQUESTER);
export const getAdminsLockup = createUserTypeController(UserType.ADMIN);
export const getTechniciansLockup = createUserTypeController(
  UserType.TECHNICIAN
);
