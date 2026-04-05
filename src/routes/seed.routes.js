'use strict';

const router = require('express').Router();
const { seedDatabase } = require('../controllers/seed.controller');

/**
 * POST /api/v1/seed
 *
 * No authentication required — intended for first-run database population
 * in environments where shell access is unavailable (e.g. Railway).
 * The underlying seed uses INSERT OR IGNORE, so repeated calls are safe.
 */
router.post('/', seedDatabase);

module.exports = router;
