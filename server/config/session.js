'use strict';

const session = require('express-session');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Build the express-session middleware.
 *
 * The frontend (clothing.arx-app.com) and the API (clothing-api.arx-app.com)
 * live on different hosts of the same registrable domain, so the session
 * cookie is issued with an explicit domain and SameSite=None when TLS is on.
 */
function createSessionMiddleware() {
  const secure = process.env.SSL_ENABLED === 'true';
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // Fail fast: an unsigned session in production would be a security hole.
      throw new Error('SESSION_SECRET must be set in production');
    }
    // eslint-disable-next-line no-console
    console.warn(
      '[session] SESSION_SECRET is not set — falling back to an insecure development secret.'
    );
  }

  const domain =
    typeof process.env.SESSION_COOKIE_DOMAIN === 'string' &&
    process.env.SESSION_COOKIE_DOMAIN.trim() !== ''
      ? process.env.SESSION_COOKIE_DOMAIN.trim()
      : undefined;

  return session({
    name: 'clothing.sid',
    secret: secret || 'dev-only-insecure-session-secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure,
      sameSite: secure ? 'none' : 'lax',
      domain,
      path: '/',
      maxAge: SEVEN_DAYS_MS,
    },
  });
}

module.exports = createSessionMiddleware;
module.exports.createSessionMiddleware = createSessionMiddleware;
module.exports.SEVEN_DAYS_MS = SEVEN_DAYS_MS;