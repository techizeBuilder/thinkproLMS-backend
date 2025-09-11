import express from "express";
import nodemailer from "nodemailer";
import { sendSetupEmail } from "../utils/email";

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

export default router;
