'use strict';

const router = require('express').Router();
const { register, login, me } = require('../controllers/auth.controller');
const { registerRules, loginRules } = require('../validators/auth.validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

/**
 * POST /auth/register
 * Public — self-registration (role defaults to viewer)
 */
router.post('/register', registerRules, validate, register);

/**
 * POST /auth/login
 * Public — returns JWT
 */
router.post('/login', loginRules, validate, login);

/**
 * GET /auth/me
 * Protected — returns current user profile
 */
router.get('/me', authenticate, me);

module.exports = router;
