import { DomainRepo } from "../repositories/DomainRepo.js";
import { Request, Response } from "express";
import { Domain } from "../entities/Domain.js";
import logger from "../utils/logger.js";
import { UniversityRepo} from "../repositories/UniversityRepo.js";
import { buildDescription ,buildName} from "../utils/handleNamaAndDesc.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";


const domainRepo = new DomainRepo();
const universityRepo = new UniversityRepo();
export async function getAllDomains(req: Request, res: Response) {
        const domainRepoInstance = domainRepo.returnRepo();
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const page_size = req.query.page_size ? parseInt(req.query.page_size as string, 10) : 20;
        const domainSearch = (req.query.name) as string | undefined;
        const universitySearch = req.query.university as string | undefined;

        const safePage = isNaN(page) || page < 1 ? 1 : page;
        const safeLimit = isNaN(page_size) || page_size < 1 ? 20 : page_size;

        const result = await Domain.paginate(
        safePage,
        safeLimit,
        domainSearch,
        domainRepoInstance,
        universitySearch      
        );
    logger.info(`Fetched domains - Page: ${safePage}, Limit: ${safeLimit}, Domain filter: ${domainSearch || "None"}, University filter: ${universitySearch || "None"}`);
    return res.json(result); 
}


export async function createDomain(req: Request, res: Response) {
    const UniversityRepoInstance = universityRepo.returnRepo();
    const domainRepoInstance = domainRepo.returnRepo();
    const { name_en,name_ar ,description_ar,description_en, university } = req.body; 

    if (!university) {
      return res.status(ResponseStatus.BAD_REQUEST).json({ message:req.t?req.t("university_required"): "university id required" });
    }
    const universityEntity = await UniversityRepoInstance.findOne({ where: { id: university } });
    if (!universityEntity) {
      return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("university_not_found"): "University not found" });
    }
    const name = { en: name_en, ar: name_ar };
    const description = { en: description_en, ar: description_ar };
    const nameObj= buildName(name);
    const descriptionObj = buildDescription(description);
    const existing = await domainRepoInstance
      .createQueryBuilder("d") 
      .where(`d.name->>'en' = :en`, { en: nameObj.en })
      .andWhere("d.universityId = :uid", { uid: university })
      .getOne();

    if (existing) {
      return res.status(ResponseStatus.CONFLICT).json({ message:req.t?req.t("domain_exists"): "Domain with this name already exists" });
    }

    const domainEntity = domainRepoInstance.create({
      name: nameObj,
      description: descriptionObj,
      university: universityEntity,
    });

    const saved = await domainRepoInstance.save(domainEntity);
    logger.info(`Created new domain with ID: ${saved.id} ${saved.description}`);

    return res.status(ResponseStatus.CREATED).json({is_added:true, message:req.t?req.t("domain_created"): "Domain created" });

}

export async function getDomainById(req: Request, res: Response) {
    const { id } = req.params;
    const domainRepoInstance = domainRepo.returnRepo();

    const domain = await domainRepoInstance.findOne({
      where: { id },
      relations: ["university"],
    });

    if (!domain) {
      return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("domain_not_found"): "Domain not found" });
    }
    logger.info(`Fetched domain with ID: ${domain.id}`);
    const plainDomain = JSON.parse(JSON.stringify(domain));
    if (plainDomain.__university__ !== undefined) {
      plainDomain.university = plainDomain.__university__;
      delete plainDomain.__university__;
    }


    return res.status(ResponseStatus.SUCCESS).json(plainDomain);
}

export async function updateDomain(req: Request, res: Response) {
        const { id } = req.params;
        const { name_en,name_ar,description_ar,description_en, university } = req.body;
        const existingUniversity = university ? await universityRepo.returnRepo().findOne({ where: { id: university } }) : undefined;
        if (university && !existingUniversity) {
            return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("university_not_found") :"University not found" });
        }
        const domainRepoInstance = domainRepo.returnRepo();
        const domain = await domainRepoInstance.findOne({ where: { id } });
        if (!domain) {
            return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("domain_not_found"): "Domain not found" });
        }
        const name = name_en || name_ar ? { en: name_en, ar: name_ar } : undefined;
        const description = description_en || description_ar ? { en: description_en, ar: description_ar } : undefined;
        domain.name = name ?? domain.name;
        domain.description = description ?? domain.description;
        domain.university = university ?? domain.university;
        await domainRepoInstance.save(domain);
        logger.info(`Updated domain with ID: ${domain.id}`);
        return res.status(ResponseStatus.SUCCESS).json({is_updated:true, message: req.t?req.t("domain_updated"):"Domain updated", domain });

}

export async function deleteDomain(req: Request, res: Response) {
        const { id } = req.params;
        const domainRepoInstance = domainRepo.returnRepo();
        const domain = await domainRepoInstance.findOne({ where: { id } });
        if (!domain) {
            return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("domain_not_found"): "Domain not found" });
        }
        await domainRepoInstance.remove(domain);
        logger.info(`Deleted domain with ID: ${domain.id}`);
        return res.json({is_deleted:true, message:req.t?req.t("domain_deleted"): "Domain deleted" });
 }
 


