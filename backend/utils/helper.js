const PRODUCT_CATALOG = {
  "leather-jacket": {
    id: "leather-jacket",
    name: "Leather Jacket",
    img: "https://www.thejacketmaker.pk/cdn/shop/files/Men_s_Lavendard_Brown_Leather_Biker_Jacket-2_746fba86-1fbc-43f9-a9d5-1e400876d80d_2048x.jpg?v=1760635123",
    unitAmount: 4900,
    currency: "usd",
  },

  "man-formal-dress": {
    id: "man-formal-dress",
    name: "Formal Dress For Man",
    img: "https://www.shaadidukaan.com/vogue/wp-content/uploads/2026/01/Formal-Dress-for-Men-for-Wedding-Summer-2.webp",
    unitAmount: 2900,
    currency: "usd",
  },

  "gold-watch": {
    id: "gold-watch",
    name: "Gold Watch For Man",
    img: "https://www.pakstyle.pk/cdn/shop/files/rizen-oyster-perpetual-watch-18800_3.webp?v=1766569789",
    unitAmount: 7900,
    currency: "usd",
  },
};

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
