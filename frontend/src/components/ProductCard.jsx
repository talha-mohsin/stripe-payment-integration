function formatMoney(amount, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function ProductCard({ product, onCheckout, loading }) {
  return (
    <article className="product-card">
      <div>
        <p className="eyebrow">Online Course</p>
        <h2>{product.name}</h2>
        <p className="product-description">{product.description}</p>
      </div>

      <div className="product-footer">
        <strong className="price">
          {formatMoney(product.unitAmount, product.currency)}
        </strong>

        <button
          type="button"
          className="primary-button"
          disabled={loading}
          onClick={() => onCheckout(product.id)}
        >
          {loading ? "Redirecting..." : "Buy with Stripe"}
        </button>
      </div>
    </article>
  );
}
