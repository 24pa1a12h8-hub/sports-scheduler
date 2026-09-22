const request = require('supertest');
const { app, sequelize, resetDatabase, createAdmin, createPlayer, loginUser, Sport, Session } = require('./testHelper');

describe('Admin Reports & Popularity Analytics Suite', () => {
  let admin, player, sport1, sport2;

  beforeEach(async () => {
    await resetDatabase();
    admin = await createAdmin('Admin User', 'admin@example.com', 'Pass123');
    player = await createPlayer('Player User', 'player@example.com', 'Pass123');

    sport1 = await Sport.create({ name: 'Badminton', userId: admin.id });
    sport2 = await Sport.create({ name: 'Tennis', userId: admin.id });

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Create 2 Badminton sessions and 1 Tennis session
    await Session.create({
      sportId: sport1.id,
      creatorId: admin.id,
      date: dateStr,
      time: '08:00',
      venue: 'Court 1',
      additionalPlayersNeeded: 2,
      status: 'scheduled'
    });

    await Session.create({
      sportId: sport1.id,
      creatorId: player.id,
      date: dateStr,
      time: '10:00',
      venue: 'Court 2',
      additionalPlayersNeeded: 2,
      status: 'scheduled'
    });

    await Session.create({
      sportId: sport2.id,
      creatorId: player.id,
      date: dateStr,
      time: '14:00',
      venue: 'Tennis Court A',
      additionalPlayersNeeded: 2,
      status: 'scheduled'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should calculate total sessions and sport popularity breakdown accurately', async () => {
    const adminAgent = request.agent(app);
    await loginUser(adminAgent, 'admin@example.com', 'Pass123');

    const res = await adminAgent.get('/admin/reports');
    expect(res.status).toBe(200);

    // Total sessions should be 3
    expect(res.text).toContain('Total Sessions in Period');
    expect(res.text).toContain('3');

    // Badminton: 2 sessions (66.7%)
    expect(res.text).toContain('Badminton');
    expect(res.text).toContain('2 sessions');
    expect(res.text).toContain('66.7%');

    // Tennis: 1 session (33.3%)
    expect(res.text).toContain('Tennis');
    expect(res.text).toContain('1 sessions');
    expect(res.text).toContain('33.3%');
  });

  it('should support custom date range filtering', async () => {
    const adminAgent = request.agent(app);
    await loginUser(adminAgent, 'admin@example.com', 'Pass123');

    // Filter for a future period with no sessions
    const res = await adminAgent.get('/admin/reports?startDate=2030-01-01&endDate=2030-01-31');
    expect(res.status).toBe(200);
    expect(res.text).toContain('0'); // 0 sessions in that window
  });
});
