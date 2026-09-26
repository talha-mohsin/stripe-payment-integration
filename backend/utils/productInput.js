export function normalizeProductInput(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Product data must be an object");
  }

  const product = {};
  const fields = ["name", "description", "category", "imageUrl", "unitAmount", "currency", "active"];

  for (const field of fields) {
    if (partial && !Object.hasOwn(input, field)) continue;

    const value = input[field];

    if (field === "name" || field === "description" || field === "category") {
      if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${field} is required`);
      }
      product[field] = value.trim();
    } else if (field === "imageUrl") {
      if (typeof value !== "string" || value.length > 2048) {
        throw new Error("A valid image URL is required");
      }

      let imageUrl;
      try {
        imageUrl = new URL(value);
      } catch {
        throw new Error("A valid image URL is required");
      }

      if (!["http:", "https:"].includes(imageUrl.protocol)) {
        throw new Error("Image URL must use http or https");
      }

      product.imageUrl = imageUrl.toString();
    } else if (field === "unitAmount") {
      if (!Number.isSafeInteger(value) || value < 1 || value > 100_000_000) {
        throw new Error("Price must be a positive amount in minor currency units");
      }
      product.unitAmount = value;
    } else if (field === "currency") {
      if (typeof value !== "string" || !/^[a-z]{3}$/i.test(value)) {
        throw new Error("Currency must be a three-letter code");
      }
      product.currency = value.toLowerCase();
      if (product.currency !== "usd") {
        throw new Error("Products currently support USD only.");
      }
    } else if (field === "active") {
      if (typeof value !== "boolean") {
        throw new Error("Active must be true or false");
      }
      product.active = value;
    }
  }

  if (!partial && fields.some((field) => !Object.hasOwn(product, field))) {
    throw new Error("All product fields are required");
  }

  if (partial && Object.keys(product).length === 0) {
    throw new Error("At least one product field is required");
  }

  return product;
}

export function toProductDto(product) {
  return {
    id: product._id.toString(),
    name: product.name,
    description: product.description,
    category: product.category,
    imageUrl: product.imageUrl,
    unitAmount: product.unitAmount,
    currency: product.currency,
    ...(product.active !== undefined && { active: product.active }),
  };
}
