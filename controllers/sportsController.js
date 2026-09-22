const { Sport, User, Session } = require('../models');

// GET /admin/sports - list sports
exports.getSports = async (req, res) => {
  try {
    const sports = await Sport.findAll({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: Session, as: 'sessions', attributes: ['id'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.render('sports/index', {
      title: 'Manage Sports - Admin',
      sports,
      errors: []
    });
  } catch (err) {
    console.error('Error fetching sports:', err);
    req.flash('error_msg', 'Failed to load sports list.');
    res.redirect('/admin/dashboard');
  }
};

// POST /admin/sports - create sport
exports.createSport = async (req, res) => {
  const { name } = req.body;
  const trimmedName = (name || '').trim();

  if (!trimmedName) {
    req.flash('error_msg', 'Sport name cannot be empty');
    return res.redirect('/admin/sports');
  }

  try {
    const existing = await Sport.findOne({ where: { name: trimmedName } });
    if (existing) {
      req.flash('error_msg', `Sport "${trimmedName}" already exists`);
      return res.redirect('/admin/sports');
    }

    await Sport.create({
      name: trimmedName,
      userId: req.user.id
    });

    req.flash('success_msg', `Sport "${trimmedName}" created successfully!`);
    res.redirect('/admin/sports');
  } catch (err) {
    console.error('Error creating sport:', err);
    req.flash('error_msg', 'Failed to create sport: ' + (err.message || 'Unknown error'));
    res.redirect('/admin/sports');
  }
};

// GET /admin/sports/:id/edit - edit sport form
exports.getEditSport = async (req, res) => {
  try {
    const sport = await Sport.findByPk(req.params.id);
    if (!sport) {
      req.flash('error_msg', 'Sport not found');
      return res.redirect('/admin/sports');
    }

    res.render('sports/edit', {
      title: `Edit ${sport.name} - Sports Scheduler`,
      sport,
      errors: []
    });
  } catch (err) {
    console.error('Error fetching sport for edit:', err);
    req.flash('error_msg', 'Error retrieving sport details');
    res.redirect('/admin/sports');
  }
};

// POST /admin/sports/:id/edit - update sport
exports.updateSport = async (req, res) => {
  const { name } = req.body;
  const trimmedName = (name || '').trim();

  if (!trimmedName) {
    req.flash('error_msg', 'Sport name cannot be empty');
    return res.redirect(`/admin/sports/${req.params.id}/edit`);
  }

  try {
    const sport = await Sport.findByPk(req.params.id);
    if (!sport) {
      req.flash('error_msg', 'Sport not found');
      return res.redirect('/admin/sports');
    }

    // Check duplicate
    const existing = await Sport.findOne({ where: { name: trimmedName } });
    if (existing && existing.id !== sport.id) {
      req.flash('error_msg', `Another sport with the name "${trimmedName}" already exists`);
      return res.redirect(`/admin/sports/${req.params.id}/edit`);
    }

    sport.name = trimmedName;
    await sport.save();

    req.flash('success_msg', 'Sport updated successfully!');
    res.redirect('/admin/sports');
  } catch (err) {
    console.error('Error updating sport:', err);
    req.flash('error_msg', 'Failed to update sport');
    res.redirect(`/admin/sports/${req.params.id}/edit`);
  }
};
