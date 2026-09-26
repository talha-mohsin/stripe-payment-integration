import { Router } from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { normalizeProductInput, toProductDto } from "../utils/productInput.js";

const publicRouter = Router();
const adminRouter = Router();

publicRouter.get("/", async (req, res) => {
  try {
    const products = await Product.find({ active: true }).sort({ createdAt: -1 });
    return res.json({ products: products.map(toProductDto) });
  } catch (error) {
    console.error("List products failed:", error);
    return res.status(500).json({ message: "Unable to load products." });
  }
});

adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.json({ products: products.map(toProductDto) });
  } catch (error) {
    console.error("List admin products failed:", error);
    return res.status(500).json({ message: "Unable to load products." });
  }
});

adminRouter.post("/", async (req, res) => {
  try {
    const product = await Product.create(normalizeProductInput(req.body));
    return res.status(201).json({ product: toProductDto(product) });
  } catch (error) {
    if (error instanceof Error && !error.name.startsWith("Mongo")) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Create product failed:", error);
    return res.status(500).json({ message: "Unable to create product." });
  }
});

adminRouter.patch("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid product ID." });
  }

  try {
    const updates = normalizeProductInput(req.body, { partial: true });
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    return res.json({ product: toProductDto(product) });
  } catch (error) {
    if (error instanceof Error && !error.name.startsWith("Mongo")) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Update product failed:", error);
    return res.status(500).json({ message: "Unable to update product." });
  }
});

adminRouter.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid product ID." });
  }

  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { active: false } },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    return res.json({ success: true, product: toProductDto(product) });
  } catch (error) {
    console.error("Deactivate product failed:", error);
    return res.status(500).json({ message: "Unable to remove product." });
  }
});

export { publicRouter as publicProductsRouter, adminRouter as adminProductsRouter };
