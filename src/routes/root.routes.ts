import { Request, Response, Router } from "express";
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import setupRouter from "./setup.routes";
import adminRouter from "./admin.routes";

const rootRouter = Router();

rootRouter.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello, TypeScript with Express!!!" });
});
rootRouter.use("/auth", authRouter);
rootRouter.use("/users", userRouter);
rootRouter.use("/setup", setupRouter);
rootRouter.use("/admins", adminRouter);

export default rootRouter;
