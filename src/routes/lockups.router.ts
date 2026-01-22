import { Router } from "express";
import {
  getAdminsLockup,
  getAllUsersLockup,
  getdepartmentsLockupController,
  getDomainDepartmentsLockupController,
  getDomainsLockupController,
  getGroupNonTechnicians,
  getGroupsLockupController,
  getGroupTechnicians,
  getPermissionsLockupController,
  getRequestersLockup,
  getSpecializationsLockupController,
  getTechniciansLockup,
  getUniversitiesLockupController,
  getUniversityDomainsLockupController,
  getUserTicketsLockupController,
} from "../controllers/lockups..controller.js";

const router = Router();

router.get("/users", getAllUsersLockup);
router.get("/requesters", getRequestersLockup);
router.get("/admins", getAdminsLockup);
router.get("/technicians", getTechniciansLockup);
router.get("/permissions", getPermissionsLockupController);
router.get("/universities", getUniversitiesLockupController);
router.get("/domains", getDomainsLockupController);
router.get("/departments", getdepartmentsLockupController);
router.get("/specializations", getSpecializationsLockupController);
router.get("/groups", getGroupsLockupController);
router.get("/universities/:id/domains", getUniversityDomainsLockupController);
router.get("/domains/:id/departments", getDomainDepartmentsLockupController);
router.get("/group/:groupId/technicians", getGroupTechnicians);
router.get("/group/:groupId/non-members-technicians", getGroupNonTechnicians);
router.get("/ticket/:id", getUserTicketsLockupController);

export default router;
