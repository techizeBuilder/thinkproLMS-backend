import { Router } from "express";
import {
  getAllModules,
  getModulesByGradeAndSubject,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
} from "../controllers/moduleController";
import { authMiddleware } from "../middleware/auth";
import { requirePermission, PERMISSIONS } from "../middleware/permissions";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Module routes
router.get("/", getAllModules);
router.get("/grade/:grade/subject/:subjectId", getModulesByGradeAndSubject);
router.get("/:id", getModuleById);
// Only lead mentors with ADD_MODULES permission can create/update/delete modules
router.post("/", requirePermission("ADD_MODULES"), createModule);
router.put("/:id", requirePermission("ADD_MODULES"), updateModule);
router.delete("/:id", requirePermission("ADD_MODULES"), deleteModule);

export default router;
