'use strict';

/**
 * 404 handler — mounted after all routers.
 */
function notFound(req, res, next) { // eslint-disable-line no-unused-vars
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

/**
 * Central error handler. Maps err.status / err.statusCode to the HTTP status
 * (defaulting to 500) and hides internal details in production.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number(err && (err.status || err.statusCode)) || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  const logPayload = {
    method: req && req.method,
    url: req && req.originalUrl,
    status,
    message: err && err.message,
  };

  if (status >= 500) {
    console.error('[error]', logPayload, (err && err.stack) || err);
  } else {
    console.warn('[warn]', logPayload);
  }

  let message = (err && err.message) || 'Internal server error';

  if (status >= 500 && isProduction) {
    message = 'Internal server error';
  }

  const body = { error: message };

  if (err && err.details) {
    body.details = err.details;
  }

  if (status >= 500 && !isProduction && err && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };