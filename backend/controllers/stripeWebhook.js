import Stripe from "stripe";
import Order from "../models/orders.js";
import WebhookModel from "../models/WebhookEvent.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function stripeWebhookHandler(req, res) {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).send("Missing Stripe signature");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error.message);

    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
  try {
    const existingEvent = await WebhookModel.findOne({
      eventId: event.id,
    });

    if (existingEvent) {
      return res.json({
        received: true,
        duplicate: true,
      });
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        console.error("No orderId found in Stripe metadata");

        return res.status(400).json({
          message: "Missing orderId",
        });
      }

      if (!/^[a-f\d]{24}$/i.test(orderId)) {
        console.error("Invalid orderId in Stripe metadata:", orderId);

        return res.status(400).json({
          message: "Invalid orderId",
        });
      }

      const isPaid =
        event.type === "checkout.session.async_payment_succeeded" ||
        (event.type === "checkout.session.completed" &&
          session.payment_status === "paid");

      if (isPaid) {
        const order = await Order.findByIdAndUpdate(
          orderId,
          {
            $set: {
              status: "paid",
              paidAt: new Date(),
              stripeCheckoutSessionId: session.id,
              ...(session.payment_intent && {
                stripePaymentIntentId: session.payment_intent,
              }),
            },
          },
          { new: true },
        );

        if (!order) {
          console.error("Order not found:", orderId);

          return res.status(404).json({
            message: "Order not found",
          });
        }

        console.log(`Order ${order._id} marked as paid`);
      } else if (event.type === "checkout.session.async_payment_failed") {
        const order = await Order.findByIdAndUpdate(
          orderId,
          {
            $set: {
              status: "failed",
              stripeCheckoutSessionId: session.id,
            },
          },
          { new: true },
        );

        if (!order) {
          console.error("Order not found:", orderId);

          return res.status(404).json({
            message: "Order not found",
          });
        }
      }
    }

    await WebhookModel.create({
      eventId: event.id,
      eventType: event.type,
    });

    return res.json({
      received: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({
        received: true,
        duplicate: true,
      });
    }

    console.error("Webhook processing error:", error);

    return res.status(500).json({
      message: "Webhook processing failed",
    });
  }
}