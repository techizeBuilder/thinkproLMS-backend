import { Request, Response, NextFunction } from "express";
import LeadMentor from "../models/LeadMentor";
import { PERMISSIONS } from "../constants";

// Extend Request interface to include leadMentor
declare global {
  namespace Express {
    interface Request {
      leadMentor?: any;
    }
  }
}

// Middleware to check if lead mentor has specific permission
export const requirePermission = (permission: keyof typeof PERMISSIONS) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user from auth middleware (assuming it's already set)
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // If user is super admin, allow all permissions
      if (user.role === "superadmin") {
        return next();
      }

      // If user is not a lead mentor, deny access
      if (user.role !== "leadmentor") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Lead mentor role required.",
        });
      }

      // Find lead mentor record
      const leadMentor = await LeadMentor.findOne({
        user: user.id,
        isActive: true,
      }).populate("user", "name email role");
      if (!leadMentor) {
        return res.status(403).json({
          success: false,
          message: "Lead mentor record not found or inactive",
        });
      }

      // Check if lead mentor has the required permission
      if (!leadMentor.permissions.includes(PERMISSIONS[permission])) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${permission}`,
        });
      }

      // Add lead mentor to request for use in controllers
      req.leadMentor = leadMentor;
      next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};

// Helper function to check multiple permissions
export const requireAnyPermission = (
  permissions: (keyof typeof PERMISSIONS)[]
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // If user is super admin, allow all permissions
      if (user.role === "superadmin") {
        return next();
      }

      // If user is not a lead mentor, deny access
      if (user.role !== "leadmentor") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Lead mentor role required.",
        });
      }

      // Find lead mentor record
      const leadMentor = await LeadMentor.findOne({
        user: user._id,
        isActive: true,
      }).populate("user", "name email role");

      if (!leadMentor) {
        return res.status(403).json({
          success: false,
          message: "Lead mentor record not found or inactive",
        });
      }

      // Check if lead mentor has any of the required permissions
      const hasPermission = permissions.some((permission) =>
        leadMentor.permissions.includes(PERMISSIONS[permission])
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required one of: ${permissions.join(", ")}`,
        });
      }

      req.leadMentor = leadMentor;
      next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};

// Export permission constants for easy access
export { PERMISSIONS };
