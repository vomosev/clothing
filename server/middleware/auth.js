'use strict';

/**
 * Authentication middleware helpers.
 *
 * Sessions are created by server/controllers/authController.js which stores
 * { id, email, full_name } on req.session.user.
 */

/**
 * Returns the signed-in user as { id, email, fullName } or null.
 * Safe to call when no session middleware ran (returns null).
 */
function getSessionUser(req) {
  try {
    const user = req && req.session && req.session.user;
    if (!user || (user.id === undefined || user.id === null)) return null;
    return {
      id: user.id,
      email: user.email || null,
      fullName: user.full_name || user.fullName || null,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Express middleware: rejects the request with 401 when there is no session user.
 */
function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = user;
  return next();
}

/**
 * Express middleware: attaches req.user when present but never blocks.
 */
function attachUser(req, res, next) {
  req.user = getSessionUser(req);
  return next();
}

module.exports = { requireAuth, getSessionUser, attachUser };