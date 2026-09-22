'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SessionParticipant extends Model {
    static associate(models) {
      SessionParticipant.belongsTo(models.Session, {
        foreignKey: 'sessionId',
        as: 'session'
      });
      SessionParticipant.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }

  SessionParticipant.init({
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'SessionParticipant',
    tableName: 'SessionParticipants',
    indexes: [
      {
        unique: true,
        fields: ['sessionId', 'userId']
      }
    ]
  });

  return SessionParticipant;
};
