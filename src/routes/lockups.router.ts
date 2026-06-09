import { Router } from "express";
import { getAdminsLockup, getAllUsersLockup, getdepartmentsLockupController, getDomainDepartmentsLockupController, getDomainsLockupController, getGroupNonTechnicians, getGroupsLockupController, getGroupTechnicians, getPermissionsLockupController, getRequestersLockup, getSpecializationsLockupController, getTechniciansLockup, getUniversitiesLockupController, getUniversityDomainsLockupController, getUserTicketsLockupController, getProblemsLockupController, getTicketProblemsLockupController, getPermissionsLockup, getAuditActionsLockupController, getTicketActivityActionsController, getTicketActivityUsersController, getTeamsLockupController } from "../controllers/lockups.controller.js";

const router = Router();

/**
 * @openapi
 * /api/v1/lockups/users:
 *   get:
 *     summary: Users lockup
 *     description: Returns a lightweight list of users for dropdown/autocomplete
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               label: "Jane Smith (jane@university.edu)"
 *
 * /api/v1/lockups/requesters:
 *   get:
 *     summary: Requesters lockup
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 10
 *               label: "Jane Smith"
 *
 * /api/v1/lockups/admins:
 *   get:
 *     summary: Admins lockup
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 2
 *               label: "Alice Admin"
 *
 * /api/v1/lockups/technicians:
 *   get:
 *     summary: Technicians lockup
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 5
 *               label: "John Doe"
 *
 * /api/v1/lockups/permissions/system:
 *   get:
 *     summary: System permissions lockup
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: "tickets.create"
 *               label: "Create Tickets"
 *
 * /api/v1/lockups/universities:
 *   get:
 *     summary: Universities lockup
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               label: "Cairo University"
 *
 * /api/v1/lockups/domains:
 *   get:
 *     summary: Domains lockup
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               label: "Engineering"
 *
 * /api/v1/lockups/departments:
 *   get:
 *     summary: Departments lockup
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               label: "Computer Science"
 *
 * /api/v1/lockups/specializations:
 *   get:
 *     summary: Specializations lockup
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               label: "Networking"
 *
 * /api/v1/lockups/groups:
 *   get:
 *     summary: Groups lockup
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               label: "Network Support Team"
 *
 * /api/v1/lockups/teams:
 *   get:
 *     summary: Teams lockup
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               label: "IT Support Team A"
 *
 * /api/v1/lockups/actions:
 *   get:
 *     summary: Audit actions lockup
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: "created"
 *               label: "Created"
 *
 * /api/v1/lockups/permissions:
 *   get:
 *     summary: All permissions lockup (grouped)
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - group: "Tickets"
 *               permissions:
 *                 - id: "tickets.create"
 *                   label: "Create Tickets"
 *                 - id: "tickets.view"
 *                   label: "View Tickets"
 *
 * /api/v1/lockups/universities/{id}/domains:
 *   get:
 *     summary: Domains by university
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               label: "Engineering"
 *
 * /api/v1/lockups/domains/{id}/departments:
 *   get:
 *     summary: Departments by domain
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               label: "Computer Science"
 *
 * /api/v1/lockups/groups/{groupId}/technicians:
 *   get:
 *     summary: Technicians in a group
 *     tags: [Lockups, Groups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 5
 *               label: "John Doe"
 *
 * /api/v1/lockups/groups/{groupId}/non-members-technicians:
 *   get:
 *     summary: Technicians NOT in a group
 *     tags: [Lockups, Groups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 8
 *               label: "Bob Smith"
 *
 * /api/v1/lockups/specializations/{id}/problems:
 *   get:
 *     summary: Problems by specialization
 *     tags: [Lockups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               label: "Cannot connect to WiFi"
 *
 * /api/v1/lockups/ticket/problems:
 *   get:
 *     summary: All ticket problems lockup
 *     tags: [Lockups, Tickets]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               label: "Cannot connect to WiFi"
 *
 * /api/v1/lockups/ticket/{id}/activities:
 *   get:
 *     summary: Ticket activity actions lockup
 *     tags: [Lockups, Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: "status_change"
 *               label: "Status Change"
 *
 * /api/v1/lockups/ticket/{id}/activity-users:
 *   get:
 *     summary: Ticket activity users lockup
 *     tags: [Lockups, Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 5
 *               label: "John Doe"
 *
 * /api/v1/lockups/ticket/{id}:
 *   get:
 *     summary: User tickets lockup
 *     tags: [Lockups, Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 42
 *               label: "Cannot access email - #42"
 */
router.get("/users", getAllUsersLockup);
router.get("/requesters", getRequestersLockup);
router.get("/admins", getAdminsLockup);
router.get("/technicians", getTechniciansLockup);
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
