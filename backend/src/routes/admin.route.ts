import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/requireRole";
import { getSummary } from "../controllers/admin.controller";
import {
  createUser,
  listUsers,
  resetPassword,
  updateUser,
} from "../controllers/adminUser.controller";

export const adminRouter = Router();

adminRouter.use(authMiddleware);

adminRouter.get("/summary", requireRole("admin"), getSummary);

adminRouter.get("/users", requireRole("admin"), listUsers);
adminRouter.post("/users", requireRole("admin"), createUser);
adminRouter.patch("/users/:id", requireRole("admin"), updateUser);
adminRouter.post("/users/:id/reset-password", requireRole("admin"), resetPassword);
