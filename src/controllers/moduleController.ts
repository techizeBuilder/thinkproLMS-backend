import { Request, Response } from "express";
import Module from "../models/Module";
import Subject from "../models/Subject";

// Get all modules
export const getAllModules = async (req: Request, res: Response) => {
  try {
    const modules = await Module.find({ isActive: true })
      .populate("subject", "name")
      .sort({ grade: 1, "subject.name": 1 });

    return res.status(200).json({
      success: true,
      data: modules,
    });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get modules by grade and subject
export const getModulesByGradeAndSubject = async (req: Request, res: Response) => {
  try {
    const { grade, subjectId } = req.params;

    const module = await Module.findOne({ 
      grade: parseInt(grade),
      subject: subjectId,
      isActive: true 
    }).populate("subject", "name");

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found for this grade and subject",
      });
    }

    return res.status(200).json({
      success: true,
      data: module,
    });
  } catch (error) {
    console.error("Error fetching module:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get module by ID
export const getModuleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const module = await Module.findById(id)
      .populate("subject", "name");

    if (!module || !module.isActive) {
      return res.status(404).json({
        success: false,
        message: "Module not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: module,
    });
  } catch (error) {
    console.error("Error fetching module:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create new module
export const createModule = async (req: Request, res: Response) => {
  try {
    const { grade, subjectId, modules } = req.body;

    // Validate required fields
    if (!grade || !subjectId || !modules || !Array.isArray(modules)) {
      return res.status(400).json({
        success: false,
        message: "Grade, subject ID, and modules array are required",
      });
    }

    // Validate grade range
    if (grade < 1 || grade > 10) {
      return res.status(400).json({
        success: false,
        message: "Grade must be between 1 and 10",
      });
    }

    // Check if subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject || !subject.isActive) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    // Check if module already exists for this grade and subject
    const existingModule = await Module.findOne({
      grade,
      subject: subjectId,
      isActive: true,
    });

    if (existingModule) {
      return res.status(409).json({
        success: false,
        message: "Module already exists for this grade and subject",
      });
    }

    const newModule = new Module({
      grade,
      subject: subjectId,
      modules,
    });

    await newModule.save();
    await newModule.populate("subject", "name");

    return res.status(201).json({
      success: true,
      message: "Module created successfully",
      data: newModule,
    });
  } catch (error) {
    console.error("Error creating module:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update module
export const updateModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { modules } = req.body;

    if (!modules || !Array.isArray(modules)) {
      return res.status(400).json({
        success: false,
        message: "Modules array is required",
      });
    }

    const module = await Module.findByIdAndUpdate(
      id,
      { modules },
      { new: true, runValidators: true }
    ).populate("subject", "name");

    if (!module || !module.isActive) {
      return res.status(404).json({
        success: false,
        message: "Module not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Module updated successfully",
      data: module,
    });
  } catch (error) {
    console.error("Error updating module:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete module (soft delete)
export const deleteModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const module = await Module.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Module deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting module:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
