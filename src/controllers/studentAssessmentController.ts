import { Request, Response } from "express";
import Assessment from "../models/Assessment";
import AssessmentResponse from "../models/AssessmentResponse";
import Student from "../models/Student";
import { ROLES } from "../constants";
import { AuthRequest } from "../middleware/auth";

// Get available assessments for student
export const getAvailableAssessments = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (user.role !== ROLES.Student) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student role required.",
      });
    }

    // Get student info
    const student = await Student.findOne({ user: user.id, isActive: true })
      .populate("school", "name");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const now = new Date();

    // Find assessments available to this student
    const assessments = await Assessment.find({
      isActive: true,
      status: "published",
      startDate: { $lte: now },
      endDate: { $gte: now },
      school: student.school,
      $or: [
        { "targetStudents.grade": student.grade },
        { "targetStudents.grade": student.grade, "targetStudents.sections": { $in: [""] } },
        { "targetStudents.grade": student.grade, "targetStudents.sections": { $size: 0 } },
      ],
    })
      .populate("school", "name")
      .populate("createdBy", "name")
      .sort({ startDate: 1 });

    // Check which assessments student has already attempted
    const assessmentIds = assessments.map(a => a._id);
    const existingResponses = await AssessmentResponse.find({
      assessment: { $in: assessmentIds },
      student: student._id,
    });

    const responseMap = new Map();
    existingResponses.forEach(response => {
      responseMap.set(response.assessment.toString(), response);
    });

    // Add attempt status to assessments
    const assessmentsWithStatus = assessments.map(assessment => {
      const response = responseMap.get(assessment._id.toString());
      return {
        ...assessment.toObject(),
        attemptStatus: response ? response.status : "not_attempted",
        hasAttempted: !!response,
        canRetake: false, // For now, no retakes allowed
      };
    });

    res.json({
      success: true,
      data: assessmentsWithStatus,
    });
  } catch (error) {
    console.error("Error fetching available assessments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Start assessment
export const startAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== ROLES.Student) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student role required.",
      });
    }

    // Get student info
    const student = await Student.findOne({ user: user.id, isActive: true });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get assessment
    const assessment = await Assessment.findById(id)
      .populate("questions.questionId");

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Check if assessment is available
    const now = new Date();
    if (assessment.status !== "published" || now < assessment.startDate || now > assessment.endDate) {
      return res.status(400).json({
        success: false,
        message: "Assessment is not currently available",
      });
    }

    // Check if student is eligible
    const isEligible = assessment.targetStudents.some(target => 
      target.grade === student.grade && 
      (target.sections.length === 0 || target.sections.includes(""))
    );

    if (!isEligible) {
      return res.status(403).json({
        success: false,
        message: "You are not eligible for this assessment",
      });
    }

    // Check if student has already attempted
    const existingResponse = await AssessmentResponse.findOne({
      assessment: id,
      student: student._id,
    });

    if (existingResponse) {
      if (existingResponse.status === "completed" || existingResponse.status === "submitted") {
        return res.status(400).json({
          success: false,
          message: "You have already completed this assessment",
        });
      }
      
      // Return existing response if in progress
      return res.json({
        success: true,
        data: {
          assessment,
          response: existingResponse,
          timeRemaining: existingResponse.endTime ? 
            Math.max(0, Math.floor((existingResponse.endTime.getTime() - now.getTime()) / 1000)) : 
            assessment.duration * 60,
        },
      });
    }

    // Create new response
    const endTime = new Date(now.getTime() + assessment.duration * 60 * 1000);
    
    const response = new AssessmentResponse({
      assessment: assessment._id,
      student: student._id,
      answers: assessment.questions.map(q => ({
        questionId: q.questionId._id,
        selectedAnswers: [],
        isCorrect: false,
        marksObtained: 0,
        timeSpent: 0,
      })),
      startTime: now,
      endTime,
      status: "in_progress",
    });

    await response.save();

    res.json({
      success: true,
      data: {
        assessment,
        response,
        timeRemaining: assessment.duration * 60,
      },
    });
  } catch (error) {
    console.error("Error starting assessment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Submit answer for a question
export const submitAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { questionId, selectedAnswers, timeSpent } = req.body;
    const user = req.user;

    if (user.role !== ROLES.Student) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student role required.",
      });
    }

    // Get student info
    const student = await Student.findOne({ user: user.id, isActive: true });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get response
    const response = await AssessmentResponse.findOne({
      _id: id,
      student: student._id,
      status: "in_progress",
    }).populate("assessment");

    if (!response) {
      return res.status(404).json({
        success: false,
        message: "Assessment response not found or not in progress",
      });
    }

    // Check if time is up
    const now = new Date();
    if (now > response.endTime) {
      response.status = "timeout";
      response.autoSubmitted = true;
      await response.save();
      
      return res.status(400).json({
        success: false,
        message: "Time is up. Assessment has been auto-submitted.",
      });
    }

    // Find the question in assessment
    const assessment = response.assessment as any;
    const assessmentQuestion = assessment.questions.find((q: any) => 
      q.questionId.toString() === questionId
    );

    if (!assessmentQuestion) {
      return res.status(400).json({
        success: false,
        message: "Question not found in assessment",
      });
    }

    // Update answer
    const answerIndex = response.answers.findIndex((a: any) => 
      a.questionId.toString() === questionId
    );

    if (answerIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Answer not found",
      });
    }

    // Get question details to check correctness
    const Question = require("../models/QuestionBank").Question;
    const question = await Question.findById(questionId);

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question not found",
      });
    }

    // Check if answer is correct
    const isCorrect = JSON.stringify(selectedAnswers.sort()) === JSON.stringify(question.correctAnswers.sort());
    const marksObtained = isCorrect ? assessmentQuestion.marks : 0;

    response.answers[answerIndex].selectedAnswers = selectedAnswers;
    response.answers[answerIndex].isCorrect = isCorrect;
    response.answers[answerIndex].marksObtained = marksObtained;
    response.answers[answerIndex].timeSpent = timeSpent || 0;

    await response.save();

    res.json({
      success: true,
      message: "Answer submitted successfully",
      data: {
        isCorrect,
        marksObtained,
        correctAnswers: question.correctAnswers,
      },
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Submit assessment
export const submitAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== ROLES.Student) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student role required.",
      });
    }

    // Get student info
    const student = await Student.findOne({ user: user.id, isActive: true });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get response
    const response = await AssessmentResponse.findOne({
      _id: id,
      student: student._id,
    }).populate("assessment");

    if (!response) {
      return res.status(404).json({
        success: false,
        message: "Assessment response not found",
      });
    }

    if (response.status === "completed" || response.status === "submitted") {
      return res.status(400).json({
        success: false,
        message: "Assessment already submitted",
      });
    }

    // Calculate final results
    const assessment = response.assessment as any;
    const totalMarks = assessment.totalMarks;
    const obtainedMarks = response.answers.reduce((sum: number, answer: any) => sum + answer.marksObtained, 0);
    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

    // Determine grade
    let grade = "F";
    if (percentage >= 90) grade = "A+";
    else if (percentage >= 80) grade = "A";
    else if (percentage >= 70) grade = "B+";
    else if (percentage >= 60) grade = "B";
    else if (percentage >= 50) grade = "C+";
    else if (percentage >= 40) grade = "C";
    else if (percentage >= 30) grade = "D";

    // Update response
    response.status = "submitted";
    response.submittedAt = new Date();
    response.isSubmitted = true;
    response.totalMarksObtained = obtainedMarks;
    response.percentage = percentage;
    response.grade = grade as "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";

    await response.save();

    res.json({
      success: true,
      message: "Assessment submitted successfully",
      data: {
        totalMarks,
        obtainedMarks,
        percentage,
        grade,
        timeSpent: response.timeSpent,
      },
    });
  } catch (error) {
    console.error("Error submitting assessment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get assessment results for student
export const getMyAssessmentResults = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (user.role !== ROLES.Student) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student role required.",
      });
    }

    // Get student info
    const student = await Student.findOne({ user: user.id, isActive: true });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const responses = await AssessmentResponse.find({
      student: student._id,
      status: { $in: ["completed", "submitted"] },
    })
      .populate("assessment", "title grade subject modules totalMarks")
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: responses,
    });
  } catch (error) {
    console.error("Error fetching assessment results:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
