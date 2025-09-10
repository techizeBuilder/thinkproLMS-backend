import { Request, Response } from "express";
import User from "../models/User";
import { ROLES } from "../constants";

export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await User.find({ role: ROLES.Admin })
      .select("-password -setupToken")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: admins,
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
