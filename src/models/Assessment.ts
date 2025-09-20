import mongoose from "mongoose";

// Question in Assessment Schema
const assessmentQuestionSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },
  order: {
    type: Number,
    required: true,
  },
  marks: {
    type: Number,
    required: true,
    default: 1,
  },
});

// Target Students Schema
const targetStudentsSchema = new mongoose.Schema({
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
});

// Assessment Schema
const assessmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    instructions: {
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
    modules: [{
      type: String,
      required: true,
      trim: true,
    }],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
    },
    questions: [assessmentQuestionSchema],
    totalMarks: {
      type: Number,
      default: 0,
    },
    targetStudents: [targetStudentsSchema],
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "completed", "cancelled"],
      default: "draft",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Analytics
    totalAttempts: {
      type: Number,
      default: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
assessmentSchema.index({ school: 1, grade: 1 });
assessmentSchema.index({ createdBy: 1 });
assessmentSchema.index({ startDate: 1, endDate: 1 });
assessmentSchema.index({ status: 1 });
assessmentSchema.index({ isActive: 1 });

// Pre-save middleware to calculate total marks
assessmentSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((total, question) => total + question.marks, 0);
  }
  next();
});

export default mongoose.model("Assessment", assessmentSchema);
