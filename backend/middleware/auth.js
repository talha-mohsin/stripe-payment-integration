import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.session;
    if (!token) {
      return res.status(401).json({ message: "Please sign in to continue." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "goodform-api",
      audience: "goodform-web",
    });
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      return res.status(401).json({ message: "Invalid or expired session." });
    }

    const user = await User.findById(payload.sub).select("_id name email role");
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired session." });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Invalid or expired session." });
    }
    return next(error);
  }
}

export async function authenticateOptional(req, res, next) {
  if (!req.cookies?.session) return next();

  try {
    const payload = jwt.verify(req.cookies.session, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "goodform-api",
      audience: "goodform-web",
    });
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      return next();
    }

    req.user = await User.findById(payload.sub).select("_id name email role");
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return next();
    }
    return next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Administrator access is required." });
  }
  return next();
}
