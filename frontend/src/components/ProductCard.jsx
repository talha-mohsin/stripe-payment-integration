function formatMoney(amount, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function ProductCard({
  product,
  quantity,
  onQuantityChange,
  onCheckout,
  loading,
}) {
  const subtotal = product.unitAmount * quantity;

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <img
          className="product-image"
          src={product.img}
          alt={product.name}
          loading="lazy"
        />
        <span className="product-category">{product.category}</span>
      </div>

      <div className="product-content">
        <div className="product-heading">
          <h3>{product.name}</h3>
          <strong className="price">
            {formatMoney(product.unitAmount, product.currency)}
          </strong>
        </div>
        <p className="product-description">{product.description}</p>

        <div className="product-footer">
          <div className="quantity-control">
            <span className="quantity-label" id={`quantity-label-${product.id}`}>
              Quantity
            </span>
            <div className="quantity-stepper">
              <button
                type="button"
                aria-label={`Decrease ${product.name} quantity`}
                aria-describedby={`quantity-label-${product.id}`}
                disabled={quantity <= 1 || loading}
                onClick={() => onQuantityChange(product.id, quantity - 1)}
              >
                −
              </button>
              <output aria-live="polite">{quantity}</output>
              <button
                type="button"
                aria-label={`Increase ${product.name} quantity`}
                aria-describedby={`quantity-label-${product.id}`}
                disabled={quantity >= 10 || loading}
                onClick={() => onQuantityChange(product.id, quantity + 1)}
              >
                +
              </button>
            </div>
          </div>
          <div className="product-total">
            <span>Subtotal</span>
            <strong>{formatMoney(subtotal, product.currency)}</strong>
          </div>
        </div>

        <button
          type="button"
          className="primary-button"
          disabled={loading}
          onClick={() => onCheckout(product.id, quantity)}
        >
          {loading ? "Opening secure checkout…" : "Add to checkout"}
          {!loading && <span aria-hidden="true">↗</span>}
        </button>
      </div>
    </article>
  );
}
