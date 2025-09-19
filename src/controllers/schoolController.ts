import { Request, Response } from "express";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import School from "../models/School";

// Get all schools
export const getAllSchools = async (req: Request, res: Response) => {
  try {
    const { state, city, includeInactive } = req.query;
    
    // Build filter object
    const filter: any = {};
    
    // If includeInactive is not true, only show active schools
    if (includeInactive !== 'true') {
      filter.isActive = true;
    }
    
    // Add state filter if provided
    if (state && state !== 'all') {
      filter.state = { $regex: new RegExp(`^${state}$`, 'i') };
    }
    
    // Add city filter if provided
    if (city && city !== 'all') {
      filter.city = { $regex: new RegExp(`^${city}$`, 'i') };
    }

    const schools = await School.find(filter)
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
      contractStartDate,
      contractEndDate,
      projectStartDate,
      projectEndDate,
      schoolHeads,
      serviceDetails,
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

    // Handle file uploads
    let contractDocumentPath = null;
    let imagePath = null;
    let logoPath = null;
    const profilePicPaths: { [key: number]: string } = {};

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};

    // Helper function to save file
    const saveFile = (file: Express.Multer.File, subDir: string): string => {
      const uploadsDir = join(process.cwd(), 'uploads', subDir);
      mkdirSync(uploadsDir, { recursive: true });

      const fileExtension = file.originalname.split('.').pop() || '';
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = join(uploadsDir, fileName);

      writeFileSync(filePath, file.buffer);
      return `/uploads/${subDir}/${fileName}`;
    };

    try {
      // Handle contract document
      if (files.contractDocument && files.contractDocument[0]) {
        contractDocumentPath = saveFile(files.contractDocument[0], 'contracts');
      }

      // Handle school image
      if (files.image && files.image[0]) {
        imagePath = saveFile(files.image[0], 'schools/images');
      }

      // Handle school logo
      if (files.logo && files.logo[0]) {
        logoPath = saveFile(files.logo[0], 'schools/logos');
      }

      // Handle school head profile pictures
      Object.keys(files).forEach(fieldName => {
        if (fieldName.startsWith('schoolHeadProfilePic')) {
          const index = parseInt(fieldName.replace('schoolHeadProfilePic', ''));
          if (files[fieldName] && files[fieldName][0]) {
            profilePicPaths[index] = saveFile(files[fieldName][0], 'schools/profile-pics');
          }
        }
      });
    } catch (fileError) {
      console.error("Error saving files:", fileError);
      return res.status(500).json({
        success: false,
        message: "Error saving files",
      });
    }

    // Parse JSON fields if they are strings
    let parsedSchoolHeads = [];
    let parsedServiceDetails = null;

    try {
      if (schoolHeads) {
        parsedSchoolHeads = typeof schoolHeads === 'string' ? JSON.parse(schoolHeads) : schoolHeads;
        
        // Update profile picture paths for school heads
        parsedSchoolHeads = parsedSchoolHeads.map((head: any, index: number) => {
          if (profilePicPaths[index]) {
            return { ...head, profilePic: profilePicPaths[index] };
          }
          return head;
        });
      }
      if (serviceDetails) {
        parsedServiceDetails = typeof serviceDetails === 'string' ? JSON.parse(serviceDetails) : serviceDetails;
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON format for schoolHeads or serviceDetails",
      });
    }

    const newSchool = new School({
      name,
      address,
      board,
      image: imagePath || image,
      logo: logoPath || logo,
      affiliatedTo,
      state,
      city,
      branchName,
      contractStartDate: contractStartDate ? new Date(contractStartDate) : null,
      contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
      projectStartDate: projectStartDate ? new Date(projectStartDate) : null,
      projectEndDate: projectEndDate ? new Date(projectEndDate) : null,
      contractDocument: contractDocumentPath,
      schoolHeads: parsedSchoolHeads,
      serviceDetails: parsedServiceDetails,
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
      contractStartDate,
      contractEndDate,
      projectStartDate,
      projectEndDate,
      schoolHeads,
      serviceDetails,
    } = req.body;

    // Handle file uploads
    let contractDocumentPath = null;
    let imagePath = null;
    let logoPath = null;
    const profilePicPaths: { [key: number]: string } = {};

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};

    // Helper function to save file
    const saveFile = (file: Express.Multer.File, subDir: string): string => {
      const uploadsDir = join(process.cwd(), 'uploads', subDir);
      mkdirSync(uploadsDir, { recursive: true });

      const fileExtension = file.originalname.split('.').pop() || '';
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = join(uploadsDir, fileName);

      writeFileSync(filePath, file.buffer);
      return `/uploads/${subDir}/${fileName}`;
    };

    try {
      // Handle contract document
      if (files.contractDocument && files.contractDocument[0]) {
        contractDocumentPath = saveFile(files.contractDocument[0], 'contracts');
      }

      // Handle school image
      if (files.image && files.image[0]) {
        imagePath = saveFile(files.image[0], 'schools/images');
      }

      // Handle school logo
      if (files.logo && files.logo[0]) {
        logoPath = saveFile(files.logo[0], 'schools/logos');
      }

      // Handle school head profile pictures
      Object.keys(files).forEach(fieldName => {
        if (fieldName.startsWith('schoolHeadProfilePic')) {
          const index = parseInt(fieldName.replace('schoolHeadProfilePic', ''));
          if (files[fieldName] && files[fieldName][0]) {
            profilePicPaths[index] = saveFile(files[fieldName][0], 'schools/profile-pics');
          }
        }
      });
    } catch (fileError) {
      console.error("Error saving files:", fileError);
      return res.status(500).json({
        success: false,
        message: "Error saving files",
      });
    }

    // Parse JSON fields if they are strings
    let parsedSchoolHeads = undefined;
    let parsedServiceDetails = undefined;

    try {
      if (schoolHeads !== undefined) {
        parsedSchoolHeads = typeof schoolHeads === 'string' ? JSON.parse(schoolHeads) : schoolHeads;
        
        // Update profile picture paths for school heads
        if (parsedSchoolHeads && Array.isArray(parsedSchoolHeads)) {
          parsedSchoolHeads = parsedSchoolHeads.map((head: any, index: number) => {
            if (profilePicPaths[index]) {
              return { ...head, profilePic: profilePicPaths[index] };
            }
            return head;
          });
        }
      }
      if (serviceDetails !== undefined) {
        parsedServiceDetails = typeof serviceDetails === 'string' ? JSON.parse(serviceDetails) : serviceDetails;
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON format for schoolHeads or serviceDetails",
      });
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (board !== undefined) updateData.board = board;
    if (imagePath !== null) updateData.image = imagePath;
    else if (image !== undefined) updateData.image = image;
    if (logoPath !== null) updateData.logo = logoPath;
    else if (logo !== undefined) updateData.logo = logo;
    if (affiliatedTo !== undefined) updateData.affiliatedTo = affiliatedTo;
    if (state !== undefined) updateData.state = state;
    if (city !== undefined) updateData.city = city;
    if (branchName !== undefined) updateData.branchName = branchName;
    if (contractStartDate !== undefined) updateData.contractStartDate = contractStartDate ? new Date(contractStartDate) : null;
    if (contractEndDate !== undefined) updateData.contractEndDate = contractEndDate ? new Date(contractEndDate) : null;
    if (projectStartDate !== undefined) updateData.projectStartDate = projectStartDate ? new Date(projectStartDate) : null;
    if (projectEndDate !== undefined) updateData.projectEndDate = projectEndDate ? new Date(projectEndDate) : null;
    if (contractDocumentPath !== null) updateData.contractDocument = contractDocumentPath;
    if (parsedSchoolHeads !== undefined) updateData.schoolHeads = parsedSchoolHeads;
    if (parsedServiceDetails !== undefined) updateData.serviceDetails = parsedServiceDetails;

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

// Toggle school activation status
export const toggleSchoolStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean value",
      });
    }

    const school = await School.findByIdAndUpdate(
      id,
      { isActive },
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
      message: `School ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: school,
    });
  } catch (error) {
    console.error("Error toggling school status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};