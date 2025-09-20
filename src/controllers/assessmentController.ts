import { Request, Response } from "express";
import Assessment from "../models/Assessment";
import AssessmentResponse from "../models/AssessmentResponse";
import Notification from "../models/Notification";
import { Question } from "../models/QuestionBank";
import Student from "../models/Student";
import Mentor from "../models/Mentor";
import { ROLES } from "../constants";
import { AuthRequest } from "../middleware/auth";

// Create new assessment
export const createAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      instructions,
      grade,
      subject,
      modules,
      startDate,
      endDate,
      duration,
      questions,
      targetStudents,
    } = req.body;

    const user = req.user;

    // Check if user has permission to create assessments
    const allowedRoles = [ROLES.SuperAdmin, ROLES.LeadMentor, ROLES.Mentor];
    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    // Validate required fields
    if (!title || !instructions || !grade || !subject || !startDate || !endDate || !duration || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start <= now) {
      return res.status(400).json({
        success: false,
        message: "Start date must be in the future",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    // Get mentor's school
    let schoolId;
    if (user.role === ROLES.Mentor) {
      const mentor = await Mentor.findOne({ user: user.id, isActive: true });
      if (!mentor || mentor.assignedSchools.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Mentor not found or no schools assigned",
        });
      }
      schoolId = mentor.assignedSchools[0]; // For now, use first school
      console.log("Creating assessment for mentor with school ID:", schoolId);
      console.log("Mentor assigned schools:", mentor.assignedSchools);
    } else {
      // For SuperAdmin and LeadMentor, school should be provided
      schoolId = req.body.school;
      if (!schoolId) {
        return res.status(400).json({
          success: false,
          message: "School is required",
        });
      }
    }

    // Validate questions exist and are approved
    const questionIds = questions.map((q: any) => q.questionId);
    const existingQuestions = await Question.find({
      _id: { $in: questionIds },
      isActive: true,
      approvedBy: { $exists: true },
    });

    if (existingQuestions.length !== questionIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more questions not found or not approved",
      });
    }

    // Create assessment
    const assessment = new Assessment({
      title,
      instructions,
      grade,
      subject,
      modules,
      startDate: start,
      endDate: end,
      duration,
      questions,
      targetStudents: targetStudents || [{ grade, sections: [] }],
      school: schoolId,
      createdBy: user.id,
      status: "draft",
    });

    await assessment.save();

    res.status(201).json({
      success: true,
      message: "Assessment created successfully",
      data: assessment,
    });
  } catch (error) {
    console.error("Error creating assessment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get assessments for mentor
export const getMyAssessments = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { status, page = 1, limit = 10 } = req.query;

    let schoolIds: string[] = [];
    
    if (user.role === ROLES.Mentor) {
      const mentor = await Mentor.findOne({ user: user.id, isActive: true });
      if (!mentor) {
        return res.status(404).json({
          success: false,
          message: "Mentor not found",
        });
      }
      schoolIds = mentor.assignedSchools.map(id => id.toString());
    }

    const filter: any = { isActive: true };
    
    if (user.role === ROLES.Mentor) {
      filter.school = { $in: schoolIds };
    }
    
    if (user.role === ROLES.SuperAdmin || user.role === ROLES.LeadMentor) {
      // Can see all assessments
    } else {
      filter.createdBy = user.id;
    }

    if (status) {
      filter.status = status;
    }

    const assessments = await Assessment.find(filter)
      .populate("school", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));

    const total = await Assessment.countDocuments(filter);

    res.json({
      success: true,
      data: assessments,
      pagination: {
        current: page,
        pages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get assessment by ID
export const getAssessmentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    console.log("Fetching assessment with ID:", id, "for user:", user.id);

    const assessment = await Assessment.findById(id)
      .populate("school", "name")
      .populate("createdBy", "name email")
      .populate({
        path: "questions.questionId",
        model: "Question",
        select: "questionText answerType answerChoices correctAnswers difficulty"
      });

    if (!assessment) {
      console.log("Assessment not found for ID:", id);
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    console.log("Assessment found:", assessment.title);

    // Check permissions
    if (user.role === ROLES.Mentor) {
      const mentor = await Mentor.findOne({ user: user.id, isActive: true });
      if (!mentor) {
        console.log("Mentor not found for user:", user.id);
        return res.status(403).json({
          success: false,
          message: "Access denied - mentor not found",
        });
      }
      
      // Convert ObjectIds to strings for comparison
      const mentorSchoolIds = mentor.assignedSchools.map(schoolId => schoolId.toString());
      
      // Handle both populated and non-populated school objects
      let assessmentSchoolId;
      if (assessment.school && typeof assessment.school === 'object' && assessment.school._id) {
        // School is populated
        assessmentSchoolId = assessment.school._id.toString();
      } else {
        // School is just an ObjectId
        assessmentSchoolId = assessment.school.toString();
      }
      
      console.log("Assessment school ID:", assessmentSchoolId);
      console.log("Mentor assigned school IDs:", mentorSchoolIds);
      
      if (!mentorSchoolIds.includes(assessmentSchoolId)) {
        console.log("Mentor not assigned to school:", assessmentSchoolId, "Mentor schools:", mentorSchoolIds);
        return res.status(403).json({
          success: false,
          message: "Access denied - not assigned to this school",
        });
      }
      
      console.log("Permission check passed - mentor is assigned to this school");
    }

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    console.error("Error fetching assessment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update assessment
export const updateAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Check permissions
    if (user.role === ROLES.Mentor) {
      const mentor = await Mentor.findOne({ user: user.id, isActive: true });
      if (!mentor || !mentor.assignedSchools.includes(assessment.school) || assessment.createdBy.toString() !== user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    } else if (user.role !== ROLES.SuperAdmin && user.role !== ROLES.LeadMentor) {
      if (assessment.createdBy.toString() !== user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Don't allow updates if assessment is published and has started
    if (assessment.status === "published" && new Date() >= assessment.startDate) {
      return res.status(400).json({
        success: false,
        message: "Cannot update published assessment that has started",
      });
    }

    const updatedAssessment = await Assessment.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("school", "name").populate("createdBy", "name email");

    res.json({
      success: true,
      message: "Assessment updated successfully",
      data: updatedAssessment,
    });
  } catch (error) {
    console.error("Error updating assessment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Publish assessment
export const publishAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notificationMessage } = req.body;
    const user = req.user;

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Check permissions
    if (user.role === ROLES.Mentor) {
      const mentor = await Mentor.findOne({ user: user.id, isActive: true });
      if (!mentor || !mentor.assignedSchools.includes(assessment.school) || assessment.createdBy.toString() !== user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    } else if (user.role !== ROLES.SuperAdmin && user.role !== ROLES.LeadMentor) {
      if (assessment.createdBy.toString() !== user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Update assessment status
    assessment.status = "published";
    await assessment.save();

    // Create notification if message provided
    if (notificationMessage) {
      const notification = new Notification({
        title: `New Assessment: ${assessment.title}`,
        message: notificationMessage,
        type: "assessment",
        priority: "high",
        targetAudience: assessment.targetStudents.map(target => ({
          grade: target.grade,
          sections: target.sections,
          school: assessment.school,
        })),
        relatedAssessment: assessment._id,
        sentBy: user.id,
        status: "sent",
      });

      await notification.save();
    }

    res.json({
      success: true,
      message: "Assessment published successfully",
      data: assessment,
    });
  } catch (error) {
    console.error("Error publishing assessment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get questions for assessment creation
export const getQuestionsForAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { grade, subject, modules, difficulty } = req.query;

    const filter: any = {
      isActive: true,
      approvedBy: { $exists: true },
    };

    if (grade) filter.grade = grade;
    if (subject) filter.subject = subject;
    if (modules) {
      const moduleArray = Array.isArray(modules) ? modules : [modules];
      filter.module = { $in: moduleArray };
    }
    if (difficulty) filter.difficulty = difficulty;

    const questions = await Question.find(filter)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get assessment analytics
export const getAssessmentAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Check permissions
    if (user.role === ROLES.Mentor) {
      const mentor = await Mentor.findOne({ user: user.id, isActive: true });
      if (!mentor || !mentor.assignedSchools.includes(assessment.school)) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Get response statistics
    const responses = await AssessmentResponse.find({ assessment: id });
    
    const analytics = {
      totalAttempts: responses.length,
      completedAttempts: responses.filter(r => r.status === "completed" || r.status === "submitted").length,
      averageScore: responses.length > 0 ? responses.reduce((sum, r) => sum + r.totalMarksObtained, 0) / responses.length : 0,
      averagePercentage: responses.length > 0 ? responses.reduce((sum, r) => sum + r.percentage, 0) / responses.length : 0,
      completionRate: responses.length > 0 ? (responses.filter(r => r.status === "completed" || r.status === "submitted").length / responses.length) * 100 : 0,
      gradeDistribution: responses.reduce((acc: Record<string, number>, r) => {
        acc[r.grade] = (acc[r.grade] || 0) + 1;
        return acc;
      }, {}),
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error fetching assessment analytics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete assessment
export const deleteAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Check permissions
    if (user.role === ROLES.Mentor) {
      const mentor = await Mentor.findOne({ user: user.id, isActive: true });
      if (!mentor || !mentor.assignedSchools.includes(assessment.school) || assessment.createdBy.toString() !== user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    } else if (user.role !== ROLES.SuperAdmin && user.role !== ROLES.LeadMentor) {
      if (assessment.createdBy.toString() !== user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Don't allow deletion if assessment has responses
    const responseCount = await AssessmentResponse.countDocuments({ assessment: id });
    if (responseCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete assessment with existing responses",
      });
    }

    assessment.isActive = false;
    await assessment.save();

    res.json({
      success: true,
      message: "Assessment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting assessment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
