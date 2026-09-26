# Goodform Stripe Store

A React storefront and Express/MongoDB API with Stripe Checkout, JWT-backed
authentication, role-protected product management, and sales reporting.

## Local setup

1. Install backend dependencies with `cd backend && npm install`.
2. Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI`,
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and a random `JWT_SECRET` of at
   least 32 bytes. For local webhook testing, run
   `stripe listen --forward-to localhost:5000/api/stripe/webhook` and use the
   signing secret printed by Stripe CLI.
3. Start the API with `cd backend && npm run start:dev`.
4. Create the first admin from an interactive terminal with
   `cd backend && npm run bootstrap-admin`. The command prompts for an email and
   a hidden password of at least 8 characters. It refuses to run if an admin
   already exists.
5. Copy `frontend/.env.example` to `frontend/.env`, then start the UI with
   `cd frontend && npm install && npm run dev`.

The first API start seeds the database with the demo products only if the
products collection is empty. Product prices are stored in minor units (for
example, `4900` means USD 49.00). The current dashboard aggregates sales in USD.

## Production configuration

Configure secrets in the hosting provider, not in source control:

- `MONGO_URI`: production MongoDB connection string with a least-privilege DB
  user and network access restricted to the API host.
- `STRIPE_SECRET_KEY`: the live-mode Stripe secret key.
- `STRIPE_WEBHOOK_SECRET`: the live webhook endpoint signing secret.
- `JWT_SECRET`: a cryptographically random secret with at least 32 bytes.
- `CLIENT_URL`: canonical frontend origin (scheme and host only).
- `CORS_ORIGINS`: optional comma-separated additional trusted frontend origins.
- `NODE_ENV=production`: enables secure cookies, proxy handling, and HSTS.
- Frontend `VITE_API_URL`: public HTTPS origin of the API.

Add the production webhook endpoint in Stripe for
`/api/stripe/webhook`, subscribe to `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, and
`checkout.session.async_payment_failed`, then verify delivery in Stripe before
accepting live payments. Create the production admin with the one-time bootstrap
command against the production database; do not expose public admin signup.

## Validation

Run backend tests with `cd backend && npm test`; build the UI with
`cd frontend && npm run build`.
