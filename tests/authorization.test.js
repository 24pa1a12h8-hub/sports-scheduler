const request = require('supertest');
const { app, sequelize, resetDatabase, createAdmin, createPlayer, loginUser } = require('./testHelper');

describe('Role-Based Authorization Suite', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should redirect unauthenticated users away from protected pages', async () => {
    const protectedUrls = ['/dashboard', '/sessions', '/sessions/new', '/admin/sports', '/admin/reports'];

    for (const url of protectedUrls) {
      const res = await request(app).get(url);
      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/login');
    }
  });

  it('should block normal players from accessing admin dashboard or admin sports', async () => {
    await createPlayer('Regular Player', 'player@example.com', 'Password123');
    const playerAgent = request.agent(app);
    await loginUser(playerAgent, 'player@example.com', 'Password123');

    // Attempt admin dashboard
    const adminDashRes = await playerAgent.get('/admin/dashboard');
    expect(adminDashRes.status).toBe(302);
    expect(adminDashRes.header.location).toBe('/dashboard');

    // Attempt admin sports management
    const adminSportsRes = await playerAgent.get('/admin/sports');
    expect(adminSportsRes.status).toBe(302);
    expect(adminSportsRes.header.location).toBe('/dashboard');

    // Attempt admin reports
    const adminReportsRes = await playerAgent.get('/admin/reports');
    expect(adminReportsRes.status).toBe(302);
    expect(adminReportsRes.header.location).toBe('/dashboard');
  });

  it('should allow admin users full access to admin dashboard, sports, and reports', async () => {
    await createAdmin('Super Admin', 'admin@example.com', 'Password123');
    const adminAgent = request.agent(app);
    await loginUser(adminAgent, 'admin@example.com', 'Password123');

    const adminDashRes = await adminAgent.get('/admin/dashboard');
    expect(adminDashRes.status).toBe(200);
    expect(adminDashRes.text).toContain('Administrator Hub');

    const adminSportsRes = await adminAgent.get('/admin/sports');
    expect(adminSportsRes.status).toBe(200);
    expect(adminSportsRes.text).toContain('Manage Sports');

    const adminReportsRes = await adminAgent.get('/admin/reports');
    expect(adminReportsRes.status).toBe(200);
    expect(adminReportsRes.text).toContain('Analytics & Popularity Reports');
  });
});
