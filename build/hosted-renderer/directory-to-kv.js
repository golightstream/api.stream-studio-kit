#!/usr/bin/env node
/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const { unlinkSync, appendFileSync, readdirSync, readFileSync, statSync } = require('fs');
const { join } = require('path');
const { isBinary } = require('istextorbinary');

if (!argv.source || !argv.destination || !argv.prefix) {
  console.warn('Missing argument: source, destination, prefix');
  process.exit(1);
}

const input = `${process.env.INIT_CWD || process.env.PWD}/${argv.source}`;
const fileName = `${process.env.INIT_CWD || process.env.PWD}/${argv.destination}`;

try {
  unlinkSync(fileName);
} catch (e) { /* */ }


// Identify all files in a directory.
const readFiles = (rootPath, dir = '') => {
  const files = readdirSync(join(rootPath, dir));
  let found = [];
  
  files.forEach((file) => {
    if (statSync(`${rootPath}${dir}/${file}`).isDirectory()) {
      found = found.concat(readFiles(rootPath, `${dir}/${file}`));
    } else {
      found.push(join(dir, '/', file));
    }
  });
  
  return found;
};

const append = data => appendFileSync(fileName, `${data}\n`, 'utf8');

// Build a Cloudflare KV compatible array of all files.
append('[')
const files = readFiles(input);

for (const [index, path] of files.entries()) {
  const f = readFileSync(join(input, path));
  
  append(`${JSON.stringify({
    key: `${argv.prefix}${path}`,
    value: isBinary(null, f) ? f.toString('base64') : f.toString(),
    base64: isBinary(null, f),
  })}${index === files.length - 1 ? '' : ','}`);
}
append(']')

