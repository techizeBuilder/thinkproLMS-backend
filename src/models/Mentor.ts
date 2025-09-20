import mongoose from "mongoose";

const mentorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    salutation: {
      type: String,
      enum: ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof."],
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    assignedSchools: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
mentorSchema.index({ user: 1 });
mentorSchema.index({ assignedSchools: 1 });
mentorSchema.index({ addedBy: 1 });
mentorSchema.index({ isActive: 1 });

export default mongoose.model("Mentor", mentorSchema);
