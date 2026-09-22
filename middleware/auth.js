module.exports = {
  requireLogin: function (req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error_msg', 'Please log in to access this page');
    res.redirect('/login');
  },

  requireAdmin: function (req, res, next) {
    if (req.isAuthenticated()) {
      if (req.user.role === 'admin') {
        return next();
      }
      req.flash('error_msg', 'Only administrators can access this page');
      return res.redirect('/dashboard');
    }
    req.flash('error_msg', 'Please log in to access this page');
    res.redirect('/login');
  },

  forwardAuthenticated: function (req, res, next) {
    if (!req.isAuthenticated()) {
      return next();
    }
    if (req.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/dashboard');
  }
};
