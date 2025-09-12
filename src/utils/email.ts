import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: Number(process.env.SMTP_PORT || 587),
//   secure: false,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendSetupEmail({
  to,
  name,
  token,
  role = "Administrator",
}: {
  to: string;
  name: string;
  token: string;
  role?: string;
}) {
  const link = `${process.env.APP_BASE_URL}/setup/${token}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .content { background-color: white; padding: 20px; border-radius: 5px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background-color: #0066ff; 
          color: #ffffff !important; 
          text-decoration: none; 
          border-radius: 5px; 
          margin-top: 15px;
          font-weight: bold;
          font-size: 16px;
          border: 2px solid #0052cc;
        }
        .button:hover {
          background-color: #0052cc;
        }
        .footer { margin-top: 20px; font-size: 12px; color: #666666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0; color: #0066ff;">LMS ${role} Invitation</h2>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>You have been invited to join the Learning Management System as a ${role}. We're excited to have you on board!</p>
          <p>To get started, please set up your password and activate your account by clicking the button below:</p>
          <a href="${link}" style="color: #ffffff; text-decoration: none;">
            <div class="button">Set Up Account</div>
          </a>
          <p style="margin-top: 20px; font-size: 13px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="font-size: 13px; color: #666666;">${link}</p>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>If you did not expect this invitation, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject: `LMS — ${role} Invitation`,
    html,
  });
}
