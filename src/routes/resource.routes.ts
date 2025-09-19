import { Router } from "express";
import {
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  getResourcesByCategory,
  upload,
} from "../controllers/resourceController";
import { authMiddleware } from "../middleware/auth";
import { requirePermission, PERMISSIONS } from "../middleware/permissions";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Resource routes
router.get("/", getAllResources);
router.get("/category/:category", getResourcesByCategory);
router.get("/:id", getResourceById);

// Protected routes - only for Lead Mentors and Super Admins
router.post(
  "/",
  requirePermission("ADD_RESOURCES"),
  upload.single("file"),
  createResource
);

router.put(
  "/:id",
  requirePermission("ADD_RESOURCES"),
  upload.single("file"),
  updateResource
);

router.delete(
  "/:id",
  requirePermission("ADD_RESOURCES"),
  deleteResource
);

export default router;
