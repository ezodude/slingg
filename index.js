#! /usr/bin/env node

var _           = require('highland')
  , program     = require('commander')
  , XLSX        = require('xlsx')
  , request     = require('superagent')
  , JSONStream  = require('JSONStream')
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
.arguments('<file>')
.option('-u, --url <http request target>', 'URL to work with.')
.action(function(file) {
  var req = request.post(program.url);
  req.type('json');

  exceltoJSONStream(file)
  .map(lowerCasedKeys)
  .map(JSON.stringify)
  .pipe(req)
  .pipe(process.stdout);
})
.parse(process.argv);