import mongoose from "mongoose";

// Student Answer Schema
const studentAnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },
  selectedAnswers: [{
    type: Number, // Index of selected answer(s)
  }],
  isCorrect: {
    type: Boolean,
    default: false,
  },
  marksObtained: {
    type: Number,
    default: 0,
  },
  timeSpent: {
    type: Number, // Time spent on this question in seconds
    default: 0,
  },
});

// Assessment Response Schema
const assessmentResponseSchema = new mongoose.Schema(
  {
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    answers: [studentAnswerSchema],
    totalMarksObtained: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    grade: {
      type: String,
      enum: ["A+", "A", "B+", "B", "C+", "C", "D", "F"],
      default: null,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "submitted", "timeout"],
      default: "in_progress",
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    timeSpent: {
      type: Number, // Total time spent in seconds
      default: 0,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    // Auto-submit when time expires
    autoSubmitted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
assessmentResponseSchema.index({ assessment: 1, student: 1 }, { unique: true });
assessmentResponseSchema.index({ student: 1 });
assessmentResponseSchema.index({ assessment: 1 });
assessmentResponseSchema.index({ status: 1 });
assessmentResponseSchema.index({ submittedAt: 1 });

// Pre-save middleware to calculate total marks and percentage
assessmentResponseSchema.pre('save', function(next) {
  if (this.answers && this.answers.length > 0) {
    this.totalMarksObtained = this.answers.reduce((total, answer) => total + answer.marksObtained, 0);
  }
  
  // Calculate percentage if assessment is completed
  if (this.status === 'completed' || this.status === 'submitted') {
    // Get total marks from assessment
    // This will be populated when needed
  }
  
  // Calculate time spent
  if (this.startTime && this.endTime) {
    this.timeSpent = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
  }
  
  next();
});

export default mongoose.model("AssessmentResponse", assessmentResponseSchema);
