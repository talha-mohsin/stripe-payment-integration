import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2000;

function formatMoney(amount, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState("Confirming payment with the backend...");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("The Checkout Session ID is missing from the URL.");
      return undefined;
    }

    let cancelled = false;
    let timeoutId;

    async function checkOrder(attempt = 1) {
      try {
        const response = await fetch(
          `${API_URL}/api/orders/session/${encodeURIComponent(sessionId)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to retrieve order");
        }

        if (cancelled) return;

        setOrder(data.order);

        if (data.order.status === "paid") {
          setMessage("Payment confirmed by the verified Stripe webhook.");
          return;
        }

        if (["failed", "cancelled"].includes(data.order.status)) {
          setMessage(`Order status: ${data.order.status}`);
          return;
        }

        if (attempt < MAX_ATTEMPTS) {
          setMessage(
            `Stripe is processing the payment. Checking again (${attempt}/${MAX_ATTEMPTS})...`
          );
          timeoutId = window.setTimeout(
            () => checkOrder(attempt + 1),
            POLL_INTERVAL_MS
          );
        } else {
          setMessage(
            "The payment page completed, but the webhook confirmation is still pending. Refresh this page shortly."
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
        }
      }
    }

    checkOrder();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [sessionId]);

  return (
    <section className="status-page page-container">
      <div className="status-card">
        <p className="eyebrow">Stripe Checkout Return Page</p>
        <h1>{order?.status === "paid" ? "Payment successful" : "Payment received"}</h1>

        {error ? <div className="error-box">{error}</div> : <p>{message}</p>}

        {order && (
          <div className="order-summary">
            <div>
              <span>Order status</span>
              <strong>{order.status}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatMoney(order.amountTotal, order.currency)}</strong>
            </div>
            <div>
              <span>Order ID</span>
              <strong className="break-text">{order._id}</strong>
            </div>
          </div>
        )}

        <Link className="secondary-button" to="/">
          Return to courses
        </Link>
      </div>
    </section>
  );
}
