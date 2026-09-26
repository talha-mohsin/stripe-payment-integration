import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    unitAmount: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    currency: {
      type: String,
      required: true,
      lowercase: true,
      match: /^[a-z]{3}$/,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productSchema);

export default Product;
