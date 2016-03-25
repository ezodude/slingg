#! /usr/bin/env node

var h           = require('highland')
  , _           = require('lodash')
  , program     = require('commander')
  , XLSX        = require('xlsx')
  , request     = require('superagent')
  , through2    = require('through2')
  , mappedColumns;

var exceltoJSONStream = function(file){
  var workbook = XLSX.readFile(file);
  var ws = workbook.Sheets[workbook.SheetNames[0]];
  var json = XLSX.utils.sheet_to_json(ws);
  return h(json);
};

var lowerCasedKeys = function(row){
  const result = {};
  _.keys(row).forEach(key => result[key.toLowerCase()] = row[key]);
  return result;
};

var mapColumns = function(row){
  const result = _.assign({}, row);
  const inverted = _.invert(mappedColumns);

  _.values(mappedColumns).forEach( val => {
    result[inverted[val]] = row[val];
    delete result[val]
  });

  return result;
};

function parseMapCols(val){
  var result = {};
  var val = val.replace(/\s|\"|\{|\}|\[|\]/g, '');
  val.split(',').forEach(function(e){
    var parts = e.split(':');
    result[parts[0]] = parts[1] === 'null' ? null : parts[1];
  });
  return result;
}

program
.usage('[options] <file>')
.arguments('<file>')
.option('-u, --url <http request target>', 'URL to work with.')
.option('-c, --mapcols [override1:original1, ...]', 'Optional column headers to override originals in xls/csv.', parseMapCols)
.action(function(file) {
  mappedColumns = program.mapcols;

  exceltoJSONStream(file)
  .map(lowerCasedKeys)
  .map(mapColumns)
  .map(JSON.stringify)
  .pipe(through2.obj(function(payload, h, next){
    request
    .post(program.url)
    .send(payload)
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .end(function(err, res){
      next(err, JSON.stringify(res));
    });
  }))
  .pipe(process.stdout);
})
.parse(process.argv);