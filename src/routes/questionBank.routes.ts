import express from "express";
import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  getQuestionRecommendations,
  createQuestionRecommendation,
  reviewQuestionRecommendation,
  getSubjectsAndModules,
} from "../controllers/questionBankController";
import {
  upload,
  parseBulkQuestions,
  uploadBulkQuestions,
} from "../controllers/bulkUploadController";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { ROLES } from "../constants";

const router = express.Router();

// Question Bank Routes
router.get("/questions", authMiddleware, getQuestions);
router.get("/questions/:id", authMiddleware, getQuestionById);
router.post("/questions", authMiddleware, createQuestion);
router.put("/questions/reorder", authMiddleware, reorderQuestions);
router.put("/questions/:id", authMiddleware, updateQuestion);
router.delete("/questions/:id", authMiddleware, deleteQuestion);

// Question Recommendations Routes
router.get("/recommendations", authMiddleware, getQuestionRecommendations);
router.post("/recommendations", authMiddleware, createQuestionRecommendation);
router.put("/recommendations/:id/review", authMiddleware, (req: AuthRequest, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (user.role !== ROLES.SuperAdmin && user.role !== ROLES.LeadMentor) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}, reviewQuestionRecommendation);

// Bulk Upload Routes
router.post("/bulk-upload/parse", authMiddleware, upload.single('file'), parseBulkQuestions);
router.post("/bulk-upload/save", authMiddleware, uploadBulkQuestions);

// Utility Routes
router.get("/subjects-modules", authMiddleware, getSubjectsAndModules);

export default router;
