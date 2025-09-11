import { Router } from "express";

// import { createAdmin } from "../controllers/userController";
import { authMiddleware } from "../middleware/auth";
// import { checkRole } from "../middleware/role";
// import { ROLES } from "../constants";

const userRouter = Router();

userRouter.use(authMiddleware);
// userRouter.post("/admin", checkRole(ROLES.SuperAdmin), createAdmin);
// Additional user-related routes can be added here

export default userRouter;
