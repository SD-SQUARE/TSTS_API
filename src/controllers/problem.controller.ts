import { Request, Response } from "express";
import { ProblemRepo } from "../repositories/ProblemRepo.js";
import { SpecializationRepo } from "../repositories/SpecializationRepo.js";
import { Problem } from "../entities/problem.js";
import { buildName, buildDescription } from "../utils/handleNamaAndDesc.js";
import logger from "../utils/logger.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { ProblemDto } from "../interfaces/response/problemResponse.js";
import { audit } from "../helpers/auditBuilder.js";
import { AuditAction } from "../enums/AuditAction.enum.js";

export async function getProblemById(req: Request, res: Response) {
    const { id } = req.params;
    const problemRepo = new ProblemRepo().getRepository();

    const auditLog = audit(req)
    .summary("Fetch problem by ID")
    .action(AuditAction.GET_PROBLEM_BY_ID)
    .metadata({ id });


    const problem = await problemRepo.findOne({
        where: { id },
        relations: ["specialization"],
    });

    if (!problem) {
        auditLog.step("Problem not found");
        return res.status(ResponseStatus.NOT_FOUND).json({
            message: req.t ? req.t("problem_not_found") : "Problem not found",
        });
    }

    auditLog
    .step("Problem fetched successfully")
    .resource("problem", problem.id);

    const result: ProblemDto = problem.toApi();

    logger.info(`Fetched problem with ID: ${problem.id}`);
    return res.json(result);
}

export async function getProblems(req: Request, res: Response) {
    const { page, page_size: limit, name, specialization } = req.query;
    const problemRepo = new ProblemRepo().getRepository();
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;

    const auditLog = audit(req)
    .summary("Fetch paginated problems")
    .action(AuditAction.GET_PROBLEMS)
    .metadata({
      page: pageNum,
      limit: limitNum,
      name: name ?? null,
      specialization: specialization ?? null,
    });

    const result = await Problem.paginate(
        pageNum,
        limitNum,
        name as string | undefined,
        problemRepo,
        specialization as string | undefined
    );

    auditLog
    .step("Problems listed successfully")
    .resource("problem", "all");

    logger.info(`Listed problems - Page: ${pageNum}, Limit: ${limitNum}`);
    return res.json(result);
}

export async function createProblem(req: Request, res: Response) {
    const { name_en, name_ar, description_en, description_ar, specialization,review_required } = req.body;

    const auditLog = audit(req)
    .summary("Create new problem")
    .action(AuditAction.CREATE_PROBLEM)
    .metadata({
      name: { en: name_en, ar: name_ar },
      specialization,
      review_required,
    });

    if (!specialization) {
        auditLog.step("Specialization missing");
        return res.status(ResponseStatus.BAD_REQUEST).json({
            message: req.t ? req.t("specialization_required") : "You must provide a specialization",
        });
    }

    const specRepo = new SpecializationRepo().getRepository();
    const spec = await specRepo.findOne({ where: { id: specialization } });
    if (!spec) {
        auditLog.step("Specialization not found");
        return res.status(ResponseStatus.BAD_REQUEST).json({
            message: req.t ? req.t("specialization_not_found") : "Specialization not found",
        });
    }

    const problemRepo = new ProblemRepo().getRepository();

    const nameObj = buildName({ en: name_en, ar: name_ar });
    if (!nameObj) {
        auditLog.step("Invalid name");
        return res.status(ResponseStatus.BAD_REQUEST).json({
            message: req.t
                ? req.t("name_invalid")
                : "Invalid name. Must be a string or an object with 'en' property",
        });
    }

    const descObj = buildDescription({ en: description_en, ar: description_ar });

     if(review_required==null){
        auditLog.step("Review required field missing");
        return res.status(ResponseStatus.BAD_REQUEST).json(
            {
                message:req.t?req.t("review_required"):"you must provide review_required"
            }
        )
    }
    const existing= await problemRepo.findOne({where:{name:nameObj}})
     if (existing) {
        auditLog.step("Problem already exists");
        return res.status(ResponseStatus.CONFLICT).json({ message:req.t?req.t("problem_existing"): "Problem with this name already exists" });
    }
    const problem =  problemRepo.create({
        name: nameObj,
        description: descObj,
        specialization: spec,
        review_required
    });

    await problemRepo.save(problem);

    auditLog.step("Problem created successfully").resource("problem", problem.id);

    logger.info(`Created problem with ID: ${problem.id}`);
    return res.status(ResponseStatus.CREATED).json({
        is_added: true,
        message: req.t ? req.t("problem_created") : "Problem created",
    });
}

export async function updateProblem(req: Request, res: Response) {
    const { id } = req.params;
    const { name_en, name_ar, description_en, description_ar, specialization,review_required } = req.body;

    const auditLog = audit(req)
    .summary("Update problem")
    .action(AuditAction.UPDATE_PROBLEM);

    const problemRepo = new ProblemRepo().getRepository();
    const problem = await problemRepo.findOne({ where: { id }, relations: ["specialization"] });

    if (!problem) {
        auditLog.step("Problem not found");
        return res.status(ResponseStatus.NOT_FOUND).json({
            message: req.t ? req.t("problem_not_found") : "Problem not found",
        });
    }

    const oldValue: Record<string, any> = {
        name: problem.name,
        description: problem.description,
        specialization: problem.specialization?.id,
        review_required: problem.review_required,
    };
    const newValue: Record<string, any> = { ...oldValue };

    if (specialization) {
        const specRepo = new SpecializationRepo().getRepository();
        const spec = await specRepo.findOne({ where: { id: specialization } });
        if (!spec) {
            auditLog.step("Specialization not found");
            return res.status(ResponseStatus.BAD_REQUEST).json({
                message: req.t ? req.t("specialization_not_found") : "Specialization not found",
            });
        }
        problem.specialization = spec;
    }

    if (name_en || name_ar) {
        const nameObj = buildName({ en: name_en, ar: name_ar });
        if (!nameObj) {
            auditLog.step("Invalid name");
            return res.status(ResponseStatus.BAD_REQUEST).json({
                message: req.t
                    ? req.t("name_invalid")
                    : "Invalid name. Must be a string or an object with 'en' property",
            });
        }
        problem.name = { en: nameObj.en, ar: nameObj.ar ?? "" };
    }

    if (description_en || description_ar) {
        const descObj = buildDescription({ en: description_en, ar: description_ar });
        problem.description = descObj;
    }
     if(review_required==null){
        auditLog.step("review_required missing");
        return res.status(ResponseStatus.BAD_REQUEST).json(
            {
                message:req.t?req.t("review_required"):"you must provide review_required"
            }
        )
    }
    problem.review_required=review_required;

    await problemRepo.save(problem);

    auditLog
    .metadata({ oldValue, newValue })
    .resource("problem", problem.id)
    .step("Problem updated successfully")

    logger.info(`Updated problem with ID: ${problem.id}`);
    return res.status(ResponseStatus.SUCCESS).json({
        is_updated: true,
        message: req.t ? req.t("problem_updated") : "Problem updated",
    });
}

export async function deleteProblem(req: Request, res: Response) {
    const { id } = req.params;
    const problemRepo = new ProblemRepo().getRepository();

    const problem = await problemRepo.findOne({ where: { id } });

    const auditLog = audit(req)
    .summary("Delete problem")
    .action(AuditAction.DELETE_PROBLEM)

    if (!problem) {
        auditLog.step("Problem not found");
        return res.status(ResponseStatus.NOT_FOUND).json({
            message: req.t ? req.t("problem_not_found") : "Problem not found",
        });
    }

    await problemRepo.remove(problem);

    auditLog
    .resource("problem", problem.id)
    .step("Problem deleted successfully");

    logger.info(`Deleted problem with ID: ${problem.id}`);
    return res.json({
        is_deleted: true,
        message: req.t ? req.t("problem_deleted") : "Problem deleted",
    });
}
