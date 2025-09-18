import { Router } from "express";
import {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../controllers/subjectController";
import { authMiddleware } from "../middleware/auth";
import { requirePermission, PERMISSIONS } from "../middleware/permissions";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Subject routes
router.get("/", getAllSubjects);
router.get("/:id", getSubjectById);
// Only lead mentors with ADD_MODULES permission can create/update/delete subjects
router.post("/", requirePermission("ADD_MODULES"), createSubject);
router.put("/:id", requirePermission("ADD_MODULES"), updateSubject);
router.delete("/:id", requirePermission("ADD_MODULES"), deleteSubject);

export default router;
