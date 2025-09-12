import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User";
import School from "../models/School";
import LeadMentor from "../models/LeadMentor";
import { ROLES } from "../constants";
import { sendSetupEmail } from "../utils/email";

// Get all lead mentors
export const getAllLeadMentors = async (req: Request, res: Response) => {
  try {
    const leadMentors = await LeadMentor.find({ isActive: true })
      .populate("user", "name email isVerified createdAt")
      .populate("assignedSchools", "name city state")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: leadMentors,
    });
  } catch (error) {
    console.error("Error fetching lead mentors:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get lead mentor by ID
export const getLeadMentorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const leadMentor = await LeadMentor.findById(id)
      .populate("user", "name email isVerified createdAt")
      .populate("assignedSchools", "name city state");

    if (!leadMentor) {
      return res.status(404).json({
        success: false,
        message: "Lead mentor not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: leadMentor,
    });
  } catch (error) {
    console.error("Error fetching lead mentor:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create new lead mentor
export const createLeadMentor = async (req: Request, res: Response) => {
  try {
    const { name, email, phoneNumber, assignedSchools, hasAccessToAllSchools } = req.body;

    // Validate required fields
    if (!name || !email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and phone number are required",
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

    // If specific schools are assigned, validate they exist
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

    // Generate setup token
    const setupToken = uuidv4();

    // Create user
    const newUser = new User({
      name,
      email,
      role: ROLES.LeadMentor,
      isVerified: false,
      password: null,
      setupToken,
    });

    await newUser.save();

    // Create lead mentor record
    const newLeadMentor = new LeadMentor({
      user: newUser._id,
      phoneNumber,
      assignedSchools: hasAccessToAllSchools ? [] : (assignedSchools || []),
      hasAccessToAllSchools: hasAccessToAllSchools || false,
    });

    await newLeadMentor.save();

    // Send setup email
    await sendSetupEmail({
      to: email,
      name,
      token: setupToken,
      role: "Lead Mentor",
    });

    // Populate the response
    await newLeadMentor.populate("user", "name email isVerified createdAt");
    await newLeadMentor.populate("assignedSchools", "name city state");

    return res.status(201).json({
      success: true,
      message: "Lead mentor invited successfully. Setup link sent to email.",
      data: newLeadMentor,
    });
  } catch (error) {
    console.error("Error creating lead mentor:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update lead mentor
export const updateLeadMentor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { phoneNumber, assignedSchools, hasAccessToAllSchools, isActive } = req.body;

    // If specific schools are assigned, validate they exist
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
    
    if (hasAccessToAllSchools !== undefined) {
      updateData.hasAccessToAllSchools = hasAccessToAllSchools;
      updateData.assignedSchools = hasAccessToAllSchools ? [] : (assignedSchools || []);
    } else if (assignedSchools !== undefined) {
      updateData.assignedSchools = assignedSchools;
    }

    const leadMentor = await LeadMentor.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("user", "name email isVerified createdAt")
      .populate("assignedSchools", "name city state");

    if (!leadMentor) {
      return res.status(404).json({
        success: false,
        message: "Lead mentor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead mentor updated successfully",
      data: leadMentor,
    });
  } catch (error) {
    console.error("Error updating lead mentor:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete lead mentor (soft delete)
export const deleteLeadMentor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const leadMentor = await LeadMentor.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!leadMentor) {
      return res.status(404).json({
        success: false,
        message: "Lead mentor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead mentor deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting lead mentor:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
