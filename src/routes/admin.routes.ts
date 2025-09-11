import { Router } from "express";
import { createAdmin, getAllAdmins } from "../controllers/adminController";
import { authMiddleware } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { ROLES } from "../constants";

const router = Router();

router.use(authMiddleware);
router.get("/", checkRole(ROLES.SuperAdmin), getAllAdmins);
router.post("/", checkRole(ROLES.SuperAdmin), createAdmin);

export default router;
