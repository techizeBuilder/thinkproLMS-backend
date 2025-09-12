import { Router } from "express";
import {
  getAllLeadMentors,
  getLeadMentorById,
  createLeadMentor,
  updateLeadMentor,
  deleteLeadMentor,
} from "../controllers/leadMentorController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Lead mentor routes
router.get("/", getAllLeadMentors);
router.get("/:id", getLeadMentorById);
router.post("/", createLeadMentor);
router.put("/:id", updateLeadMentor);
router.delete("/:id", deleteLeadMentor);

export default router;
