import { Request, Response } from "express";
import School from "../models/School";

// Get all schools
export const getAllSchools = async (req: Request, res: Response) => {
  try {
    const schools = await School.find({ isActive: true })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: schools,
    });
  } catch (error) {
    console.error("Error fetching schools:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get school by ID
export const getSchoolById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const school = await School.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: school,
    });
  } catch (error) {
    console.error("Error fetching school:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create new school
export const createSchool = async (req: Request, res: Response) => {
  try {
    const {
      name,
      address,
      board,
      image,
      logo,
      affiliatedTo,
      state,
      city,
      branchName,
    } = req.body;

    // Validate required fields
    if (!name || !address || !board || !state || !city) {
      return res.status(400).json({
        success: false,
        message: "Name, address, board, state, and city are required",
      });
    }

    // Check if school with same name already exists in the same city
    const existingSchool = await School.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      city: { $regex: new RegExp(`^${city}$`, 'i') },
      state: { $regex: new RegExp(`^${state}$`, 'i') },
    });

    if (existingSchool) {
      return res.status(409).json({
        success: false,
        message: "School with this name already exists in this city",
      });
    }

    const newSchool = new School({
      name,
      address,
      board,
      image,
      logo,
      affiliatedTo,
      state,
      city,
      branchName,
    });

    await newSchool.save();

    return res.status(201).json({
      success: true,
      message: "School created successfully",
      data: newSchool,
    });
  } catch (error) {
    console.error("Error creating school:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update school
export const updateSchool = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const school = await School.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "School updated successfully",
      data: school,
    });
  } catch (error) {
    console.error("Error updating school:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete school (soft delete)
export const deleteSchool = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const school = await School.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "School deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting school:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
