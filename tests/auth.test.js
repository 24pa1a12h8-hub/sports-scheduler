const request = require('supertest');
const { app, sequelize, resetDatabase, createPlayer, loginUser, User } = require('./testHelper');

describe('Authentication & Registration Suite', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Sign Up (POST /signup)', () => {
    it('should register a new player successfully and hash the password', async () => {
      const res = await request(app)
        .post('/signup')
        .send({
          name: 'Sarah Player',
          email: 'sarah@example.com',
          password: 'SecretPassword123',
          confirmPassword: 'SecretPassword123'
        });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/login');

      const user = await User.findOne({ where: { email: 'sarah@example.com' } });
      expect(user).not.toBeNull();
      expect(user.name).toBe('Sarah Player');
      expect(user.role).toBe('player');
      expect(user.passwordHash).not.toBe('SecretPassword123');
      const isMatch = await user.isValidPassword('SecretPassword123');
      expect(isMatch).toBe(true);
    });

    it('should reject registration when email already exists', async () => {
      await createPlayer('Existing User', 'existing@example.com', 'Password123');

      const res = await request(app)
        .post('/signup')
        .send({
          name: 'New Person',
          email: 'existing@example.com',
          password: 'Password123',
          confirmPassword: 'Password123'
        });

      expect(res.status).toBe(400);
      expect(res.text).toContain('Email is already registered');
    });

    it('should reject registration if passwords do not match', async () => {
      const res = await request(app)
        .post('/signup')
        .send({
          name: 'Sarah',
          email: 'sarah@example.com',
          password: 'Password123',
          confirmPassword: 'DifferentPassword'
        });

      expect(res.status).toBe(400);
      expect(res.text).toContain('Passwords do not match');
    });

    it('should reject registration if password is shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/signup')
        .send({
          name: 'Sarah',
          email: 'sarah@example.com',
          password: '123',
          confirmPassword: '123'
        });

      expect(res.status).toBe(400);
      expect(res.text).toContain('Password must be at least 6 characters');
    });

    it('should never assign admin role from signup form even if injected', async () => {
      const res = await request(app)
        .post('/signup')
        .send({
          name: 'Hacker',
          email: 'hacker@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          role: 'admin'
        });

      expect(res.status).toBe(302);
      const user = await User.findOne({ where: { email: 'hacker@example.com' } });
      expect(user.role).toBe('player');
    });
  });

  describe('Login & Logout (POST /login & POST /logout)', () => {
    it('should successfully log in a registered player and redirect to /dashboard', async () => {
      await createPlayer('Player One', 'player1@example.com', 'Password123');
      const agent = request.agent(app);

      const res = await loginUser(agent, 'player1@example.com', 'Password123');
      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/dashboard');

      // Verify authenticated session access
      const dashboardRes = await agent.get('/dashboard');
      expect(dashboardRes.status).toBe(200);
      expect(dashboardRes.text).toContain('Player One');
    });

    it('should fail login with invalid password and redirect to /login', async () => {
      await createPlayer('Player One', 'player1@example.com', 'Password123');
      const agent = request.agent(app);

      const res = await loginUser(agent, 'player1@example.com', 'WrongPassword');
      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/login');

      // Cannot access dashboard
      const dashRes = await agent.get('/dashboard');
      expect(dashRes.status).toBe(302);
      expect(dashRes.header.location).toBe('/login');
    });

    it('should logout user and clear session', async () => {
      await createPlayer('Player One', 'player1@example.com', 'Password123');
      const agent = request.agent(app);

      await loginUser(agent, 'player1@example.com', 'Password123');
      const logoutRes = await agent.post('/logout');
      expect(logoutRes.status).toBe(302);
      expect(logoutRes.header.location).toBe('/login');

      // Subsequent dashboard request should be rejected
      const dashRes = await agent.get('/dashboard');
      expect(dashRes.status).toBe(302);
      expect(dashRes.header.location).toBe('/login');
    });
  });

  describe('Change Password (POST /change-password)', () => {
    it('should allow an authenticated user to change password', async () => {
      await createPlayer('Player One', 'player1@example.com', 'OldPassword123');
      const agent = request.agent(app);

      await loginUser(agent, 'player1@example.com', 'OldPassword123');

      const res = await agent
        .post('/change-password')
        .send({
          currentPassword: 'OldPassword123',
          newPassword: 'BrandNewPassword123',
          confirmNewPassword: 'BrandNewPassword123'
        });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/dashboard');

      // Verify new password works
      const freshAgent = request.agent(app);
      const newLoginRes = await loginUser(freshAgent, 'player1@example.com', 'BrandNewPassword123');
      expect(newLoginRes.status).toBe(302);
      expect(newLoginRes.header.location).toBe('/dashboard');
    });

    it('should reject password change if current password is wrong', async () => {
      await createPlayer('Player One', 'player1@example.com', 'OldPassword123');
      const agent = request.agent(app);

      await loginUser(agent, 'player1@example.com', 'OldPassword123');

      const res = await agent
        .post('/change-password')
        .send({
          currentPassword: 'IncorrectPassword',
          newPassword: 'BrandNewPassword123',
          confirmNewPassword: 'BrandNewPassword123'
        });

      expect(res.status).toBe(400);
      expect(res.text).toContain('Incorrect current password');
    });
  });
});
