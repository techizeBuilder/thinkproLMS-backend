import { Router } from "express";
import {
  getAllMentors,
  getMentorById,
  getMyProfile,
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
router.get("/my-profile", getMyProfile); // Mentors can access their own profile
router.get("/:id", getMentorById);
router.post("/", createMentor);
router.put("/:id", updateMentor);
router.delete("/:id", deleteMentor);

export default router;
