import { Request, Response } from "express";
import { getSystemInfoService } from "../services/systemInfo.service.js";

export const getSystemInfoController = async (
  _req: Request,
  res: Response,
) => {
  const info = await getSystemInfoService();
  return res.status(200).json(info);
};
