const { Session, Sport, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getReports = async (req, res) => {
  try {
    const today = new Date();
    // Default to current month: start of month to end of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const startDate = req.query.startDate || startOfMonth;
    const endDate = req.query.endDate || endOfMonth;

    // Fetch all sports to list even sports with 0 sessions
    const sports = await Sport.findAll({
      order: [['name', 'ASC']]
    });

    // Fetch sessions in that date window
    const sessions = await Session.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [{ model: Sport, as: 'sport' }]
    });

    const totalSessions = sessions.length;

    // Count sessions per sport
    const sportCounts = {};
    sports.forEach(s => {
      sportCounts[s.id] = {
        id: s.id,
        name: s.name,
        count: 0,
        percentage: 0
      };
    });

    sessions.forEach(sess => {
      if (sess.sportId && sportCounts[sess.sportId]) {
        sportCounts[sess.sportId].count += 1;
      } else if (sess.sport) {
        if (!sportCounts[sess.sportId]) {
          sportCounts[sess.sportId] = {
            id: sess.sportId,
            name: sess.sport.name,
            count: 1,
            percentage: 0
          };
        } else {
          sportCounts[sess.sportId].count += 1;
        }
      }
    });

    const reportData = Object.values(sportCounts).map(item => {
      const percentage = totalSessions > 0 ? ((item.count / totalSessions) * 100).toFixed(1) : 0;
      return {
        ...item,
        percentage: Number(percentage)
      };
    });

    // Sort reportData by count descending
    reportData.sort((a, b) => b.count - a.count);

    res.render('admin/reports', {
      title: 'Admin Reports & Popularity Analytics',
      startDate,
      endDate,
      totalSessions,
      reportData,
      sessions
    });
  } catch (err) {
    console.error('Error generating reports:', err);
    req.flash('error_msg', 'Failed to generate report.');
    res.redirect('/admin/dashboard');
  }
};
