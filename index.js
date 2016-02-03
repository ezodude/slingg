#! /usr/bin/env node

var _           = require('highland')
  , program     = require('commander')
  , XLSX        = require('xlsx')
  , request     = require('superagent')
  , through2    = require('through2')
  , url;

var exceltoJSONStream = function(file){
  var workbook = XLSX.readFile(file);
  var ws = workbook.Sheets[workbook.SheetNames[0]];
  var json = XLSX.utils.sheet_to_json(ws);
  return _(json);
};

var lowerCasedKeys = function(row){
  _.keys(row).each(function(key){
    row[key.toLowerCase()] = row[key];
    delete row[key];
  });
  return row;
};

program
.usage('[options] <file>')
.arguments('<file>')
.option('-u, --url <http request target>', 'URL to work with.')
.option('-m, --mapping [override1:original1, ...]', 'Optional column mappings to override originals in xls/csv.')
.action(function(file) {
  exceltoJSONStream(file)
  .map(lowerCasedKeys)
  .pipe(through2.obj(function(buf, _, next){
    request.post(program.url).send(buf).end(function(err, res){
      next(err, JSON.stringify(res));
    });
  }))
  .pipe(process.stdout);
})
.parse(process.argv);