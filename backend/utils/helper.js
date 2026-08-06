export function normalizeCartItems(clientItems) {
  if (!Array.isArray(clientItems) || clientItems.length === 0) {
    throw new Error("At least one item is required");
  }

  return clientItems.map((clientItem) => {
    const product = PRODUCT_CATALOG[clientItem.productId];

    if (!product) {
      throw new Error(`Invalid product: ${clientItem.productId}`);
    }

    const quantity = Number(clientItem.quantity);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new Error("Quantity must be between 1 and 10");
    }

    return {
      productId: clientItem.productId,
      name: product.name,
      quantity,
      unitAmount: product.unitAmount,
      currency: product.currency,
    };
  });
}
