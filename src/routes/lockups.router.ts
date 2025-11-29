import { Router } from "express";
import {
  getAdminsLockup,
  getAllUsersLockup,
  getRequestersLockup,
  getTechniciansLockup,
} from "../controllers/lockups..controller.js";

const router = Router();

router.get("/users", getAllUsersLockup);
router.get("/requesters", getRequestersLockup);
router.get("/admins", getAdminsLockup);
router.get("/technicians", getTechniciansLockup);

export default router;
