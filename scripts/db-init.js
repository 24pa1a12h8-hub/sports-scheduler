'use strict';
require('dotenv').config();
const { execSync } = require('child_process');
const { sequelize, User } = require('../models');

async function waitForDb(maxRetries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sequelize.authenticate();
      console.log('Database connected successfully.');
      return;
    } catch (err) {
      console.warn(`Database connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt === maxRetries) {
        throw err;
      }
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
}

async function initDb() {
  console.log('Checking database connectivity...');
  await waitForDb();

  console.log('Running database migrations...');
  try {
    execSync('npx sequelize-cli db:migrate', {
      stdio: 'inherit',
      env: process.env
    });
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }

  // Check if seed data is needed
  try {
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('Database has no users. Running initial seeders...');
      execSync('npx sequelize-cli db:seed:all', {
        stdio: 'inherit',
        env: process.env
      });
      console.log('Seeders completed successfully.');
    } else {
      console.log(`Database already populated (${userCount} users found). Skipping seed.`);
    }
  } catch (err) {
    console.warn('Seeder verification notice:', err.message);
  }
}

if (require.main === module) {
  initDb()
    .then(() => {
      console.log('Database setup complete.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Database setup failed:', err);
      process.exit(1);
    });
}

module.exports = initDb;
