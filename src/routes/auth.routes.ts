import { Router } from "express";
import { login, registerGuest } from "../controllers/authController";

const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/register-guest", registerGuest);

export default authRouter;
