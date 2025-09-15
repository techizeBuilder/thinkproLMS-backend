import mongoose from "mongoose";
import { ROLES } from "../constants";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, default: null }, // hashed password or null until set

    role: {
      type: String,
      enum: [
        ROLES.SuperAdmin,
        ROLES.LeadMentor,
        ROLES.SchoolAdmin,
        ROLES.Mentor,
        ROLES.Student,
      ],
      default: ROLES.Student,
    },
    isVerified: { type: Boolean, default: false },
    isSystemAdmin: { type: Boolean, default: false }, // true only for the original system superadmin

    setupToken: { type: String, default: null }, // token used for account setup (email link)
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.isNew) {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
    next();
  }
});

export default mongoose.model("User", userSchema);
