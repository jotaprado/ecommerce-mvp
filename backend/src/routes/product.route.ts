import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/requireRole";
import { asyncHandler } from "../lib/asyncHandler";
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct,
} from "../controllers/product.controller";

export const productRouter = Router();

productRouter.get("/", asyncHandler(listProducts));
productRouter.get("/:id", asyncHandler(getProductById));
productRouter.post("/", authMiddleware, requireRole("admin"), asyncHandler(createProduct));
productRouter.put("/:id", authMiddleware, requireRole("admin"), asyncHandler(updateProduct));
productRouter.delete("/:id", authMiddleware, requireRole("admin"), asyncHandler(deleteProduct));
