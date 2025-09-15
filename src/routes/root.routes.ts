import { Request, Response, Router } from "express";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import setupRouter from "./setup.routes";
import testRouter from "./test.routes";
import superadminRouter from "./superadmin.routes";
import schoolRouter from "./school.routes";
import schoolAdminRouter from "./schoolAdmin.routes";
import leadMentorRouter from "./leadMentor.routes";
import mentorRouter from "./mentor.routes";
import studentRouter from "./student.routes";
import questionBankRouter from "./questionBank.routes";

const rootRouter = Router();

rootRouter.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello, TypeScript with Express!!!" });
});

// Auth & Setup
rootRouter.use("/auth", authRouter);
rootRouter.use("/setup", setupRouter);

// Users
rootRouter.use("/users", userRouter);

// Role wise
rootRouter.use("/superadmins", superadminRouter);

// School management
rootRouter.use("/schools", schoolRouter);
rootRouter.use("/school-admins", schoolAdminRouter);
rootRouter.use("/lead-mentors", leadMentorRouter);

// User management by Lead Mentors
rootRouter.use("/mentors", mentorRouter);
rootRouter.use("/students", studentRouter);

// Question Bank
rootRouter.use("/question-bank", questionBankRouter);

// Test
rootRouter.use("/test", testRouter);

export default rootRouter;
