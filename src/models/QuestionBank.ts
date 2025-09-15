import mongoose from "mongoose";

// Answer Choice Schema
const answerChoiceSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    required: true,
  },
});

// Question Schema
const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      enum: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", 
             "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"],
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    answerType: {
      type: String,
      required: true,
      enum: ["radio", "checkbox", "dropdown", "multichoice"],
      default: "radio",
    },
    answerChoices: [answerChoiceSchema],
    correctAnswers: [{
      type: Number, // Index of correct answer(s)
      required: true,
    }],
    difficulty: {
      type: String,
      required: true,
      enum: ["Easy", "Medium", "Tough"],
      default: "Medium",
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Question Recommendation Schema
const questionRecommendationSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      enum: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", 
             "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"],
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    answerType: {
      type: String,
      required: true,
      enum: ["radio", "checkbox", "dropdown", "multichoice"],
      default: "radio",
    },
    answerChoices: [answerChoiceSchema],
    correctAnswers: [{
      type: Number, // Index of correct answer(s)
      required: true,
    }],
    difficulty: {
      type: String,
      required: true,
      enum: ["Easy", "Medium", "Tough"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    recommendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewComments: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
questionSchema.index({ grade: 1, subject: 1, module: 1 });
questionSchema.index({ createdBy: 1 });
questionSchema.index({ isActive: 1 });
questionSchema.index({ difficulty: 1 });

questionRecommendationSchema.index({ status: 1 });
questionRecommendationSchema.index({ recommendedBy: 1 });
questionRecommendationSchema.index({ grade: 1, subject: 1, module: 1 });

export const Question = mongoose.model("Question", questionSchema);
export const QuestionRecommendation = mongoose.model("QuestionRecommendation", questionRecommendationSchema);
