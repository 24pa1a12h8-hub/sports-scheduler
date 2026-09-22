const { Session, Sport, User, SessionParticipant, sequelize } = require('../models');
const { Op } = require('sequelize');

// Helper to determine if a session date/time is in the past
function isSessionInPast(dateStr, timeStr) {
  const sessionDateTime = new Date(`${dateStr}T${timeStr}`);
  return sessionDateTime <= new Date();
}

// GET /sessions - View sessions catalog with tabs/sections and server-side filtering
exports.getSessions = async (req, res) => {
  try {
    const tab = req.query.tab || 'available';
    const userId = req.user.id;

    const { sport, date, venue, search } = req.query;
    const hasActiveFilters = Boolean((sport && sport.trim()) || (date && date.trim()) || (venue && venue.trim()) || (search && search.trim()));

    // Fetch all sports for filter dropdown
    const sports = await Sport.findAll({ order: [['name', 'ASC']] });

    // Build database where clause for server-side filtering
    const whereClause = {};

    if (sport && sport.trim()) {
      whereClause.sportId = parseInt(sport.trim(), 10);
    }

    if (date && date.trim()) {
      whereClause.date = date.trim();
    }

    if (venue && venue.trim()) {
      whereClause.venue = { [Op.like]: `%${venue.trim()}%` };
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereClause[Op.or] = [
        { venue: { [Op.like]: searchTerm } },
        { '$sport.name$': { [Op.like]: searchTerm } }
      ];
    }

    // Query sessions from database matching filters
    const sessions = await Session.findAll({
      where: whereClause,
      include: [
        { model: Sport, as: 'sport' },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'participants', attributes: ['id', 'name', 'email'] }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']]
    });

    // Partition sessions
    const availableSessions = [];
    const myCreatedSessions = [];
    const myJoinedSessions = [];
    const pastSessions = [];

    sessions.forEach(s => {
      const isPast = isSessionInPast(s.date, s.time);
      const isCreator = s.creatorId === userId;
      const isParticipant = s.participants.some(p => p.id === userId);
      const remainingSlots = Math.max(0, s.additionalPlayersNeeded - s.participants.length);

      // Attach computed fields
      s.totalCapacity = s.additionalPlayersNeeded;
      s.isPast = isPast;
      s.remainingSlots = remainingSlots;
      s.isUserJoined = isParticipant;
      s.isUserCreator = isCreator;

      if (isCreator) {
        myCreatedSessions.push(s);
      }
      if (isParticipant) {
        myJoinedSessions.push(s);
      }

      if (isPast) {
        pastSessions.push(s);
      } else if (s.status !== 'cancelled' && remainingSlots > 0 && !isParticipant && !isCreator) {
        availableSessions.push(s);
      }
    });

    res.render('sessions/index', {
      title: 'Sessions - Sports Scheduler',
      activeTab: tab,
      sports,
      availableSessions,
      myCreatedSessions,
      myJoinedSessions,
      pastSessions,
      allSessions: sessions,
      filters: {
        sport: sport || '',
        date: date || '',
        venue: venue || '',
        search: search || ''
      },
      hasActiveFilters
    });
  } catch (err) {
    console.error('Error fetching sessions:', err);
    req.flash('error_msg', 'Failed to retrieve sessions.');
    res.redirect('/dashboard');
  }
};

// GET /sessions/new - Show create session form
exports.getNewSession = async (req, res) => {
  try {
    const sports = await Sport.findAll({ order: [['name', 'ASC']] });
    if (sports.length === 0) {
      req.flash('error_msg', 'No sports are currently available. An admin must create a sport first.');
      return res.redirect('/sessions');
    }

    const today = new Date().toISOString().split('T')[0];

    res.render('sessions/new', {
      title: 'Create Sport Session - Sports Scheduler',
      sports,
      today,
      formData: {},
      errors: []
    });
  } catch (err) {
    console.error('Error loading session form:', err);
    req.flash('error_msg', 'Could not open session creation form.');
    res.redirect('/sessions');
  }
};

// POST /sessions - Create new session (creator is NOT automatically added as participant)
exports.postCreateSession = async (req, res) => {
  const { sportId, date, time, venue, additionalPlayersNeeded } = req.body;
  const errors = [];

  const trimmedVenue = (venue || '').trim();
  const playersNeeded = parseInt(additionalPlayersNeeded, 10);

  if (!sportId) {
    errors.push('Please select a sport');
  }
  if (!date) {
    errors.push('Please choose a date');
  }
  if (!time) {
    errors.push('Please specify a time');
  }
  if (!trimmedVenue) {
    errors.push('Venue location is required');
  }
  if (isNaN(playersNeeded) || playersNeeded < 0) {
    errors.push('Additional players needed must be a non-negative integer');
  }

  // Validate date & time not in past
  if (date && time && isSessionInPast(date, time)) {
    errors.push('Cannot schedule a session in the past. Please select an upcoming date and time.');
  }

  // Check sport exists
  let sport = null;
  if (sportId) {
    sport = await Sport.findByPk(sportId);
    if (!sport) {
      errors.push('Selected sport does not exist');
    }
  }

  if (errors.length > 0) {
    const sports = await Sport.findAll({ order: [['name', 'ASC']] });
    const today = new Date().toISOString().split('T')[0];
    return res.status(400).render('sessions/new', {
      title: 'Create Sport Session - Sports Scheduler',
      sports,
      today,
      formData: req.body,
      errors
    });
  }

  try {
    // Create the Session record. Creator is recorded in creatorId but NOT automatically added to SessionParticipants
    const session = await Session.create({
      sportId,
      creatorId: req.user.id,
      date,
      time,
      venue: trimmedVenue,
      additionalPlayersNeeded: playersNeeded,
      status: 'scheduled'
    });

    req.flash('success_msg', 'Sport session created successfully!');
    res.redirect(`/sessions/${session.id}`);
  } catch (err) {
    console.error('Error creating session:', err);
    req.flash('error_msg', 'Failed to create session: ' + err.message);
    res.redirect('/sessions/new');
  }
};

// GET /sessions/:id - Detailed session view with participant roster & slots
exports.getSessionDetails = async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.id, {
      include: [
        { model: Sport, as: 'sport' },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        {
          model: SessionParticipant,
          as: 'sessionParticipants',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
        }
      ]
    });

    if (!session) {
      req.flash('error_msg', 'Session not found');
      return res.redirect('/sessions');
    }

    if (session.sessionParticipants) {
      session.sessionParticipants.sort((a, b) => a.id - b.id);
    }

    const isPast = isSessionInPast(session.date, session.time);
    const isCreator = req.user && session.creatorId === req.user.id;
    const isAdmin = req.user && req.user.role === 'admin';
    const isParticipant = req.user && session.sessionParticipants.some(sp => sp.userId === req.user.id);
    
    // Capacity = additionalPlayersNeeded
    const totalCapacity = session.additionalPlayersNeeded;
    const remainingSlots = Math.max(0, totalCapacity - session.sessionParticipants.length);
    const isFull = remainingSlots === 0;

    res.render('sessions/show', {
      title: `${session.sport ? session.sport.name : 'Sport'} Session - Sports Scheduler`,
      session,
      isPast,
      isCreator,
      isAdmin,
      isParticipant,
      totalCapacity,
      remainingSlots,
      isFull
    });
  } catch (err) {
    console.error('Error fetching session details:', err);
    req.flash('error_msg', 'Failed to load session details.');
    res.redirect('/sessions');
  }
};

// POST /sessions/:id/join - Join session (both players and creators/admins can join voluntarily)
exports.postJoinSession = async (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user.id;

  try {
    const session = await Session.findByPk(sessionId, {
      include: [
        { model: SessionParticipant, as: 'sessionParticipants' },
        { model: Sport, as: 'sport' }
      ]
    });

    if (!session) {
      req.flash('error_msg', 'Session does not exist');
      return res.redirect('/sessions');
    }

    // 1. Check if cancelled
    if (session.status === 'cancelled') {
      req.flash('error_msg', 'Cannot join a cancelled session');
      return res.redirect(`/sessions/${sessionId}`);
    }

    // 2. Check if in past
    if (isSessionInPast(session.date, session.time)) {
      req.flash('error_msg', 'This session has already started or taken place');
      return res.redirect(`/sessions/${sessionId}`);
    }

    // 3. Check if already joined (prevents double join for creator or player)
    const alreadyJoined = session.sessionParticipants.some(p => p.userId === userId);
    if (alreadyJoined) {
      req.flash('error_msg', 'You have already joined this session');
      return res.redirect(`/sessions/${sessionId}`);
    }

    // 4. Check if total capacity is reached
    if (session.sessionParticipants.length >= session.additionalPlayersNeeded) {
      req.flash('error_msg', 'This session is already full');
      return res.redirect(`/sessions/${sessionId}`);
    }

    // 5. Check time conflicts with other sessions where user is participating
    const conflictingParticipation = await SessionParticipant.findOne({
      where: { userId },
      include: [
        {
          model: Session,
          as: 'session',
          where: {
            date: session.date,
            time: session.time,
            status: { [Op.ne]: 'cancelled' },
            id: { [Op.ne]: session.id }
          }
        }
      ]
    });

    if (conflictingParticipation) {
      req.flash('error_msg', 'You are already participating in another session at this date and time. You cannot join multiple sessions at the same time.');
      return res.redirect(`/sessions/${sessionId}`);
    }

    // Add to participants
    await SessionParticipant.create({
      sessionId,
      userId,
      joinedAt: new Date()
    });

    req.flash('success_msg', 'Successfully joined the session!');
    res.redirect(`/sessions/${sessionId}`);
  } catch (err) {
    console.error('Error joining session:', err);
    req.flash('error_msg', 'Unable to join session: ' + (err.message || 'Unknown error'));
    res.redirect(`/sessions/${sessionId}`);
  }
};

// POST /sessions/:id/cancel - Cancel session
exports.postCancelSession = async (req, res) => {
  const sessionId = req.params.id;
  const { cancellationReason } = req.body;
  const trimmedReason = (cancellationReason || '').trim();

  if (!trimmedReason) {
    req.flash('error_msg', 'A cancellation reason is required to cancel this session.');
    return res.redirect(`/sessions/${sessionId}`);
  }

  try {
    const session = await Session.findByPk(sessionId);
    if (!session) {
      req.flash('error_msg', 'Session not found');
      return res.redirect('/sessions');
    }

    // Only creator or admin can cancel
    if (session.creatorId !== req.user.id && req.user.role !== 'admin') {
      req.flash('error_msg', 'You are not authorized to cancel this session');
      return res.redirect(`/sessions/${sessionId}`);
    }

    session.status = 'cancelled';
    session.cancellationReason = trimmedReason;
    await session.save();

    req.flash('success_msg', 'Session has been cancelled successfully.');
    res.redirect(`/sessions/${sessionId}`);
  } catch (err) {
    console.error('Error cancelling session:', err);
    req.flash('error_msg', 'Failed to cancel session');
    res.redirect(`/sessions/${sessionId}`);
  }
};
