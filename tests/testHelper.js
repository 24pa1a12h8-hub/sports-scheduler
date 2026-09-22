process.env.NODE_ENV = 'test';
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../app');
const { sequelize, User, Sport, Session, SessionParticipant } = require('../models');

async function resetDatabase() {
  await sequelize.sync({ force: true });
}

async function createAdmin(name = 'Admin User', email = 'admin@test.com', password = 'Password@123') {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({
    name,
    email,
    passwordHash,
    role: 'admin'
  });
}

async function createPlayer(name = 'Player User', email = 'player@test.com', password = 'Password@123') {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({
    name,
    email,
    passwordHash,
    role: 'player'
  });
}

async function loginUser(agent, email, password) {
  return agent
    .post('/login')
    .send({ email, password });
}

module.exports = {
  app,
  sequelize,
  User,
  Sport,
  Session,
  SessionParticipant,
  resetDatabase,
  createAdmin,
  createPlayer,
  loginUser
};
