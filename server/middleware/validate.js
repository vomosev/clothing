'use strict';

/**
 * Small validation helpers shared by the controllers.
 * All "throwing" helpers throw an Error with a `status` property so that
 * server/middleware/errorHandler.js can map it to an HTTP response.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/**
 * Create an Error carrying an HTTP status code.
 * @param {string} message
 * @param {number} [status=400]
 * @returns {Error & { status: number }}
 */
function httpError(message, status = 400) {
  const err = new Error(message || 'Invalid request');
  err.status = status;
  err.statusCode = status;
  return err;
}

/**
 * True when the value looks like a valid email address.
 * @param {unknown} value
 * @returns {boolean}
 */
function isEmail(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return EMAIL_RE.test(trimmed);
}

/**
 * Normalise an email for storage/lookup (trimmed + lowercased).
 * @param {unknown} value
 * @returns {string}
 */
function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/**
 * Trim a value, coerce to string and clamp its length.
 * Returns an empty string for null/undefined/objects.
 * @param {unknown} value
 * @param {number} [maxLen=255]
 * @returns {string}
 */
function sanitizeString(value, maxLen = 255) {
  if (value === null || value === undefined) return '';
  let str;
  if (typeof value === 'string') {
    str = value;
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    str = String(value);
  } else {
    return '';
  }
  // Strip control characters that have no business in stored text.
  str = str.replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
  const limit = Number.isFinite(maxLen) && maxLen > 0 ? Math.floor(maxLen) : 255;
  if (str.length > limit) str = str.slice(0, limit).trim();
  return str;
}

/**
 * Ensure every named field is present and non-empty on the body.
 * Throws a 400 error listing the missing fields.
 * @param {Record<string, unknown>} body
 * @param {string[]} fields
 * @returns {Record<string, unknown>} the body (for chaining)
 */
function requireFields(body, fields) {
  const source = body && typeof body === 'object' ? body : {};
  const list = Array.isArray(fields) ? fields : [];
  const missing = [];

  for (const field of list) {
    const value = source[field];
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0)
    ) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw httpError(
      `Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
      400
    );
  }

  return source;
}

/**
 * Parse a value into a positive integer, falling back when invalid.
 * @param {unknown} value
 * @param {number} [fallback=1]
 * @param {{ min?: number, max?: number }} [options]
 * @returns {number}
 */
function toPositiveInt(value, fallback = 1, options = {}) {
  const min = Number.isFinite(options.min) ? Math.floor(options.min) : 1;
  const max = Number.isFinite(options.max) ? Math.floor(options.max) : Number.MAX_SAFE_INTEGER;

  let parsed;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    parsed = Number(value.trim());
  } else {
    parsed = NaN;
  }

  if (!Number.isFinite(parsed)) {
    parsed = Number(fallback);
  }

  parsed = Math.floor(parsed);

  if (!Number.isFinite(parsed) || parsed < min) {
    const fallbackInt = Math.floor(Number(fallback));
    parsed = Number.isFinite(fallbackInt) && fallbackInt >= min ? fallbackInt : min;
  }

  if (parsed > max) parsed = max;
  return parsed;
}

/**
 * Validate a password, throwing a 400 when it is too short/long.
 * @param {unknown} value
 * @param {number} [minLen=8]
 * @returns {string}
 */
function requirePassword(value, minLen = 8) {
  if (typeof value !== 'string' || value.length < minLen) {
    throw httpError(`Password must be at least ${minLen} characters long`, 400);
  }
  if (value.length > 200) {
    throw httpError('Password is too long', 400);
  }
  return value;
}

/**
 * Validate an email, throwing a 400 when it is malformed.
 * @param {unknown} value
 * @returns {string} normalised email
 */
function requireEmail(value) {
  if (!isEmail(value)) {
    throw httpError('A valid email address is required', 400);
  }
  return normalizeEmail(value);
}

/**
 * Pick one of a set of allowed values, otherwise return the fallback.
 * @param {unknown} value
 * @param {string[]} allowed
 * @param {string} fallback
 * @returns {string}
 */
function oneOf(value, allowed, fallback) {
  const list = Array.isArray(allowed) ? allowed : [];
  const str = typeof value === 'string' ? value.trim() : '';
  return list.includes(str) ? str : fallback;
}

module.exports = {
  httpError,
  isEmail,
  normalizeEmail,
  requireEmail,
  requireFields,
  requirePassword,
  sanitizeString,
  toPositiveInt,
  oneOf,
};