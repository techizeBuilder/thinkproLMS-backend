import { Request, Response } from "express";
import { Question, QuestionRecommendation } from "../models/QuestionBank";
import Subject from "../models/Subject";
import Module from "../models/Module";
import { ROLES } from "../constants";
import { AuthRequest } from "../middleware/auth";

// Get all questions with filtering
export const getQuestions = async (req: Request, res: Response) => {
  try {
    const {
      grade,
      subject,
      module,
      difficulty,
      answerType,
      page = 1,
      limit = 10,
      search,
    } = req.query;

    const filter: any = { isActive: true };

    if (grade) filter.grade = grade;
    if (subject) filter.subject = subject;
    if (module) filter.module = module;
    if (difficulty) filter.difficulty = difficulty;
    if (answerType) filter.answerType = answerType;
    if (search) {
      filter.questionText = { $regex: search, $options: "i" };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const questions = await Question.find(filter)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("subject", "name")
      .populate({
        path: "module",
        select: "grade modules",
        populate: {
          path: "subject",
          select: "name"
        }
      })
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Question.countDocuments(filter);

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
    });
  }
};

// Get single question by ID
export const getQuestionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("subject", "name")
      .populate({
        path: "module",
        select: "grade modules",
        populate: {
          path: "subject",
          select: "name"
        }
      });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    res.json({
      success: true,
      data: question,
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch question",
    });
  }
};

// Create new question
export const createQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const {
      questionText,
      grade,
      subject,
      module,
      answerType,
      answerChoices,
      correctAnswers,
      difficulty,
    } = req.body;

    // Validate required fields
    if (!questionText || !grade || !subject || !module || !answerChoices || !correctAnswers) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate answer choices
    if (answerChoices.length < 2 || answerChoices.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Answer choices must be between 2 and 15",
      });
    }

    // Validate correct answers
    const validCorrectAnswers = correctAnswers.every((answer: number) => 
      answer >= 0 && answer < answerChoices.length
    );

    if (!validCorrectAnswers) {
      return res.status(400).json({
        success: false,
        message: "Invalid correct answer indices",
      });
    }

    // Validate subject and module exist
    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(400).json({
        success: false,
        message: "Subject not found",
      });
    }

    const moduleExists = await Module.findById(module);
    if (!moduleExists) {
      return res.status(400).json({
        success: false,
        message: "Module not found",
      });
    }

    // Get the highest order number for this grade/subject/module
    const lastQuestion = await Question.findOne({
      grade,
      subject,
      module,
    }).sort({ order: -1 });

    const newOrder = lastQuestion ? lastQuestion.order + 1 : 1;

    // Determine approval status based on user role
    const isAutoApproved = req.user?.role === ROLES.SuperAdmin || req.user?.role === ROLES.LeadMentor;
    
    const question = new Question({
      questionText,
      grade,
      subject,
      module,
      answerType,
      answerChoices: answerChoices.map((choice: any, index: number) => ({
        ...choice,
        order: index + 1,
      })),
      correctAnswers,
      difficulty,
      order: newOrder,
      createdBy: req.user?.id,
      approvedBy: isAutoApproved ? req.user?.id : null,
      approvedAt: isAutoApproved ? new Date() : null,
    });

    await question.save();

    res.status(201).json({
      success: true,
      data: question,
      message: "Question created successfully",
    });
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create question",
    });
  }
};

// Update question
export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const question = await Question.findById(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Check permissions
    if (req.user?.role !== ROLES.SuperAdmin && question.createdBy.toString() !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this question",
      });
    }

    // Validate subject and module if they are being updated
    if (updateData.subject) {
      const subjectExists = await Subject.findById(updateData.subject);
      if (!subjectExists) {
        return res.status(400).json({
          success: false,
          message: "Subject not found",
        });
      }
    }

    if (updateData.module) {
      const moduleExists = await Module.findById(updateData.module);
      if (!moduleExists) {
        return res.status(400).json({
          success: false,
          message: "Module not found",
        });
      }
    }

    // If answer choices are being updated, validate them
    if (updateData.answerChoices) {
      if (updateData.answerChoices.length < 2 || updateData.answerChoices.length > 15) {
        return res.status(400).json({
          success: false,
          message: "Answer choices must be between 2 and 15",
        });
      }

      // Validate correct answers
      const validCorrectAnswers = updateData.correctAnswers.every((answer: number) => 
        answer >= 0 && answer < updateData.answerChoices.length
      );

      if (!validCorrectAnswers) {
        return res.status(400).json({
          success: false,
          message: "Invalid correct answer indices",
        });
      }

      // Update answer choices with order
      updateData.answerChoices = updateData.answerChoices.map((choice: any, index: number) => ({
        ...choice,
        order: index + 1,
      }));
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate("createdBy", "name email")
     .populate("approvedBy", "name email")
     .populate("subject", "name")
     .populate("module", "modules");

    res.json({
      success: true,
      data: updatedQuestion,
      message: "Question updated successfully",
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update question",
    });
  }
};

// Delete question (soft delete)
export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Check permissions
    if (req.user?.role !== ROLES.SuperAdmin && question.createdBy.toString() !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this question",
      });
    }

    question.isActive = false;
    await question.save();

    res.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete question",
    });
  }
};

// Reorder questions
export const reorderQuestions = async (req: Request, res: Response) => {
  try {
    const { questionOrders } = req.body;

    if (!Array.isArray(questionOrders)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question orders format",
      });
    }

    const updatePromises = questionOrders.map((item: { id: string; order: number }) =>
      Question.findByIdAndUpdate(item.id, { order: item.order })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: "Questions reordered successfully",
    });
  } catch (error) {
    console.error("Error reordering questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reorder questions",
    });
  }
};

// Get question recommendations
export const getQuestionRecommendations = async (req: Request, res: Response) => {
  try {
    const {
      status = "pending",
      grade,
      subject,
      module,
      page = 1,
      limit = 10,
    } = req.query;

    const filter: any = {};

    if (status) filter.status = status;
    if (grade) filter.grade = grade;
    if (subject) filter.subject = subject;
    if (module) filter.module = module;

    const skip = (Number(page) - 1) * Number(limit);

    const recommendations = await QuestionRecommendation.find(filter)
      .populate("recommendedBy", "name email")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await QuestionRecommendation.countDocuments(filter);

    res.json({
      success: true,
      data: {
        recommendations,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching question recommendations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch question recommendations",
    });
  }
};

// Create question recommendation
export const createQuestionRecommendation = async (req: AuthRequest, res: Response) => {
  try {
    const {
      questionText,
      grade,
      subject,
      module,
      answerType,
      answerChoices,
      correctAnswers,
      difficulty,
    } = req.body;

    // Validate required fields
    if (!questionText || !grade || !subject || !module || !answerChoices || !correctAnswers) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate answer choices
    if (answerChoices.length < 2 || answerChoices.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Answer choices must be between 2 and 15",
      });
    }

    // Validate subject and module exist
    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(400).json({
        success: false,
        message: "Subject not found",
      });
    }

    const moduleExists = await Module.findById(module);
    if (!moduleExists) {
      return res.status(400).json({
        success: false,
        message: "Module not found",
      });
    }

    const recommendation = new QuestionRecommendation({
      questionText,
      grade,
      subject,
      module,
      answerType,
      answerChoices: answerChoices.map((choice: any, index: number) => ({
        ...choice,
        order: index + 1,
      })),
      correctAnswers,
      difficulty,
      recommendedBy: req.user?.id,
    });

    await recommendation.save();

    res.status(201).json({
      success: true,
      data: recommendation,
      message: "Question recommendation submitted successfully",
    });
  } catch (error) {
    console.error("Error creating question recommendation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create question recommendation",
    });
  }
};

// Review question recommendation
export const reviewQuestionRecommendation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewComments } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'approved' or 'rejected'",
      });
    }

    const recommendation = await QuestionRecommendation.findById(id);

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        message: "Question recommendation not found",
      });
    }

    recommendation.status = status;
    recommendation.reviewedBy = req.user?.id;
    recommendation.reviewedAt = new Date();
    recommendation.reviewComments = reviewComments;

    await recommendation.save();

    // If approved, create the question in the question bank
    if (status === "approved") {
      const question = new Question({
        questionText: recommendation.questionText,
        grade: recommendation.grade,
        subject: recommendation.subject,
        module: recommendation.module,
        answerType: recommendation.answerType,
        answerChoices: recommendation.answerChoices,
        correctAnswers: recommendation.correctAnswers,
        difficulty: recommendation.difficulty,
        createdBy: recommendation.recommendedBy,
        approvedBy: req.user?.id,
        approvedAt: new Date(),
      });

      await question.save();
    }

    res.json({
      success: true,
      data: recommendation,
      message: `Question recommendation ${status} successfully`,
    });
  } catch (error) {
    console.error("Error reviewing question recommendation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to review question recommendation",
    });
  }
};

// Get available subjects and modules
export const getSubjectsAndModules = async (req: Request, res: Response) => {
  try {
    const { grade } = req.query;

    // Get all active subjects
    const subjects = await Subject.find({ isActive: true }).select("name");

    // Get all active modules with their subjects
    const moduleFilter: any = { isActive: true };
    if (grade && typeof grade === 'string') {
      moduleFilter.grade = parseInt(grade.replace("Grade ", ""));
    }
    
    const modules = await Module.find(moduleFilter)
      .populate("subject", "name")
      .select("grade subject modules");

    res.json({
      success: true,
      data: {
        subjects,
        modules,
      },
    });
  } catch (error) {
    console.error("Error fetching subjects and modules:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subjects and modules",
    });
  }
};
