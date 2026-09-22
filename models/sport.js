'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Sport extends Model {
    static associate(models) {
      Sport.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'creator'
      });
      Sport.hasMany(models.Session, {
        foreignKey: 'sportId',
        as: 'sessions'
      });
    }
  }

  Sport.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'Sport name already exists'
      },
      validate: {
        notEmpty: { msg: 'Sport name cannot be empty' },
        len: {
          args: [2, 100],
          msg: 'Sport name must be between 2 and 100 characters'
        }
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Sport',
    tableName: 'Sports'
  });

  return Sport;
};
