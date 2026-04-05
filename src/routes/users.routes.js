'use strict';

const router = require('express').Router();
const {
  listUsers, getUser, createUser, updateUser, deleteUser,
} = require('../controllers/users.controller');
const { updateUserRules } = require('../validators/user.validator');
const { registerRules }   = require('../validators/auth.validator');
const { validate }        = require('../middleware/validate');
const { authenticate }    = require('../middleware/auth');
const { requireRole }     = require('../middleware/rbac');

// All user-management routes require authentication + admin role
router.use(authenticate, requireRole('admin'));

/**
 * GET  /users          — paginated list with optional ?role= ?status= filters
 * POST /users          — admin creates a user with any role
 */
router.route('/')
  .get(listUsers)
  .post(registerRules, validate, createUser);

/**
 * GET    /users/:id    — fetch single user
 * PATCH  /users/:id   — update name / role / status
 * DELETE /users/:id   — hard delete
 */
router.route('/:id')
  .get(getUser)
  .patch(updateUserRules, validate, updateUser)
  .delete(deleteUser);

module.exports = router;
