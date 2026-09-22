require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');

// Passport Config
require('./config/passport')(passport);

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Body parser & static files
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'sports_scheduler_super_secret_session_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash
app.use(flash());

// Global template variables
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/admin', require('./routes/admin'));
app.use('/admin/sports', require('./routes/sports'));
app.use('/sessions', require('./routes/sessions'));

// 404 Handler
app.use((req, res, next) => {
  res.status(404).render('errors/404', {
    title: 'Page Not Found - Sports Scheduler'
  });
});

// 500 Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).render('errors/500', {
    title: 'Internal Server Error - Sports Scheduler',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred. Please try again later.'
  });
});

module.exports = app;
