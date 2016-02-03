#! /usr/bin/env node

var h           = require('highland')
  , _      = require('lodash')
  , program     = require('commander')
  , XLSX        = require('xlsx')
  , request     = require('superagent')
  , through2    = require('through2')
  , mapping;

var exceltoJSONStream = function(file){
  var workbook = XLSX.readFile(file);
  var ws = workbook.Sheets[workbook.SheetNames[0]];
  var json = XLSX.utils.sheet_to_json(ws);
  return h(json);
};

var lowerCasedKeys = function(row){
  h.keys(row).each(function(key){
    row[key.toLowerCase()] = row[key];
    delete row[key];
  });
  return row;
};

var mapColumns = function(row){
  var invertedMapping = _.invert(mapping);
  h.values(mapping).each(function(val){
    row[invertedMapping[val]] = row[val];
    delete row[val];
  });
  return row;
};

function parseMapCols(val){
  var result = {};
  var val = val.replace(/\s|\"|\{|\}/g, '');
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
.option('-c, --map-cols [override1:original1, ...]', 'Optional column headers to override originals in xls/csv.', parseMapCols)
.action(function(file) {
  mapping = program.mapping;

  exceltoJSONStream(file)
  .map(lowerCasedKeys)
  .map(mapColumns)
  .map(JSON.stringify)
  .pipe(through2.obj(function(buf, h, next){
    request.post(program.url).send(buf).end(function(err, res){
      next(err, JSON.stringify(res));
    });
  }))
  .pipe(process.stdout);
})
.parse(process.argv);