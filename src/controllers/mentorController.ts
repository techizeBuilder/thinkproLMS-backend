import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User";
import School from "../models/School";
import Mentor from "../models/Mentor";
import LeadMentor from "../models/LeadMentor";
import { ROLES } from "../constants";
import { sendSetupEmail } from "../utils/email";

// Get all mentors for a lead mentor
export const getAllMentors = async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId } = req.query;
    const leadMentorId = req.user?.leadMentorId; // Assuming this is set in auth middleware

    if (!leadMentorId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Lead mentor role required.",
      });
    }

    // Build query filter
    const filter: any = { isActive: true, addedBy: leadMentorId };
    if (schoolId) {
      filter.assignedSchools = schoolId;
    }

    const mentors = await Mentor.find(filter)
      .populate("user", "name email isVerified createdAt")
      .populate("assignedSchools", "name city state board branchName")
      .populate("addedBy", "user")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: mentors,
    });
  } catch (error) {
    console.error("Error fetching mentors:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get mentor by ID
export const getMentorById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const leadMentorId = req.user?.leadMentorId;

    const mentor = await Mentor.findOne({ _id: id, addedBy: leadMentorId })
      .populate("user", "name email isVerified createdAt")
      .populate("assignedSchools", "name city state board branchName")
      .populate("addedBy", "user");

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: mentor,
    });
  } catch (error) {
    console.error("Error fetching mentor:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create a new mentor
export const createMentor = async (req: AuthRequest, res: Response) => {
  try {
    const { name, salutation, address, email, phoneNumber, schoolIds } = req.body;
    const leadMentorId = req.user?.leadMentorId;

    if (!leadMentorId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Lead mentor role required.",
      });
    }

    // Validate required fields
    if (!name || !salutation || !address || !email || !phoneNumber || !schoolIds || schoolIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All fields are required including at least one school assignment",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Verify schools exist
    const schools = await School.find({ _id: { $in: schoolIds }, isActive: true });
    if (schools.length !== schoolIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more schools not found or inactive",
      });
    }

    // Create user
    const setupToken = uuidv4();
    const user = new User({
      name,
      email,
      role: ROLES.Mentor,
      setupToken,
    });
    await user.save();

    // Create mentor
    const mentor = new Mentor({
      user: user._id,
      salutation,
      address,
      phoneNumber,
      assignedSchools: schoolIds,
      addedBy: leadMentorId,
    });
    await mentor.save();

    // Send setup email
    await sendSetupEmail({
      to: email,
      name,
      token: setupToken,
    });

    // Populate the created mentor for response
    const populatedMentor = await Mentor.findById(mentor._id)
      .populate("user", "name email isVerified createdAt")
      .populate("assignedSchools", "name city state board branchName");

    return res.status(201).json({
      success: true,
      message: "Mentor created successfully and setup email sent",
      data: populatedMentor,
    });
  } catch (error) {
    console.error("Error creating mentor:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update mentor
export const updateMentor = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, salutation, address, phoneNumber, schoolIds } = req.body;
    const leadMentorId = req.user?.leadMentorId;

    // Find mentor
    const mentor = await Mentor.findOne({ _id: id, addedBy: leadMentorId });
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor not found",
      });
    }

    // Update user info if provided
    if (name) {
      await User.findByIdAndUpdate(mentor.user, { name });
    }

    // Verify schools if provided
    if (schoolIds && schoolIds.length > 0) {
      const schools = await School.find({ _id: { $in: schoolIds }, isActive: true });
      if (schools.length !== schoolIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more schools not found or inactive",
        });
      }
    }

    // Update mentor
    const updateData: any = {};
    if (salutation) updateData.salutation = salutation;
    if (address) updateData.address = address;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (schoolIds) updateData.assignedSchools = schoolIds;

    const updatedMentor = await Mentor.findByIdAndUpdate(id, updateData, { new: true })
      .populate("user", "name email isVerified createdAt")
      .populate("assignedSchools", "name city state board branchName");

    return res.status(200).json({
      success: true,
      message: "Mentor updated successfully",
      data: updatedMentor,
    });
  } catch (error) {
    console.error("Error updating mentor:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete mentor (soft delete)
export const deleteMentor = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const leadMentorId = req.user?.leadMentorId;

    const mentor = await Mentor.findOneAndUpdate(
      { _id: id, addedBy: leadMentorId },
      { isActive: false },
      { new: true }
    );

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mentor deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting mentor:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
