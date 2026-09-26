import mongoose from "mongoose";
import Product from "../models/Product.js";

export async function normalizeCartItems(clientItems) {
  if (!Array.isArray(clientItems) || clientItems.length === 0) {
    throw new Error("At least one item is required");
  }

  const productIds = clientItems.map((item) => item?.productId);
  if (
    productIds.some(
      (productId) =>
        typeof productId !== "string" || !mongoose.isValidObjectId(productId),
    )
  ) {
    throw new Error("Invalid product");
  }

  const products = await Product.find({
    _id: { $in: productIds },
    active: true,
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  return clientItems.map((clientItem) => {
    const product = productMap.get(clientItem.productId);

    if (!product) {
      throw new Error("Product is unavailable");
    }

    const quantity = Number(clientItem.quantity);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new Error("Quantity must be between 1 and 10");
    }

    return {
      productId: product.id,
      name: product.name,
      quantity,
      unitAmount: product.unitAmount,
      currency: product.currency,
    };
  });
}
