import mongoose from "mongoose";

// Target Audience Schema
const targetAudienceSchema = new mongoose.Schema({
  grade: {
    type: String,
    required: true,
    enum: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", 
           "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"],
  },
  sections: [{
    type: String,
    trim: true,
  }], // If empty, applies to all sections in the grade
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
  },
});

// Notification Schema
const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["assessment", "announcement", "reminder", "system"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    targetAudience: [targetAudienceSchema],
    // Related entities
    relatedAssessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      default: null,
    },
    // Sender information
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Delivery settings
    scheduledFor: {
      type: Date,
      default: null, // If null, send immediately
    },
    expiresAt: {
      type: Date,
      default: null, // If null, never expires
    },
    // Status tracking
    status: {
      type: String,
      enum: ["draft", "scheduled", "sent", "failed", "cancelled"],
      default: "draft",
    },
    // Delivery tracking
    totalRecipients: {
      type: Number,
      default: 0,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
    readCount: {
      type: Number,
      default: 0,
    },
    // Metadata
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
notificationSchema.index({ sentBy: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ "targetAudience.school": 1 });
notificationSchema.index({ "targetAudience.grade": 1 });
notificationSchema.index({ relatedAssessment: 1 });

export default mongoose.model("Notification", notificationSchema);
