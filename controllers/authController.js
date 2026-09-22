const bcrypt = require('bcryptjs');
const passport = require('passport');
const { User } = require('../models');

// Email regex helper
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

exports.getSignup = (req, res) => {
  res.render('auth/signup', {
    title: 'Sign Up - Sports Scheduler',
    name: '',
    email: '',
    errors: []
  });
};

exports.postSignup = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  const errors = [];

  const trimmedName = (name || '').trim();
  const trimmedEmail = (email || '').trim().toLowerCase();

  if (!trimmedName) {
    errors.push('Name is required');
  }
  if (!trimmedEmail) {
    errors.push('Email is required');
  } else if (!isValidEmail(trimmedEmail)) {
    errors.push('Please provide a valid email address');
  }
  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  if (errors.length > 0) {
    return res.status(400).render('auth/signup', {
      title: 'Sign Up - Sports Scheduler',
      name: trimmedName,
      email: trimmedEmail,
      errors
    });
  }

  try {
    const existingUser = await User.findOne({ where: { email: trimmedEmail } });
    if (existingUser) {
      errors.push('Email is already registered. Please log in or use a different email.');
      return res.status(400).render('auth/signup', {
        title: 'Sign Up - Sports Scheduler',
        name: trimmedName,
        email: trimmedEmail,
        errors
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Role is strictly set to 'player'
    await User.create({
      name: trimmedName,
      email: trimmedEmail,
      passwordHash,
      role: 'player'
    });

    req.flash('success_msg', 'Registration successful! You can now log in.');
    return res.redirect('/login');
  } catch (err) {
    console.error('Error during signup:', err);
    errors.push('An unexpected error occurred. Please try again.');
    return res.status(500).render('auth/signup', {
      title: 'Sign Up - Sports Scheduler',
      name: trimmedName,
      email: trimmedEmail,
      errors
    });
  }
};

exports.getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Log In - Sports Scheduler'
  });
};

exports.postLogin = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Passport authenticate error:', err);
      return next(err);
    }
    if (!user) {
      req.flash('error_msg', (info && info.message) || 'Invalid email or password');
      return res.redirect('/login');
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      req.flash('success_msg', `Welcome back, ${user.name}!`);
      if (user.role === 'admin') {
        return res.redirect('/admin/dashboard');
      }
      return res.redirect('/dashboard');
    });
  })(req, res, next);
};

exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash('success_msg', 'You have been logged out successfully.');
    res.redirect('/login');
  });
};

exports.getChangePassword = (req, res) => {
  res.render('auth/change-password', {
    title: 'Change Password - Sports Scheduler',
    errors: []
  });
};

exports.postChangePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const errors = [];

  if (!currentPassword) {
    errors.push('Current password is required');
  }
  if (!newPassword) {
    errors.push('New password is required');
  } else if (newPassword.length < 6) {
    errors.push('New password must be at least 6 characters long');
  }
  if (newPassword !== confirmNewPassword) {
    errors.push('New passwords do not match');
  }

  if (errors.length > 0) {
    return res.status(400).render('auth/change-password', {
      title: 'Change Password - Sports Scheduler',
      errors
    });
  }

  try {
    const user = await User.findByPk(req.user.id);
    const isMatch = await user.isValidPassword(currentPassword);
    if (!isMatch) {
      errors.push('Incorrect current password');
      return res.status(400).render('auth/change-password', {
        title: 'Change Password - Sports Scheduler',
        errors
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();

    req.flash('success_msg', 'Password successfully updated.');
    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Error changing password:', err);
    errors.push('An error occurred while updating your password.');
    return res.status(500).render('auth/change-password', {
      title: 'Change Password - Sports Scheduler',
      errors
    });
  }
};
