'use strict';

const _           = require('lodash')
    ,  h          = require('highland')
    , XLSX        = require('xlsx')
    , request     = require('superagent')
    , transforms  = require('./lib/transforms')
    , xlsFiles    = require('./lib/xlsFiles');

const xlsPaths = h.wrapCallback(xlsFiles);
const RATE_LIMIT_IN_MS = 100;

function Workbook(path){
  this.path = path;
  this.source = XLSX.readFile(this.path);
  this.sheet = this.source.Sheets[this.source.SheetNames[0]];
};

Workbook.prototype.toJSON = function () {
  return XLSX.utils.sheet_to_json(this.sheet);
};

function Slingg(opts) {
  if (!(this instanceof Slingg)) return new Slingg(opts);

  opts || (opts = {});
  if(!opts.url){ throw new Error('Destination url is missing!'); }

  this.url = opts.url;
  this.headers = opts.headers || {};
}

Slingg.prototype.hasOverrideHeaders = function () {
  return this.headers && this.headers.override;
};

Slingg.prototype.hasIgnoreHeaders = function () {
  return this.headers && this.headers.ignore;
};

Slingg.prototype.mineXls = function (path) {
  this.allXls = xlsPaths(path);
  return this;
}

Slingg.prototype.aggregateWorkbooks = function () {
  this.baseStream =
    this.allXls
    .fork()
    .flatten()
    .doto(console.log)
    .map(xlsFile => new Workbook(xlsFile))
    .map(workbook => workbook.toJSON())
    .series();

  return this;
};

Slingg.prototype.stream = function () {;
  const requestWrapper = (payload, cb) => {
    request
      .post(this.url)
      .send(payload)
      .set({'Accept': 'application/json', 'Content-Type': 'application/json'})
      .end(cb);
  };
  return this._prepBase()
    .ratelimit(1, RATE_LIMIT_IN_MS)
    .flatMap(h.wrapCallback(requestWrapper))
    .stopOnError(e => console.log('ERROR:', e));
};

Slingg.prototype._prepBase = function () {
  return this.baseStream
    .map(transforms.lowerCasedKeys)
    .doto( row => transforms.dynamic(this.headers.coercions, row) )
    .map((row) => { return this.hasOverrideHeaders() ? transforms.override(this.headers.override, row) : row; })
    .map((row) => { return this.hasIgnoreHeaders() ? transforms.ignore(this.headers.ignore, row) : row; })
    .map(JSON.stringify);
};

Slingg.fromPath = (path, opts) => {
  const obj = new Slingg(opts);
  obj.mineXls(path);
  obj.aggregateWorkbooks();
  return obj;
};

module.exports = Slingg;