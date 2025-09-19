import mongoose from "mongoose";

const guestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    guestType: {
      type: String,
      enum: ["student", "parent", "other"],
      required: true,
    },
    
    // Student fields
    schoolName: { type: String, default: null },
    grade: { type: String, default: null },
    
    // Parent fields
    childName: { type: String, default: null },
    childSchoolName: { type: String, default: null },
    
    // Other fields
    organisation: { type: String, default: null },
    
    // Common fields
    city: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    
    // Marketing and engagement tracking
    hasViewedWelcomeVideo: { type: Boolean, default: false },
    hasAttemptedQuiz: { type: Boolean, default: false },
    hasRequestedDemo: { type: Boolean, default: false },
    hasRequestedCallback: { type: Boolean, default: false },
    hasSubscribed: { type: Boolean, default: false },
    
    // Analytics
    lastActivity: { type: Date, default: Date.now },
    totalSessions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Guest", guestSchema);
