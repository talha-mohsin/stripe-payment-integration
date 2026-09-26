import { randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_COOKIE = "csrfToken";

const cookieOptions = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};

export function issueCsrfToken(req, res) {
  const existingToken = req.cookies?.[TOKEN_COOKIE];
  const token =
    typeof existingToken === "string" && /^[a-f\d]{64}$/i.test(existingToken)
      ? existingToken
      : randomBytes(32).toString("hex");

  if (token !== existingToken) {
    res.cookie(TOKEN_COOKIE, token, cookieOptions);
  }
  return res.json({ csrfToken: token });
}

export function requireCsrf(req, res, next) {
  const cookieToken = req.cookies?.[TOKEN_COOKIE];
  const headerToken = req.get("x-csrf-token");

  if (
    typeof cookieToken !== "string" ||
    typeof headerToken !== "string" ||
    cookieToken.length !== headerToken.length ||
    !timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    return res.status(403).json({ message: "CSRF validation failed. Refresh and try again." });
  }

  return next();
}
