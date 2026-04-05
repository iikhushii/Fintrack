'use strict';

const router = require('express').Router();
const {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactions.controller');
const { createRules, updateRules, filterRules } = require('../validators/transaction.validator');
const { validate }     = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireRole }  = require('../middleware/rbac');

// All transaction routes require a valid JWT
router.use(authenticate);

/**
 * GET  /transactions
 *   Viewer   ✓  read-only
 *   Analyst  ✓  read-only
 *   Admin    ✓  read-only
 *
 * POST /transactions
 *   Viewer   ✗  403
 *   Analyst  ✓
 *   Admin    ✓
 */
router.route('/')
  .get(filterRules, validate, listTransactions)
  .post(requireRole('analyst'), createRules, validate, createTransaction);

/**
 * GET    /transactions/:id  — all roles
 * PATCH  /transactions/:id  — analyst+
 * DELETE /transactions/:id  — admin only (soft delete)
 */
router.route('/:id')
  .get(getTransaction)
  .patch(requireRole('analyst'), updateRules, validate, updateTransaction)
  .delete(requireRole('admin'), deleteTransaction);

module.exports = router;
