const { User, Sport, Session, SessionParticipant } = require('../models');
const { Op } = require('sequelize');

exports.getPlayerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Joined sessions
    const joinedSessions = await Session.findAll({
      include: [
        { model: Sport, as: 'sport' },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        {
          model: SessionParticipant,
          as: 'sessionParticipants',
          where: { userId }
        }
      ],
      where: {
        date: { [Op.gte]: todayStr },
        status: { [Op.ne]: 'cancelled' }
      },
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit: 5
    });

    // Created sessions
    const createdSessions = await Session.findAll({
      where: {
        creatorId: userId,
        date: { [Op.gte]: todayStr }
      },
      include: [
        { model: Sport, as: 'sport' },
        { model: User, as: 'participants', attributes: ['id', 'name'] }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit: 5
    });

    res.render('dashboard/player', {
      title: 'Player Dashboard - Sports Scheduler',
      joinedSessions,
      createdSessions
    });
  } catch (err) {
    console.error('Error loading player dashboard:', err);
    req.flash('error_msg', 'Could not load dashboard.');
    res.render('dashboard/player', {
      title: 'Player Dashboard - Sports Scheduler',
      joinedSessions: [],
      createdSessions: []
    });
  }
};

exports.getAdminDashboard = async (req, res) => {
  try {
    const totalSports = await Sport.count();
    const totalSessions = await Session.count();
    const activeSessions = await Session.count({ where: { status: 'scheduled' } });
    const totalPlayers = await User.count({ where: { role: 'player' } });

    // Sports created by this admin
    const sports = await Sport.findAll({
      where: { userId: req.user.id },
      include: [{ model: Session, as: 'sessions' }],
      order: [['createdAt', 'DESC']]
    });

    // Recent sessions
    const recentSessions = await Session.findAll({
      include: [
        { model: Sport, as: 'sport' },
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.render('dashboard/admin', {
      title: 'Admin Dashboard - Sports Scheduler',
      totalSports,
      totalSessions,
      activeSessions,
      totalPlayers,
      sports,
      recentSessions
    });
  } catch (err) {
    console.error('Error loading admin dashboard:', err);
    req.flash('error_msg', 'Could not load admin dashboard.');
    res.redirect('/dashboard');
  }
};
