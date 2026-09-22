const request = require('supertest');
const { app, sequelize, resetDatabase, createAdmin, createPlayer, loginUser, Sport } = require('./testHelper');

describe('Sports Management Suite (Admin)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should allow admin to create a new sport', async () => {
    await createAdmin('Admin User', 'admin@example.com', 'Password123');
    const adminAgent = request.agent(app);
    await loginUser(adminAgent, 'admin@example.com', 'Password123');

    const res = await adminAgent
      .post('/admin/sports')
      .send({ name: 'Table Tennis' });

    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/admin/sports');

    const sport = await Sport.findOne({ where: { name: 'Table Tennis' } });
    expect(sport).not.toBeNull();
    expect(sport.name).toBe('Table Tennis');
  });

  it('should allow admin to edit an existing sport', async () => {
    const admin = await createAdmin('Admin User', 'admin@example.com', 'Password123');
    const sport = await Sport.create({ name: 'Soccer', userId: admin.id });

    const adminAgent = request.agent(app);
    await loginUser(adminAgent, 'admin@example.com', 'Password123');

    const res = await adminAgent
      .post(`/admin/sports/${sport.id}/edit`)
      .send({ name: 'Association Football' });

    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/admin/sports');

    await sport.reload();
    expect(sport.name).toBe('Association Football');
  });

  it('should block non-admin players from creating sports', async () => {
    await createPlayer('Regular Player', 'player@example.com', 'Password123');
    const playerAgent = request.agent(app);
    await loginUser(playerAgent, 'player@example.com', 'Password123');

    const res = await playerAgent
      .post('/admin/sports')
      .send({ name: 'Unauthorized Sport' });

    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/dashboard');

    const count = await Sport.count({ where: { name: 'Unauthorized Sport' } });
    expect(count).toBe(0);
  });
});
