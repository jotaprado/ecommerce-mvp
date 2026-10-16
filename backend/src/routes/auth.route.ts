import { Router } from "express";
import { login, register } from "../controllers/auth.controller";
import { loginLimiter } from "../middleware/rateLimit";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", loginLimiter, login);
