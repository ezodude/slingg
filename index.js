'use strict';

const h           = require('highland')
    , XLSX        = require('xlsx')
    , request     = require('superagent')
    , through2    = require('through2')
    , transforms  = require('./lib/transforms');


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

Slingg.prototype.createBaseStream = function () {
  const ws = this.workbook.Sheets[this.workbook.SheetNames[0]];
  this.baseStream = h(XLSX.utils.sheet_to_json(ws));
  return this;
};

Slingg.prototype.start = function () {;
  return this._prepBase()
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

Slingg.prototype._prepBase = function () {
  return this.baseStream
    .map(transforms.lowerCasedKeys)
    .map((row) => { return this.hasOverrideHeaders() ? transforms.override(this.headers.override, row) : row; })
    .map((row) => { return this.hasIgnoreHeaders() ? transforms.ignore(this.headers.ignore, row) : row; })
    .map(JSON.stringify);
};

Slingg.fromPath = (filePath, opts) => {
  const obj = new Slingg(opts);
  return obj
  .extractWorkbookFromPath(filePath)
  .createBaseStream();
};

module.exports = Slingg;