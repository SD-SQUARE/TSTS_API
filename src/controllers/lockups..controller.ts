import { Request, Response, NextFunction } from "express";
import {
  getDepartmentsLockupService,
  getDomainDepartmentsLockupService,
  getDomainsLockupService,
  getGroupNonTechniciansLockupService,
  getGroupsLockupService,
  getGroupTechniciansLockupService,
  getPermissionsLockupService,
  getSpecializationsLockupService,
  getUniversitiesLockupService,
  getUniversityDomainsLockupService,
  getUsersLockupService,
  getUserTicketsLockupService,
  getProblemsLockUpService,
  getTicketProblemsService
} from "../services/lockups.service.js";
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

export const getPermissionsLockupController = async (
  req: Request,
  res: Response
) => {
  const data = await getPermissionsLockupService(req.query);
  res.status(200).json(data);
};

export const getUniversitiesLockupController = async (
  req: Request,
  res: Response
) => {
  const universities = await getUniversitiesLockupService(req.query);
  res.status(200).json({ universities });
};

export const getDomainsLockupController = async (
  req: Request,
  res: Response
) => {
  const domains = await getDomainsLockupService(req.query);
  res.status(200).json({ domains });
};

export const getdepartmentsLockupController = async (
  req: Request,
  res: Response
) => {
  const departments = await getDepartmentsLockupService(req.query);
  res.status(200).json({ departments });
};

export const getSpecializationsLockupController = async (
  req: Request,
  res: Response
) => {
  const specializations = await getSpecializationsLockupService(req.query);
  res.status(200).json({ specializations });
};

export const getGroupsLockupController = async (
  req: Request,
  res: Response
) => {
  const groups = await getGroupsLockupService(req.query);
  res.status(200).json({ groups });
};

export const getUniversityDomainsLockupController = async (
  req: Request,
  res: Response
) => {
  const universityId = req.params.id;
  const domains = await getUniversityDomainsLockupService(
    universityId,
    req.query
  );
  res.status(200).json({ domains });
};

export const getDomainDepartmentsLockupController = async (
  req: Request,
  res: Response
) => {
  const domainId = req.params.id;
  const departments = await getDomainDepartmentsLockupService(
    domainId,
    req.query
  );
  res.status(200).json({ departments });
};

export const getGroupTechnicians = async (req: Request, res: Response) => {
  const { groupId } = req.params;

  const technicians = await getGroupTechniciansLockupService(
    groupId,
    req.query
  );

  res.status(200).json({ technicians });
};

export const getGroupNonTechnicians = async (req: Request, res: Response) => {
  const { groupId } = req.params;

  const technicians = await getGroupNonTechniciansLockupService(
    groupId,
    req.query
  );

  res.status(200).json({ technicians });
};

export const getUserTicketsLockupController = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;

  const tickets = await getUserTicketsLockupService(id);

  return res.status(200).json(tickets);
};
export const getProblemsLockupController = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const { name } = req.query;
  const lang = req.language as "en" | "ar";
  const problems = await getProblemsLockUpService(name as string | undefined,lang,id);

  return res.status(200).json(problems);
};
export const getTicketProblemsLockupController = async (
  req: Request,
  res: Response
) => {
  const { name ,specialization} = req.query ;
  const lang = req.language as "en" | "ar";
  const specializations = await getTicketProblemsService(specialization as string | undefined,name as string | undefined ,lang);

  return res.status(200).json(specializations);
};

