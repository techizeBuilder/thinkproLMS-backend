import { Router } from "express";
import multer from "multer";
import {
  getAllSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
} from "../controllers/schoolController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Allow PDF, DOC, DOCX files for contract documents
    if (file.mimetype === "application/pdf" ||
        file.mimetype === "application/msword" ||
        file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, and DOCX files are allowed for contract documents"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Apply auth middleware to all routes
router.use(authMiddleware);

// School routes
router.get("/", getAllSchools);
router.get("/:id", getSchoolById);
router.post("/", upload.single("contractDocument"), createSchool);
router.put("/:id", upload.single("contractDocument"), updateSchool);
router.delete("/:id", deleteSchool);

export default router;
