import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import { apiRequest } from "../api";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [loadingProductId, setLoadingProductId] = useState("");
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  async function loadProducts() {
    setProductsLoading(true);
    setProductsError("");
    try {
      const data = await apiRequest("/api/products");
      setProducts((data.products || []).map((product) => ({
        ...product,
        id: product.id || product._id,
        img: product.imageUrl || product.img,
      })));
    } catch (requestError) {
      setProductsError(requestError.message);
    } finally {
      setProductsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function changeQuantity(productId, quantity) {
    setQuantities((currentQuantities) => ({
      ...currentQuantities,
      [productId]: Math.min(10, Math.max(1, quantity)),
    }));
  }

  async function startCheckout(productId, quantity) {
    try {
      setError("");
      setLoadingProductId(productId);

      const data = await apiRequest("/api/payments/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({
          customerEmail: email.trim() || undefined,
          items: [{ productId, quantity }],
        }),
      });
      if (!data.checkoutUrl) throw new Error(data.message || "Unable to start checkout");

      window.location.assign(data.checkoutUrl);
    } catch (requestError) {
      setError(requestError.message);
      setLoadingProductId("");
    }
  }

  return (
    <section className="page-container">
      <div className="hero">
        <p className="eyebrow">The everyday edit</p>
        <h1>Good things, <span>well chosen.</span></h1>
        <p>
          Discover a few considered essentials, choose what you need, and check
          out securely in just a moment.
        </p>
      </div>

      <div className="store-toolbar">
        <div>
          <p className="eyebrow">Curated for you</p>
          <h2>Shop the collection</h2>
        </div>
        <label className="email-field">
          <span>Receipt email <span className="optional-label">Optional</span></span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
      </div>

      {error && <div className="error-box" role="alert">{error}</div>}
      {productsError && (
        <div className="error-box" role="alert">
          Unable to load products: {productsError}{" "}
          <button className="inline-retry" type="button" onClick={loadProducts}>Try again</button>
        </div>
      )}

      <div className="product-grid">
        {productsLoading ? (
          <p className="store-message" aria-live="polite">Loading products…</p>
        ) : productsError ? null : products.length === 0 ? (
          <p className="store-message">There are no products available right now.</p>
        ) : products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            quantity={quantities[product.id] || 1}
            onQuantityChange={changeQuantity}
            onCheckout={startCheckout}
            loading={loadingProductId === product.id}
          />
        ))}
      </div>

      <aside className="test-card-box">
        <div className="payment-mark" aria-hidden="true">✓</div>
        <div>
          <h3>Secure checkout, powered by Stripe</h3>
          <p>Your payment details are encrypted and handled securely.</p>
        </div>
        <div className="test-card-details">
          <span>Demo card</span>
          <code>4242&nbsp; 4242&nbsp; 4242&nbsp; 4242</code>
          <span>Any future expiry · Any 3-digit CVC</span>
        </div>
      </aside>
    </section>
  );
}
