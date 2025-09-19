import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      enum: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", 
             "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"],
    },
    parentEmail: {
      type: String,
      trim: true,
      default: null,
    },
    parentPhoneNumber: {
      type: String,
      trim: true,
      default: null,
    },
    hasCustomCredentials: {
      type: Boolean,
      default: false, // true if email/phone provided, false if system-generated
    },
    generatedPassword: {
      type: String,
      default: null, // temporary password for system-generated accounts
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
studentSchema.index({ user: 1 });
studentSchema.index({ school: 1 });
studentSchema.index({ studentId: 1 });
studentSchema.index({ grade: 1 });
studentSchema.index({ addedBy: 1 });
studentSchema.index({ isActive: 1 });
studentSchema.index({ hasCustomCredentials: 1 });

export default mongoose.model("Student", studentSchema);
