import express from "express";
import nodemailer from "nodemailer";
import { sendSetupEmail } from "../utils/email";
import School from "../models/School";
import User from "../models/User";
import SchoolAdmin from "../models/SchoolAdmin";
import LeadMentor from "../models/LeadMentor";
import { 
  uploadVideo, 
  uploadImage, 
  uploadDocument, 
  directUpload,
  uploadMultiple
} from '../controllers/fileUploadController';
import { 
  videoUpload, 
  imageUpload, 
  documentUpload,
  generalUpload
} from '../config/s3Storage';

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

router.get("/", (req, res) => {
  res.json({ message: "Test route is working!" });
});

router.post("/send-email", async (req, res) => {
  const { to, subject, text } = req.body;

  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject,
      text,
    };

    await sendSetupEmail({
      to,
      name: "Utkarsh",
      token: "setupToken123",
    });

    // await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Email sent successfully" });
  } catch (err: any) {
    console.error("Error sending email:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test route to verify models are working
router.get("/models", async (req, res) => {
  try {
    const schoolCount = await School.countDocuments();
    const userCount = await User.countDocuments();
    const schoolAdminCount = await SchoolAdmin.countDocuments();
    const leadMentorCount = await LeadMentor.countDocuments();

    res.json({
      success: true,
      message: "All models are working correctly",
      counts: {
        schools: schoolCount,
        users: userCount,
        schoolAdmins: schoolAdminCount,
        leadMentors: leadMentorCount,
      },
    });
  } catch (error: any) {
    console.error("Error testing models:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test route to verify multiple school admins per school works
router.get("/test-multiple-admins", async (req, res) => {
  try {
    // Find all schools with multiple admins
    const schoolsWithMultipleAdmins = await SchoolAdmin.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$school", adminCount: { $sum: 1 } } },
      { $match: { adminCount: { $gt: 1 } } },
      { $lookup: { from: "schools", localField: "_id", foreignField: "_id", as: "school" } },
      { $unwind: "$school" },
      { $project: { schoolName: "$school.name", adminCount: 1 } }
    ]);

    res.json({
      success: true,
      message: "Multiple school admins per school test",
      data: {
        schoolsWithMultipleAdmins,
        note: "This demonstrates that multiple users can be admins of the same school"
      }
    });
  } catch (error: any) {
    console.error("Error testing multiple admins:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// File upload test routes
router.post("/upload/video", videoUpload.single('video'), uploadVideo);
router.post("/upload/image", imageUpload.single('image'), uploadImage);
router.post("/upload/document", documentUpload.single('document'), uploadDocument);
router.post("/upload/multiple", generalUpload.array('files', 10), uploadMultiple);
router.post("/upload/direct", directUpload);

export default router;
