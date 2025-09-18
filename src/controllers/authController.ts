import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../models/User";
import LeadMentor from "../models/LeadMentor";
import { generateToken } from "../utils/jwt";
import { ROLES } from "../constants";

// LOGIN
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password!);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  // Auto-verify on first login
  if (!user.isVerified) {
    user.isVerified = true;
    await user.save();
  }

  // Get additional info for Lead Mentors
  let leadMentorId = null;
  let permissions: string[] = [];
  if (user.role === ROLES.LeadMentor) {
    const leadMentor = await LeadMentor.findOne({ user: user._id });
    if (leadMentor) {
      leadMentorId = leadMentor._id;
      permissions = leadMentor.permissions;
    }
  }

  const token = generateToken({
    id: user._id,
    role: user.role,
    leadMentorId,
  });

  res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      leadMentorId,
      permissions,
    },
  });
};
