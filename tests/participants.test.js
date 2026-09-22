const request = require('supertest');
const { app, sequelize, resetDatabase, createAdmin, createPlayer, loginUser, Sport, Session, SessionParticipant } = require('./testHelper');

describe('Session Participants & Joining Suite', () => {
  let admin, host, player1, player2, sport, futureSession;

  beforeEach(async () => {
    await resetDatabase();
    admin = await createAdmin('Admin', 'admin@test.com', 'Pass123');
    host = await createPlayer('Host Player', 'host@test.com', 'Pass123');
    player1 = await createPlayer('Player One', 'player1@test.com', 'Pass123');
    player2 = await createPlayer('Player Two', 'player2@test.com', 'Pass123');
    sport = await Sport.create({ name: 'Football', userId: admin.id });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Session with 1 slot needed
    futureSession = await Session.create({
      sportId: sport.id,
      creatorId: host.id,
      date: dateStr,
      time: '18:00',
      venue: 'Main Stadium',
      additionalPlayersNeeded: 1,
      status: 'scheduled'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should allow session creator to voluntarily join their own created session', async () => {
    const hostAgent = request.agent(app);
    await loginUser(hostAgent, 'host@test.com', 'Pass123');

    // 1. Before joining, creator should see the join option and not be in participant list
    const beforeRes = await hostAgent.get(`/sessions/${futureSession.id}`);
    expect(beforeRes.status).toBe(200);
    expect(beforeRes.text).toContain('Join This Match');
    expect(beforeRes.text).not.toContain('You Have Joined');
    expect(beforeRes.text).not.toContain('Joined</span>');

    // 2. Creator clicks Join Session
    const joinRes = await hostAgent.post(`/sessions/${futureSession.id}/join`);
    expect(joinRes.status).toBe(302);
    expect(joinRes.header.location).toBe(`/sessions/${futureSession.id}`);

    // 3. Creator is now in DB as participant
    const participant = await SessionParticipant.findOne({
      where: { sessionId: futureSession.id, userId: host.id }
    });
    expect(participant).not.toBeNull();

    // 4. Detail page now displays creator in participant roster
    const afterRes = await hostAgent.get(`/sessions/${futureSession.id}`);
    expect(afterRes.status).toBe(200);
    expect(afterRes.text).toContain('Host Player');
    expect(afterRes.text).toContain('Organizer');
    expect(afterRes.text).toContain('You Have Joined');
    expect(afterRes.text).toContain('Remaining slots:');
    expect(afterRes.text).toContain('0'); // 1 slot total - 1 filled = 0 remaining
  });

  it('should allow admin to voluntarily join a session they created', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const adminSession = await Session.create({
      sportId: sport.id,
      creatorId: admin.id,
      date: dateStr,
      time: '15:00',
      venue: 'Admin Arena',
      additionalPlayersNeeded: 2,
      status: 'scheduled'
    });

    const adminAgent = request.agent(app);
    await loginUser(adminAgent, 'admin@test.com', 'Pass123');

    // Admin joins session
    const res = await adminAgent.post(`/sessions/${adminSession.id}/join`);
    expect(res.status).toBe(302);

    const participant = await SessionParticipant.findOne({
      where: { sessionId: adminSession.id, userId: admin.id }
    });
    expect(participant).not.toBeNull();

    const detailRes = await adminAgent.get(`/sessions/${adminSession.id}`);
    expect(detailRes.text).toContain('Admin');
    expect(detailRes.text).toContain('You Have Joined');
  });

  it('should prevent player or creator from joining the same session twice', async () => {
    const agent = request.agent(app);
    await loginUser(agent, 'player1@test.com', 'Pass123');

    // First join
    await agent.post(`/sessions/${futureSession.id}/join`);

    // Second join attempt
    const secondRes = await agent.post(`/sessions/${futureSession.id}/join`);
    expect(secondRes.status).toBe(302);

    const detailRes = await agent.get(`/sessions/${futureSession.id}`);
    expect(detailRes.text).toContain('You have already joined this session');

    const count = await SessionParticipant.count({
      where: { sessionId: futureSession.id, userId: player1.id }
    });
    expect(count).toBe(1);
  });

  it('should prevent joining when session is full', async () => {
    // Player 1 fills the only slot
    await SessionParticipant.create({
      sessionId: futureSession.id,
      userId: player1.id
    });

    const agent2 = request.agent(app);
    await loginUser(agent2, 'player2@test.com', 'Pass123');

    const res = await agent2.post(`/sessions/${futureSession.id}/join`);
    expect(res.status).toBe(302);

    const detailRes = await agent2.get(`/sessions/${futureSession.id}`);
    expect(detailRes.text).toContain('This session is already full');

    const count = await SessionParticipant.count({
      where: { sessionId: futureSession.id, userId: player2.id }
    });
    expect(count).toBe(0);
  });

  it('should prevent joining past sessions', async () => {
    const pastSession = await Session.create({
      sportId: sport.id,
      creatorId: host.id,
      date: '2021-01-01',
      time: '10:00',
      venue: 'Past Field',
      additionalPlayersNeeded: 5,
      status: 'scheduled'
    });

    const agent = request.agent(app);
    await loginUser(agent, 'player1@test.com', 'Pass123');

    const res = await agent.post(`/sessions/${pastSession.id}/join`);
    expect(res.status).toBe(302);

    const detailRes = await agent.get(`/sessions/${pastSession.id}`);
    expect(detailRes.text).toContain('This session has already started or taken place');
  });

  it('should block player or admin from joining multiple sessions at the same date and time with exact warning', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Session 2 at same date and time
    const conflictingSession = await Session.create({
      sportId: sport.id,
      creatorId: admin.id,
      date: dateStr,
      time: '18:00', // same date and time as futureSession
      venue: 'Alternative Arena',
      additionalPlayersNeeded: 5,
      status: 'scheduled'
    });

    const agent = request.agent(app);
    await loginUser(agent, 'player1@test.com', 'Pass123');

    // Join first session
    await agent.post(`/sessions/${futureSession.id}/join`);

    // Attempt to join conflicting session
    const conflictRes = await agent.post(`/sessions/${conflictingSession.id}/join`);
    expect(conflictRes.status).toBe(302);

    const detailRes = await agent.get(`/sessions/${conflictingSession.id}`);
    expect(detailRes.text).toContain(
      'You are already participating in another session at this date and time. You cannot join multiple sessions at the same time.'
    );
  });
});
