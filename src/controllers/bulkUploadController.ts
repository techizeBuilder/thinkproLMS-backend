import { Request, Response } from "express";
import multer from "multer";
import xlsx from "xlsx";
import { Question } from "../models/QuestionBank";
import { ROLES } from "../constants";

// Configure multer for file upload
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  },
});

interface BulkQuestionData {
  questionText: string;
  grade: string;
  subject: string;
  module: string;
  answerType: string;
  answerChoices: string[];
  correctAnswers: number[];
  difficulty: string;
  row: number;
}

// Parse Excel/CSV file and validate data
export const parseBulkQuestions = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const file = req.file;
    let workbook;
    let worksheet;

    // Parse file based on type
    if (file.mimetype === 'text/csv') {
      const csvData = file.buffer.toString('utf-8');
      workbook = xlsx.read(csvData, { type: 'string' });
    } else {
      workbook = xlsx.read(file.buffer, { type: 'buffer' });
    }

    const sheetName = workbook.SheetNames[0];
    worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length < 2) {
      return res.status(400).json({
        success: false,
        message: "File must contain at least a header row and one data row",
      });
    }

    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1) as any[][];

    // Required headers (must be present)
    const requiredHeaders = [
      'Question Text',
      'Grade',
      'Subject',
      'Module',
      'Answer Type',
      'Answer Choice 1',
      'Answer Choice 2',
      'Correct Answer(s)',
      'Difficulty'
    ];

    // Validate required headers
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required headers: ${missingHeaders.join(', ')}`,
      });
    }

    const parsedQuestions: BulkQuestionData[] = [];
    const errors: string[] = [];

    // Process each row
    dataRows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because we start from row 2 (after header)
      
      try {
        const questionText = row[headers.indexOf('Question Text')];
        const grade = row[headers.indexOf('Grade')];
        const subject = row[headers.indexOf('Subject')];
        const module = row[headers.indexOf('Module')];
        const answerType = row[headers.indexOf('Answer Type')];
        const difficulty = row[headers.indexOf('Difficulty')];
        const correctAnswersStr = row[headers.indexOf('Correct Answer(s)')];

        // Validate required fields
        if (!questionText || !grade || !subject || !module || !answerType || !difficulty || !correctAnswersStr) {
          errors.push(`Row ${rowNumber}: Missing required fields`);
          return;
        }

        // Validate grade
        const validGrades = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", 
                           "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];
        if (!validGrades.includes(grade)) {
          errors.push(`Row ${rowNumber}: Invalid grade. Must be one of: ${validGrades.join(', ')}`);
          return;
        }

        // Validate answer type
        const validAnswerTypes = ["radio", "checkbox", "dropdown", "multichoice"];
        if (!validAnswerTypes.includes(answerType)) {
          errors.push(`Row ${rowNumber}: Invalid answer type. Must be one of: ${validAnswerTypes.join(', ')}`);
          return;
        }

        // Validate difficulty
        const validDifficulties = ["Easy", "Medium", "Tough"];
        if (!validDifficulties.includes(difficulty)) {
          errors.push(`Row ${rowNumber}: Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`);
          return;
        }

        // Extract answer choices
        const answerChoices: string[] = [];
        for (let i = 1; i <= 15; i++) {
          const choiceIndex = headers.indexOf(`Answer Choice ${i}`);
          if (choiceIndex !== -1 && row[choiceIndex] && row[choiceIndex].toString().trim()) {
            answerChoices.push(row[choiceIndex].toString().trim());
          }
        }

        if (answerChoices.length < 2) {
          errors.push(`Row ${rowNumber}: Must have at least 2 answer choices`);
          return;
        }

        if (answerChoices.length > 15) {
          errors.push(`Row ${rowNumber}: Cannot have more than 15 answer choices`);
          return;
        }

        // Parse correct answers
        const correctAnswers: number[] = [];
        const correctAnswersParts = correctAnswersStr.toString().split(',').map((s: string) => s.trim());
        
        for (const part of correctAnswersParts) {
          const answerIndex = parseInt(part) - 1; // Convert to 0-based index
          if (isNaN(answerIndex) || answerIndex < 0 || answerIndex >= answerChoices.length) {
            errors.push(`Row ${rowNumber}: Invalid correct answer index: ${part}`);
            return;
          }
          correctAnswers.push(answerIndex);
        }

        if (correctAnswers.length === 0) {
          errors.push(`Row ${rowNumber}: Must specify at least one correct answer`);
          return;
        }

        parsedQuestions.push({
          questionText: questionText.toString().trim(),
          grade,
          subject: subject.toString().trim(),
          module: module.toString().trim(),
          answerType,
          answerChoices,
          correctAnswers,
          difficulty,
          row: rowNumber,
        });

      } catch (error) {
        errors.push(`Row ${rowNumber}: Error parsing data - ${error}`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation errors found",
        errors,
      });
    }

    res.json({
      success: true,
      data: {
        questions: parsedQuestions,
        total: parsedQuestions.length,
      },
      message: `Successfully parsed ${parsedQuestions.length} questions`,
    });

  } catch (error) {
    console.error("Error parsing bulk questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to parse file",
    });
  }
};

// Upload and save bulk questions
export const uploadBulkQuestions = async (req: Request, res: Response) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No questions provided",
      });
    }

    const savedQuestions = [];
    const errors = [];

    for (const questionData of questions) {
      try {
        // Get the highest order number for this grade/subject/module
        const lastQuestion = await Question.findOne({
          grade: questionData.grade,
          subject: questionData.subject,
          module: questionData.module,
        }).sort({ order: -1 });

        const newOrder = lastQuestion ? lastQuestion.order + 1 : 1;

        // Determine approval status based on user role
        const isAutoApproved = (req as any).user?.role === ROLES.SuperAdmin || (req as any).user?.role === ROLES.LeadMentor;
        
        const question = new Question({
          questionText: questionData.questionText,
          grade: questionData.grade,
          subject: questionData.subject,
          module: questionData.module,
          answerType: questionData.answerType,
          answerChoices: questionData.answerChoices.map((choice: string, index: number) => ({
            text: choice,
            isCorrect: questionData.correctAnswers.includes(index),
            order: index + 1,
          })),
          correctAnswers: questionData.correctAnswers,
          difficulty: questionData.difficulty,
          order: newOrder,
          createdBy: (req as any).user?.id,
          approvedBy: isAutoApproved ? (req as any).user?.id : null,
          approvedAt: isAutoApproved ? new Date() : null,
        });

        await question.save();
        savedQuestions.push(question);

      } catch (error) {
        errors.push({
          row: questionData.row,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    res.json({
      success: true,
      data: {
        saved: savedQuestions.length,
        errors: errors.length,
        questions: savedQuestions,
        errorDetails: errors,
      },
      message: `Successfully uploaded ${savedQuestions.length} questions${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
    });

  } catch (error) {
    console.error("Error uploading bulk questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload questions",
    });
  }
};
