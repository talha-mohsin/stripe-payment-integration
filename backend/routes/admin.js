import { Router } from "express";
import Order from "../models/orders.js";
import User from "../models/User.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/dashboard", async (req, res) => {
  try {
    const [
      revenueSummary,
      buyerUserIds,
      guestBuyerEmails,
      pendingOrders,
      registeredUsers,
      recentOrders,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$amountTotal" },
            sales: { $sum: 1 },
          },
        },
      ]),
      Order.distinct("userId", { status: "paid", userId: { $ne: null } }),
      Order.distinct("customerEmail", {
        status: "paid",
        userId: null,
        customerEmail: { $ne: null },
      }),
      Order.countDocuments({ status: "pending" }),
      User.countDocuments({ role: "user" }),
      Order.find()
        .select("_id customerEmail amountTotal currency status createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const summary = revenueSummary[0];

    return res.json({
      stats: {
        revenue: summary?.revenue ?? 0,
        sales: summary?.sales ?? 0,
        customers: buyerUserIds.length + guestBuyerEmails.length,
        registeredUsers,
        pendingOrders,
      },
      recentOrders,
    });
  } catch (error) {
    console.error("Load admin dashboard failed:", error);
    return res.status(500).json({ message: "Unable to load dashboard data." });
  }
});

router.get("/customers", async (req, res) => {
  try {
    const customers = await Order.aggregate([
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $ne: ["$userId", null] },
              { $concat: ["user:", { $toString: "$userId" }] },
              {
                $ifNull: [
                  { $concat: ["email:", "$customerEmail"] },
                  { $concat: ["guest:", { $toString: "$_id" }] },
                ],
              },
            ],
          },
          customerEmail: { $last: "$customerEmail" },
          orderCount: { $sum: 1 },
          sales: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
          },
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, "$amountTotal", 0],
            },
          },
          currency: { $last: "$currency" },
          lastOrderAt: { $max: "$createdAt" },
        },
      },
      { $sort: { lastOrderAt: -1 } },
      { $limit: 100 },
      {
        $project: {
          _id: 0,
          id: "$_id",
          email: "$customerEmail",
          orderCount: 1,
          sales: 1,
          totalPaid: 1,
          currency: 1,
          lastOrderAt: 1,
        },
      },
    ]);

    return res.json({ customers });
  } catch (error) {
    console.error("Load customer records failed:", error);
    return res.status(500).json({ message: "Unable to load customer records." });
  }
});

export default router;
