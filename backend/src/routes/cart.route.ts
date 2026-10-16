import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../lib/asyncHandler";
import { addItem, getCart, mergeCart, removeItem, updateQuantity } from "../controllers/cart.controller";

export const cartRouter = Router();

cartRouter.use(authMiddleware);

cartRouter.get("/", asyncHandler(getCart));
cartRouter.post("/items", asyncHandler(addItem));
cartRouter.patch("/items/:id", asyncHandler(updateQuantity));
cartRouter.delete("/items/:id", asyncHandler(removeItem));
cartRouter.post("/merge", asyncHandler(mergeCart));
