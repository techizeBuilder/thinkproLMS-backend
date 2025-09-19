import mongoose from "mongoose";
import { ROLES } from "../constants";

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      required: true,
      enum: ["document", "video"],
    },
    category: {
      type: String,
      required: true,
      enum: ["mentor", "student"],
    },
    // For documents: file path or external URL
    // For videos: file path or external URL (YouTube, Vimeo, etc.)
    content: {
      url: {
        type: String,
        required: true,
      },
      fileName: {
        type: String,
        trim: true,
      },
      fileSize: {
        type: Number, // in bytes
      },
      mimeType: {
        type: String,
      },
      isExternal: {
        type: Boolean,
        default: false,
      },
    },
    // Subject and grade association for better organization
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: false,
    },
    grade: {
      type: String,
      required: false,
      enum: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", 
             "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"],
    },
    // School association (optional - for school-specific resources)
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: false,
    },
    // Tags for better search and categorization
    tags: [{
      type: String,
      trim: true,
    }],
    // Access control
    isPublic: {
      type: Boolean,
      default: true,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Metadata
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // View count for analytics
    viewCount: {
      type: Number,
      default: 0,
    },
    // Thumbnail for videos
    thumbnail: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
resourceSchema.index({ type: 1, category: 1 });
resourceSchema.index({ subject: 1, grade: 1 });
resourceSchema.index({ school: 1 });
resourceSchema.index({ uploadedBy: 1 });
resourceSchema.index({ isActive: 1, isPublic: 1 });
resourceSchema.index({ tags: 1 });
resourceSchema.index({ createdAt: -1 });

// Virtual for getting the display URL
resourceSchema.virtual('displayUrl').get(function() {
  if (this.content?.isExternal) {
    return this.content.url;
  }
  // For internal files, you might want to prepend your server URL
  return this.content?.url;
});

// Ensure virtual fields are serialized
resourceSchema.set('toJSON', { virtuals: true });

export default mongoose.model("Resource", resourceSchema);
