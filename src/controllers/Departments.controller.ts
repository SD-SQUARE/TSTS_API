import { Request,Response } from "express";
import { DepartmentRepo } from "../repositories/DepartmentRepo.js";
import { buildDescription ,buildName} from "../utils/handleNamaAndDesc.js";
import { Domain } from "../entities/Domain.js";
import { Department } from "../entities/Department.js";
import { UserDepartmentRepo } from "../repositories/UserDepartmentRepo.js";
import logger from "../utils/logger.js";
import { normalizeRelations } from "../utils/normalizeRelations.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
export async function createDepartment(req: Request, res: Response){

    const { name_en,name_ar, description_ar,description_en, domainId } = req.body;
    const departmentRepo = new DepartmentRepo().getRepository();
    if (!domainId) {
        return res.status(400).json({ message:req.t?req.t("domain_required") :"domain id required" });
    }
    const domainEntity = await departmentRepo.manager.findOne(Domain, { where: { id: domainId } });
    if (!domainEntity) {
        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("domain_not_found"): "Domain not found" });
    }
    const name = { en: name_en, ar: name_ar };
    const description = { en: description_en, ar: description_ar };
    const nameObj= buildName(name);
    const descriptionObj = buildDescription(description);
    const existing = await departmentRepo
        .createQueryBuilder("dept")
        .where(`dept.name->>'en' = :en`, { en: nameObj.en })
        .andWhere("dept.domainId = :did", { did: domainId })
        .getOne();
    if (existing) {
        return res.status(ResponseStatus.CONFLICT).json({ message:req.t?req.t("department_exists"): "Department with this name already exists" });
    }


    const department = departmentRepo.create({
        name: nameObj,
        description: descriptionObj,
        domain: { id: domainId },
    });
    await departmentRepo.save(department);

    res.status(ResponseStatus.CREATED).json({ is_added:true,message:req.t?req.t("department_created"): "Department created" });
}

export async function getDepartmentById(req: Request, res: Response) {
  const { id } = req.params;
  const departmentRepo = new DepartmentRepo().getRepository();

  const department = await departmentRepo.findOne({
    where: { id },
    relations: ["domain", "domain.university"], 
  });

  if (!department) {
    return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("department_not_found"): "Department not found" });
  }

  logger.info(`Fetched department with ID: ${department.id}`);
  const plain=JSON.parse(JSON.stringify(department));
  const normalizedData = normalizeRelations(plain);
  return res.status(ResponseStatus.SUCCESS).json(normalizedData);
}

export async function updateDepartment(req: Request, res: Response) {
  const { id } = req.params;
  const { name_en, name_ar,description_ar,description_en, domainId } = req.body;

  const departmentRepo = new DepartmentRepo().getRepository();
  const department = await departmentRepo.findOne({
    where: { id },
    relations: ["domain"],
  });

  if (!department) {
    return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("department_not_found"): "Department not found" });
  }
  if (domainId) {
    const domainEntity = await departmentRepo.manager.findOne(Domain, {
      where: { id: domainId },
    });
    if (!domainEntity) {
      return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("domain_not_found"): "Domain not found" });
    }
    department.domain = domainEntity;
  }
    const name = { en: name_en, ar: name_ar };

  if (name) {
    const nameObj = buildName(name); 
    if (!nameObj) {
      return res.status(ResponseStatus.BAD_REQUEST).json({
        message:req.t?req.t("name_invalid"): "Invalid name. Must be a string or an object with 'en' property",
      });
    }
    department.name = nameObj;
  }
    const description = { en: description_en, ar: description_ar };

  if (description) {
    const descObj = buildDescription(description);
    department.description = descObj; 
  }

  await departmentRepo.save(department);

  logger.info(`Updated department with ID: ${department.id}`);
  return res.json({is_updated:true ,message:req.t?req.t("department_updated"): "Department updated" });
}
export async function deleteDepartment(req: Request, res: Response) {
  const { id } = req.params;
  const departmentRepo = new DepartmentRepo().getRepository();
    const department = await departmentRepo.findOne({ where: { id } });
    if (!department) {
        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("department_not_found"): "Department not found" });
    }
    await departmentRepo.remove(department);
    logger.info(`Deleted department with ID: ${department.id}`);
    return res.status(ResponseStatus.SUCCESS).json({is_deleted:true, message:req.t?req.t("department_deleted"): "Department deleted" });
}
export async function getAllDepartments(req: Request, res: Response) {
    const { page, limit, Name, domain, university } = req.query;
    const departmentRepo = new DepartmentRepo().getRepository();

    const filters: any = {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
    };
    if (Name) {
        filters.Name = Name;
    }
    if (domain) {
        filters.domain = domain;
    }
    if (university) {
        filters.university = university;
    }
        const result = await Department.paginate(filters, departmentRepo);
    logger.info(`Fetched departments - Page: ${filters.page}, Limit: ${filters.limit}, Department filter: ${Name || "None"}, Domain filter: ${domain || "None"}, University filter: ${university || "None"}`);
        return res.json(result);
}
export async function getDepartmentUsers(req: Request, res: Response) {
    const { id } = req.params;
    const {
      firstName,
      midName,
      lastName,
      user_type,
      page_index = "1",
      page_size = "20",
    } = req.query as Record<string, string | undefined>;

    if (!id) {
      return res.status(400).json({ message: req.t ? req.t("department_id_required") : "department id required" });
    }

    const departmentRepo = new DepartmentRepo().getRepository();
    const exists = await departmentRepo.findOneBy({ id });
    if (!exists) {
      return res.status(ResponseStatus.NOT_FOUND).json({
        message: req.t ? req.t("department_not_found") : "Department not found",
      });
    }

    const udRepo = new UserDepartmentRepo().getRepository();

    const page = Math.max(1, parseInt(page_index, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(page_size, 10) || 20));
    const offset = (page - 1) * limit;

    const qb = udRepo
      .createQueryBuilder("ud")
      .leftJoinAndSelect("ud.user", "usr") 
      .where("ud.departmentId = :deptId", { deptId: id });

    if (firstName && firstName.trim().length > 0) {
      qb.andWhere(`usr.firstName::text ILIKE :firstName`, { firstName: `%${firstName.trim()}%` });
    }

    if (midName && midName.trim().length > 0) {
      qb.andWhere(`usr.midName::text ILIKE :midName`, { midName: `%${midName.trim()}%` });
    }

    if (lastName && lastName.trim().length > 0) {
      qb.andWhere(`usr.lastName::text ILIKE :lastName`, { lastName: `%${lastName.trim()}%` });
    }

    if (user_type && user_type.trim().length > 0) {
      qb.andWhere(`usr.user_type::text ILIKE :user_type`, { user_type: `%${user_type.trim()}%` });
    }

    qb.orderBy("ud.createdAt", "DESC");
    qb.skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

   const users = await Promise.all(
      items.map(async (ud: any) => {
        const u = await ud.user; 
        return {
          id: u?.id ?? null,
          image: u?.image ?? null,
          email: u?.email ?? null,
          first_name: u?.firstName ?? null,
          mid_name: u?.midName ?? null,
          last_name: u?.lastName ?? null,
          user_type: u?.user_type ?? null,
          status: u?.status ?? null,
        };
      })
    );

    logger.info(
      `Fetched users for department ID: ${id} - Page: ${page}, Limit: ${limit}, Returned: ${users.length}`
    );

    return res.json({
      users,
      meta: { total, page_index: page, page_size: limit },
    });
  
}
