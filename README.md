# MONOLITH — Streetwear Store

A black-and-platinum streetwear commerce app. The storefront is a **Next.js (App Router)** application that lives at the repository root (`app/`, `components/`, `lib/`), and the API is an **Express** server in `server/` backed by **MySQL 8**. Authentication uses bcrypt password hashing plus a signed cookie session shared across the frontend and API hosts. Payments (one-off product bundles, gift cards and the *Inner Circle* membership subscription) are handled by the pre-built `server/payments` module across Flutterwave, PayPal, Paystack and Stripe in **USD**.

---

## Table of contents

1. [What the store is](#what-the-store-is)
2. [Design language](#design-language)
3. [Prerequisites](#prerequisites)
4. [Database setup](#database-setup)
5. [Environment variables](#environment-variables)
6. [Running locally](#running-locally)
7. [Deployed URLs](#deployed-urls)
8. [Directory tree](#directory-tree)
9. [REST API](#rest-api)
10. [Payments module](#payments-module)
11. [Deployment (PM2 / START.sh)](#deployment-pm2--startsh)
12. [Troubleshooting](#troubleshooting)

---

## What the store is

MONOLITH sells a tightly curated streetwear catalogue — boxy tees, heavyweight hoodies, technical outerwear, cargo bottoms and accessories. The app covers the full retail loop:

- **Catalogue** (`/shop`) with category filters, text search and price/newest sorting.
- **Product detail** (`/product/[slug]`) with size selection, stock awareness and an add-to-bag flow.
- **Cart** (`/cart`) persisted in `localStorage`; the checkout total is always **recomputed on the server** from the database before a payment is created.
- **Accounts** (`/signup`, `/login`, `/account`) with order history.
- **Membership & bundles** (`/pricing`, `/billing`, `/billing/success`, `/billing/cancel`) powered by the payments module.

Every data view in the UI implements four states: loading skeleton, empty, error (with retry) and success.

---

## Design language

| Token role | Intent |
| --- | --- |
| `--color-bg` | Near-black canvas (`#0A0A0B`-ish) — the whole app is dark by default |
| `--color-surface` / `--color-surface-raised` | Layered charcoal panels for cards, headers and modals |
| `--color-border` | Low-contrast hairlines that separate without shouting |
| `--color-text` / `--color-text-muted` | Platinum white and a dimmed secondary tone |
| `--color-accent` / `--color-accent-hover` | Platinum silver used for CTAs, links and focus rings |
| `--color-success` / `--color-warning` / `--color-danger` | Status feedback only |

Styling rules that the codebase sticks to:

- **One stylesheet**: `app/globals.css`, imported exactly once from `app/layout.jsx`. No Tailwind, no CSS modules, no CSS-in-JS, no inline style objects.
- **Tokens only** — spacing (`--space-1` … `--space-16`), type scale (`--text-xs` … `--text-4xl`), radii, shadows and z-index (`--z-dropdown` … `--z-toast`) are all custom properties. No magic pixel values or ad-hoc hex outside the `:root` block.
- **Gap-based layout** — `.stack`, `.cluster`, `.grid` helpers space children with `gap`; never child margins, `<br>` or spacer divs.
- **Product imagery** is generated locally by `components/ProductMedia.jsx`: a deterministic black/platinum gradient SVG derived from `image_key`, inside a fixed `aspect-ratio: 4 / 5` box with `object-fit: cover`. There are no hotlinked external images, so nothing reflows on load.
- **Accessibility** — every interactive element defines `:hover`, `:focus-visible` (a visible ring, never bare `outline: none`), `:active` and `:disabled`; hit areas are at least 44×44px; motion is disabled under `prefers-reduced-motion`.
- **Responsive** — mobile-first with breakpoints at 640 / 768 / 1024px. The desktop header nav appears from 1024px; below that a focus-trapping mobile panel takes over. Nothing wraps or overlaps between 360px and 1200px.

---

## Prerequisites

- **Node.js 18+** (20 LTS recommended)
- **MySQL 8.0+**
- npm 9+

---

## Database setup

Create the database and user, then load the schema and seed data:

```bash
mysql -u root -p -e "CREATE DATABASE clothing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE USER 'clothing'@'localhost' IDENTIFIED BY 'change-me';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON clothing.* TO 'clothing'@'localhost'; FLUSH PRIVILEGES;"

mysql -u clothing -p clothing < schema.sql
```

`schema.sql` creates:

| Table | Purpose |
| --- | --- |
| `users` | `id`, `email` (unique), `password_hash`, `full_name`, `created_at` |
| `products` | `id`, `slug` (unique), `name`, `description`, `category`, `price_cents`, `currency`, `image_key`, `badge`, `stock`, `is_featured`, `created_at` |
| `product_sizes` | `id`, `product_id` → `products.id`, `size`, `stock` |
| `orders` | `id`, `user_id` → `users.id`, `reference` (unique), `status`, `subtotal_cents`, `total_cents`, `currency`, `created_at` |
| `order_items` | `id`, `order_id` → `orders.id`, `product_id`, `size`, `quantity`, `unit_price_cents`, `name_snapshot` |

It finishes with `INSERT` statements seeding ~14 streetwear products (Obsidian Boxy Tee, Platinum Arc Hoodie, Nightshift Cargo Pant, …) and their size rows, so the storefront has real content immediately.

Session state is kept in memory by `express-session` — there is no `sessions` table.

The payments module manages its own tables and creates them on boot; you do not need to add anything for it.

---

## Environment variables

Copy the template and fill it in:

```bash
cp .env.example .env
```

| Variable | Meaning |
| --- | --- |
| `PORT` | Port the Express API listens on. Assigned by the deploy script (production: `4118`). Never hardcoded in code. |
| `NODE_ENV` | `development` or `production`. Controls error verbosity. |
| `SSL_ENABLED` | `true` to terminate TLS inside the Node process (production). Anything else serves plain HTTP. |
| `SSL_CERT_PATH` | Absolute path to the TLS certificate (`/home/arx-app/backends/certs/certificate.crt`). |
| `SSL_KEY_PATH` | Absolute path to the TLS private key (`/home/arx-app/backends/certs/private.key`). |
| `SSL_CA_PATH` | Optional absolute path to a CA chain bundle. |
| `DB_HOST` | MySQL host name. |
| `DB_USER` | MySQL user name. |
| `DB_PASSWORD` | MySQL user password. |
| `DB_NAME` | MySQL database name. |
| `SESSION_SECRET` | Secret used to sign the `clothing.sid` session cookie. Use a long random string. |
| `SESSION_COOKIE_DOMAIN` | Cookie domain shared by the frontend and API hosts (e.g. `.arx-app.com`). Leave blank locally. |
| `CORS_ORIGINS` | Comma-separated extra allowed origins. All `*.arx-app.com` hosts and localhost dev ports are always allowed. |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the API used by the browser (e.g. `https://clothing-api.arx-app.com:4118`). The only public variable. |
| `STRIPE_SECRET_KEY` | Stripe secret key (backend only). |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. |
| `PAYPAL_CLIENT_ID` | PayPal REST client id. |
| `PAYPAL_CLIENT_SECRET` | PayPal REST client secret. |
| `PAYSTACK_SECRET_KEY` | Paystack secret key. |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave secret key. |
| `FLUTTERWAVE_WEBHOOK_HASH` | Flutterwave webhook verification hash. |

> Payment provider keys are **backend only**. They never appear in frontend code or in any `NEXT_PUBLIC_*` variable. `/api/payments/providers` returns an empty list until at least one provider's keys are present, and the `/pricing` page then shows a friendly "payments are not available yet" state.

---

## Running locally

```bash
npm install
```

**API** (reads `.env`, listens on `PORT`):

```bash
npm run server
# → http://localhost:4118/health
```

**Frontend**, in a second terminal:

```bash
npx next dev
# → http://localhost:3000
```

Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:4118` in `.env` for local development so the browser talks to your local API. All API calls run from client components at runtime with `credentials: 'include'` — nothing is fetched during the build.

**Production build of the frontend:**

```bash
npm run build
```

The available scripts are exactly:

```json
{
  "build": "next build",
  "start": "node server/index.js",
  "server": "node server/index.js"
}
```

---

## Deployed URLs

| Surface | URL |
| --- | --- |
| Storefront | https://clothing.arx-app.com |
| API | https://clothing-api.arx-app.com:4118 |
| Health check | https://clothing-api.arx-app.com:4118/health |

Because the two hosts share the `.arx-app.com` cookie domain, the session cookie is issued with `SameSite=None; Secure; Domain=.arx-app.com` in production.

---

## Directory tree

```
.
├── app/                          Next.js App Router pages (all client components that fetch data)
│   ├── globals.css               THE single global stylesheet (imported once, in layout.jsx)
│   ├── layout.jsx                Root layout: metadata, font, AuthProvider → CartProvider → SiteShell
│   ├── page.jsx                  Home: hero, featured drop grid, value strip, membership teaser
│   ├── shop/page.jsx             Catalogue with filters, search and sort
│   ├── product/[slug]/page.jsx   Product detail, size + quantity selection, add to bag
│   ├── cart/page.jsx             Bag, summary and auth-gated checkout
│   ├── login/page.jsx            Sign in
│   ├── signup/page.jsx           Create account
│   ├── account/page.jsx          Profile and order history
│   ├── pricing/page.jsx          Plans, bundles and one pay button per provider
│   ├── billing/page.jsx          Current subscription, cancel and manage
│   ├── billing/success/page.jsx  Reads ?ref=, completes and polls the payment
│   ├── billing/cancel/page.jsx   Payment cancelled notice
│   ├── not-found.jsx             404
│   └── error.jsx                 Client error boundary
├── components/
│   ├── SiteShell.jsx             Header + <main class="site-main container"> + footer
│   ├── SiteHeader.jsx            Sticky header, 5 nav links, cart count, auth actions
│   ├── SiteFooter.jsx            Brand block, link columns, bottom bar
│   ├── ProductMedia.jsx          Deterministic local SVG/gradient product art
│   ├── ProductCard.jsx           Card + media + badge + price, links to the PDP
│   ├── ProductGrid.jsx           Responsive grid with loading / empty / error states
│   ├── ShopFilters.jsx           Category buttons, search field, sort select
│   ├── CartLineItem.jsx          Thumbnail, size badge, quantity stepper, remove
│   ├── PlanCard.jsx              Plan/product pricing card with per-provider buttons
│   └── ui/                       Button, Input (Field/Textarea/Select), Card, Modal,
│                                 Table, Badge, Spinner, EmptyState
├── context/
│   ├── AuthContext.jsx           useAuth(): user, status, login, signup, logout, refresh
│   └── CartContext.jsx           useCart(): items, addItem, setQuantity, clear, subtotalCents
├── lib/
│   ├── api.js                    Browser API client (credentials: 'include', ApiError)
│   └── format.js                 formatPrice, formatDate, formatInterval, pluralize
├── public/
│   └── favicon.svg               Platinum "M" monogram on a black rounded square
├── server/
│   ├── index.js                  Express entry point (webhooks → cors → json → session → routes)
│   ├── config/
│   │   ├── db.js                 mysql2/promise pool + checkDatabaseConnection()
│   │   └── session.js            createSessionMiddleware()
│   ├── middleware/
│   │   ├── auth.js               requireAuth, getSessionUser
│   │   ├── errorHandler.js       notFound, errorHandler
│   │   └── validate.js           isEmail, requireFields, sanitizeString, toPositiveInt
│   ├── routes/
│   │   ├── auth.js               /api/auth
│   │   ├── products.js           /api/products
│   │   └── orders.js             /api/orders
│   ├── controllers/
│   │   ├── authController.js     signup, login, logout, me
│   │   ├── productController.js  listProducts, listCategories, getProductBySlug
│   │   └── orderController.js    createOrder, listOrders, getOrder, fulfilOrder
│   └── payments/                 PRE-BUILT MODULE — do not edit (except plans.js catalogue data)
├── schema.sql                    MySQL 8 schema + seed catalogue
├── next.config.js
├── ecosystem.config.js           PM2 app definition
├── START.sh                      Background launcher used on the server
├── .env.example
└── package.json                  Single root manifest for frontend + backend
```

---

## REST API

All endpoints return JSON. Authenticated endpoints rely on the `clothing.sid` cookie, so the browser must send `credentials: 'include'` (handled centrally by `lib/api.js`).

### Health

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | `{ status: 'ok', db: 'up' \| 'down' }` — the DB ping never throws. |

### Auth — `/api/auth`

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | `{ fullName, email, password }` | Creates a user (bcrypt, 10 rounds). `409` on duplicate email, `400` on weak input (password min 8 chars). |
| `POST` | `/api/auth/login` | `{ email, password }` | `401` on bad credentials. Regenerates the session. |
| `POST` | `/api/auth/logout` | — | Destroys the session and clears the cookie. |
| `GET` | `/api/auth/me` | — | `{ user }` for the signed-in user. `401` when anonymous. |

`password_hash` is never returned.

### Products — `/api/products`

| Method | Path | Query | Description |
| --- | --- | --- | --- |
| `GET` | `/api/products` | `category`, `q`, `sort` (`newest\|price_asc\|price_desc`), `featured`, `limit` | Filtered, sorted catalogue. |
| `GET` | `/api/products/categories` | — | `DISTINCT` categories with product counts. |
| `GET` | `/api/products/:slug` | — | Product plus its `sizes` array. `404` when absent. |

Product payloads are camelCase: `{ id, slug, name, description, category, priceCents, currency, imageKey, badge, stock, isFeatured, sizes }`.

### Orders — `/api/orders` (all require auth)

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/api/orders` | `{ provider, items: [{ productId, size, quantity }] }` | Re-reads every price from MySQL inside a transaction, computes the subtotal/total in cents, writes `orders` + `order_items` with a generated reference, then creates the checkout and returns `{ reference, redirectUrl }`. |
| `GET` | `/api/orders` | — | The signed-in user's orders with their items. |
| `GET` | `/api/orders/:reference` | — | A single order. `404` when it is not the caller's. |

> The server **never** trusts an amount sent by the browser. Cart totals shown in the UI are display-only.

### Payments — `/api/payments` (provided by the pre-built module)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/payments/providers` | `{ currency, providers: [{ id, label, mode }] }` — empty until keys are configured. |
| `GET` | `/api/payments/plans` | `{ currency, plans: [...], products: [...] }` from `server/payments/plans.js`. |
| `POST` | `/api/payments/checkout` | `{ provider, planId }` or `{ provider, productId }` → `{ reference, redirectUrl }`. Redirect with `window.location.href`. |
| `POST` | `/api/payments/:reference/complete` | `{ reference, status: 'paid'\|'pending'\|'failed'\|'canceled', kind, itemId, amount, currency }`. |
| `GET` | `/api/payments/subscription` | `{ subscription \| null }`. |
| `POST` | `/api/payments/subscription/cancel` | `{ subscription }`. |
| `GET` | `/api/payments/subscription/manage` | `{ url }` — hide the manage button when `url` is `null`. |

Provider webhooks are mounted by `payments.attachPaymentWebhooks(app)` **before** `cors()` and `express.json()` so raw bodies stay intact for signature verification.

---

## Payments module

`server/payments/*` is a **pre-built module. Do not edit or replace those files.** The only catalogue data the app owns is `server/payments/plans.js`:

- **Plans** — `inner-circle-monthly` ($12.00/month) and `inner-circle-yearly` ($120.00/year).
- **Products** — `starter-drop-bundle` ($125.00), `gift-card-50` ($50.00), `gift-card-100` ($100.00).

Amounts are whole numbers in USD minor units (`1200` = $12.00). The frontend formats them with:

```js
new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount / 100);
```

Zero-decimal currencies (JPY, XOF, XAF, UGX, RWF) are not divided — see `lib/format.js`.

Wiring in `server/index.js`, in this exact order:

```js
const express = require('express');
const payments = require('./payments');
const app = express();

payments.attachPaymentWebhooks(app);      // FIRST — before cors / body parsers
// ...cors({ credentials: true }), express.json(), session, auth middleware...
payments.attachPaymentRoutes(app, {
  getUser: (req) => (req.session?.user ? { id: req.session.user.id, email: req.session.user.email } : null),
});

payments.on('payment.succeeded', ({ reference /*, userId, itemId, amount, currency */ }) => {
  // marks the matching order paid and decrements stock
});
```

Paid API routes can be guarded with `payments.requireSubscription()` (any active plan) or `payments.requireSubscription(['inner-circle-monthly'])`.

**Card details are never collected by this app** — customers are always redirected to the provider's hosted page.

---

## Deployment (PM2 / START.sh)

### Option A — `START.sh`

```bash
chmod +x START.sh
./START.sh
```

The script `cd`s to its own directory, exports `SSL_ENABLED=true`, `SSL_CERT_PATH=/home/arx-app/backends/certs/certificate.crt`, `SSL_KEY_PATH=/home/arx-app/backends/certs/private.key` and `PORT=4118` when unset, runs `npm install --omit=dev` if `node_modules` is missing, then starts the API with `nohup node server/index.js > server.log 2>&1 &` and writes the PID to `server.pid`.

Stop it with:

```bash
kill "$(cat server.pid)"
```

### Option B — PM2

```bash
npm install --omit=dev
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 logs clothing
```

`ecosystem.config.js`:

```js
module.exports = {
  apps: [{
    name: 'clothing',
    script: 'server/index.js',
    cwd: '/home/arx-app/backends/clothing',
    env: { NODE_ENV: 'production', PORT: 4118 },
  }],
};
```

The Express process serves **only** the API — it never serves the Next.js build. The frontend is deployed separately and points at `NEXT_PUBLIC_API_BASE_URL`.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `/health` reports `db: 'down'` | Wrong `DB_*` credentials or MySQL not running. The endpoint intentionally never throws. |
| Browser calls return `401` after login | The session cookie is not being stored. Check `SESSION_COOKIE_DOMAIN`, that `SSL_ENABLED=true` in production (so `Secure` + `SameSite=None` are set) and that the frontend sends `credentials: 'include'`. |
| CORS error in the console | Add the origin to `CORS_ORIGINS` (comma separated). All `*.arx-app.com` hosts and localhost dev ports are allowed by default. |
| `/pricing` shows "payments are not available yet" | No provider keys are configured. Add at least one provider's secret to `.env` and restart the API. |
| Webhooks fail signature verification | A body parser ran before `attachPaymentWebhooks`. It must be the first thing registered on the app. |
| Storefront shows the API error state everywhere | `NEXT_PUBLIC_API_BASE_URL` is wrong or the API is down. `lib/api.js` converts network failures into `ApiError` with `status: 0`. |