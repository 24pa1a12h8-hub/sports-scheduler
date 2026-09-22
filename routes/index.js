const express = require('express');
const router = express.Router();
const { Sport, Session, User } = require('../models');

router.get('/', async (req, res) => {
  try {
    const sports = await Sport.findAll({ limit: 6, order: [['name', 'ASC']] });
    const upcomingSessions = await Session.findAll({
      where: { status: 'scheduled' },
      include: [
        { model: Sport, as: 'sport' },
        { model: User, as: 'creator', attributes: ['name'] }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit: 3
    });

    res.render('home', {
      title: 'Sports Scheduler - Connect, Play & Organize',
      sports,
      upcomingSessions
    });
  } catch (err) {
    console.error('Home page error:', err);
    res.render('home', {
      title: 'Sports Scheduler - Connect, Play & Organize',
      sports: [],
      upcomingSessions: []
    });
  }
});

module.exports = router;
