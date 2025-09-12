import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User";
import School from "../models/School";
import SchoolAdmin from "../models/SchoolAdmin";
import { ROLES } from "../constants";
import { sendSetupEmail } from "../utils/email";

// Get all school admins
export const getAllSchoolAdmins = async (req: Request, res: Response) => {
  try {
    const schoolAdmins = await SchoolAdmin.find({ isActive: true })
      .populate("user", "name email isVerified createdAt")
      .populate("assignedSchools", "name city state")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: schoolAdmins,
    });
  } catch (error) {
    console.error("Error fetching school admins:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get school admins by school ID
export const getSchoolAdminsBySchool = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const schoolAdmins = await SchoolAdmin.find({ 
      assignedSchools: schoolId, 
      isActive: true 
    })
      .populate("user", "name email isVerified createdAt")
      .populate("assignedSchools", "name city state")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: schoolAdmins,
    });
  } catch (error) {
    console.error("Error fetching school admins:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create new school admin
export const createSchoolAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, phoneNumber, assignedSchools } = req.body;

    // Validate required fields
    if (!name || !email || !phoneNumber || !assignedSchools || assignedSchools.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone number, and at least one school are required",
      });
    }

    // Check if schools exist
    const schoolCount = await School.countDocuments({
      _id: { $in: assignedSchools },
      isActive: true,
    });
    
    if (schoolCount !== assignedSchools.length) {
      return res.status(400).json({
        success: false,
        message: "One or more assigned schools not found",
      });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Generate setup token
    const setupToken = uuidv4();

    // Create user
    const newUser = new User({
      name,
      email,
      role: ROLES.SchoolAdmin,
      isVerified: false,
      password: null,
      setupToken,
    });

    await newUser.save();

    // Create school admin record
    const newSchoolAdmin = new SchoolAdmin({
      user: newUser._id,
      assignedSchools,
      phoneNumber,
    });

    await newSchoolAdmin.save();

    // Send setup email
    await sendSetupEmail({
      to: email,
      name,
      token: setupToken,
      role: "School Administrator",
    });

    // Populate the response
    await newSchoolAdmin.populate("user", "name email isVerified createdAt");
    await newSchoolAdmin.populate("assignedSchools", "name city state");

    return res.status(201).json({
      success: true,
      message: "School admin invited successfully. Setup link sent to email.",
      data: newSchoolAdmin,
    });
  } catch (error) {
    console.error("Error creating school admin:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update school admin
export const updateSchoolAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { phoneNumber, assignedSchools, isActive } = req.body;

    // If schools are being updated, validate they exist
    if (assignedSchools && assignedSchools.length > 0) {
      const schoolCount = await School.countDocuments({
        _id: { $in: assignedSchools },
        isActive: true,
      });
      
      if (schoolCount !== assignedSchools.length) {
        return res.status(400).json({
          success: false,
          message: "One or more assigned schools not found",
        });
      }
    }

    const updateData: any = { phoneNumber, isActive };
    if (assignedSchools !== undefined) {
      updateData.assignedSchools = assignedSchools;
    }

    const schoolAdmin = await SchoolAdmin.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("user", "name email isVerified createdAt")
      .populate("assignedSchools", "name city state");

    if (!schoolAdmin) {
      return res.status(404).json({
        success: false,
        message: "School admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "School admin updated successfully",
      data: schoolAdmin,
    });
  } catch (error) {
    console.error("Error updating school admin:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete school admin (soft delete)
export const deleteSchoolAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const schoolAdmin = await SchoolAdmin.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!schoolAdmin) {
      return res.status(404).json({
        success: false,
        message: "School admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "School admin deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting school admin:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
