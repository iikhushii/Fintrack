'use strict';

const { body, query, param } = require('express-validator');

const VALID_CATEGORIES = [
  'Salary','Freelance','Investment','Rent','Groceries',
  'Utilities','Entertainment','Travel','Healthcare','Education','Other',
];

const createRules = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),

  body('type')
    .notEmpty().withMessage('Type is required')
    .isIn(['income', 'expense']).withMessage('Type must be income or expense'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(VALID_CATEGORIES).withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid ISO date (YYYY-MM-DD)')
    .toDate(),

  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

const updateRules = [
  body('amount')
    .optional()
    .isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),

  body('type')
    .optional()
    .isIn(['income', 'expense']).withMessage('Type must be income or expense'),

  body('category')
    .optional()
    .isIn(VALID_CATEGORIES).withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid ISO date (YYYY-MM-DD)')
    .toDate(),

  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

const filterRules = [
  query('type').optional().isIn(['income', 'expense']).withMessage('type must be income or expense'),
  query('category').optional().isIn(VALID_CATEGORIES).withMessage('Invalid category'),
  query('from').optional().isISO8601().withMessage('from must be a valid date'),
  query('to').optional().isISO8601().withMessage('to must be a valid date'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100').toInt(),
  query('sort').optional().isIn(['date_asc','date_desc','amount_asc','amount_desc']).withMessage('Invalid sort option'),
];

module.exports = { createRules, updateRules, filterRules, VALID_CATEGORIES };
