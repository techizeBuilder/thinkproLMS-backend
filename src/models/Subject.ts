import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
subjectSchema.index({ name: 1 });
subjectSchema.index({ isActive: 1 });

export default mongoose.model("Subject", subjectSchema);
