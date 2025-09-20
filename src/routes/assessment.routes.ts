import express from "express";
import {
  createAssessment,
  getMyAssessments,
  getAssessmentById,
  updateAssessment,
  publishAssessment,
  getQuestionsForAssessment,
  getAssessmentAnalytics,
  deleteAssessment,
} from "../controllers/assessmentController";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { PERMISSIONS } from "../constants";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Assessment CRUD routes
router.post("/", requirePermission("CREATE_ASSESSMENTS"), createAssessment);
router.get("/", getMyAssessments);
router.get("/questions", getQuestionsForAssessment);
router.get("/:id", getAssessmentById);
router.put("/:id", requirePermission("MANAGE_ASSESSMENTS"), updateAssessment);
router.post("/:id/publish", requirePermission("MANAGE_ASSESSMENTS"), publishAssessment);
router.get("/:id/analytics", getAssessmentAnalytics);
router.delete("/:id", requirePermission("MANAGE_ASSESSMENTS"), deleteAssessment);

export default router;
