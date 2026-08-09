import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [email, setEmail] = useState("");
  const [loadingProductId, setLoadingProductId] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(`${API_URL}/api/products`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load products");
        }

        setProducts(data.products);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadProducts();
  }, []);

  async function startCheckout(productId) {
    try {
      setError("");
      setLoadingProductId(productId);

      const response = await fetch(
        `${API_URL}/api/payments/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerEmail: email.trim() || undefined,
            items: [
              {
                productId,
                quantity: 5,
              },
            ],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to start checkout");
      }

      window.location.assign(data.checkoutUrl);
    } catch (requestError) {
      setError(requestError.message);
      setLoadingProductId("");
    }
  }

  return (
    <section className="page-container">
      <div className="hero">
        <p className="eyebrow">MERN Stack Practical</p>
        <h1>Complete Stripe Checkout Demo</h1>
        <p>
          Product prices come from the backend. Stripe securely collects the
          payment, and a verified webhook updates MongoDB.
        </p>
      </div>

      <label className="email-field">
        <span>Email for Stripe receipt (optional)</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="student@example.com"
        />
      </label>

      {error && <div className="error-box">{error}</div>}

      {loadingProducts ? (
        <p>Loading products...</p>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onCheckout={startCheckout}
              loading={loadingProductId === product.id}
            />
          ))}
        </div>
      )}

      <aside className="test-card-box">
        <h3>Stripe test card</h3>
        <code>4242 4242 4242 4242</code>
        <p>Use any future expiry date and any three-digit CVC.</p>
      </aside>
    </section>
  );
}
