import { Router } from "express";
import multer from "multer";
import {
  getAllSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
  toggleSchoolStatus,
} from "../controllers/schoolController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Allow different file types based on field name
    if (file.fieldname === 'contractDocument') {
      // Allow PDF, DOC, DOCX files for contract documents
      if (file.mimetype === "application/pdf" ||
          file.mimetype === "application/msword" ||
          file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        cb(null, true);
      } else {
        cb(new Error("Only PDF, DOC, and DOCX files are allowed for contract documents"));
      }
    } else if (file.fieldname === 'image' || file.fieldname === 'logo' || file.fieldname.startsWith('schoolHeadProfilePic')) {
      // Allow image files for school image, logo, and school head profile pictures
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed for images and logos"));
      }
    } else {
      cb(new Error("Invalid file field"));
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
router.post("/", upload.fields([
  { name: 'contractDocument', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
  { name: 'schoolHeadProfilePic0', maxCount: 1 },
  { name: 'schoolHeadProfilePic1', maxCount: 1 },
  { name: 'schoolHeadProfilePic2', maxCount: 1 },
  { name: 'schoolHeadProfilePic3', maxCount: 1 },
  { name: 'schoolHeadProfilePic4', maxCount: 1 }
]), createSchool);
router.put("/:id", upload.fields([
  { name: 'contractDocument', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
  { name: 'schoolHeadProfilePic0', maxCount: 1 },
  { name: 'schoolHeadProfilePic1', maxCount: 1 },
  { name: 'schoolHeadProfilePic2', maxCount: 1 },
  { name: 'schoolHeadProfilePic3', maxCount: 1 },
  { name: 'schoolHeadProfilePic4', maxCount: 1 }
]), updateSchool);
router.patch("/:id/toggle-status", toggleSchoolStatus);
router.delete("/:id", deleteSchool);

export default router;
