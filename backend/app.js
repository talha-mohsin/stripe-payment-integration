import "dotenv/config";
import express from "express";
import Stripe from "stripe";
import cors from "cors";
import mongoose from "mongoose";
import Order from "./models/orders.js";
import WebhookModel from "./models/WebhookEvent.js";
import { normalizeCartItems } from "./utils/helper.js";
import { stripeWebhookHandler } from "./controllers/stripeWebhook.js";

const clientUrl = process.env.CLIENT_URL;

if (!clientUrl) {
  throw new Error("CLIENT_URL must be set to the frontend origin");
}

let clientOrigin;

try {
  const parsedClientUrl = new URL(clientUrl);

  if (!["http:", "https:"].includes(parsedClientUrl.protocol)) {
    throw new Error("CLIENT_URL must use http or https");
  }

  clientOrigin = parsedClientUrl.origin;
} catch (error) {
  throw new Error(`Invalid CLIENT_URL: ${error.message}`);
}

const app = express();

app.use(cors());

// Stripe webhook route comes first
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((error) => console.error("MongoDB connection error:", error));

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.get("/api/orders/session/:sessionId", async (req, res) => {
  try {
    const order = await Order.findOne({
      stripeCheckoutSessionId: req.params.sessionId,
    }).select("_id amountTotal currency status");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No order was found for this Checkout Session.",
      });
    }

    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order by checkout session error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve order status.",
    });
  }
});

app.post("/api/payments/create-checkout-session", async (req, res) => {
  try {
    const { items, customerEmail } = req.body;

    const normalizedItems = normalizeCartItems(items);

    const amountTotal = normalizedItems.reduce(
      (total, item) => total + item.unitAmount * item.quantity,
      0,
    );

    const order = await Order.create({
      customerEmail: customerEmail || null,

      items: normalizedItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitAmount: item.unitAmount,
      })),

      amountTotal,
      currency: "usd",
      status: "pending",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: normalizedItems.map((item) => ({
        price_data: {
          currency: item.currency,

          product_data: {
            name: item.name,
          },

          unit_amount: item.unitAmount,
        },

        quantity: item.quantity,
      })),

      customer_email: customerEmail || undefined,

      success_url: `${clientOrigin}/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${clientOrigin}/cancel`,

      metadata: {
        orderId: order._id.toString(),
      },

      payment_intent_data: {
        metadata: {
          orderId: order._id.toString(),
        },
      },
    });

    order.stripeCheckoutSessionId = session.id;
    await order.save();

    return res.status(201).json({
      success: true,
      checkoutUrl: session.url,
      orderId: order._id,
    });
  } catch (error) {
    console.error("Create checkout session error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to create checkout session",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
