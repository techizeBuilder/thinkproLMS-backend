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
}: {
  to: string;
  name: string;
  token: string;
}) {
  const link = `${process.env.APP_BASE_URL}/setup/${token}`;
  const html = `
    <p>Hi ${name},</p>
    <p>You were invited to join the LMS as an Admin.</p>
    <p>Please click the link below to set your password and activate your account:</p>
    <p><a href="${link}">${link}</a></p>
  `;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject: "LMS — Admin Invitation",
    html,
  });
}
