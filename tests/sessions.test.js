const request = require('supertest');
const { app, sequelize, resetDatabase, createAdmin, createPlayer, loginUser, Sport, Session, SessionParticipant } = require('./testHelper');

describe('Sessions Creation & Display Suite', () => {
  let admin, player, sport, tennisSport;

  beforeEach(async () => {
    await resetDatabase();
    admin = await createAdmin('Admin User', 'admin@example.com', 'Password123');
    player = await createPlayer('Player User', 'player@example.com', 'Password123');
    sport = await Sport.create({ name: 'Basketball', userId: admin.id });
    tennisSport = await Sport.create({ name: 'Tennis', userId: admin.id });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should allow an authenticated player to create a session without automatically adding them as participant', async () => {
    const playerAgent = request.agent(app);
    await loginUser(playerAgent, 'player@example.com', 'Password123');

    // Future date: tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await playerAgent
      .post('/sessions')
      .send({
        sportId: sport.id,
        date: dateStr,
        time: '19:00',
        venue: 'Downtown Basketball Court #1',
        additionalPlayersNeeded: 5
      });

    expect(res.status).toBe(302);

    const session = await Session.findOne({ where: { venue: 'Downtown Basketball Court #1' } });
    expect(session).not.toBeNull();
    expect(session.creatorId).toBe(player.id);
    expect(session.additionalPlayersNeeded).toBe(5);
    expect(session.status).toBe('scheduled');

    // Verify creator is NOT automatically enrolled as participant
    const participant = await SessionParticipant.findOne({
      where: { sessionId: session.id, userId: player.id }
    });
    expect(participant).toBeNull();
  });

  it('should allow an admin to create a session without automatically adding them as participant', async () => {
    const adminAgent = request.agent(app);
    await loginUser(adminAgent, 'admin@example.com', 'Password123');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await adminAgent
      .post('/sessions')
      .send({
        sportId: tennisSport.id,
        date: dateStr,
        time: '10:00',
        venue: 'Grand Slam Court',
        additionalPlayersNeeded: 3
      });

    expect(res.status).toBe(302);

    const session = await Session.findOne({ where: { venue: 'Grand Slam Court' } });
    expect(session).not.toBeNull();
    expect(session.creatorId).toBe(admin.id);

    // Verify admin is NOT automatically enrolled
    const participant = await SessionParticipant.findOne({
      where: { sessionId: session.id, userId: admin.id }
    });
    expect(participant).toBeNull();
  });

  it('should reject session creation with a past date/time', async () => {
    const playerAgent = request.agent(app);
    await loginUser(playerAgent, 'player@example.com', 'Password123');

    const res = await playerAgent
      .post('/sessions')
      .send({
        sportId: sport.id,
        date: '2020-01-01',
        time: '10:00',
        venue: 'Old Court',
        additionalPlayersNeeded: 2
      });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Cannot schedule a session in the past');

    const count = await Session.count({ where: { venue: 'Old Court' } });
    expect(count).toBe(0);
  });

  it('should reject session creation if venue is missing or players needed is negative', async () => {
    const playerAgent = request.agent(app);
    await loginUser(playerAgent, 'player@example.com', 'Password123');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await playerAgent
      .post('/sessions')
      .send({
        sportId: sport.id,
        date: dateStr,
        time: '19:00',
        venue: '',
        additionalPlayersNeeded: -3
      });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Venue location is required');
  });

  it('should support server-side filtering by sport, date, and venue', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 5);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    // Session 1: Basketball at City Court
    await Session.create({
      sportId: sport.id,
      creatorId: admin.id,
      date: tomorrowStr,
      time: '18:00',
      venue: 'City Court',
      additionalPlayersNeeded: 4,
      status: 'scheduled'
    });

    // Session 2: Tennis at Metro Arena
    await Session.create({
      sportId: tennisSport.id,
      creatorId: admin.id,
      date: nextWeekStr,
      time: '09:00',
      venue: 'Metro Arena',
      additionalPlayersNeeded: 2,
      status: 'scheduled'
    });

    const playerAgent = request.agent(app);
    await loginUser(playerAgent, 'player@example.com', 'Password123');

    // 1. Filter by sport (Basketball)
    const sportFilterRes = await playerAgent.get(`/sessions?tab=available&sport=${sport.id}`);
    expect(sportFilterRes.status).toBe(200);
    expect(sportFilterRes.text).toContain('City Court');
    expect(sportFilterRes.text).not.toContain('Metro Arena');

    // 2. Filter by venue (Metro)
    const venueFilterRes = await playerAgent.get('/sessions?tab=available&venue=Metro');
    expect(venueFilterRes.status).toBe(200);
    expect(venueFilterRes.text).toContain('Metro Arena');
    expect(venueFilterRes.text).not.toContain('City Court');

    // 3. Filter by date (tomorrowStr)
    const dateFilterRes = await playerAgent.get(`/sessions?tab=available&date=${tomorrowStr}`);
    expect(dateFilterRes.status).toBe(200);
    expect(dateFilterRes.text).toContain('City Court');
    expect(dateFilterRes.text).not.toContain('Metro Arena');

    // 4. Filter with no match
    const noMatchRes = await playerAgent.get('/sessions?tab=available&venue=NonExistentVenue');
    expect(noMatchRes.status).toBe(200);
    expect(noMatchRes.text).toContain('No sessions found matching your filters.');
  });
});
