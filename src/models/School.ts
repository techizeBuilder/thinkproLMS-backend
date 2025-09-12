import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    board: {
      type: String,
      enum: ["ICSE", "CBSE", "State", "Other"],
      required: true,
    },
    image: {
      type: String, // URL or path to school image
      default: null,
    },
    logo: {
      type: String, // URL or path to school logo
      default: null,
    },
    affiliatedTo: {
      type: String,
      trim: true,
      default: null,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    branchName: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for faster queries
schoolSchema.index({ name: 1, city: 1, state: 1 });
schoolSchema.index({ board: 1 });
schoolSchema.index({ isActive: 1 });

export default mongoose.model("School", schoolSchema);
