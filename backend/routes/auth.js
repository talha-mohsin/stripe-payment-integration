import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_MS,
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Try again later." },
});

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function issueSession(user, res) {
  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: user._id.toString(),
    expiresIn: "7d",
    issuer: "goodform-api",
    audience: "goodform-web",
    algorithm: "HS256",
  });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
}

function validatePassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    Buffer.byteLength(password, "utf8") <= 72
  );
}

router.post("/register", loginLimiter, async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const { password } = req.body;

    if (!name || name.length > 80) {
      return res.status(400).json({ message: "Name is required (up to 80 characters)." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and no more than 72 bytes.",
      });
    }

    const user = await User.create({ name, email, password });
    issueSession(user, res);
    return res.status(201).json({ user: serializeUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    console.error("Registration failed:", error.message);
    return res.status(500).json({ message: "Unable to create your account." });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  const email =
    typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const { password } = req.body;

  if (!email || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password are required." });
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    return res.status(401).json({ message: "Email or password is incorrect." });
  }

  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }

    issueSession(user, res);
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error("Sign-in failed:", error.message);
    return res.status(500).json({ message: "Unable to sign in." });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE, {
    ...sessionCookieOptions,
    maxAge: undefined,
  });
  return res.json({ success: true });
});

router.get("/me", authenticate, (req, res) => {
  return res.json({ user: serializeUser(req.user) });
});

export default router;
