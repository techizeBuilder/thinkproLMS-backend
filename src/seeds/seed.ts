import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../models/User";
import { dbName, ROLES } from "../constants";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, {
      dbName,
    });
    console.log("✅ Connected to MongoDB");

    const email = process.env.SUPERADMIN_EMAIL as string;
    const password = process.env.SUPERADMIN_PASS as string;

    if (!email || !password) {
      console.error(
        "❌ SUPERADMIN_EMAIL and SUPERADMIN_PASS must be set in .env"
      );
      process.exit(1);
    }

    const existing = await User.findOne({ role: "superadmin" });
    if (existing) {
      console.log("⚠️ SuperAdmin already exists:", existing.email);
      process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 10);

    const superadmin = await User.create({
      name: "System SuperAdmin",
      email,
      password: hashed,
      role: ROLES.SuperAdmin,
      isVerified: true,
      isSystemAdmin: true, // Mark as system admin - cannot be deleted
    });

    console.log("✅ SuperAdmin created:", superadmin.email);
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error seeding SuperAdmin:", err.message);
    process.exit(1);
  }
};

run();
