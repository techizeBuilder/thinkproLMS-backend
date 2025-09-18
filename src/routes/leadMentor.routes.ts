import { Router } from "express";
import {
  getAllLeadMentors,
  getLeadMentorById,
  createLeadMentor,
  updateLeadMentor,
  deleteLeadMentor,
} from "../controllers/leadMentorController";
import { authMiddleware } from "../middleware/auth";
import { requirePermission, PERMISSIONS } from "../middleware/permissions";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Lead mentor routes
router.get("/", getAllLeadMentors);
router.get("/:id", getLeadMentorById);
// Only lead mentors with ADD_MENTORS permission can create/update/delete lead mentors
router.post("/", requirePermission("ADD_MENTORS"), createLeadMentor);
router.put("/:id", requirePermission("ADD_MENTORS"), updateLeadMentor);
router.delete("/:id", requirePermission("ADD_MENTORS"), deleteLeadMentor);

export default router;
