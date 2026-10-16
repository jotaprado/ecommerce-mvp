import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { trackingLimiter } from "../middleware/rateLimit";
import { getTracking } from "../controllers/tracking.controller";

export const trackingRouter = Router();

// Público: sin authMiddleware, con límite de 30 consultas por minuto por IP.
trackingRouter.get("/:trackingId", trackingLimiter, asyncHandler(getTracking));
