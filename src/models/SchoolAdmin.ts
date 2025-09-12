import mongoose from "mongoose";

const schoolAdminSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    assignedSchools: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
    }],
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Ensure one school admin record per user
schoolAdminSchema.index({ user: 1 }, { unique: true });
schoolAdminSchema.index({ assignedSchools: 1 });
schoolAdminSchema.index({ isActive: 1 });

export default mongoose.model("SchoolAdmin", schoolAdminSchema);
