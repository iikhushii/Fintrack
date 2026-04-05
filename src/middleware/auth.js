'use strict';

const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

/**
 * authenticate
 * Validates the Bearer JWT in the Authorization header.
 * Attaches the full user record to req.user on success.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }

  const db   = getDb();
  const user = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(payload.sub);

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  if (user.status === 'inactive') {
    return res.status(403).json({ error: 'Account is deactivated' });
  }

  req.user = user;
  next();
}

module.exports = { authenticate };
