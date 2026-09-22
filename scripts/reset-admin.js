require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User, sequelize } = require('../models');

async function resetAdmin() {
  const email = (process.argv[2] || 'admin@example.com').trim().toLowerCase();
  const newPassword = process.argv[3] || 'Admin@123';

  if (!newPassword || newPassword.length < 6) {
    console.error('Error: Password must be at least 6 characters.');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    let admin = await User.findOne({ where: { email } });

    const passwordHash = await bcrypt.hash(newPassword, 10);

    if (admin) {
      admin.passwordHash = passwordHash;
      admin.role = 'admin'; // ensure role is admin
      await admin.save();
      console.log(`Successfully updated admin user:`);
      console.log(`  ID:       ${admin.id}`);
      console.log(`  Name:     ${admin.name}`);
      console.log(`  Email:    ${admin.email}`);
      console.log(`  Role:     ${admin.role}`);
      console.log(`  Password: (set to provided password)`);
    } else {
      admin = await User.create({
        name: 'Admin User',
        email,
        passwordHash,
        role: 'admin'
      });
      console.log(`Created new admin user:`);
      console.log(`  ID:       ${admin.id}`);
      console.log(`  Email:    ${admin.email}`);
      console.log(`  Role:     ${admin.role}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Failed to reset admin:', err);
    process.exit(1);
  }
}

resetAdmin();
