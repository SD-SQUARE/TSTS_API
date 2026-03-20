import { Request, Response } from "express";
import { University } from "../entities/University.js";
import { UniversityRepo } from "../repositories/UniversityRepo.js";
import logger from "../utils/logger.js";
import { buildDescription, buildName } from "../utils/handleNamaAndDesc.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { audit } from "../helpers/auditBuilder.js";
import { AuditAction } from "../enums/AuditAction.enum.js";

const universityRepo = new UniversityRepo();

export async function getAllUniversities(req: Request, res: Response) {
  const auditLog = audit(req)
    .summary("Fetch all universities")
    .ACTION(AuditAction.GET_ALL_UNIVERSITIES)
    .resource("University")
    .metadata({ query: req.query });  
  
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const name = req.query.name ? (req.query.name as string) : undefined;
    const safePage = isNaN(page) || page < 1 ? 1 : page;
    const safeLimit = isNaN(limit) || limit < 1 ? 20 : limit;
    const universityRepoInstance = universityRepo.returnRepo();
    const result = await University.paginate(safePage, safeLimit, name, universityRepoInstance);
    logger.info(`Fetched universities - Page: ${safePage}, Limit: ${safeLimit}, Name filter: ${name || "None"}`);

    auditLog
      .step("Fetched universities successfully")
      .metadata({
        page: safePage,
        limit: safeLimit,
        nameFilter: name || null,
        totalItems: result.meta?.total || 0,
      });

    return res.status(ResponseStatus.SUCCESS).json(result); 
}

export async function createUniversity(req: Request, res: Response) {
   const auditLog = audit(req)
    .summary("Create new university")
    .ACTION(AuditAction.CREATE_UNIVERSITY)
    .resource("University")
    .metadata({ body: req.body });  
  
    const { name_en, name_ar, description_en, description_ar } = req.body;

    const nameInput = { en: name_en, ar: name_ar };
    const descInput = { en: description_en, ar: description_ar };

    let nameObj;
    nameObj = buildName(nameInput); 

    const descriptionObj = buildDescription(descInput); 

    const universityRepoInstance = universityRepo.returnRepo();

    const existing = await universityRepoInstance
      .createQueryBuilder("u")
      .where(`u.name->>'en' = :en`, { en: nameObj.en })
      .getOne();

    if (existing) {
      auditLog.step("University already exists").metadata({ existingId: existing.id });

      return res.status(ResponseStatus.CONFLICT).json({ message:req.t? req.t("university_exists") :"University already exists" });
    }

    const safeName = {
      en: nameObj.en,
      ar: nameObj.ar ?? "",
    };

    const safeDescription = descriptionObj ?? undefined;

    const university = universityRepoInstance.create({
      name: safeName,
      description: safeDescription,
    });

    const saved = await universityRepoInstance.save(university);

    auditLog.step("University created successfully").metadata({ universityId: saved.id });

    logger.info(`Created new university with ID: ${saved.id}`);
    return res.status(ResponseStatus.CREATED).json({is_added:true, message: req.t? req.t("university_created"): "University created" });

}


export async function getUniversityById(req: Request, res: Response) {
  
        const { id } = req.params;
        const auditLog = audit(req)
          .summary("Fetch single university by ID")
          .ACTION(AuditAction.GET_UNIVERSITY_BY_ID)
          .resource("University", id)
          .metadata({ requestedBy: (req as any).user?.id });

        const universityRepoInstance = universityRepo.returnRepo();
        const university = await universityRepoInstance.findOne({ where: { id } });
        if (!university) {
            auditLog.step("University not found").metadata({ universityId: id });

            return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("university_not_found"):"University not found" });
        }
        auditLog.step("University fetched successfully").metadata({ universityId: university.id });

        logger.info(`Fetched university with ID: ${university.id}`);
        return res.status(ResponseStatus.SUCCESS).json(university);

}

export async function updateUniversity(req: Request, res: Response) {
        const { id } = req.params;
        const { name_en, name_ar, description_en, description_ar } = req.body;
        
        const auditLog = audit(req)
          .summary("Update university")
          .ACTION(AuditAction.UPDATE_UNIVERSITY)
          .resource("University", id)
          .metadata({ requestedBy: (req as any).user?.id, body: req.body });
        
        const universityRepoInstance = universityRepo.returnRepo();
        const university = await universityRepoInstance.findOne({ where: { id } });
        if (!university) {
            auditLog.step("University not found").metadata({ universityId: id });
            return res.status(ResponseStatus.NOT_FOUND).json({ message: req.t?req.t("university_not_found"):"University not found" });
        }
        const oldValue = {
          name: university.name,
          description: university.description,
        };

        const name = name_en || name_ar ? { en: name_en, ar: name_ar } : undefined;
        const description = description_en || description_ar ? { en: description_en, ar: description_ar } : undefined;
        university.name = name ?? university.name;
        university.description = description ?? university.description;
        await universityRepoInstance.save(university);
        auditLog
          .step("University updated successfully")
          .metadata({ universityId: university.id, oldValue, newValue: { name: university.name, description: university.description } });

        logger.info(`Updated university with ID: ${university.id}`);
        return res.status(ResponseStatus.SUCCESS).json({is_updated:true, message: req.t?req.t("university_updated"):"University updated"  });

}
export async function deleteUniversity(req: Request, res: Response) {
        const { id } = req.params;

         const auditLog = audit(req)
          .summary("Delete university")
          .ACTION(AuditAction.DELETE_UNIVERSITY)
          .resource("University", id)
          .metadata({ requestedBy: (req as any).user?.id });

        const universityRepoInstance = universityRepo.returnRepo();
        const university = await universityRepoInstance.findOne({ where: { id } });
        if (!university) {
            auditLog.step("University not found").metadata({ universityId: id });
            return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("university_not_found"): "University not found" });
        }
        await universityRepoInstance.remove(university);
        
        auditLog.step("University deleted successfully").metadata({ universityId: university.id });

        logger.info(`Deleted university with ID: ${university.id}`);
        return res.json({ is_deleted:true,message: req.t?req.t("university_deleted"):"University deleted" });
}
