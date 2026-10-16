import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/requireRole";
import { asyncHandler } from "../lib/asyncHandler";
import { getUserById } from "../controllers/user.controller";

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get("/:id", requireRole("support", "admin"), asyncHandler(getUserById));
