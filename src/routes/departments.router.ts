import { getDepartmentById,getAllDepartments,updateDepartment,createDepartment,deleteDepartment ,getDepartmentUsers} from "../controllers/Departments.controller.js";
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = Router();
router.post("/",asyncHandler(createDepartment) );
router.get("/",asyncHandler(getAllDepartments) );
router.get("/:id",asyncHandler(getDepartmentById) );
router.put("/:id",asyncHandler (updateDepartment));
router.delete("/:id",asyncHandler(deleteDepartment) );
router.get("/:id/users",asyncHandler(getDepartmentUsers) );

export default router;