const LocalStrategy = require('passport-local').Strategy;
const { User } = require('../models');

module.exports = function (passport) {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          const normalizedEmail = (email || '').trim().toLowerCase();
          const user = await User.findOne({ where: { email: normalizedEmail } });
          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          const isMatch = await user.isValidPassword(password);
          if (!isMatch) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
