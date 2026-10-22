'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {checkConfig} = require('./check-config.cjs');
const ROOT = path.resolve(__dirname, '..');

function checkDistribution() {
  const configuration = checkConfig();
  const read = name => fs.readFileSync(path.join(ROOT, name));
  const manifest = JSON.parse(read('public/assets/manifest.json'));
  const splash = JSON.parse(read('public/assets/splash.json'));
  const fileFor = url => {
    assert.equal(typeof url, 'string');
    const rel = url.startsWith('/assets/') ? 'public' + url : url;
    assert(rel.startsWith('/public/assets/') || rel.startsWith('public/assets/'), 'Only bundled asset URLs');
    const file = path.resolve(ROOT, '.' + (rel.startsWith('/') ? rel : '/' + rel));
    assert(file.startsWith(path.join(ROOT, 'public', 'assets') + path.sep));
    assert(fs.statSync(file).isFile(), 'Missing bundled asset: ' + url);
    return file;
  };
  assert.equal(Object.keys(manifest.images).length, 74);
  assert.equal(Object.keys(manifest.sounds).length, 31);
  let checked = 0;
  for (const entry of [...Object.values(manifest.images), ...Object.values(manifest.sounds)]) {
    const bytes = fs.readFileSync(fileFor(entry.src));
    assert.equal(bytes.length, entry.bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    checked++;
  }
  for (const entry of [...splash.frames, ...splash.sounds]) fileFor(entry.src);
  assert.equal(splash.finishAt, 8200);
  for (const name of ['runtime.js', 'generated-game.js', 'physics.js', 'game-config.js', 'boot.js'])
    new vm.Script(read('src/' + name).toString('utf8'), {filename:name}); // Parse only; do not boot the game.
  assert(read('public/vendor/BOX2D-LICENSE.txt').toString().includes('Erin Catto'));
  assert(!read('index.html').toString().includes('href="/reference/"'));
  return {passed:true, assetHashesChecked:checked, gameImages:74, gameSounds:31,
    splashSegments:splash.frames.length, configuration, sourceParsedNotExecuted:true};
}
if (require.main === module) console.log(JSON.stringify(checkDistribution(), null, 2));
module.exports = {checkDistribution};
