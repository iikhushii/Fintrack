'use strict';

const router = require('express').Router();

router.use('/auth',         require('./auth.routes'));
router.use('/users',        require('./users.routes'));
router.use('/transactions', require('./transactions.routes'));
router.use('/dashboard',    require('./dashboard.routes'));
router.use('/seed',         require('./seed.routes'));

// Health-check (no auth required)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
