#! /usr/bin/env node

'use strict';

const program     = require('commander')
    , slingg = require('../');

function parseOverrideCols(val){
  var result = {};
  var val = val.replace(/\s|\"|\{|\}|\[|\]/g, '');
  val.split(',').forEach(function(e){
    var parts = e.split(':');
    result[parts[0]] = parts[1] === 'null' ? null : parts[1];
  });
  return result;
}

function parseIgnoreCols(val){
  var result = {};
  var val = val.replace(/\s|\"|\{|\}|\[|\]/g, '');
  return val.split(',');
}

program
.usage('[options] <file|directory>')
.arguments('<file|directory>')
.option('-u, --url <http request target>', 'URL to work with.')
.option('-h, --override [override1:original1, ...]', 'Optional, headers to override originals in xls/csv.', parseOverrideCols)
.option('-i, --ignore [ignore1, ignore2, ...]', 'Optional, headers to ignore from xls/csv.', parseIgnoreCols)
.action(function(file) {
  const opts = {
    url: program.url,
    headers: {
      override: program.override,
      ignore: program.ignore
    }
  };
  const sl = slingg.fromPath(file, opts);
  sl.stream().pipe(process.stdout);
})
.parse(process.argv);