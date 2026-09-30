require('dotenv/config');

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const https = require('https');

const payments = require('./payments');

const { checkDatabaseConnection } = require('./config/db');
const createSessionMiddleware = require('./config/session');
const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const orderController = require('./controllers/orderController');

const app = express();

// Payment webhooks MUST be attached before cors / body parsers.
payments.attachPaymentWebhooks(app);

const extraOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const ARX_HOST_PATTERN = /^https?:\/\/([a-z0-9-]+\.)*arx-app\.com(:\d+)?$/i;
const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin, curl, server-to-server
  if (ARX_HOST_PATTERN.test(origin)) return true;
  if (LOCALHOST_PATTERN.test(origin)) return true;
  return extraOrigins.includes(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(createSessionMiddleware());

app.get('/health', async (req, res) => {
  let db = 'down';
  try {
    const ok = await checkDatabaseConnection();
    db = ok ? 'up' : 'down';
  } catch (err) {
    db = 'down';
  }
  res.json({ status: 'ok', db, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

payments.attachPaymentRoutes(app, {
  getUser: (req) =>
    req.session && req.session.user
      ? { id: req.session.user.id, email: req.session.user.email }
      : null,
});

payments.on('payment.succeeded', async (event) => {
  try {
    const reference = event && (event.itemId || event.reference);
    if (!reference) return;
    if (typeof orderController.fulfilOrder === 'function') {
      await orderController.fulfilOrder(reference);
    }
  } catch (err) {
    console.error('[payments] failed to fulfil order:', err && err.message ? err.message : err);
  }
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;

let server;
if (process.env.SSL_ENABLED === 'true') {
  try {
    server = https.createServer(
      {
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        ...(process.env.SSL_CA_PATH ? { ca: fs.readFileSync(process.env.SSL_CA_PATH) } : {}),
      },
      app
    );
  } catch (err) {
    console.error('[server] Failed to start HTTPS, falling back to HTTP:', err.message);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] MONOLITH API listening on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('[server] listen error:', err && err.message ? err.message : err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[server] uncaught exception:', err);
});

module.exports = app;