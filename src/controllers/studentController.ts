import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User";
import School from "../models/School";
import Student from "../models/Student";
import LeadMentor from "../models/LeadMentor";
import { ROLES } from "../constants";
import { sendSetupEmail } from "../utils/email";
import * as XLSX from "xlsx";

// Generate unique student ID
const generateStudentId = async (schoolId: string): Promise<string> => {
  const school = await School.findById(schoolId);
  const schoolCode = school?.name.substring(0, 3).toUpperCase() || "SCH";

  // Find the last student ID for this school
  const lastStudent = await Student.findOne({ school: schoolId })
    .sort({ studentId: -1 })
    .select("studentId");

  let nextNumber = 1;
  if (lastStudent && lastStudent.studentId) {
    const lastNumber = parseInt(lastStudent.studentId.split("-")[1] || "0");
    nextNumber = lastNumber + 1;
  }

  return `${schoolCode}-${nextNumber.toString().padStart(4, "0")}`;
};

// Generate unique password for students
const generateCommonPassword = (): string => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 random digits
  return `Welcome${randomDigits}`;
};

// Get all students - accessible by superadmin, leadmentor, mentor, and schooladmin
export const getAllStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId, grade } = req.query;
    const user = req.user;

    // Check if user has permission to access students
    const allowedRoles = [
      ROLES.SuperAdmin,
      ROLES.LeadMentor,
      ROLES.Mentor,
      ROLES.SchoolAdmin,
    ];
    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    // Build query filter based on user role
    const filter: any = { isActive: true };

    // // Role-based filtering
    // if (user.role === ROLES.LeadMentor || user.role === ROLES.Mentor) {
    //   // Lead mentors and mentors can see students they personally added
    //   filter.addedBy = user.id;
    // } else if (user.role === ROLES.SchoolAdmin) {
    //   // School admins can see students from their school only
    //   filter.school = user.schoolId;
    // }
    // SuperAdmin can see all students (no additional filter)

    // Additional filters
    if (schoolId) filter.school = schoolId;
    if (grade) filter.grade = grade;

    const students = await Student.find(filter)
      .populate("user", "name email isVerified createdAt")
      .populate("school", "name city state board branchName")
      .populate("addedBy", "user")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get student by ID - accessible by superadmin, leadmentor, mentor, schooladmin, and student (self only)
export const getStudentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Check if user has permission to access students
    const allowedRoles = [
      ROLES.SuperAdmin,
      ROLES.LeadMentor,
      ROLES.Mentor,
      ROLES.SchoolAdmin,
      ROLES.Student,
    ];
    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    // Build query filter based on user role
    let filter: any = { _id: id, isActive: true };

    // Any user can access any student (no additional filter)

    const student = await Student.findOne(filter)
      .populate("user", "name email isVerified createdAt")
      .populate("school", "name city state board branchName")
      .populate("addedBy", "user");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create a single student - only superadmin, leadmentor, and mentor can create
export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { name, schoolId, grade, email, parentEmail, parentPhoneNumber } =
      req.body;
    const user = req.user;

    // Check if user has permission to create students
    const allowedRoles = [ROLES.SuperAdmin, ROLES.LeadMentor, ROLES.Mentor];
    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only superadmin, lead mentor, or mentor can create students.",
      });
    }

    // Use the current user's ID as addedBy regardless of role
    const addedBy = user._id || user.id;

    // Validate required fields
    if (!name || !schoolId || !grade) {
      return res.status(400).json({
        success: false,
        message: "Name, school, and grade are required",
      });
    }

    // Verify school exists
    const school = await School.findById(schoolId);
    if (!school || !school.isActive) {
      return res.status(400).json({
        success: false,
        message: "School not found or inactive",
      });
    }

    // Generate student ID
    const studentId = await generateStudentId(schoolId);

    // Determine if custom credentials or system-generated
    const hasCustomCredentials = !!(email || parentEmail);
    const studentEmail =
      email ||
      `${studentId.toLowerCase()}@${school.name
        .replace(/\s+/g, "")
        .toLowerCase()}.edu`;

    // Check if email already exists
    const existingUser = await User.findOne({ email: studentEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create user
    const setupToken = uuidv4();
    const generatedPassword = hasCustomCredentials
      ? null
      : generateCommonPassword();

    const newUser = new User({
      name,
      email: studentEmail,
      role: ROLES.Student,
      setupToken: hasCustomCredentials ? setupToken : null,
      password: hasCustomCredentials ? null : generatedPassword, // Will be hashed by pre-save hook
    });
    await newUser.save();

    // Create student
    const student = new Student({
      user: newUser._id,
      school: schoolId,
      studentId,
      grade,
      parentEmail,
      parentPhoneNumber,
      hasCustomCredentials,
      generatedPassword: hasCustomCredentials ? null : generatedPassword,
      addedBy: addedBy,
    });
    await student.save();

    // Send setup email if custom credentials
    if (hasCustomCredentials && (email || parentEmail)) {
      await sendSetupEmail({
        to: email || parentEmail!,
        name,
        token: setupToken,
      });
    }

    // Populate the created student for response
    const populatedStudent = await Student.findById(student._id)
      .populate("user", "name email isVerified createdAt")
      .populate("school", "name city state board branchName");

    return res.status(201).json({
      success: true,
      message: hasCustomCredentials
        ? "Student created successfully and setup email sent"
        : "Student created successfully with generated credentials",
      data: populatedStudent,
    });
  } catch (error) {
    console.error("Error creating student:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Bulk upload students - only superadmin, leadmentor, and mentor can bulk upload
export const bulkUploadStudents = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { generateCredentials, schoolId } = req.body;

    // Check if user has permission to bulk upload students
    const allowedRoles = [ROLES.SuperAdmin, ROLES.LeadMentor, ROLES.Mentor];
    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only superadmin, lead mentor, or mentor can bulk upload students.",
      });
    }

    // Use the current user's ID as addedBy regardless of role
    const addedBy = user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    // Verify school exists and is active
    const school = await School.findOne({ _id: schoolId, isActive: true });
    if (!school) {
      return res.status(400).json({
        success: false,
        message: "School not found or inactive",
      });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      try {
        // Validate required fields
        if (!row.name || !row.grade) {
          errors.push(`Row ${i + 1}: Name and grade are required`);
          continue;
        }

        // Generate student ID using the provided school
        const studentId = await generateStudentId(schoolId);

        // Determine credentials approach
        const hasCustomCredentials =
          !generateCredentials && !!(row.email || row.parentEmail);
        const studentEmail = hasCustomCredentials
          ? row.email || row.parentEmail
          : `${studentId.toLowerCase()}@${school.name
              .replace(/\s+/g, "")
              .toLowerCase()}.edu`;

        // Check if email already exists
        const existingUser = await User.findOne({ email: studentEmail });
        if (existingUser) {
          errors.push(
            `Row ${i + 1}: User with email "${studentEmail}" already exists`
          );
          continue;
        }

        // Create user
        const setupToken = uuidv4();
        const generatedPassword = hasCustomCredentials
          ? null
          : generateCommonPassword();

        const newUser = new User({
          name: row.name,
          email: studentEmail,
          role: ROLES.Student,
          setupToken: hasCustomCredentials ? setupToken : null,
          password: hasCustomCredentials ? null : generatedPassword,
        });
        await newUser.save();

        // Create student
        const student = new Student({
          user: newUser._id,
          school: schoolId,
          studentId,
          grade: row.grade,
          parentEmail: row.parentEmail || null,
          parentPhoneNumber: row.parentPhoneNumber || null,
          hasCustomCredentials,
          generatedPassword: hasCustomCredentials ? null : generatedPassword,
          addedBy: addedBy,
        });
        await student.save();

        // Send setup email if custom credentials
        if (hasCustomCredentials && (row.email || row.parentEmail)) {
          await sendSetupEmail({
            to: row.email || row.parentEmail,
            name: row.name,
            token: setupToken,
          });
        }

        results.push({
          name: row.name,
          studentId,
          email: studentEmail,
          school: school.name,
          grade: row.grade,
          hasCustomCredentials,
          generatedPassword: hasCustomCredentials ? null : generatedPassword,
        });
      } catch (error: any) {
        console.error(`Error processing row ${i + 1}:`, error);
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${results.length} students successfully`,
      data: {
        successful: results,
        errors,
        totalProcessed: data.length,
        successCount: results.length,
        errorCount: errors.length,
      },
    });
  } catch (error) {
    console.error("Error in bulk upload:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update student - only superadmin, leadmentor, and mentor can update
export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, grade, parentEmail, parentPhoneNumber } = req.body;
    const user = req.user;

    // Check if user has permission to update students
    const allowedRoles = [ROLES.SuperAdmin, ROLES.LeadMentor, ROLES.Mentor];
    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only superadmin, lead mentor, or mentor can update students.",
      });
    }

    // Build query filter based on user role
    let filter: any = { _id: id, isActive: true };

    if (user.role === ROLES.LeadMentor || user.role === ROLES.Mentor) {
      filter.addedBy = user.id;
    }
    // SuperAdmin can update any student (no additional filter)

    // Find student
    const student = await Student.findOne(filter);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied",
      });
    }

    // Update user info if provided
    if (name) {
      await User.findByIdAndUpdate(student.user, { name });
    }

    // Update student
    const updateData: any = {};
    if (grade) updateData.grade = grade;
    if (parentEmail !== undefined) updateData.parentEmail = parentEmail;
    if (parentPhoneNumber !== undefined)
      updateData.parentPhoneNumber = parentPhoneNumber;

    const updatedStudent = await Student.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("user", "name email isVerified createdAt")
      .populate("school", "name city state board branchName");

    return res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete student (soft delete) - only superadmin, leadmentor, and mentor can delete
export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Check if user has permission to delete students
    const allowedRoles = [ROLES.SuperAdmin, ROLES.LeadMentor, ROLES.Mentor];
    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only superadmin, lead mentor, or mentor can delete students.",
      });
    }

    // Build query filter based on user role
    let filter: any = { _id: id, isActive: true };

    if (user.role === ROLES.LeadMentor || user.role === ROLES.Mentor) {
      filter.addedBy = user.id;
    }
    // SuperAdmin can delete any student (no additional filter)

    const student = await Student.findOneAndUpdate(
      filter,
      { isActive: false },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found or access denied",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Download student list with credentials - accessible by superadmin, leadmentor, mentor, and schooladmin
export const downloadStudentList = async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId, format = "excel" } = req.query;
    const user = req.user;

    // Check if user has permission to download student list
    const allowedRoles = [
      ROLES.SuperAdmin,
      ROLES.LeadMentor,
      ROLES.Mentor,
      ROLES.SchoolAdmin,
    ];
    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    // Build query filter based on user role
    const filter: any = { isActive: true };

    if (user.role === ROLES.LeadMentor || user.role === ROLES.Mentor) {
      filter.addedBy = user.id;
    } else if (user.role === ROLES.SchoolAdmin) {
      filter.school = user.schoolId;
    }
    // SuperAdmin can download all students (no additional filter)

    if (schoolId) filter.school = schoolId;

    const students = await Student.find(filter)
      .populate("user", "name email")
      .populate("school", "name city state board branchName")
      .sort({ school: 1, grade: 1, "user.name": 1 });

    const data = students.map((student) => ({
      "Student Name": (student.user as any).name,
      "Student ID": student.studentId,
      Email: (student.user as any).email,
      School: (student.school as any).name,
      Grade: student.grade,
      "Parent Email": student.parentEmail || "N/A",
      "Parent Phone": student.parentPhoneNumber || "N/A",
      "Generated Password": student.generatedPassword || "N/A",
      "Has Custom Credentials": student.hasCustomCredentials ? "Yes" : "No",
    }));

    if (format === "excel") {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=students.xlsx"
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      return res.send(buffer);
    } else {
      // Return JSON for PDF generation on frontend
      return res.status(200).json({
        success: true,
        data,
      });
    }
  } catch (error) {
    console.error("Error downloading student list:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get student's own profile - only accessible by student themselves
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    // Only students can access this endpoint
    if (user?.role !== ROLES.Student) {
      return res.status(403).json({
        success: false,
        message: "Access denied. This endpoint is only for students.",
      });
    }

    const student = await Student.findOne({ user: user.id, isActive: true })
      .populate("user", "name email isVerified createdAt")
      .populate("school", "name city state board branchName")
      .populate("addedBy", "user");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get student generated password - accessible by superadmin, leadmentor, mentor, and schooladmin
export const getStudentPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Check if user has permission to access student passwords
    const allowedRoles = [
      ROLES.SuperAdmin,
      ROLES.LeadMentor,
      ROLES.Mentor,
      ROLES.SchoolAdmin,
    ];
    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    // Find the student
    const student = await Student.findById(id).populate("user", "name email");
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check if user has access to this student's school
    if (user.role === ROLES.LeadMentor) {
      const leadMentor = await LeadMentor.findOne({ user: user.id });
      if (!leadMentor) {
        return res.status(403).json({
          success: false,
          message: "Lead mentor profile not found",
        });
      }
      if (
        !leadMentor.hasAccessToAllSchools &&
        !leadMentor.assignedSchools.includes(student.school)
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Student not in your schools.",
        });
      }
    }

    // Return the generated password
    return res.status(200).json({
      success: true,
      data: {
        studentId: student.studentId,
        generatedPassword: student.generatedPassword,
        hasCustomCredentials: student.hasCustomCredentials,
      },
    });
  } catch (error) {
    console.error("Error fetching student password:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get students for grade promotion - accessible by leadmentor only
export const getStudentsForPromotion = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { schoolId, grade } = req.query;
    const user = req.user;

    // Check if user has permission to promote students
    if (user?.role !== ROLES.LeadMentor) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only lead mentors can promote students.",
      });
    }

    // Validate required parameters
    if (!schoolId || !grade) {
      return res.status(400).json({
        success: false,
        message: "School ID and grade are required",
      });
    }

    // Build query filter
    const filter: any = {
      isActive: true,
      school: schoolId,
      grade: grade,
      addedBy: user.leadMentorId,
    };

    const students = await Student.find(filter)
      .populate("user", "name email isVerified createdAt")
      .populate("school", "name city state board branchName")
      .sort({ "user.name": 1 });

    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("Error fetching students for promotion:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Promote students to next grade - accessible by leadmentor only
export const promoteStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { studentIds, schoolId, currentGrade } = req.body;
    const user = req.user;

    // Check if user has permission to promote students
    if (user?.role !== ROLES.LeadMentor) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only lead mentors can promote students.",
      });
    }

    // Validate required fields
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Student IDs are required",
      });
    }

    if (!schoolId || !currentGrade) {
      return res.status(400).json({
        success: false,
        message: "School ID and current grade are required",
      });
    }

    // Calculate next grade
    const gradeMap: { [key: string]: string } = {
      "Grade 1": "Grade 2",
      "Grade 2": "Grade 3",
      "Grade 3": "Grade 4",
      "Grade 4": "Grade 5",
      "Grade 5": "Grade 6",
      "Grade 6": "Grade 7",
      "Grade 7": "Grade 8",
      "Grade 8": "Grade 9",
      "Grade 9": "Grade 10",
      "Grade 10": "Grade 10", // Stay in Grade 10 if already at max
    };

    const nextGrade = gradeMap[currentGrade];
    if (!nextGrade) {
      return res.status(400).json({
        success: false,
        message: "Invalid current grade",
      });
    }

    // Check if students are already at the highest grade
    if (currentGrade === "Grade 10") {
      return res.status(400).json({
        success: false,
        message: "Students are already at the highest grade (Grade 10)",
      });
    }

    // Verify all students belong to the lead mentor and are in the specified school and grade
    const students = await Student.find({
      _id: { $in: studentIds },
      school: schoolId,
      grade: currentGrade,
      addedBy: user.leadMentorId,
      isActive: true,
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some students not found or access denied",
      });
    }

    // Update students to next grade
    const updateResult = await Student.updateMany(
      { _id: { $in: studentIds } },
      { $set: { grade: nextGrade } }
    );

    // Fetch updated students for response
    const updatedStudents = await Student.find({ _id: { $in: studentIds } })
      .populate("user", "name email")
      .populate("school", "name");

    return res.status(200).json({
      success: true,
      message: `Successfully promoted ${updateResult.modifiedCount} students from ${currentGrade} to ${nextGrade}`,
      data: {
        promotedCount: updateResult.modifiedCount,
        students: updatedStudents,
        fromGrade: currentGrade,
        toGrade: nextGrade,
      },
    });
  } catch (error) {
    console.error("Error promoting students:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
