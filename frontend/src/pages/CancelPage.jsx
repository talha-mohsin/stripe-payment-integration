import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api";

export default function CancelPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [message, setMessage] = useState("Your Stripe Checkout was cancelled.");

  useEffect(() => {
    if (!orderId) return;

    async function cancelPendingOrder() {
      try {
        await apiRequest(`/api/orders/${encodeURIComponent(orderId)}/cancel`, { method: "POST" });
        setMessage("Checkout was cancelled and the pending order was closed.");
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
