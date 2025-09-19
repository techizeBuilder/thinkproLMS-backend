import { Request, Response } from "express";
import Resource from "../models/Resource";
import Subject from "../models/Subject";
import School from "../models/School";
import { AuthRequest } from "../middleware/auth";
import { ROLES } from "../constants";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/resources");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow documents and videos
    const allowedMimes = [
      // Documents
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
      "application/msword", // DOC
      "application/vnd.ms-excel", // XLS
      "application/vnd.ms-powerpoint", // PPT
      // Videos
      "video/mp4",
      "video/avi",
      "video/mov",
      "video/wmv",
      "video/webm",
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, PPTX, XLSX, DOCX, DOC, XLS, PPT, MP4, AVI, MOV, WMV, and WEBM files are allowed."));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// Get all resources with filtering
export const getAllResources = async (req: AuthRequest, res: Response) => {
  try {
    const { type, category, subject, grade, school, search, page = 1, limit = 10 } = req.query;
    const user = req.user;

    // Build query filter
    const filter: any = { isActive: true };

    // Role-based access control
    if (user?.role === ROLES.Student) {
      filter.category = "student";
    } else if (user?.role === ROLES.Mentor || user?.role === ROLES.SchoolAdmin) {
      filter.category = "mentor";
    }
    // SuperAdmin and LeadMentor can see all resources

    // Additional filters
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (subject) filter.subject = subject;
    if (grade) filter.grade = grade;
    if (school) filter.school = school;

    // Search functionality
    if (search && typeof search === 'string') {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const resources = await Resource.find(filter)
      .populate("subject", "name")
      .populate("school", "name city state")
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Resource.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: resources,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get resource by ID
export const getResourceById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const resource = await Resource.findById(id)
      .populate("subject", "name")
      .populate("school", "name city state")
      .populate("uploadedBy", "name email");

    if (!resource || !resource.isActive) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // Check access permissions
    if (user?.role === ROLES.Student && resource.category !== "student") {
      return res.status(403).json({
        success: false,
        message: "Access denied. This resource is not available for students.",
      });
    }

    if ((user?.role === ROLES.Mentor || user?.role === ROLES.SchoolAdmin) && resource.category !== "mentor") {
      return res.status(403).json({
        success: false,
        message: "Access denied. This resource is not available for mentors.",
      });
    }

    // Increment view count
    await Resource.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    return res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    console.error("Error fetching resource:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create new resource
export const createResource = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, type, category, subject, grade, school, tags, isPublic, url } = req.body;
    const user = req.user;

    // Check if user has permission to create resources
    const allowedRoles = [ROLES.SuperAdmin, ROLES.LeadMentor];
    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only superadmin and lead mentor can create resources.",
      });
    }

    // Validate required fields
    if (!title || !type || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, type, and category are required",
      });
    }

    // Validate type and category
    if (!["document", "video"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be either 'document' or 'video'",
      });
    }

    if (!["mentor", "student"].includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Category must be either 'mentor' or 'student'",
      });
    }

    // Validate subject if provided
    if (subject) {
      const subjectExists = await Subject.findById(subject);
      if (!subjectExists || !subjectExists.isActive) {
        return res.status(400).json({
          success: false,
          message: "Subject not found or inactive",
        });
      }
    }

    // Validate school if provided
    if (school) {
      const schoolExists = await School.findById(school);
      if (!schoolExists || !schoolExists.isActive) {
        return res.status(400).json({
          success: false,
          message: "School not found or inactive",
        });
      }
    }

    let contentData: any = {};

    // Handle file upload or external URL
    if (req.file) {
      // File upload
      contentData = {
        url: `/uploads/resources/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        isExternal: false,
      };
    } else if (url) {
      // External URL
      contentData = {
        url: url,
        fileName: null,
        fileSize: null,
        mimeType: null,
        isExternal: true,
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Either a file upload or external URL is required",
      });
    }

    const newResource = new Resource({
      title: title.trim(),
      description: description?.trim() || "",
      type,
      category,
      subject: subject || null,
      grade: grade || null,
      school: school || null,
      tags: tags || [],
      isPublic: isPublic !== undefined ? isPublic : true,
      content: contentData,
      uploadedBy: user?.id,
    });

    await newResource.save();
    await newResource.populate([
      { path: "subject", select: "name" },
      { path: "school", select: "name city state" },
      { path: "uploadedBy", select: "name email" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Resource created successfully",
      data: newResource,
    });
  } catch (error) {
    console.error("Error creating resource:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update resource
export const updateResource = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, type, category, subject, grade, school, tags, isPublic, url } = req.body;
    const user = req.user;

    // Check if user has permission to update resources
    const allowedRoles = [ROLES.SuperAdmin, ROLES.LeadMentor];
    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only superadmin and lead mentor can update resources.",
      });
    }

    const resource = await Resource.findById(id);
    if (!resource || !resource.isActive) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // Validate type and category if provided
    if (type && !["document", "video"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be either 'document' or 'video'",
      });
    }

    if (category && !["mentor", "student"].includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Category must be either 'mentor' or 'student'",
      });
    }

    // Validate subject if provided
    if (subject) {
      const subjectExists = await Subject.findById(subject);
      if (!subjectExists || !subjectExists.isActive) {
        return res.status(400).json({
          success: false,
          message: "Subject not found or inactive",
        });
      }
    }

    // Validate school if provided
    if (school) {
      const schoolExists = await School.findById(school);
      if (!schoolExists || !schoolExists.isActive) {
        return res.status(400).json({
          success: false,
          message: "School not found or inactive",
        });
      }
    }

    // Update fields
    const updateData: any = {};
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (type) updateData.type = type;
    if (category) updateData.category = category;
    if (subject !== undefined) updateData.subject = subject;
    if (grade !== undefined) updateData.grade = grade;
    if (school !== undefined) updateData.school = school;
    if (tags) updateData.tags = tags;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    // Handle content update
    if (req.file) {
      // Delete old file if it exists and is not external
      if (resource.content?.url && !resource.content?.isExternal) {
        const oldFilePath = path.join(__dirname, "../../", resource.content.url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      updateData.content = {
        url: `/uploads/resources/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        isExternal: false,
      };
    } else if (url) {
      // Delete old file if it exists and is not external
      if (resource.content?.url && !resource.content?.isExternal) {
        const oldFilePath = path.join(__dirname, "../../", resource.content.url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      updateData.content = {
        url: url,
        fileName: null,
        fileSize: null,
        mimeType: null,
        isExternal: true,
      };
    }

    const updatedResource = await Resource.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: "subject", select: "name" },
      { path: "school", select: "name city state" },
      { path: "uploadedBy", select: "name email" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Resource updated successfully",
      data: updatedResource,
    });
  } catch (error) {
    console.error("Error updating resource:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete resource
export const deleteResource = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Check if user has permission to delete resources
    const allowedRoles = [ROLES.SuperAdmin, ROLES.LeadMentor];
    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only superadmin and lead mentor can delete resources.",
      });
    }

    const resource = await Resource.findById(id);
    if (!resource || !resource.isActive) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    // Delete associated file if it exists and is not external
    if (resource.content?.url && !resource.content?.isExternal) {
      const filePath = path.join(__dirname, "../../", resource.content.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Soft delete by setting isActive to false
    await Resource.findByIdAndUpdate(id, { isActive: false });

    return res.status(200).json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get resources by category (for easier frontend integration)
export const getResourcesByCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.params;
    const { type, subject, grade, school, page = 1, limit = 10 } = req.query;
    const user = req.user;

    // Validate category
    if (!["mentor", "student"].includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category. Must be 'mentor' or 'student'",
      });
    }

    // Check access permissions
    if (user?.role === ROLES.Student && category !== "student") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Students can only access student resources.",
      });
    }

    if ((user?.role === ROLES.Mentor || user?.role === ROLES.SchoolAdmin) && category !== "mentor") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Mentors can only access mentor resources.",
      });
    }

    // Build query filter
    const filter: any = { 
      isActive: true, 
      category,
      isPublic: true 
    };

    if (type) filter.type = type;
    if (subject) filter.subject = subject;
    if (grade) filter.grade = grade;
    if (school) filter.school = school;

    const skip = (Number(page) - 1) * Number(limit);

    const resources = await Resource.find(filter)
      .populate("subject", "name")
      .populate("school", "name city state")
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Resource.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: resources,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching resources by category:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Export multer middleware for use in routes
export { upload };
