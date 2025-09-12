import { Router } from "express";
import {
  getAllSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
} from "../controllers/schoolController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// School routes
router.get("/", getAllSchools);
router.get("/:id", getSchoolById);
router.post("/", createSchool);
router.put("/:id", updateSchool);
router.delete("/:id", deleteSchool);

export default router;
