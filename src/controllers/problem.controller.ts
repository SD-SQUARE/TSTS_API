import { Request, Response } from "express";
import { ProblemRepo } from "../repositories/ProblemRepo.js";
import { SpecializationRepo } from "../repositories/SpecializationRepo.js";
import { Problem } from "../entities/Problem.js";
import { buildName, buildDescription } from "../utils/handleNamaAndDesc.js";
import logger from "../utils/logger.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { ProblemDto } from "../interfaces/response/problemResponse.js";

export async function getProblemById(req: Request, res: Response) {
    const { id } = req.params;
    const problemRepo = new ProblemRepo().getRepository();

    const problem = await problemRepo.findOne({
        where: { id },
        relations: ["specialization"],
    });

    if (!problem) {
        return res.status(ResponseStatus.NOT_FOUND).json({
            message: req.t ? req.t("problem_not_found") : "Problem not found",
        });
    }

    const result: ProblemDto = problem.toApi();

    logger.info(`Fetched problem with ID: ${problem.id}`);
    return res.json(result);
}

export async function getProblems(req: Request, res: Response) {
    const { page, limit, name, specialization } = req.query;
    const problemRepo = new ProblemRepo().getRepository();
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;

    // Use Problem.paginate helper
    const result = await Problem.paginate(
        pageNum,
        limitNum,
        name as string | undefined,
        problemRepo,
        specialization as string | undefined
    );

    logger.info(`Listed problems - Page: ${pageNum}, Limit: ${limitNum}`);
    return res.json(result);
}

export async function createProblem(req: Request, res: Response) {
    const { name_en, name_ar, description_en, description_ar, specialization,review_required } = req.body;

    if (!specialization) {
        return res.status(ResponseStatus.BAD_REQUEST).json({
            message: req.t ? req.t("specialization_required") : "You must provide a specialization",
        });
    }

    const specRepo = new SpecializationRepo().getRepository();
    const spec = await specRepo.findOne({ where: { id: specialization } });
    if (!spec) {
        return res.status(ResponseStatus.BAD_REQUEST).json({
            message: req.t ? req.t("specialization_not_found") : "Specialization not found",
        });
    }

    const problemRepo = new ProblemRepo().getRepository();

    const nameObj = buildName({ en: name_en, ar: name_ar });
    if (!nameObj) {
        return res.status(ResponseStatus.BAD_REQUEST).json({
            message: req.t
                ? req.t("name_invalid")
                : "Invalid name. Must be a string or an object with 'en' property",
        });
    }

    const descObj = buildDescription({ en: description_en, ar: description_ar });

     if(review_required==null){
        return res.status(ResponseStatus.BAD_REQUEST).json(
            {
                message:req.t?req.t("review_required"):"you must provide review_required"
            }
        )
    }
    const existing= await problemRepo.findOne({where:{name:nameObj}})
     if (existing) {
        return res.status(ResponseStatus.CONFLICT).json({ message:req.t?req.t("problem_existing"): "Problem with this name already exists" });
    }
    const problem =  problemRepo.create({
        name: nameObj,
        description: descObj,
        specialization: spec,
        review_required
    });

    await problemRepo.save(problem);

    logger.info(`Created problem with ID: ${problem.id}`);
    return res.status(ResponseStatus.CREATED).json({
        is_added: true,
        message: req.t ? req.t("problem_created") : "Problem created",
    });
}

export async function updateProblem(req: Request, res: Response) {
    const { id } = req.params;
    const { name_en, name_ar, description_en, description_ar, specialization,review_required } = req.body;

    const problemRepo = new ProblemRepo().getRepository();
    const problem = await problemRepo.findOne({ where: { id }, relations: ["specialization"] });

    if (!problem) {
        return res.status(ResponseStatus.NOT_FOUND).json({
            message: req.t ? req.t("problem_not_found") : "Problem not found",
        });
    }

    if (specialization) {
        const specRepo = new SpecializationRepo().getRepository();
        const spec = await specRepo.findOne({ where: { id: specialization } });
        if (!spec) {
            return res.status(ResponseStatus.BAD_REQUEST).json({
                message: req.t ? req.t("specialization_not_found") : "Specialization not found",
            });
        }
        problem.specialization = spec;
    }

    if (name_en || name_ar) {
        const nameObj = buildName({ en: name_en, ar: name_ar });
        if (!nameObj) {
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
        return res.status(ResponseStatus.BAD_REQUEST).json(
            {
                message:req.t?req.t("review_required"):"you must provide review_required"
            }
        )
    }
    problem.review_required=review_required;

    await problemRepo.save(problem);

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
    if (!problem) {
        return res.status(ResponseStatus.NOT_FOUND).json({
            message: req.t ? req.t("problem_not_found") : "Problem not found",
        });
    }

    await problemRepo.remove(problem);

    logger.info(`Deleted problem with ID: ${problem.id}`);
    return res.json({
        is_deleted: true,
        message: req.t ? req.t("problem_deleted") : "Problem deleted",
    });
}
