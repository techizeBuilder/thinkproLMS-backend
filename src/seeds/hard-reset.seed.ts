import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User";
import School from "../models/School";
import Student from "../models/Student";
import Mentor from "../models/Mentor";
import LeadMentor from "../models/LeadMentor";
import SchoolAdmin from "../models/SchoolAdmin";
import { Question, QuestionRecommendation } from "../models/QuestionBank";
import { dbName, ROLES } from "../constants";

dotenv.config();

const run = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI as string, {
      dbName,
    });
    console.log("✅ Connected to MongoDB");

    // Clear all collections
    console.log("🗑️ Clearing all collections...");
    await User.deleteMany({});
    await School.deleteMany({});
    await Student.deleteMany({});
    await Mentor.deleteMany({});
    await LeadMentor.deleteMany({});
    await SchoolAdmin.deleteMany({});
    await Question.deleteMany({});
    await QuestionRecommendation.deleteMany({});
    console.log("✅ All collections cleared");

    // Create SuperAdmin only
    const superAdminEmail = process.env.SUPERADMIN_EMAIL || "superadmin@thinkpro.com";
    const superAdminPassword = process.env.SUPERADMIN_PASS || "admin123";

    const superAdmin = await User.create({
      name: "System SuperAdmin",
      email: superAdminEmail,
      password: superAdminPassword,
      role: ROLES.SuperAdmin,
      isVerified: true,
      isSystemAdmin: true,
    });
    console.log("✅ SuperAdmin created:", superAdmin.email);

    console.log("\n🎉 Database hard reset completed!");
    console.log("\n📊 Summary:");
    console.log(`- SuperAdmin: 1 (${superAdminEmail})`);
    console.log("- All other collections: EMPTY");

    console.log("\n🔑 SuperAdmin Credentials:");
    console.log(`- Email: ${superAdminEmail}`);
    console.log("- Password: admin123 (or from env)");

    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error during hard reset:", err.message);
    console.error(err);
    process.exit(1);
  }
};

run();
