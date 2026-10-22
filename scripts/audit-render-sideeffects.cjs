/* Read-only game/runtime audit. Rendering is intentionally NOT made pure.
 * Fixtures call original factories (without earning XP); they are unit probes,
 * not evidence of a natural campaign victory. No gameplay method is replaced.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {createHarness} = require('./game-test-harness.cjs');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/manifest.json')));

function runtimeHarness() {
  // Real runtime clock, InputDevice, OnEnterFrame and Invoke wrappers. Only the
  // OS-facing Canvas/audio/intro services are inert; this is not pixel/audio QA.
  const drawing = new Proxy({}, {get: (target, key) => target[key] || (() => 0)});
  class Canvas {
    constructor(w = 800, h = 600) {this.width = w; this.height = h;}
    getContext() {return drawing;}
  }
  class SuspendedAudioContext {constructor() {this.state = 'suspended';}}
  const context = vm.createContext({console, performance: {now: () => 0},
    OffscreenCanvas: Canvas, AudioContext: SuspendedAudioContext});
  vm.runInContext(fs.readFileSync(path.join(root, 'src/runtime.js'), 'utf8'), context);
  const images = Object.fromEntries(Object.entries(manifest.images).map(([name, record]) =>
    [name, {...record, image: {width: record.width, height: record.height}}]));
  context.configureRuntime({canvas: new Canvas(), assets: {...images, ...manifest.sounds}});
  // Skip the movie identically to createHarness; the battle audit starts at t=0.
  Object.assign(context, {PlayMovie: () => 0, MovieFinished: () => 1, EndMovie: () => 0});
  vm.runInContext(fs.readFileSync(path.join(root, 'src/generated-game.js'), 'utf8'), context);
  context.bb_Init(); context.bb_Main();
  const device = context.ZTPGamePort.state.bb_mojo_app_device;
  device.OnCreate(); device.OnUpdate();
  return {context, device, game: context.ZTPGamePort.state.bb_Game,
    getMillis: () => context.getRuntimeStatus().milliseconds,
    tick: n => context.stepRuntime(n), draw: () => device.InvokeOnRender()};
}

function listItems(list) {
  const out = [], iterator = list.bbObjectEnumerator();
  while (iterator.bbHasNext()) out.push(iterator.bbNextObject());
  return out;
}
function scalars(object) {
  return Object.fromEntries(Object.keys(object).sort().filter(key =>
    ['number', 'boolean', 'string'].includes(typeof object[key])).map(key => [key, object[key]]));
}
function capture(h) {
  const g = h.game;
  const entities = {};
  for (const key of ['bbpeople', 'bbzombies', 'bbpombies', 'bbpowerups', 'bbbottles',
    'bbexplosions', 'bbsmokelist', 'bbflinglist', 'bbbodyparts', 'bbdeathlist']) {
    entities[key] = listItems(g[key]).map(entity => ({...scalars(entity),
      unitType: entity.bbunit?.bbtype ?? null, skinFrame: entity.bbskin?.bbframe ?? null}));
  }
  // Normalize VM realms. Include entity positions/modes/health, resource/queue
  // state, particle state and every scalar game field, not merely a win flag.
  return JSON.parse(JSON.stringify({seed: h.context.ZTPGamePort.state.bb_std_random_Seed,
    milliseconds: h.getMillis() | 0, game: scalars(g), ztp: scalars(g.bbztp),
    buildings: [...g.bbztp.bbbuildingcount],
    units: g.bbunits.map(scalars), queues: g.bbbuildings.map(scalars), powers: g.bbpowers.map(scalars),
    blood: {count: g.bbblood.bbcount, xy: g.bbblood.bbxy.slice(0, g.bbblood.bbcount * 4)}, entities}));
}
function hash(value) {return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function prepare(h, harvest = true) {
  assert.equal(h.game.bbmainState, 1);
  h.game.bbPlayGame(1);
  h.context.ZTPGamePort.setRandomSeed(1234);
  if (harvest) {
    h.game.bbAddPower(h.game.bbpowers[1]);
    listItems(h.game.bbpowerups).at(-1).bbHarvest(null);
  }
}
function pairedFrame(h) {
  // A frame, not a batch: update and render must remain adjacent.
  h.tick(1); if (!h.renderEachFrame) h.draw();
}
function lcg(seed, count) {for (let i = 0; i < count; i++) seed = (seed * 1664525 + 1013904223) | 0; return seed;}

function main() {
  const report = {scope: 'Controlled original-method fixtures; not natural campaign or pixel/audio proof',
    sourceSha256: {}, passed: false};
  for (const file of ['reference/simplified/scripts/main.as', 'src/generated-game.js', 'src/runtime.js',
    'scripts/game-test-harness.cjs', 'scripts/audit-render-sideeffects.cjs']) {
    report.sourceSha256[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
  }
  const isolated = createHarness({renderEachFrame: false}); prepare(isolated);
  const before = capture(isolated); isolated.draw(); const after = capture(isolated);
  assert.equal(after.seed, lcg(before.seed, 103));
  assert.equal(after.blood.count - before.blood.count, 51);
  assert.equal(after.milliseconds, before.milliseconds);
  assert.equal(after.game.bbgameticks, before.game.bbgameticks);
  assert.equal(after.ztp.bbcash, before.ztp.bbcash);
  report.heldClockRender = {beforeSeed: before.seed, afterSeed: after.seed,
    expectedLCGCalls: 103, bloodAdded: after.blood.count - before.blood.count,
    milliseconds: after.milliseconds, ticks: after.game.bbgameticks};

  const paired = createHarness({renderEachFrame: true}), runtime = runtimeHarness(),
    updateOnly = createHarness({renderEachFrame: false});
  for (const h of [paired, runtime, updateOnly]) prepare(h);
  assert.deepEqual(capture(paired), capture(runtime));
  const trace = []; let firstUpdateOnlySeedDivergence = null;
  for (let frame = 1; frame <= 180; frame++) {
    pairedFrame(paired); runtime.tick(1); updateOnly.tick(1);
    const p = capture(paired), r = capture(runtime), u = capture(updateOnly);
    assert.deepEqual(p, r, 'Full-update/render harness differs from real stepRuntime at frame ' + frame);
    if (firstUpdateOnlySeedDivergence === null && u.seed !== r.seed) firstUpdateOnlySeedDivergence = frame;
    if ([1, 2, 30, 60, 120, 180].includes(frame)) trace.push({frame, ticks: p.game.bbgameticks,
      millis: p.milliseconds, pairedSeed: p.seed, runtimeSeed: r.seed, updateOnlySeed: u.seed,
      pairedBlood: p.blood.count, updateOnlyBlood: u.blood.count, equalFullStateSHA256: hash(p)});
  }
  assert.equal(firstUpdateOnlySeedDivergence, 1);
  report.frameComparison = {frames: 180, deepEqualEveryFrame: true, firstUpdateOnlySeedDivergence, trace};

  // A baseline without active harvest proves that clock advancement itself is
  // identical, including integer milliseconds and AS3's catch-up tick cadence.
  const plainPaired = createHarness({renderEachFrame: true}), plainRuntime = runtimeHarness();
  prepare(plainPaired, false); prepare(plainRuntime, false);
  for (let frame = 0; frame < 180; frame++) {
    pairedFrame(plainPaired); plainRuntime.tick(1);
    assert.deepEqual(capture(plainPaired), capture(plainRuntime));
  }
  report.noHarvestClockBaseline = {frames: 180, deepEqualEveryFrame: true,
    ticks: plainPaired.game.bbgameticks, milliseconds: plainPaired.getMillis() | 0};

  const input = new runtime.context.gxtkInput();
  input.OnKeyDown(1);
  const runtimeHits = [input.KeyHit(1), input.KeyHit(1)]; input.EndUpdate(); runtimeHits.push(input.KeyHit(1));
  const inputProbe = createHarness({renderEachFrame: false}); inputProbe.inputState.hits.set(1, 1);
  const harnessHits = [inputProbe.input.KeyHit(1), inputProbe.input.KeyHit(1)];
  assert.deepEqual(runtimeHits, [1, 1, 0]);
  report.inputLifetimeProbe = {runtimeReadTwiceThenEndUpdate: runtimeHits, currentHarnessReadTwice: harnessHits,
    harnessMatchesOriginalReadSemantics: harnessHits[0] === 1 && harnessHits[1] === 1};
  report.passed = true;
  const output = path.join(root, 'evidence/render-sideeffects.json');
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
if (require.main === module) main();
module.exports = {runtimeHarness, capture, prepare, pairedFrame};
