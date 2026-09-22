'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const playerPasswordHash = await bcrypt.hash('Player@123', 10);

    const now = new Date();

    // Insert Users
    await queryInterface.bulkInsert('Users', [
      {
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        passwordHash: adminPasswordHash,
        role: 'admin',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 2,
        name: 'John Player',
        email: 'player@example.com',
        passwordHash: playerPasswordHash,
        role: 'player',
        createdAt: now,
        updatedAt: now
      }
    ], {});

    // Insert Sports
    await queryInterface.bulkInsert('Sports', [
      { id: 1, name: 'Cricket', userId: 1, createdAt: now, updatedAt: now },
      { id: 2, name: 'Football', userId: 1, createdAt: now, updatedAt: now },
      { id: 3, name: 'Badminton', userId: 1, createdAt: now, updatedAt: now },
      { id: 4, name: 'Basketball', userId: 1, createdAt: now, updatedAt: now },
      { id: 5, name: 'Tennis', userId: 1, createdAt: now, updatedAt: now }
    ], {});

    // Calculate dates for demo sessions:
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 3);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    // Insert Sessions (Creators are owners; participants join voluntarily)
    await queryInterface.bulkInsert('Sessions', [
      {
        id: 1,
        sportId: 1, // Cricket
        creatorId: 1, // Admin is creator
        date: tomorrowStr,
        time: '17:00',
        venue: 'City Sports Arena, Ground A',
        additionalPlayersNeeded: 10,
        status: 'scheduled',
        cancellationReason: null,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 2,
        sportId: 3, // Badminton
        creatorId: 2, // John Player is creator
        date: nextWeekStr,
        time: '18:30',
        venue: 'Metro Badminton Club, Court 2',
        additionalPlayersNeeded: 3,
        status: 'scheduled',
        cancellationReason: null,
        createdAt: now,
        updatedAt: now
      }
    ], {});

    // Insert SessionParticipants (John Player joined Cricket session)
    await queryInterface.bulkInsert('SessionParticipants', [
      {
        id: 1,
        sessionId: 1,
        userId: 2, // John Player joined Cricket session
        joinedAt: now,
        createdAt: now,
        updatedAt: now
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('SessionParticipants', null, {});
    await queryInterface.bulkDelete('Sessions', null, {});
    await queryInterface.bulkDelete('Sports', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};
