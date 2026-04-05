'use strict';

/**
 * Global error handler.
 * Catches anything passed to next(err) or thrown synchronously inside Express routes.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';

  // SQLite unique constraint violation
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'A record with those details already exists' });
  }

  // SQLite foreign key violation
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(400).json({ error: 'Referenced resource does not exist' });
  }

  const status  = err.statusCode || err.status || 500;
  const message = err.message    || 'Internal server error';

  console.error(`[${new Date().toISOString()}] ${status} — ${message}`);
  if (isDev && err.stack) console.error(err.stack);

  res.status(status).json({
    error: message,
    ...(isDev && { stack: err.stack }),
  });
}

/** Convenience factory to create an operational error with a status code */
function createError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { errorHandler, createError };
