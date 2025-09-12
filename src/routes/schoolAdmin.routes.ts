import { Router } from "express";
import {
  getAllSchoolAdmins,
  getSchoolAdminsBySchool,
  createSchoolAdmin,
  updateSchoolAdmin,
  deleteSchoolAdmin,
} from "../controllers/schoolAdminController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// School admin routes
router.get("/", getAllSchoolAdmins);
router.get("/school/:schoolId", getSchoolAdminsBySchool);
router.post("/", createSchoolAdmin);
router.put("/:id", updateSchoolAdmin);
router.delete("/:id", deleteSchoolAdmin);

export default router;
