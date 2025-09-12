import { Request, Response, Router } from "express";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import setupRouter from "./setup.routes";
import testRouter from "./test.routes";
import superadminRouter from "./superadmin.routes";

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

// Test
rootRouter.use("/test", testRouter);

export default rootRouter;
