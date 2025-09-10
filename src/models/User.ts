import mongoose from "mongoose";
import { ROLES } from "../constants";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, default: null }, // hashed password or null until set

    role: {
      type: String,
      enum: [
        ROLES.SuperAdmin,
        ROLES.Admin,
        ROLES.Mentor,
        ROLES.LeadMentor,
        ROLES.Student,
      ],
      default: "student",
    },
    isVerified: { type: Boolean, default: false },

    setupToken: { type: String, default: null }, // token used for account setup (email link)
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
