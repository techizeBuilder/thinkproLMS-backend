import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../models/User";
import LeadMentor from "../models/LeadMentor";
import Guest from "../models/Guest";
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

// GUEST REGISTRATION
export const registerGuest = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      guestType,
      city,
      phoneNumber,
      schoolName,
      grade,
      childName,
      childSchoolName,
      organisation,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      role: ROLES.Guest,
      isVerified: true, // Auto-verify guests
    });

    await user.save();

    // Create guest profile
    const guestData: any = {
      user: user._id,
      guestType,
      city,
      phoneNumber,
    };

    // Add type-specific fields
    if (guestType === "student") {
      guestData.schoolName = schoolName;
      guestData.grade = grade;
    } else if (guestType === "parent") {
      guestData.childName = childName;
      guestData.childSchoolName = childSchoolName;
    } else if (guestType === "other") {
      guestData.organisation = organisation;
    }

    const guest = new Guest(guestData);
    await guest.save();

    // Generate token
    const token = generateToken({
      id: user._id,
      role: user.role,
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      guest: {
        id: guest._id,
        guestType: guest.guestType,
        city: guest.city,
      },
    });
  } catch (error: any) {
    console.error("Guest registration error:", error);
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
};
