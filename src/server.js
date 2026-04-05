'use strict';

const app  = require('./app');
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`\n🚀  Finance Dashboard API`);
  console.log(`   Listening on http://localhost:${port}/api/v1`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${port}/api/v1/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received — shutting down gracefully');
  server.close(() => process.exit(0));
});

module.exports = server;
