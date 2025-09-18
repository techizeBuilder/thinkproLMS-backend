import { Request, Response } from "express";
import Subject from "../models/Subject";

// Get all subjects
export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    const subjects = await Subject.find({ isActive: true })
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get subject by ID
export const getSubjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findById(id);

    if (!subject || !subject.isActive) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    console.error("Error fetching subject:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create new subject
export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject name is required",
      });
    }

    // Check if subject with this name already exists
    const existingSubject = await Subject.findOne({ 
      name: name.trim(),
      isActive: true 
    });
    
    if (existingSubject) {
      return res.status(409).json({
        success: false,
        message: "Subject with this name already exists",
      });
    }

    const newSubject = new Subject({
      name: name.trim(),
    });

    await newSubject.save();

    return res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: newSubject,
    });
  } catch (error) {
    console.error("Error creating subject:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update subject
export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject name is required",
      });
    }

    // Check if another subject with this name already exists
    const existingSubject = await Subject.findOne({ 
      name: name.trim(),
      isActive: true,
      _id: { $ne: id }
    });
    
    if (existingSubject) {
      return res.status(409).json({
        success: false,
        message: "Subject with this name already exists",
      });
    }

    const subject = await Subject.findByIdAndUpdate(
      id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    if (!subject || !subject.isActive) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      data: subject,
    });
  } catch (error) {
    console.error("Error updating subject:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete subject (soft delete)
export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subject:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
