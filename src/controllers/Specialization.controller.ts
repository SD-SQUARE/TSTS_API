import { Request,Response } from "express";
import { SpecializationRepo } from "../repositories/SpecializationRepo.js";
import { Specialization } from "../entities/Specialization.js";
import { buildDescription ,buildName} from "../utils/handleNamaAndDesc.js";
import logger from "../utils/logger.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import {SpecializationDto} from "../interfaces/response/specializationResponse.js"
import { audit } from "../helpers/auditBuilder.js";
import { AuditAction } from "../enums/AuditAction.enum.js";

export async function getSpecializationById(req: Request, res: Response) {
    const { id } = req.params;

    const auditLog = audit(req)
    .summary("Fetch specialization by ID")
    .ACTION(AuditAction.GET_SPECIALIZATION)
    .resource("Specialization", id);

    const specializationRepo = new SpecializationRepo().getRepository();

    const specialization = await specializationRepo.findOne({
        where: { id },
    });
    if (!specialization) {
        auditLog.step("Specialization not found");

        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("specialization_not_found"): "Specialization not found" });
    }
    const result:SpecializationDto=specialization.toApi();

    auditLog.step("Specialization fetched successfully");

    logger.info(`Fetched specialization with ID: ${specialization.id}`);
    return res.json(result);
}
export async function getAllSpecializations(req: Request, res: Response) {
    const { page, limit, name } = req.query;
    const specializationRepo = new SpecializationRepo().getRepository();
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;
    const search = name ? name as string : undefined;

    const auditLog = audit(req)
    .summary("Fetch all specializations")
    .ACTION(AuditAction.GET_ALL_SPECIALIZATIONS)
    .metadata({
      page: pageNum,
      limit: limitNum,
      search,
    });

    const result = await Specialization.paginate(
        pageNum,
        limitNum,
        search as string | undefined,
        specializationRepo
    );

    auditLog.step("Specializations fetched successfully");

        logger.info(`Listed specializations - Page: ${pageNum}, Limit: ${limitNum}`);
        return res.json(result);  
}
export async function createSpecialization(req: Request, res: Response) {
    const { name_en, name_ar, description_en, description_ar ,review_required} = req.body;
    
    const auditLog = audit(req)
    .summary("Create specialization")
    .ACTION(AuditAction.CREATE_SPECIALIZATION);

    const specializationRepo = new SpecializationRepo().getRepository();
    const name = { en: name_en, ar: name_ar };
    const nameObj = buildName(name);
    if (!nameObj) {
        auditLog.step("Invalid name provided");

        return res.status(ResponseStatus.BAD_REQUEST).json({
            message:req.t?req.t("name_invalid"): "Invalid name. Must be a string or an object with 'en' property",
        });
    }

    const description = { en: description_en, ar: description_ar };
    const descObj = buildDescription(description);
    const existing = await specializationRepo.findOne({ where: { name: nameObj } });
    if (existing) {
        auditLog.step("Duplicate specialization name");

        return res.status(ResponseStatus.CONFLICT).json({ message:req.t?req.t("specialization_exists"): "Specialization with this name already exists" });
    }
    if(review_required==null){
        auditLog.step("Missing review_required");

        return res.status(ResponseStatus.BAD_REQUEST).json(
            {
                message:req.t?req.t("review_required"):"you must provide review_required"
            }
        )
    }
    const specialization = specializationRepo.create({
        name: nameObj,
        description: descObj,
        review_required
    });
    
    await specializationRepo.save(specialization);

    auditLog
      .resource("Specialization", specialization.id)
      .metadata({
        name: nameObj.en,
        review_required,
      })
      .step("Specialization created successfully");

    logger.info(`Created specialization with ID: ${specialization.id}`);
    return res.status(ResponseStatus.CREATED).json({is_added:true, message:req.t?req.t("specialization_created"): "Specialization created" });
}
export async function updateSpecialization(req: Request, res: Response) {
    const { id } = req.params;
    const { name_en, name_ar, description_en, description_ar,review_required } = req.body;
    
    const auditLog = audit(req)
    .summary("Update specialization")
    .ACTION(AuditAction.UPDATE_SPECIALIZATION)
    .resource("Specialization", id);
    
    const specializationRepo = new SpecializationRepo().getRepository();
    const specialization = await specializationRepo.findOne({ where: { id } });
    if (!specialization) {
        auditLog.step("Specialization not found");
        
        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("specialization_not_found"): "Specialization not found" });
    }

    const changes: Record<string, any> = {};

    const name = { en: name_en, ar: name_ar };

    if (name) {
        const nameObj = buildName(name); 
        if (!nameObj) {
            auditLog.step("Invalid name provided");

            return res.status(ResponseStatus.BAD_REQUEST).json({
                message:req.t?req.t("name_invalid"): "Invalid name. Must be a string or an object with 'en' property",
            });
        }

        changes.name = {
            oldValue: specialization.name,
            newValue: { en: nameObj.en, ar: nameObj.ar ?? "" },
        };

        specialization.name = {
            en: nameObj.en,
            ar: nameObj.ar ?? "",
        };
    }
    const description = { en: description_en, ar: description_ar };

    if (description) {
        const descObj = buildDescription(description);

        changes.description = {
            oldValue: specialization.description,
            newValue: descObj,
        };

        specialization.description = descObj; 
    }
    if(review_required==null){
        auditLog.step("Missing review_required");
        
        return res.status(ResponseStatus.BAD_REQUEST).json({  message:req.t?req.t("review_required"):"you must provide review_required"})}
    
    if (specialization.review_required !== review_required) {
      changes.review_required = {
        oldValue: specialization.review_required,
        newValue: review_required,
      };
    }
    
    specialization.review_required=review_required
    await specializationRepo.save(specialization);

    if (Object.keys(changes).length > 0) {
      auditLog.metadata(changes);
    }

    auditLog.step("Specialization updated successfully");

    logger.info(`Updated specialization with ID: ${specialization.id}`);
    return res.status(ResponseStatus.SUCCESS).json({is_updated:true ,message:req.t?req.t("specialization_updated"): "Specialization updated" });
}
export async function deleteSpecialization(req: Request, res: Response) {
    const { id } = req.params;

    const auditLog = audit(req)
    .summary("Delete specialization")
    .ACTION(AuditAction.DELETE_SPECIALIZATION)
    .resource("Specialization", id);

    const specializationRepo = new SpecializationRepo().getRepository();
    const specialization = await specializationRepo.findOne({ where: { id } }); 
    if (!specialization) {
        auditLog.step("Specialization not found");

        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("specialization_not_found"): "Specialization not found" });
    }
    await specializationRepo.remove(specialization);

    auditLog
      .metadata({
        name: specialization.name?.en,
      })
      .step("Specialization deleted successfully");

    logger.info(`Deleted specialization with ID: ${specialization.id}`);
    return res.json({is_deleted:true, message:req.t?req.t("specialization_deleted"): "Specialization deleted" });
}