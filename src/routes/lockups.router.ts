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
  getProblemsLockupController,
  getTicketProblemsLockupController,
  getPermissionsLockup,
  getAuditActionsLockupController,
  getTicketActivityActionsController,
  getTicketActivityUsersController,
  getTeamsLockupController,
} from "../controllers/lockups.controller.js";

const router = Router();

router.get("/users", getAllUsersLockup);
router.get("/requesters", getRequestersLockup);
router.get("/admins", getAdminsLockup);
router.get("/technicians", getTechniciansLockup);
// router.get("/permissions", getPermissionsLockupController);
router.get("/permissions/system", getPermissionsLockupController);
router.get("/universities", getUniversitiesLockupController);
router.get("/domains", getDomainsLockupController);
router.get("/departments", getdepartmentsLockupController);
router.get("/specializations", getSpecializationsLockupController);
router.get("/groups", getGroupsLockupController);
router.get("/teams", getTeamsLockupController);
router.get("/actions", getAuditActionsLockupController);
router.get("/universities/:id/domains", getUniversityDomainsLockupController);
router.get("/domains/:id/departments", getDomainDepartmentsLockupController);
router.get("/groups/:groupId/technicians", getGroupTechnicians);
router.get("/groups/:groupId/non-members-technicians", getGroupNonTechnicians);
router.get("/specializations/:id/problems/", getProblemsLockupController);
router.get("/ticket/problems/",getTicketProblemsLockupController);
router.get("/ticket/:id/activities", getTicketActivityActionsController);
router.get("/ticket/:id/activity-users", getTicketActivityUsersController);
router.get("/ticket/:id", getUserTicketsLockupController);
router.get("/permissions", getPermissionsLockup);


export default router;
