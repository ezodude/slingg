'use strict';

const fs  = require('fs')
    , path = require('path')
    , h   = require('highland')
    , dir = require('node-dir')
    , _   = require('lodash');

const stats = h.wrapCallback(fs.lstat);
const files = h.wrapCallback(dir.files);

module.exports = function (aPath, cb) {
  stats(aPath)
  .map(stat => stat.isDirectory())
  .flatMap(isDirectory => isDirectory ? files(aPath) : [aPath])
  .flatten()
  .filter(file => path.extname(file) === '.xls')
  .toArray(data => cb(null, data));
};