import mongoose from "mongoose";

const subtopicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  subtopics: [subtopicSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const moduleItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  topics: [topicSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const moduleSchema = new mongoose.Schema(
  {
    grade: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    modules: [moduleItemSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
moduleSchema.index({ grade: 1 });
moduleSchema.index({ subject: 1 });
moduleSchema.index({ isActive: 1 });
moduleSchema.index({ grade: 1, subject: 1 });

export default mongoose.model("Module", moduleSchema);
