import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// Load as an ESM data URL even before the application has a package.json.
const source = fs.readFileSync(path.join(root, 'src/data.js'));
const data = await import(`data:text/javascript;base64,${source.toString('base64')}`);
const raw = JSON.parse(fs.readFileSync(path.join(root, 'data/raw.json'), 'utf8'));
assert.deepEqual(data.RAW, raw);
assert.equal(Object.keys(data.RAW).length, 56);
assert.deepEqual(data.UNITS.map(x => x.buildTicks), [50, 300, 500, 300, 1500, 0]);
assert.deepEqual(data.UNITS.map(x => x.people), [1, 2, 5, 2, 3, 0]);
assert.deepEqual(data.ZOMBIES.map(x => x.type), [32, 33, 34, 35, 36, 37]);
assert.deepEqual(data.BUILDINGS.map(x => x.buildTicks), [300, 300, 500, 500, 1000, 2000]);
assert.deepEqual(data.BUILDINGS.map(x => x.maximum), [15, 5, 1, 1, 1, 1]);
assert.deepEqual(data.POWERS.map(x => [x.xp, x.buildTicks, x.cooldownTicks]),
  [[3000, 150, 5000], [4000, 150, 10000], [5000, 150, 10000]]);
assert.deepEqual(data.LEVELS.map(x => x.waves.length), [66, 68, 68, 68]);
assert.deepEqual(data.LEVELS.map(x => x.zombieCount), [764, 794, 816, 835]);
assert.equal(data.REINFORCEMENTS.length, 12);
assert.deepEqual(data.REINFORCEMENTS.find(x => x.stage === 4 && x.threshold === 5000)
  .queueOrder.map(x => x.type), [5, 4, 3, 1]);
assert.equal(Object.keys(data.SPRITESHEETS).length, 30);
assert.equal(Object.values(data.SPRITESHEETS).reduce((n, s) => n + s.frames.length, 0), 760);
assert.equal(Object.values(data.FONTS).reduce((n, f) => n + f.glyphs.length, 0), 447);

// Oracle fixture arithmetic only, not a test of the application implementation.
function waveFixture(type, count, delay, updates) {
  delay |= 0;
  let ticks = 0, time = 0;
  const events = [];
  for (let i = 1; i <= updates && count; i++) {
    ticks++;
    if (ticks > 60) {
      ticks -= 60;
      time += 0.5;
      if (time > delay) {
        events.push({ update: i, type });
        if (--count > 0) time -= delay;
      }
    }
  }
  return events;
}
assert.deepEqual(waveFixture(1, 5, 3, 1861).map(e => e.update), [421, 781, 1141, 1501, 1861]);
assert.deepEqual(waveFixture(1, 2, 0.5, 121).map(e => e.update), [61, 121]);
assert.deepEqual(waveFixture(0, 1, 4, 541), [{ update: 541, type: 0 }]);
console.log(JSON.stringify({
  dataModule: 'PASS', rawVariables: 56, spriteFrames: 760, glyphs: 447,
  oracleFixtureArithmetic: 'PASS', applicationGameplayTested: false
}, null, 2));
