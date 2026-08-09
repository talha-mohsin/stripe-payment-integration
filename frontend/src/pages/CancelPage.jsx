import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CancelPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [message, setMessage] = useState("Your Stripe Checkout was cancelled.");

  useEffect(() => {
    if (!orderId) return;

    async function cancelPendingOrder() {
      try {
        const response = await fetch(
          `${API_URL}/api/orders/${encodeURIComponent(orderId)}/cancel`,
          { method: "POST" }
        );

        if (response.ok) {
          setMessage("Checkout was cancelled and the pending order was closed.");
        }
      } catch {
        // The page can still display cancellation even if this convenience call fails.
      }
    }

    cancelPendingOrder();
  }, [orderId]);

  return (
    <section className="status-page page-container">
      <div className="status-card">
        <p className="eyebrow">Checkout Cancelled</p>
        <h1>No payment was confirmed</h1>
        <p>{message}</p>
        <Link className="secondary-button" to="/">
          Try again
        </Link>
      </div>
    </section>
  );
}
