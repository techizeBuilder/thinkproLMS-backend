import { Router } from "express";
import multer from "multer";
import {
  getAllStudents,
  getStudentById,
  createStudent,
  bulkUploadStudents,
  updateStudent,
  deleteStudent,
  downloadStudentList,
  getMyProfile,
  getStudentPassword,
} from "../controllers/studentController";
import { authMiddleware } from "../middleware/auth";
import { requirePermission, PERMISSIONS } from "../middleware/permissions";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.mimetype === "application/vnd.ms-excel") {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Apply auth middleware to all routes
router.use(authMiddleware);

// Student routes
router.get("/", getAllStudents);
router.get("/my-profile", getMyProfile); // Students can access their own profile
router.get("/download", downloadStudentList);
router.get("/:id", getStudentById);
router.get("/:id/password", getStudentPassword); // Get student generated password
// Only lead mentors with ADD_STUDENTS permission can create/update/delete students
router.post("/", requirePermission("ADD_STUDENTS"), createStudent);
router.post("/bulk-upload", requirePermission("ADD_STUDENTS"), upload.single("file"), bulkUploadStudents);
router.put("/:id", requirePermission("ADD_STUDENTS"), updateStudent);
router.delete("/:id", requirePermission("ADD_STUDENTS"), deleteStudent);

export default router;
