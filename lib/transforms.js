'use strict';

const _ = require('lodash');

module.exports = {
  lowerCasedKeys(row) {
    const result = {};
    _.keys(row).forEach(key => result[key.toLowerCase()] = row[key]);
    return result;
  },

  override(overriden, row) {
    const result = _.assign({}, row);
    const inverted = _.invert(overriden);

    _.values(overriden).forEach( val => {
      result[inverted[val]] = row[val];
      delete result[val]
    });

    return result;
  },

  ignore(ignored, row) {
    const result = _.assign({}, row);
    ignored.forEach( i => { delete result[i] });
    return result;
  }
};