'use strict';

const router = require('express').Router();
const {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
  getWeeklyTrend,
  getRecentActivity,
  getCurrentMonth,
} = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole }  = require('../middleware/rbac');

router.use(authenticate);

/**
 * Summary — available to all authenticated users (viewer+)
 *   ?from=YYYY-MM-DD  &to=YYYY-MM-DD  (optional date range)
 */
router.get('/summary',       getSummary);
router.get('/current-month', getCurrentMonth);

/**
 * Analytics — analyst+ only
 *   These are richer aggregated endpoints viewers shouldn't access.
 */
router.get('/category-breakdown', requireRole('analyst'), getCategoryBreakdown);
router.get('/monthly-trend',      requireRole('analyst'), getMonthlyTrend);
router.get('/weekly-trend',       requireRole('analyst'), getWeeklyTrend);
router.get('/recent-activity',    requireRole('analyst'), getRecentActivity);

module.exports = router;
