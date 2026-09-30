# Integration Notes for clothing

## Overview

**clothing** (product name **MONOLITH**) is a streetwear e-commerce application built on a black-and-platinum visual identity. It ships as a single repository containing two deployable halves that share one `package.json`:

| Half | Stack | Entry point | Public host |
| --- | --- | --- | --- |
| Storefront | Next.js (App Router, JSX, plain global CSS) | `app/layout.jsx` | `https://clothing.arx-app.com` |
| API | Express 4 (CommonJS) + MySQL 8 | `server/index.js` | `https://clothing-api.arx-app.com:4118` |

The storefront covers the full shopping journey — home (`app/page.jsx`), catalogue (`app/shop/page.jsx`), product detail (`app/product/[slug]/page.jsx`), cart (`app/cart/page.jsx`), auth (`app/login/page.jsx`, `app/signup/page.jsx`), account (`app/account/page.jsx`), and the payment surfaces `app/pricing/page.jsx`, `app/billing/page.jsx`, `app/billing/success/page.jsx`, `app/billing/cancel/page.jsx`.

Authentication is session-based: `bcryptjs` password hashing in `server/controllers/authController.js` and a signed cookie issued by `server/config/session.js` (`clothing.sid`). Because the frontend and API live on different hostnames, the cookie is scoped to a shared parent domain via `SESSION_COOKIE_DOMAIN`, and every browser request from `lib/api.js` is sent with `credentials: 'include'`.

Payments for one-off bundles (`Starter Drop Bundle`, gift cards) and the **Inner Circle** membership subscription are handled by the **pre-built** module in `server/payments/`. Four providers are wired — Flutterwave, PayPal, Paystack, Stripe — all charging in **USD**. The only file in that folder you are expected to read or change is `server/payments/plans.js`, which declares the catalogue of plans and products; everything else in `server/payments/` is documented separately and must not be edited.

Three architectural rules are load-bearing and should survive any refactor:

1. **Prices are never trusted from the browser.** `server/controllers/orderController.js` re-reads every product price from MySQL inside a transaction and computes the charge amount server-side.
2. **Payment webhooks mount before body parsers.** `server/index.js` calls `payments.attachPaymentWebhooks(app)` as the very first middleware so raw request bodies stay intact for signature verification.
3. **No data fetching during build or SSR.** Every API call originates from a client component inside `useEffect`, so `next build` never needs a reachable API or database.

---

## Prerequisites

- **Node.js 18 or newer** (the App Router, `next/font`, and native `fetch` in `lib/api.js` all assume it). Check with `node -v`.
- **npm 9+** (bundled with Node 18).
- **MySQL 8.0 or newer** — `schema.sql` uses `utf8mb4` and MySQL 8 defaults. A reachable host, a database, and a user with `CREATE`, `SELECT`, `INSERT`, `UPDATE`, `DELETE` privileges.
- **TLS certificate and key** if you intend to terminate HTTPS inside the Node process (`SSL_ENABLED=true`). The deploy convention is `/home/arx-app/backends/certs/certificate.crt` and `/home/arx-app/backends/certs/private.key`.
- **PM2** (optional but recommended for production): `npm install -g pm2`. `ecosystem.config.js` is already written for it.
- **Provider dashboard access** for whichever of Stripe / PayPal / Paystack / Flutterwave you plan to enable. Providers with missing keys are simply omitted from `GET /api/payments/providers`, and the UI degrades to a "Payments are not available yet" empty state.

---

## Installation

### 1. Install dependencies

There is a **single root `package.json`** — no workspaces, no separate `server/package.json`. One install covers both halves:

```bash
cd /home/arx-app/backends/clothing
npm install
```

For a production box where you do not need dev tooling:

```bash
npm install --omit=dev
```

This pulls `next`, `react`, `react-dom`, `express`, `cors`, `dotenv`, `express-session`, `bcryptjs`, `mysql2`, and `cookie-parser`.

### 2. Create the database and load the schema

```bash
mysql -u root -p -e "CREATE DATABASE clothing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE USER 'clothing_user'@'localhost' IDENTIFIED BY 'your-secret-here';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON clothing.* TO 'clothing_user'@'localhost'; FLUSH PRIVILEGES;"
```

Then apply `schema.sql`, which creates `users`, `products`, `product_sizes`, `orders`, and `order_items`, and seeds roughly fourteen realistic streetwear products (*Obsidian Boxy Tee*, *Platinum Arc Hoodie*, *Nightshift Cargo Pant*, …) together with their size rows:

```bash
mysql -u clothing_user -p clothing < schema.sql
```

Verify the seed landed:

```bash
mysql -u clothing_user -p clothing -e "SELECT COUNT(*) AS products FROM products; SELECT COUNT(*) AS sizes FROM product_sizes;"
```

There is no `sessions` table — sessions live in the default `express-session` memory store (see *Production Considerations* for why you will want to change that).

### 3. Create your environment file

```bash
cp .env.example .env
```

`.env.example` documents every variable below plus placeholder-only payment provider keys. Fill in real values in `.env`; never commit `.env`.

```bash
chmod 600 .env
```

### 4. Build the frontend

```bash
npm run build
```

`next.config.js` sets `reactStrictMode: true` and passes `NEXT_PUBLIC_API_BASE_URL` through to the client bundle. **`NEXT_PUBLIC_*` variables are inlined at build time**, so if you change the API base URL you must rebuild. There are no rewrites or proxying — the browser talks to `https://clothing-api.arx-app.com:4118` directly, which is why CORS and cookie-domain configuration matter.

---

## Environment Variables

All of the following are read by `server/index.js`, `server/config/db.js`, and `server/config/session.js` via `dotenv/config`, except `NEXT_PUBLIC_API_BASE_URL`, which is consumed by the Next.js build and `lib/api.js`.

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | Port the Express API listens on (assigned by the deploy script). `server/index.js` reads it directly and never falls back to a hardcoded port. | `4118` |
| `NODE_ENV` | Node environment. In `production`, `server/middleware/errorHandler.js` hides internal error details from responses. | `production` |
| `SSL_ENABLED` | Set to `'true'` to terminate TLS directly in the API process. Also flips the session cookie to `secure: true` / `sameSite: 'none'`. | `true` |
| `SSL_CERT_PATH` | Absolute path to the TLS certificate file. Read synchronously at boot when `SSL_ENABLED=true`. | `/home/arx-app/backends/certs/certificate.crt` |
| `SSL_KEY_PATH` | Absolute path to the TLS private key file. | `/home/arx-app/backends/certs/private.key` |
| `SSL_CA_PATH` | Optional absolute path to a CA chain bundle. Passed to `https.createServer` only when set. | `/home/arx-app/backends/certs/ca_bundle.crt` |
| `DB_HOST` | MySQL host name used by the `mysql2/promise` pool in `server/config/db.js`. | `127.0.0.1` |
| `DB_USER` | MySQL user name. | `clothing_user` |
| `DB_PASSWORD` | MySQL user password. | `your-secret-here` |
| `DB_NAME` | MySQL database name. | `clothing` |
| `SESSION_SECRET` | Secret used to sign the session cookie. Use a long random string; rotating it invalidates every active session. | `change-me-to-a-long-random-string` |
| `SESSION_COOKIE_DOMAIN` | Cookie domain shared by the frontend and API hosts, so `clothing.arx-app.com` and `clothing-api.arx-app.com` see the same session. | `.arx-app.com` |
| `CORS_ORIGINS` | Comma separated list of extra allowed origins. All `*.arx-app.com` hosts are always allowed, as is localhost during development. | `https://clothing.arx-app.com` |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the API used by the browser. `lib/api.js` falls back to `https://clothing-api.arx-app.com:4118` when unset. Inlined at build time. | `https://clothing-api.arx-app.com:4118` |

### Payment provider keys (placeholders in `.env.example`)

These are consumed by the pre-built `server/payments/` module. Omit a provider's keys and that provider simply does not appear in `GET /api/payments/providers`.

| Variable | Provider |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe API secret |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `PAYPAL_CLIENT_ID` | PayPal REST client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal REST client secret |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave secret key |
| `FLUTTERWAVE_WEBHOOK_HASH` | Flutterwave webhook verification hash |

---

## Running the Application

### Local development

Run the API and the Next.js dev server in two terminals.

Terminal 1 — API:

```bash
npm run server
# equivalent to: node server/index.js
```

Terminal 2 — storefront:

```bash
npx next dev
```

For local work, set in `.env`:

```
PORT=4118
NODE_ENV=development
SSL_ENABLED=false
SESSION_COOKIE_DOMAIN=
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4118
```

Leave `SESSION_COOKIE_DOMAIN` empty locally — `localhost` cookies cannot be scoped to a dotted parent domain, and `session.js` passes `undefined` when the value is blank. With `SSL_ENABLED=false` the cookie is issued as `secure: false` / `sameSite: 'lax'`, which works for `localhost:3000 → localhost:4118`.

Smoke test the API:

```bash
curl -s http://localhost:4118/health
# {"status":"ok","db":"ok"}
```

`/health` uses `checkDatabaseConnection()` from `server/config/db.js` and is written to never throw, so a database outage reports a degraded `db` field rather than a 500.

### Production — the three available scripts

`package.json` defines exactly three scripts:

```bash
npm run build     # next build
npm start         # node server/index.js
npm run server    # node server/index.js
```

Note that `npm start` starts the **API**, not Next.js. The Express process never serves the Next.js app; the two are deployed and fronted independently.

### Production — `START.sh`

`START.sh` is the self-contained launcher. It `cd`s to its own directory, exports `SSL_ENABLED`, `SSL_CERT_PATH=/home/arx-app/backends/certs/certificate.crt`, `SSL_KEY_PATH=/home/arx-app/backends/certs/private.key` and `PORT=4118` if they are not already set, runs `npm install --omit=dev` when `node_modules` is absent, then launches the API detached:

```bash
chmod +x START.sh
./START.sh

tail -f server.log      # stdout/stderr
cat server.pid          # background PID
kill "$(cat server.pid)"  # stop
```

### Production — PM2

`ecosystem.config.js` is preconfigured for the standard deploy path:

```js
module.exports = {
  apps: [{
    name: 'clothing',
    script: 'server/index.js',
    cwd: '/home/arx-app/backends/clothing',
    env: { NODE_ENV: 'production', PORT: 4118 }
  }]
};
```

```bash
pm2 start ecosystem.config.js
pm2 logs clothing
pm2 restart clothing
pm2 save
pm2 startup     # print the systemd command to survive reboots
```

Variables other than `NODE_ENV` and `PORT` still come from `.env` via `dotenv/config`, so `.env` must exist in `cwd`.

### Serving the storefront

After `npm run build`, serve the Next.js output behind your reverse proxy at `https://clothing.arx-app.com` using `npx next start -p <port>` (or your platform's Next.js runtime). Keep it on a different port from `PORT`.

### Payment flow checklist

1. Configure at least one provider's keys and restart the API.
2. `curl -k https://clothing-api.arx-app.com:4118/api/payments/providers` — confirm your provider is listed.
3. Visit `/pricing`. `PlanCard` renders one pay button per provider for each entry in `server/payments/plans.js`.
4. Register the provider's webhook URL in its dashboard pointing at the API host. Webhooks are mounted by `payments.attachPaymentWebhooks(app)` before `express.json()`.
5. Set the provider's success/cancel return URLs to `https://clothing.arx-app.com/billing/success?ref=...` and `https://clothing.arx-app.com/billing/cancel`.
6. On `payment.succeeded`, `server/index.js` invokes `fulfilOrder(reference)` from `server/controllers/orderController.js`, which marks the order paid and decrements stock. `app/billing/success/page.jsx` additionally POSTs `/api/payments/<ref>/complete` and polls every 3 seconds up to 10 times for reconciliation, clearing the cart on a paid product purchase.

### REST surface

| Method & path | Notes |
| --- | --- |
| `GET /health` | Status plus non-throwing DB ping |
| `POST /api/auth/signup` | Name, email, password (min 8 chars); 409 on duplicate email |
| `POST /api/auth/login` | Regenerates the session on success |
| `POST /api/auth/logout` | Destroys the session, clears the cookie |
| `GET /api/auth/me` | Behind `requireAuth` |
| `GET /api/products` | `category`, `q`, `sort`, `featured`, `limit` |
| `GET /api/products/categories` | Distinct categories with counts |
| `GET /api/products/:slug` | Product plus `product_sizes` |
| `POST /api/orders` | Behind `requireAuth`; totals recomputed server-side, returns `{ reference, redirectUrl }` |
| `GET /api/orders` | Signed-in user's orders with items |
| `GET /api/orders/:reference` | Single order |
| `/api/payments/*` | Mounted by the pre-built module: `providers`, `plans`, `checkout`, `:ref/complete`, `subscription`, `subscription/cancel`, `subscription/manage` |

---

## Project Structure

```
clothing/
├── package.json            Single root manifest; scripts: build, start, server
├── next.config.js          reactStrictMode + NEXT_PUBLIC_API_BASE_URL passthrough
├── .env.example            Documented template for every variable above
├── ecosystem.config.js     PM2 app definition
├── START.sh                Background launcher (nohup + server.pid + server.log)
├── schema.sql              MySQL 8 utf8mb4 schema + ~14 seeded products
├── README.md               Full project documentation
│
├── app/                    Next.js App Router
│   ├── globals.css         THE single stylesheet — design tokens, reset, layout,
│   │                       component classes, mobile-first queries at 640/768/1024
│   ├── layout.jsx          Root layout; the only importer of globals.css; wraps
│   │                       children in AuthProvider → CartProvider → SiteShell
│   ├── page.jsx            Home: hero, featured ProductGrid, value strip, membership teaser
│   ├── shop/page.jsx       Catalogue with filters, search, sort, results count
│   ├── product/[slug]/page.jsx  Detail: media column, size selector, add to bag
│   ├── cart/page.jsx       Line items, summary, auth-gated checkout
│   ├── login/page.jsx      Sign in; honours ?next=
│   ├── signup/page.jsx     Registration with client-side validation
│   ├── account/page.jsx    Profile card + order history Table
│   ├── pricing/page.jsx    Plans & products × providers → /api/payments/checkout
│   ├── billing/page.jsx    Subscription status, cancel Modal, manage-billing link
│   ├── billing/success/page.jsx  Reads ?ref= in Suspense, completes and polls
│   ├── billing/cancel/page.jsx   "Nothing was charged" state
│   ├── not-found.jsx       404 — "This drop has sold out or moved"
│   └── error.jsx           Client error boundary with reset()
│
├── components/
│   ├── SiteShell.jsx       Header + <main class="site-main container"> + footer
│   ├── SiteHeader.jsx      Sticky single-row header; desktop nav from 1024px;
│   │                       mobile panel with scroll lock, focus trap, Escape close
│   ├── SiteFooter.jsx      Brand block spanning 1/-1, auto-fit link columns, bottom bar
│   ├── ProductMedia.jsx    Deterministic local SVG/gradient placeholder, 4/5 aspect ratio
│   ├── ProductCard.jsx     Card + media + badge + formatted price → /product/[slug]
│   ├── ProductGrid.jsx     Grid with skeleton, empty and error-with-retry states
│   ├── ShopFilters.jsx     Category buttons, search field, sort select
│   ├── CartLineItem.jsx    Thumbnail, size badge, quantity stepper, remove
│   ├── PlanCard.jsx        Plan/product pricing with one pay button per provider
│   └── ui/                 Button, Input (Field/Textarea/Select), Card, Modal (portal),
│                           Table, Badge, Spinner, EmptyState
│
├── context/
│   ├── AuthContext.jsx     { user, status, login, signup, logout, refresh };
│   │                       degrades to 'anonymous' if the API is unreachable
│   └── CartContext.jsx     localStorage-backed cart under 'monolith.cart'
│
├── lib/
│   ├── api.js              API_BASE, request() with credentials:'include', ApiError
│   │                       (network failures become status 0), all named endpoints
│   └── format.js           formatPrice (minor units, zero-decimal aware), formatDate,
│                           formatInterval, pluralize
│
├── public/favicon.svg      Platinum "M" monogram on a black rounded square
│
└── server/
    ├── index.js            Entry point. Webhooks → CORS → trust proxy → json →
    │                       session → /health → routers → payment routes →
    │                       payment.succeeded listener → notFound/errorHandler →
    │                       http|https server on PORT, bound to 0.0.0.0
    ├── config/db.js        mysql2/promise pool + checkDatabaseConnection()
    ├── config/session.js   createSessionMiddleware() → 'clothing.sid' cookie
    ├── middleware/auth.js  requireAuth, getSessionUser
    ├── middleware/errorHandler.js  notFound, errorHandler
    ├── middleware/validate.js      isEmail, requireFields, sanitizeString, toPositiveInt
    ├── routes/             auth.js, products.js, orders.js
    ├── controllers/        authController.js, productController.js, orderController.js
    └── payments/           PRE-BUILT — do not edit (except plans.js)
        └── plans.js        Inner Circle monthly/annual + bundle & gift cards, USD minor units
```

### Styling contract

`app/globals.css` is the only stylesheet in the repository and is imported exactly once, from `app/layout.jsx`. There is no Tailwind, no CSS modules, no CSS-in-JS, and no inline style objects. All colour, spacing, type, radius, shadow, and z-index values come from `:root` custom properties; spacing between siblings is achieved with `gap`, never child margins or spacer elements. If you add UI, add a semantic class to `globals.css` rather than introducing a second styling mechanism.

### Payments module boundary

Treat `server/payments/` as a vendored dependency. Its public surface, used by `server/index.js`, is:

- `payments.attachPaymentWebhooks(app)` — must run first, before any body parser or CORS
- `payments.attachPaymentRoutes(app, { getUser })` — `getUser` maps the session to `{ id, email }`
- `payments.createCheckout({ provider, user, amount, description, itemId })` — called from `orderController.createOrder`
- `payments.on('payment.succeeded', handler)` — wired to `fulfilOrder`

Edit `server/payments/plans.js` to change the plan or product catalogue. Amounts there are **USD minor units** (`1200` = $12.00), matching `formatPrice` in `lib/format.js`.

---

## Next Steps / Production Considerations

**Sessions.** `server/config/session.js` uses the default `express-session` MemoryStore. That leaks memory under load and drops every session on restart or when you scale past one process. Before serious traffic, move to a persistent store (`connect-redis`, or a MySQL-backed store reusing the pool from `server/config/db.js`). Note that `schema.sql` deliberately does not create a `sessions` table — you will add one if you choose the SQL route.

**Secrets.** Generate `SESSION_SECRET` with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Keep `.env` at mode `600`, out of version control, and out of container images. Rotate provider keys separately from the session secret, since rotating the latter logs everyone out.

**Cookies across hosts.** With `SSL_ENABLED=true` the cookie is `secure` + `sameSite: 'none'` + `domain=.arx-app.com`. Both `clothing.arx-app.com` and `clothing-api.arx-app.com` must be served over HTTPS or the browser will silently drop it. If login "succeeds" but `/api/auth/me` returns 401, check in order: the cookie domain, HTTPS on both hosts, `credentials: 'include'` reaching the API, and that the origin is matched by the CORS callback.

**TLS strategy.** Terminating TLS in-process is convenient but means certificate renewal requires a restart, since the cert is read synchronously at boot. For a long-lived deployment, put nginx or a load balancer in front, set `SSL_ENABLED=false`, and rely on `app.set('trust proxy', 1)` — already configured — so `secure` cookie detection and client IPs stay correct behind the proxy.

**Rate limiting and abuse.** `/api/auth/login` and `/api/auth/signup` have no throttling. Add `express-rate-limit` (or equivalent at the proxy) keyed on IP + email before going public. Consider email verification at signup and a password-reset flow, neither of which is implemented.

**Stock and concurrency.** `fulfilOrder` decrements stock on `payment.succeeded`, but nothing reserves inventory between checkout creation and webhook arrival, so a limited drop can oversell. For scarce releases, add a reservation row with a TTL, or a conditional `UPDATE ... WHERE stock >= ?` inside the existing transaction and reject when zero rows change.

**Webhook idempotency.** Providers retry. Make `fulfilOrder` safe to call twice — guard on the current `orders.status` before marking paid and decrementing stock — and log every webhook with its provider event ID.

**Database hardening.** The pool is capped at `connectionLimit: 10`; raise it in step with your process count and MySQL's `max_connections`. `multipleStatements` is `false` and every query is parameterised — preserve both. Add indexes on the columns your queries actually filter by: `products.category`, `products.is_featured`, `orders.user_id`, `order_items.order_id`. Back up with `mysqldump` on a schedule and test a restore.

**Observability.** `errorHandler` logs to stdout, captured by PM2 or `server.log`. Route those into a real log aggregator, and monitor `/health` (including its `db` field) from an external checker. Add error tracking such as Sentry on both halves.

**Build-time coupling.** `NEXT_PUBLIC_API_BASE_URL` is baked into the client bundle by `next build`. Any change to the API host or port requires a rebuild and redeploy of the frontend, not just an API restart. Keep that in your release checklist.

**Images.** `ProductMedia.jsx` renders deterministic local SVG gradients — zero external requests, no layout shift. When you introduce real photography, keep the fixed `4/5` aspect ratio and `object-fit: cover`, serve through `next/image` with explicit dimensions, and add the CDN host to `next.config.js` `images.remotePatterns`.

**Accessibility and UX.** The primitives in `components/ui/` already supply focus-visible rings, 44px hit areas, `aria-busy` on loading buttons, portal-rendered modals with focus traps, and `prefers-reduced-motion` handling. Verify with keyboard-only navigation and a screen reader after any UI change, and re-check the header between 360px and 1200px — no nav link may wrap, shrink, or overlap.

**Testing.** No test suite ships with this project. The highest-value first tests are: server-side total recomputation in `orderController.createOrder` (the price-tampering guard), the `payment.succeeded` → `fulfilOrder` path, and auth session regeneration on login and signup.

## Database Provisioning

A mysql database has been automatically provisioned for this app.

- **Database:** app_clothing
- **Host:** testdb.gridiron-app.com
- **Port:** 3306
- **User:** clothing
- **Credentials stored in Vault at:** `secret/data/mysql/clothing`

Retrieve the password securely from Vault and set it as an environment variable (e.g. `DB_PASSWORD`) in your deployment settings — do not commit it to source control.


## Payments

This app takes payments through Flutterwave, PayPal, Paystack, Stripe in USD. The pre-built module is in `server/payments/`; what the app sells is defined in `server/payments/plans.js`.

**Before going live:**

1. Enter your payment keys in the **Payments** section of the Deploy dialog. They are stored in Vault and written to the backend's environment at deploy time, never into the code. Start with test keys.
2. **Flutterwave:** In the Flutterwave Dashboard open Settings → Webhooks, paste this URL, enter the secret hash shown below, and save. The Deploy dialog shows the URL to use.
3. **Paystack:** In the Paystack Dashboard open Settings → API Keys & Webhooks and paste this URL into the Webhook URL field for the mode you are using (test or live). The Deploy dialog shows the URL to use.
4. **Stripe:** save the Customer Portal settings once in the Stripe dashboard (Settings → Billing → Customer portal) so the "Manage subscription" button works.