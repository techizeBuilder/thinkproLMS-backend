import { Request, Response } from "express";
import User from "../models/User";
import { ROLES } from "../constants";

import { v4 as uuidv4 } from "uuid";
import { sendSetupEmail } from "../utils/email";

export const getAllSuperAdmins = async (req: Request, res: Response) => {
  try {
    const superAdmins = await User.find({ role: ROLES.SuperAdmin })
      .select("-password -setupToken")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: superAdmins,
    });
  } catch (error) {
    console.error("Error fetching superadmins:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const createSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: "Email and name are required" });
    }

    // check if user with this email already exists (any role)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    // generate one-time setup token
    const setupToken = uuidv4();
    const newSuperAdmin = new User({
      email,
      name,
      role: ROLES.SuperAdmin,
      isVerified: false,
      password: null,
      setupToken,
    });

    await newSuperAdmin.save();

    // send email with setup link
    await sendSetupEmail({
      to: email,
      name,
      token: setupToken,
    });

    res.status(201).json({
      message: "SuperAdmin invited successfully. Setup link sent to email.",
    });
  } catch (error) {
    console.error("Error creating superadmin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "SuperAdmin ID is required" });
    }

    // Find the superadmin to delete
    const superAdminToDelete = await User.findById(id);
    if (!superAdminToDelete) {
      return res.status(404).json({ message: "SuperAdmin not found" });
    }

    // Check if this is the system admin
    if (superAdminToDelete.isSystemAdmin) {
      return res.status(403).json({ 
        message: "System SuperAdmin cannot be deleted" 
      });
    }

    // Check if user is trying to delete themselves (optional protection)
    const currentUser = (req as any).user; // from auth middleware
    if (superAdminToDelete._id.toString() === currentUser.id) {
      return res.status(403).json({ 
        message: "You cannot delete your own account" 
      });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: "SuperAdmin deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting superadmin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
