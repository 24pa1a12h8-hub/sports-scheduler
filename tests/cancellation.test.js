const request = require('supertest');
const { app, sequelize, resetDatabase, createAdmin, createPlayer, loginUser, Sport, Session, SessionParticipant } = require('./testHelper');

describe('Session Cancellation Suite', () => {
  let admin, creator, otherPlayer, sport, session;

  beforeEach(async () => {
    await resetDatabase();
    admin = await createAdmin('Admin User', 'admin@example.com', 'Pass123');
    creator = await createPlayer('Creator Player', 'creator@example.com', 'Pass123');
    otherPlayer = await createPlayer('Other Player', 'other@example.com', 'Pass123');
    sport = await Sport.create({ name: 'Cricket', userId: admin.id });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split('T')[0];

    session = await Session.create({
      sportId: sport.id,
      creatorId: creator.id,
      date: dateStr,
      time: '16:00',
      venue: 'City Oval',
      additionalPlayersNeeded: 10,
      status: 'scheduled'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should allow the session creator to cancel with a valid reason', async () => {
    const creatorAgent = request.agent(app);
    await loginUser(creatorAgent, 'creator@example.com', 'Pass123');

    const res = await creatorAgent
      .post(`/sessions/${session.id}/cancel`)
      .send({ cancellationReason: 'Heavy monsoon rains expected at the oval.' });

    expect(res.status).toBe(302);
    expect(res.header.location).toBe(`/sessions/${session.id}`);

    await session.reload();
    expect(session.status).toBe('cancelled');
    expect(session.cancellationReason).toBe('Heavy monsoon rains expected at the oval.');

    // Verify detail page displays the cancellation notice
    const detailRes = await creatorAgent.get(`/sessions/${session.id}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.text).toContain('This Session Has Been Cancelled');
    expect(detailRes.text).toContain('Heavy monsoon rains expected at the oval.');
  });

  it('should require a reason when cancelling', async () => {
    const creatorAgent = request.agent(app);
    await loginUser(creatorAgent, 'creator@example.com', 'Pass123');

    const res = await creatorAgent
      .post(`/sessions/${session.id}/cancel`)
      .send({ cancellationReason: '' });

    expect(res.status).toBe(302);

    await session.reload();
    expect(session.status).toBe('scheduled');
  });

  it('should prevent unauthorized users from cancelling someone else session', async () => {
    const otherAgent = request.agent(app);
    await loginUser(otherAgent, 'other@example.com', 'Pass123');

    const res = await otherAgent
      .post(`/sessions/${session.id}/cancel`)
      .send({ cancellationReason: 'I want to cancel this.' });

    expect(res.status).toBe(302);

    await session.reload();
    expect(session.status).toBe('scheduled');
  });

  it('should allow an administrator to cancel any session with a reason', async () => {
    const adminAgent = request.agent(app);
    await loginUser(adminAgent, 'admin@example.com', 'Pass123');

    const res = await adminAgent
      .post(`/sessions/${session.id}/cancel`)
      .send({ cancellationReason: 'Venue maintenance scheduled by stadium authority.' });

    expect(res.status).toBe(302);

    await session.reload();
    expect(session.status).toBe('cancelled');
    expect(session.cancellationReason).toBe('Venue maintenance scheduled by stadium authority.');
  });

  it('should prevent players from joining a cancelled session', async () => {
    // Cancel the session
    session.status = 'cancelled';
    session.cancellationReason = 'Maintenance';
    await session.save();

    const otherAgent = request.agent(app);
    await loginUser(otherAgent, 'other@example.com', 'Pass123');

    const res = await otherAgent.post(`/sessions/${session.id}/join`);
    expect(res.status).toBe(302);

    const detailRes = await otherAgent.get(`/sessions/${session.id}`);
    expect(detailRes.text).toContain('Cannot join a cancelled session');

    const count = await SessionParticipant.count({
      where: { sessionId: session.id, userId: otherPlayer.id }
    });
    expect(count).toBe(0);
  });
});
