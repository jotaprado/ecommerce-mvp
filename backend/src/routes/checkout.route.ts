import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getCheckoutConfig } from "../controllers/checkout.controller";

export const checkoutRouter = Router();

checkoutRouter.use(authMiddleware);

checkoutRouter.get("/config", getCheckoutConfig);
