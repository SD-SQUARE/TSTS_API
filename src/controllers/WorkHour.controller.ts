import { WorkHourRepo } from "../repositories/WorkHourRepo.js";
import { Request,Response } from "express";
import { WorkHour } from "../entities/WorkHour.js";
import logger from "../utils/logger.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
const workHourRepo = new WorkHourRepo();


export async function getWorkHours(req:Request,res:Response){
        const { page, page_size, startTime, endTime, status, sortBy, order } = req.query;
        const paginateOptions = {
            page: page ? parseInt(page as string, 10) : undefined,
            limit: page_size ? parseInt(page_size as string, 10) : undefined,
            startTime: startTime as string | undefined,
            endTime: endTime as string | undefined,
            status: status as string | undefined,
            sortBy: sortBy as "startTime" | "endTime" | "createdAt" | "updatedAt" | undefined,
            order: order as "ASC" | "DESC" | undefined,
        };
        const result = await WorkHour.paginate(paginateOptions);
        logger.info(`[server] [workHour] Fetched work hours page ${paginateOptions.page || 1}`);
        return res.status(ResponseStatus.SUCCESS).json(result);
 
}
export async function createWorkHour(req:Request,res:Response){
    const { startTime, endTime, status,day } = req.body;
    const existing = await workHourRepo.getRepository().findOneBy({ startTime: startTime, endTime: endTime });
    if (existing) {
        return res.status(ResponseStatus.CONFLICT).json({ message:req.t?req.t("work_hour_exists"): "Work hour with the same start and end time already exists" });
    }

    if(day && !Object.values(WorkHour.prototype).includes(day)){
        return  res.status(ResponseStatus.BAD_REQUEST).json({ message:req.t?req.t("day_invalid"): "Invalid day value" });
    }    
    if(status && !Object.values(WorkHour.prototype).includes(status)){
        return  res.status(ResponseStatus.BAD_REQUEST).json({ message:req.t?req.t("status_invalid"): "Invalid status value" });
    }
    const workHour = workHourRepo.getRepository().create({ startTime, endTime, status, day });
    await workHourRepo.getRepository().save(workHour);
    logger.info(`[server] [workHour] Created work hour from ${startTime} to ${endTime}`);
    return res.status(ResponseStatus.CREATED).json({is_added:true ,message:req.t?req.t("work_hour_created"): "Work hour created" });
}
export async function getWorkHourById(req:Request,res:Response){
    const { id } = req.params;
    const workHour = await workHourRepo.getRepository().findOneBy({ id: id });
    if (!workHour) {
        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("work_hour_not_found"): "Work hour not found" });
    }
    logger.info(`[server] [workHour] Fetched work hour ID ${id}`);
    return res.status(ResponseStatus.SUCCESS).json(workHour);
}
export async function updateWorkHour(req:Request,res:Response){
    const { id } = req.params;
    const { startTime, endTime, status,day } = req.body;
    const workHour = await workHourRepo.getRepository().findOneBy({id:id} );
    if (!workHour) {
        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("work_hour_not_found"): "Work hour not found" });
    }
    if(day && !Object.values(WorkHour.prototype).includes(day)){
        return  res.status(ResponseStatus.BAD_REQUEST).json({ message:req.t?req.t("day_invalid"): "Invalid day value" });
    }
    if(status && !Object.values(WorkHour.prototype).includes(status)){
        return  res.status(ResponseStatus.BAD_REQUEST).json({ message:req.t?req.t("status_invalid"): "Invalid status value" });
    }
    workHour.startTime = startTime || workHour.startTime;
    workHour.endTime = endTime || workHour.endTime;
    workHour.status = status || workHour.status;
    workHour.day = day || workHour.day;
    await workHourRepo.getRepository().save(workHour);
    logger.info(`[server] [workHour] Updated work hour ID ${id}`);
    return res.status(ResponseStatus.SUCCESS).json({ message:req.t?req.t("work_hour_updated"): "Work hour updated" });
}
export async function deleteWorkHour(req:Request,res:Response){
    const { id } = req.params;
    const workHour = await workHourRepo.getRepository().findOneBy({ id: id  });    
    if (!workHour) {
        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("work_hour_not_found"): "Work hour not found" });
    }   
    await workHourRepo.getRepository().remove(workHour);
    logger.info(`[server] [workHour] Deleted work hour ID ${id}`);
    return res.status(ResponseStatus.SUCCESS).json({ message:req.t?req.t("work_hour_deleted"): "Work hour deleted" });
}