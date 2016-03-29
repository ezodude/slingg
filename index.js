'use strict';

const h           = require('highland')
    , _           = require('lodash')
    , XLSX        = require('xlsx')
    , request     = require('superagent')
    , through2    = require('through2');

const workbookToStream = (workbook, opts) => {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws);
  return h(json);
};

const lowerCasedKeys = (row) => {
  const result = {};
  _.keys(row).forEach(key => result[key.toLowerCase()] = row[key]);
  return result;
};

const override = (overriden, row) => {
  const result = _.assign({}, row);
  const inverted = _.invert(overriden);

  _.values(overriden).forEach( val => {
    result[inverted[val]] = row[val];
    delete result[val]
  });

  return result;
};

const ignore = (ignored, row) => {
  const result = _.assign({}, row);
  ignored.forEach( i => { delete result[i] });
  return result;
};

function Slingg(opts) {
  if (!(this instanceof Slingg)) return new Slingg(opts);

  opts || (opts = {});
  if(!opts.url){ throw new Error('Destination url is missing!'); }

  this.url = opts.url;
  this.headers = opts.headers;
}

Slingg.prototype.hasOverrideHeaders = function () {
  return this.headers && this.headers.override;
};

Slingg.prototype.hasIgnoreHeaders = function () {
  return this.headers && this.headers.ignore;
};

Slingg.prototype.extractWorkbookFromPath = function (filePath) {
  this.workbook = XLSX.readFile(filePath);
  return this;
};

Slingg.prototype.extractWorkbookFromBuffer = function (buffer) {
  this.workbook = XLSX.read(buffer);
  return this;
};

Slingg.prototype.createBaseStream = function () {
  const ws = this.workbook.Sheets[this.workbook.SheetNames[0]];
  this.baseStream = h(XLSX.utils.sheet_to_json(ws));
  return this;
};

Slingg.prototype.start = function () {
  return this.baseStream
    .map(lowerCasedKeys)
    .map((row) => { return this.hasOverrideHeaders() ? override(this.headers.override, row) : row; })
    .map((row) => { return this.hasIgnoreHeaders() ? ignore(this.headers.ignore, row) : row; })
    .map(JSON.stringify)
    .pipe(through2.obj((payload, _, next) => {
      request
      .post(this.url)
      .send(payload)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .end(function(err, res){
        next(err, JSON.stringify(res));
      });
    }));
};

Slingg.fromPath = (filePath, opts) => {
  const obj = new Slingg(opts);
  return obj
  .extractWorkbookFromPath(filePath)
  .createBaseStream();
};

module.exports = Slingg;