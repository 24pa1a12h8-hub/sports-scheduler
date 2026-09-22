'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    static associate(models) {
      Session.belongsTo(models.Sport, {
        foreignKey: 'sportId',
        as: 'sport'
      });
      Session.belongsTo(models.User, {
        foreignKey: 'creatorId',
        as: 'creator'
      });
      Session.belongsToMany(models.User, {
        through: models.SessionParticipant,
        foreignKey: 'sessionId',
        as: 'participants'
      });
      Session.hasMany(models.SessionParticipant, {
        foreignKey: 'sessionId',
        as: 'sessionParticipants'
      });
    }

    isPast() {
      const sessionDateTime = new Date(`${this.date}T${this.time}`);
      return sessionDateTime < new Date();
    }
  }

  Session.init({
    sportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Sport is required' }
      }
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: { msg: 'Please provide a valid date' },
        notEmpty: { msg: 'Date is required' }
      }
    },
    time: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Time is required' }
      }
    },
    venue: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Venue is required' }
      }
    },
    additionalPlayersNeeded: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: { msg: 'Additional players needed must be an integer' },
        min: {
          args: [0],
          msg: 'Additional players needed cannot be negative'
        }
      }
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'cancelled'),
      allowNull: false,
      defaultValue: 'scheduled'
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Session',
    tableName: 'Sessions'
  });

  return Session;
};
