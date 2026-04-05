'use strict';

/**
 * Role hierarchy (higher index = more privilege)
 *
 *   viewer   → can only read dashboard summaries & their own profile
 *   analyst  → can read records + all summary/analytics endpoints
 *   admin    → full CRUD on records AND user management
 */

const ROLE_LEVELS = { viewer: 1, analyst: 2, admin: 3 };

/**
 * requireRole(minRole)
 * Factory that returns middleware enforcing a minimum role level.
 *
 * Usage:  router.get('/path', authenticate, requireRole('analyst'), handler)
 */
function requireRole(minRole) {
  return (req, res, next) => {
    const userLevel = ROLE_LEVELS[req.user?.role] ?? 0;
    const required  = ROLE_LEVELS[minRole] ?? Infinity;

    if (userLevel < required) {
      return res.status(403).json({
        error: `Access denied — requires role '${minRole}' or higher (your role: '${req.user?.role}')`,
      });
    }
    next();
  };
}

/**
 * requireExactRoles(...roles)
 * Middleware that only allows the listed roles (no hierarchy).
 * Useful for admin-only endpoints.
 */
function requireExactRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        error: `Access denied — allowed roles: ${roles.join(', ')} (your role: '${req.user?.role}')`,
      });
    }
    next();
  };
}

module.exports = { requireRole, requireExactRoles, ROLE_LEVELS };
