import { Request,Response } from "express";
import { DepartmentRepo } from "../repositories/DepartmentRepo.js";
import { buildDescription ,buildName} from "../utils/handleNamaAndDesc.js";
import { Domain } from "../entities/Domain.js";
import { Department } from "../entities/Department.js";
import { UserDepartmentRepo } from "../repositories/UserDepartmentRepo.js";
import logger from "../utils/logger.js";
import { normalizeRelations } from "../utils/normalizeRelations.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { audit } from "../helpers/auditBuilder.js";
export async function createDepartment(req: Request, res: Response){

    const { name_en,name_ar, description_ar,description_en, domain } = req.body;
    const departmentRepo = new DepartmentRepo().getRepository();

    audit(req).summary("Create department request received").action("CREATE_DEPARTMENT").step("Request received");

    if (!domain) {
        audit(req).step("Missing domain in request");
        return res.status(400).json({ message:req.t?req.t("domain_required") :"domain id required" });
    }
    const domainEntity = await departmentRepo.manager.findOne(Domain, { where: { id: domain } });
    if (!domainEntity) {
        audit(req).step("Domain not found");
        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("domain_not_found"): "Domain not found" });
    }
    const name = { en: name_en, ar: name_ar };
    const description = { en: description_en, ar: description_ar };
    const nameObj= buildName(name);
    const descriptionObj = buildDescription(description);
    const existing = await departmentRepo
        .createQueryBuilder("dept")
        .where(`dept.name->>'en' = :en`, { en: nameObj.en })
        .andWhere("dept.domain = :did", { did: domain })
        .getOne();
    if (existing) {
        audit(req).step("Department already exists");
        return res.status(ResponseStatus.CONFLICT).json({ message:req.t?req.t("department_exists"): "Department with this name already exists" });
    }


    const department = departmentRepo.create({
        name: nameObj,
        description: descriptionObj,
        domain: { id: domain },
    });
    await departmentRepo.save(department);

    audit(req).resource("DEPARTMENT", department.id).step("Department created successfully");

    res.status(ResponseStatus.CREATED).json({ is_added:true,message:req.t?req.t("department_created"): "Department created" });
}

export async function getDepartmentById(req: Request, res: Response) {
  const { id } = req.params;
  const departmentRepo = new DepartmentRepo().getRepository();

  audit(req)
    .summary('Get department by ID request')
    .action('RETRIEVE_DEPARTMENT')
    .step(`Fetching department ${id}`)

  const department = await departmentRepo.findOne({
    where: { id },
    relations: ["domain", "domain.university"], 
  });

  if (!department) {
    audit(req).step("Department not found");
    return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("department_not_found"): "Department not found" });
  }

  audit(req).resource("DEPARTMENT", department.id).step("Department fetched successfully");

  logger.info(`Fetched department with ID: ${department.id}`);
  const plain=JSON.parse(JSON.stringify(department));
  const normalizedData = normalizeRelations(plain);
  return res.status(ResponseStatus.SUCCESS).json(normalizedData);
}

export async function updateDepartment(req: Request, res: Response) {
  const { id } = req.params;
  const { name_en, name_ar,description_ar,description_en, domain } = req.body;

  const departmentRepo = new DepartmentRepo().getRepository();
  const department = await departmentRepo.findOne({
    where: { id },
    relations: ["domain"],
  });

  audit(req).summary("Update department request").action("UPDATE_DEPARTMENT").step(`Updating department ${id}`);

  if (!department) {
    audit(req).step("Department not found");
    return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("department_not_found"): "Department not found" });
  }

  if (domain) {
    const domainEntity = await departmentRepo.manager.findOne(Domain, {
      where: { id: domain },
    });
    if (!domainEntity) {
      audit(req).step("Domain not found for update");
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

  audit(req).resource("DEPARTMENT", department.id).step("Department updated successfully");

  logger.info(`Updated department with ID: ${department.id}`);
  return res.json({is_updated:true ,message:req.t?req.t("department_updated"): "Department updated" });
}
export async function deleteDepartment(req: Request, res: Response) {
  const { id } = req.params;
  const departmentRepo = new DepartmentRepo().getRepository();

  audit(req).summary("Delete department request").action("DELETE_DEPARTMENT").step(`Deleting department ${id}`);

    const department = await departmentRepo.findOne({ where: { id } });
    if (!department) {
        audit(req).step("Department not found for deletion");
        return res.status(ResponseStatus.NOT_FOUND).json({ message:req.t?req.t("department_not_found"): "Department not found" });
    }

    await departmentRepo.remove(department);
    audit(req).resource("DEPARTMENT", department.id).step("Department deleted successfully");

    logger.info(`Deleted department with ID: ${department.id}`);
    return res.status(ResponseStatus.SUCCESS).json({is_deleted:true, message:req.t?req.t("department_deleted"): "Department deleted" });
}
export async function getAllDepartments(req: Request, res: Response) {
    const { page, limit, name, domain, university } = req.query;
    const departmentRepo = new DepartmentRepo().getRepository();

  audit(req)
    .summary("Get all departments request")
    .action("DEPARTMENTS_RETRIEVED")
    .step("Fetching departments list");

    const filters: any = {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
    };
    if (name) {
        filters.departmentName = name;
    }
    if (domain) {
        filters.domain = domain;
    }
    if (university) {
        filters.university = university;
    }
        const result = await Department.paginate(filters, departmentRepo);
    audit(req).step(`Fetched ${result.departments.length} departments`);

    logger.info(`Fetched departments - Page: ${filters.page}, Limit: ${filters.limit}, Department filter: ${name || "None"}, Domain filter: ${domain || "None"}, University filter: ${university || "None"}`);
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

    audit(req)
      .summary("Get department users request")
      .action("RETRIEVE_DEPARTMENT_USERS")
      .step(`Fetching users for department ${id}`)
      .resource('DEPARTMENT', id);

    if (!id) {
      audit(req).step("Missing department ID").status('FAILED');
      return res.status(400).json({ message: req.t ? req.t("department_id_required") : "department id required" });
    }

    const departmentRepo = new DepartmentRepo().getRepository();
    const exists = await departmentRepo.findOneBy({ id });
    if (!exists) {
      audit(req).step("Department not found for fetching users");
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

    audit(req).step(`Fetched ${users.length} users for department ${id}`);
    logger.info(
      `Fetched users for department ID: ${id} - Page: ${page}, Limit: ${limit}, Returned: ${users.length}`
    );

    return res.json({
      users,
      meta: { total, page_index: page, page_size: limit },
    });
  
}
