#! /usr/bin/env node

'use strict';

const program = require('commander')
    , slingg  = require('../');

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

function parseTransforms(val, memo){
  const clean = val.replace(/\"/g, '');
  clean.split(',').forEach(function(e){
    const parts = e.split(':');
    memo[parts[0].trim()] = parts[1] === 'null' ? null : parts[1].trim();
  });
  return memo;
}

program
.description('Slingg performs http requests using rows in an .XLSX file as payloads.')
.usage('[options] <file|directory>')
.arguments('<file|directory>')
.option('-u, --url <http request target>', 'URL to work with.')
.option('-h, --override [override1:original1, ...]', 'Optional, headers to override originals in xlsx.', parseOverrideCols)
.option('-i, --ignore [ignore1, ignore2, ...]', 'Optional, headers to ignore from xlsx.', parseIgnoreCols)
.option('-t, --transforms header:"<js code>"', 'Optional, JS transform to coerce header values using eval.', parseTransforms, {})
.option('-v, --verbose', 'Optional, verbose mode.')
.action(function(file) {
  const opts = {
    url: program.url,
    headers: {
      override: program.override,
      ignore: program.ignore,
      coercions: program.transforms
    }
  };
  console.log('slingg starting.');
  const sl = slingg.fromPath(file, opts);
  sl.stream()
  .each(res => {
    if (program.verbose) { console.log(JSON.stringify(res.body)); }
  })
  .done(_ => console.log('slingg completed.'));
})
.parse(process.argv);

if (!program.args.length) program.help();