'use strict';

const { validationResult } = require('express-validator');

/**
 * validate
 * Reads express-validator results and short-circuits with 422 on errors.
 * Always placed AFTER the validation chain in a route definition.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = { validate };
