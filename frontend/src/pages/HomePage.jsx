import { useState } from "react";
import ProductCard from "../components/ProductCard";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const PRODUCTS = [
  {
    id: "leather-jacket",
    name: "Leather Jacket",
    description: "A timeless layer with a clean silhouette and everyday comfort.",
    category: "Outerwear",
    img: "https://www.thejacketmaker.pk/cdn/shop/files/Men_s_Lavendard_Brown_Leather_Biker_Jacket-2_746fba86-1fbc-43f9-a9d5-1e400876d80d_2048x.jpg?v=1760635123",
    unitAmount: 4900,
    currency: "usd",
  },
  {
    id: "man-formal-dress",
    name: "Formal Dress For Man",
    description: "A refined occasion-ready look, tailored for memorable moments.",
    category: "Menswear",
    img: "https://www.shaadidukaan.com/vogue/wp-content/uploads/2026/01/Formal-Dress-for-Men-for-Wedding-Summer-2.webp",
    unitAmount: 2900,
    currency: "usd",
  },
  {
    id: "gold-watch",
    name: "Gold Watch For Man",
    description: "A polished gold-tone finish that brings a little extra to every day.",
    category: "Accessories",
    img: "https://www.pakstyle.pk/cdn/shop/files/rizen-oyster-perpetual-watch-18800_3.webp?v=1766569789",
    unitAmount: 7900,
    currency: "usd",
  },
];

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [loadingProductId, setLoadingProductId] = useState("");
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState("");

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
                quantity,
              },
            ],
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.checkoutUrl) {
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

      <div className="product-grid">
        {PRODUCTS.map((product) => (
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
