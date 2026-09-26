import "dotenv/config";
import express from "express";
import Stripe from "stripe";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import Order from "./models/orders.js";
import Product from "./models/Product.js";
import { DEFAULT_PRODUCTS } from "./data/defaultProducts.js";
import { normalizeCartItems } from "./utils/helper.js";
import { stripeWebhookHandler } from "./controllers/stripeWebhook.js";
import authRouter from "./routes/auth.js";
import { publicProductsRouter, adminProductsRouter } from "./routes/products.js";
import adminRouter from "./routes/admin.js";
import { authenticateOptional } from "./middleware/auth.js";
import { issueCsrfToken, requireCsrf } from "./middleware/csrf.js";

const clientUrl = process.env.CLIENT_URL;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const jwtSecret = process.env.JWT_SECRET;

if (!clientUrl) {
  throw new Error("CLIENT_URL must be set to the frontend origin");
}

if (!webhookSecret) {
  throw new Error(
    "STRIPE_WEBHOOK_SECRET must be set to the signing secret from `stripe listen`",
  );
}

if (!jwtSecret || Buffer.byteLength(jwtSecret, "utf8") < 32) {
  throw new Error("JWT_SECRET must be set to a random secret of at least 32 bytes");
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

const allowedOrigins = new Set([
  clientOrigin,
  ...(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        throw new Error(`Invalid origin in CORS_ORIGINS: ${origin}`);
      }
    }),
]);

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    strictTransportSecurity: process.env.NODE_ENV === "production",
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Stripe webhook route comes first
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.get("/api/auth/csrf", issueCsrfToken);
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return requireCsrf(req, res, next);
  }
  return next();
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
app.use("/api/auth", authRouter);
app.use("/api/products", publicProductsRouter);
app.use("/api/admin/products", adminProductsRouter);
app.use("/api/admin", adminRouter);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

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

app.post(
  "/api/payments/create-checkout-session",
  authenticateOptional,
  async (req, res) => {
    try {
      const { items, customerEmail } = req.body;

      if (
        customerEmail !== undefined &&
        (typeof customerEmail !== "string" ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
          customerEmail.length > 254)
      ) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid receipt email address.",
        });
      }

      const normalizedItems = await normalizeCartItems(items);
      const currency = normalizedItems[0].currency;
      if (normalizedItems.some((item) => item.currency !== currency)) {
        return res.status(400).json({
          success: false,
          message: "All items in a checkout must use the same currency.",
        });
      }

      const amountTotal = normalizedItems.reduce(
        (total, item) => total + item.unitAmount * item.quantity,
        0,
      );

      const order = await Order.create({
        userId: req.user?._id || null,
        customerEmail: customerEmail || req.user?.email || null,

        items: normalizedItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitAmount: item.unitAmount,
        })),

        amountTotal,
        currency,
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

        customer_email: customerEmail || req.user?.email || undefined,

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
  },
);

const PORT = process.env.PORT || 5000;

async function startServer() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be configured");
  }

  await mongoose.connect(process.env.MONGO_URI);
  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany(DEFAULT_PRODUCTS);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Backend startup failed:", error);
  process.exitCode = 1;
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.message === "Origin is not allowed by CORS") {
    return res.status(403).json({ message: error.message });
  }

  console.error("Unhandled request error:", error);
  return res.status(500).json({ message: "An unexpected server error occurred." });
});
