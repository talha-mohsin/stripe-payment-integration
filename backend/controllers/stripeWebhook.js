import Stripe from "stripe";
import Order from "../models/orders.js";
import WebhookModel from "../models/WebhookEvent.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function stripeWebhookHandler(req, res) {
  const signature = req.headers["stripe-signature"];

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
    // Prevent duplicate webhook processing
    const existingEvent = await WebhookModel.findOne({
      eventId: event.id,
    });

    if (existingEvent) {
      return res.json({
        received: true,
        duplicate: true,
      });
    }

    await WebhookModel.create({
      eventId: event.id,
      eventType: event.type,
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const orderId = session.metadata?.orderId;

      if (!orderId) {
        console.error("No orderId found in Stripe metadata");

        return res.status(400).json({
          message: "Missing orderId",
        });
      }

      const order = await Order.findById(orderId);

      if (!order) {
        console.error("Order not found:", orderId);

        return res.status(404).json({
          message: "Order not found",
        });
      }

      order.status = "paid";
      order.paidAt = new Date();
      order.stripeCheckoutSessionId = session.id;

      if (session.payment_intent) {
        order.stripePaymentIntentId = session.payment_intent;
      }

      await order.save();

      console.log(`Order ${order._id} marked as paid`);
    }

    return res.json({
      received: true,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);

    return res.status(500).json({
      message: "Webhook processing failed",
    });
  }
}