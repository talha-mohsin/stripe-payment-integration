import express from "express";
import Stripe from "stripe";
import cors from "cors";
import mongoose from "mongoose";
import "dotenv/config";
import Order from "./models/orders";
import WebhookModel from "./models/WebhookEvent";
import { normalizeCartItems } from "./utils/helper";

const app = express();

const PRODUCT_CATALOG = {
  "node-course": {
    name: "Node.js Backend Masterclass",
    unitAmount: 4900,
    currency: "usd",
  },

  "react-course": {
    name: "React Fundamentals",
    unitAmount: 2900,
    currency: "usd",
  },

  "mern-course": {
    name: "Complete MERN Stack Program",
    unitAmount: 7900,
    currency: "usd",
  },
};

// Stripe webhook route comes first
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


app.post(
  "/api/payments/create-checkout-session",
  async (req, res) => {
    try {
      const { items, customerEmail } = req.body;

      const normalizedItems = normalizeCartItems(items);

      const amountTotal = normalizedItems.reduce(
        (total, item) =>
          total + item.unitAmount * item.quantity,
        0
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

      const session =
        await stripe.checkout.sessions.create({
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

          success_url:
            `${process.env.CLIENT_URL}` +
            `/payment/success?session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${process.env.CLIENT_URL}/checkout?cancelled=true`,

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
      console.error(
        "Create checkout session error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Unable to create checkout session",
      });
    }
  }
);


const PORT = process.env.PORT || 5000;
