import { Request,Response } from "express";
import { SpecializationRepo } from "../repositories/SpecializationRepo.js";
import { Specialization } from "../entities/Specialization.js";
import { buildDescription ,buildName} from "../utils/handleNamaAndDesc.js";
import logger from "../utils/logger.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";

export async function getSpecializationById(req: Request, res: Response) {
    const { id } = req.params;
    const specializationRepo = new SpecializationRepo().getRepository();

    const specialization = await specializationRepo.findOne({
        where: { id },
    });
    if (!specialization) {
        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("specialization_not_found"): "Specialization not found" });
    }

    logger.info(`Fetched specialization with ID: ${specialization.id}`);
    return res.json(specialization);
}
export async function getAllSpecializations(req: Request, res: Response) {
    const { page, limit, specializationName } = req.query;
    const specializationRepo = new SpecializationRepo().getRepository();
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;
    const search = specializationName ? specializationName as string : undefined;
    const result = await Specialization.paginate(
        pageNum,
        limitNum,
        search as string | undefined,
        specializationRepo
    );
        logger.info(`Listed specializations - Page: ${pageNum}, Limit: ${limitNum}`);
        return res.json(result);  
}
export async function createSpecialization(req: Request, res: Response) {
    const { name_en, name_ar, description_en, description_ar } = req.body;
    const specializationRepo = new SpecializationRepo().getRepository();
    const name = { en: name_en, ar: name_ar };
    const nameObj = buildName(name);
    if (!nameObj) {
        return res.status(ResponseStatus.BAD_REQUEST).json({
            message:req.t?req.t("name_invalid"): "Invalid name. Must be a string or an object with 'en' property",
        });
    }

    const description = { en: description_en, ar: description_ar };
    const descObj = buildDescription(description);
    const existing = await specializationRepo.findOne({ where: { name: nameObj } });
    if (existing) {
        return res.status(ResponseStatus.CONFLICT).json({ message:req.t?req.t("specialization_exists"): "Specialization with this name already exists" });
    }
    const specialization = specializationRepo.create({
        name: nameObj,
        description: descObj,
    });
    
    await specializationRepo.save(specialization);

    logger.info(`Created specialization with ID: ${specialization.id}`);
    return res.status(ResponseStatus.CREATED).json({is_added:true, message:req.t?req.t("specialization_created"): "Specialization created" });
}
export async function updateSpecialization(req: Request, res: Response) {
    const { id } = req.params;
    const { name_en, name_ar, description_en, description_ar } = req.body;
    const specializationRepo = new SpecializationRepo().getRepository();
    const specialization = await specializationRepo.findOne({ where: { id } });
    if (!specialization) {
        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("specialization_not_found"): "Specialization not found" });
    }
    const name = { en: name_en, ar: name_ar };

    if (name) {
        const nameObj = buildName(name); 
        if (!nameObj) {
            return res.status(ResponseStatus.BAD_REQUEST).json({
                message:req.t?req.t("name_invalid"): "Invalid name. Must be a string or an object with 'en' property",
            });
        }
        specialization.name = {
            en: nameObj.en,
            ar: nameObj.ar ?? "",
        };
    }
    const description = { en: description_en, ar: description_ar };

    if (description) {
        const descObj = buildDescription(description);
        specialization.description = descObj; 
    }
    await specializationRepo.save(specialization);

    logger.info(`Updated specialization with ID: ${specialization.id}`);
    return res.status(ResponseStatus.SUCCESS).json({is_updated:true ,message:req.t?req.t("specialization_updated"): "Specialization updated" });
}
export async function deleteSpecialization(req: Request, res: Response) {
    const { id } = req.params;
    const specializationRepo = new SpecializationRepo().getRepository();
    const specialization = await specializationRepo.findOne({ where: { id } }); 
    if (!specialization) {
        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("specialization_not_found"): "Specialization not found" });
    }
    await specializationRepo.remove(specialization);

    logger.info(`Deleted specialization with ID: ${specialization.id}`);
    return res.json({is_deleted:true, message:req.t?req.t("specialization_deleted"): "Specialization deleted" });
}