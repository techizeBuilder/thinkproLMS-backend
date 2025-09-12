import { Router } from "express";
import {
  getAllMentors,
  getMentorById,
  createMentor,
  updateMentor,
  deleteMentor,
} from "../controllers/mentorController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Mentor routes
router.get("/", getAllMentors);
router.get("/:id", getMentorById);
router.post("/", createMentor);
router.put("/:id", updateMentor);
router.delete("/:id", deleteMentor);

export default router;
