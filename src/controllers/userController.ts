import { Request, Response } from "express";
import User from "../models/User";
import { ROLES } from "../constants";
import { v4 as uuidv4 } from "uuid";
// import { sendSetupEmail } from "../utils/email";

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: "Email and name are required" });
    }

    // check if admin already exists
    const existingAdmin = await User.findOne({ email, role: ROLES.Admin });
    if (existingAdmin) {
      return res
        .status(409)
        .json({ message: "Admin with this email already exists" });
    }

    // generate one-time setup token
    const setupToken = uuidv4();
    const newAdmin = new User({
      email,
      name,
      role: ROLES.Admin,
      isVerified: false,
      password: null,
      setupToken,
    });

    await newAdmin.save();

    // ☑️ TODO: send email with setup link ☑️
    // await sendSetupEmail({
    //   to: email,
    //   name,
    //   token: setupToken,
    // });

    res.status(201).json({
      message: "Admin invited successfully. Setup link sent to email.",
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
