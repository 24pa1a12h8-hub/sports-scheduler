'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Sport, {
        foreignKey: 'userId',
        as: 'sports'
      });
      User.hasMany(models.Session, {
        foreignKey: 'creatorId',
        as: 'createdSessions'
      });
      User.belongsToMany(models.Session, {
        through: models.SessionParticipant,
        foreignKey: 'userId',
        as: 'joinedSessions'
      });
      User.hasMany(models.SessionParticipant, {
        foreignKey: 'userId',
        as: 'participations'
      });
    }

    async isValidPassword(password) {
      return bcrypt.compare(password, this.passwordHash);
    }

    toJSON() {
      const values = { ...this.get() };
      delete values.passwordHash;
      return values;
    }
  }

  User.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name is required' }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'Email address is already registered'
      },
      validate: {
        isEmail: { msg: 'Please enter a valid email address' },
        notEmpty: { msg: 'Email is required' }
      }
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'player'),
      allowNull: false,
      defaultValue: 'player',
      validate: {
        isIn: {
          args: [['admin', 'player']],
          msg: 'Role must be either admin or player'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users'
  });

  return User;
};
