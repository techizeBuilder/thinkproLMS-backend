import mongoose from "mongoose";

// School Head Schema
const schoolHeadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  designation: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  profilePic: {
    type: String, // URL or path to profile picture
    default: null,
  },
});

// Service Details Schema
const serviceDetailsSchema = new mongoose.Schema({
  serviceType: {
    type: String,
    required: true,
    trim: true,
  },
  mentors: [{
    type: String,
    enum: ["School Mentor", "Thinker Mentor"],
  }],
  grades: [{
    type: Number,
    min: 1,
    max: 10,
  }],
  subjects: [{
    type: String,
    trim: true,
  }],
  sections: [{
    grade: {
      type: Number,
      min: 1,
      max: 10,
    },
    numberOfSections: {
      type: Number,
      min: 1,
    },
  }],
});

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
    // Contract and Project dates
    contractStartDate: {
      type: Date,
      default: null,
    },
    contractEndDate: {
      type: Date,
      default: null,
    },
    projectStartDate: {
      type: Date,
      default: null,
    },
    projectEndDate: {
      type: Date,
      default: null,
    },
    // Contract document
    contractDocument: {
      type: String, // URL or path to contract document
      default: null,
    },
    // School heads
    schoolHeads: [schoolHeadSchema],
    // Service details
    serviceDetails: serviceDetailsSchema,
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
