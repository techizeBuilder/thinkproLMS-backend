import mongoose from "mongoose";

const leadMentorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    assignedSchools: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
    }],
    hasAccessToAllSchools: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
leadMentorSchema.index({ user: 1 });
leadMentorSchema.index({ assignedSchools: 1 });
leadMentorSchema.index({ hasAccessToAllSchools: 1 });
leadMentorSchema.index({ isActive: 1 });

export default mongoose.model("LeadMentor", leadMentorSchema);
