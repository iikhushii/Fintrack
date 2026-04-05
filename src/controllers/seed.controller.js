'use strict';

const { runSeed } = require('../config/seed');

/**
 * POST /api/v1/seed
 *
 * Runs the database seed. Uses INSERT OR IGNORE throughout, so calling this
 * endpoint more than once is safe — existing rows are left untouched.
 */
async function seedDatabase(req, res, next) {
  try {
    const result = await runSeed();

    res.status(200).json({
      message: 'Database seeded successfully',
      seeded: {
        users: result.usersSeeded,
        transactions: result.transactionsSeeded,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { seedDatabase };
