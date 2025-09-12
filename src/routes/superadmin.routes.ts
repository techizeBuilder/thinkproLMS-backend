import { Router } from "express";
import { 
  createSuperAdmin, 
  getAllSuperAdmins, 
  deleteSuperAdmin 
} from "../controllers/superadminController";
import { authMiddleware } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { ROLES } from "../constants";

const router = Router();

router.use(authMiddleware);
router.get("/", checkRole(ROLES.SuperAdmin), getAllSuperAdmins);
router.post("/", checkRole(ROLES.SuperAdmin), createSuperAdmin);
router.delete("/:id", checkRole(ROLES.SuperAdmin), deleteSuperAdmin);

export default router;
