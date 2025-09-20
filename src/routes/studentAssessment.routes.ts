import express from "express";
import {
  getAvailableAssessments,
  startAssessment,
  submitAnswer,
  submitAssessment,
  getMyAssessmentResults,
} from "../controllers/studentAssessmentController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Student assessment routes
router.get("/available", getAvailableAssessments);
router.get("/results", getMyAssessmentResults);
router.post("/:id/start", startAssessment);
router.put("/:id/answer", submitAnswer);
router.post("/:id/submit", submitAssessment);

export default router;
