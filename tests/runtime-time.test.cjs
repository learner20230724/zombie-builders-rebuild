'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

function fixture({ generated = false, rate = 60, workPerFrame = 0 } = {}) {
  let wall = 1000, callback = null;
  const drawing = new Proxy({}, { get: () => () => 0 });
  const canvas = { width: 800, height: 600, style: {}, getContext: () => drawing, setAttribute() {} };
  const target = vm.createContext({ console, performance: { now: () => wall },
    requestAnimationFrame(fn) { callback = fn; return 1; }, cancelAnimationFrame() { callback = null; },
    simulateRenderWork() { wall += workPerFrame; },
    URL, queueMicrotask, setTimeout, clearTimeout });
  vm.runInContext(read('src/runtime.js'), target);
  target.ZTPRuntime.configure({ canvas });
  if (generated) {
    const manifest = JSON.parse(read('public/assets/manifest.json'));
    const graphics = new Proxy({ Width: () => 800, Height: () => 600,
      LoadSurface(name) { const image = manifest.images[name]; assert.ok(image, name);
        return { Width: () => image.width, Height: () => image.height }; }
    }, { get: (o, key) => o[key] || (() => 0) });
    target.gxtkApp.prototype.GraphicsDevice = () => graphics;
    target.gxtkApp.prototype.AudioDevice = () => ({ LoadSample: name => ({ name }), PlaySample: () => ({}), StopChannel() {} });
    target.PlayMovie = () => 0; target.MovieFinished = () => 1; target.EndMovie = () => 0;
    vm.runInContext(read('src/generated-game.js'), target);
    target.bb_Init(); target.bb_Main(); target.app.InvokeOnCreate(); target.app.InvokeOnUpdate();
    target.ZTPGamePort.state.bb_Game.bbPlayGame(1);
  } else {
    vm.runInContext(`globalThis.app = new gxtkApp(); app.SetUpdateRate(${rate});
      app.events = []; app.OnUpdate = function () { this.events.push(['update', this.MilliSecs()]); };
      app.OnRender = function () { this.events.push(['render', this.MilliSecs()]); simulateRenderWork(); };`, target);
  }
  return { target, runtime: target.ZTPRuntime, app: target.app,
    wall(value) { wall = value; },
    raf(value) { wall = value; const fn = callback; assert.ok(fn, 'RAF callback exists'); callback = null; fn(value); }
  };
}
const plain = value => JSON.parse(JSON.stringify(value));
function gameSnapshot(h) {
  const port = h.target.ZTPGamePort, game = port.state.bb_Game;
  const items = list => { const result = [], e = list.bbObjectEnumerator(); while(e.bbHasNext()) {
    const item = e.bbNextObject(); result.push([item.bbunit?.bbtype, item.bbxpos, item.bbhealth, item.bbmode]);
  } return result; };
  return plain({ seed: port.state.bb_std_random_Seed, updates: game.bbupdates, time: game.bbgametime,
    wealth: game.bbztp.bbcash, coins: game.bbztp.bbcoins,
    people: items(game.bbpeople), zombies: items(game.bbzombies),
    peopleBase: [game.bbpeoplebase.bbhealth, game.bbpeoplebase.bbmode],
    zombieBase: [game.bbzombiebase.bbhealth, game.bbzombiebase.bbmode],
    frames: h.runtime.diagnostics.frames, frameUpdates: h.runtime.diagnostics.updates });
}

test('time-scale API validates 0..20 in 0.1 steps without changing state on rejection', () => {
  const h = fixture();
  assert.equal(h.runtime.getStatus().timeScale, 1);
  for (const value of [-1, 20.1, Infinity, NaN, '2', null, 0.25]) {
    assert.throws(() => h.runtime.setTimeScale(value), /between 0 and 20/);
    assert.equal(h.runtime.getStatus().timeScale, 1);
  }
  for (const value of [0, 0.1, 1.5, 20, 1]) {
    assert.equal(h.runtime.setTimeScale(value), value); assert.equal(h.runtime.getStatus().timeScale, value);
  }
});

test('untouched 1x keeps legacy manual full/partial-frame behavior and update-render order', () => {
  const h = fixture({ rate: 30 });
  h.runtime.setTimeScale(1); h.runtime.advance(35);
  assert.equal(h.runtime.diagnostics.updates, 2);
  assert.deepEqual(plain(h.app.events.map(e => e[0])), ['update','render','update','render']);
  assert.equal(h.app.MilliSecs(), 35);
});

test('whole scaled frames preserve fractional credit without adding draw-only frames', () => {
  const h = fixture(); h.runtime.setTimeScale(0.1);
  h.runtime.step(9); assert.equal(h.runtime.diagnostics.frames, 0);
  h.runtime.step(1); assert.equal(h.runtime.diagnostics.frames, 1);
  assert.equal(h.runtime.diagnostics.updates, 1);
  h.runtime.setTimeScale(1.5); h.runtime.step(2);
  assert.equal(h.runtime.diagnostics.frames, 4);
  assert.deepEqual(plain(h.app.events.map(e => e[0])), Array.from({ length: 4 }, () => ['update','render']).flat());
});

test('20x executes all original frames instead of losing ticks to generated five-tick clamp', () => {
  const h = fixture(); h.runtime.setTimeScale(20); h.runtime.advance(1000);
  assert.equal(h.runtime.diagnostics.updates, 1200);
  assert.equal(h.runtime.diagnostics.frames, 1200);
  assert.ok(Math.abs(h.app.MilliSecs() - 20000) <= 1);
});

test('zero speed freezes time, updates, drawing and intro completion, including manual and realtime resume', () => {
  const h = fixture(); h.runtime.configure({ movies: { intro: { frames: [{ image: { width: 1, height: 1 }, duration: 100 }] } } });
  h.target.PlayMovie('intro'); h.runtime.setTimeScale(0); const before = h.app.MilliSecs();
  h.runtime.advance(10000); h.runtime.step(1000); h.wall(90000);
  assert.equal(h.app.MilliSecs(), before); assert.equal(h.runtime.diagnostics.frames, 0);
  assert.equal(h.target.MovieFinished(), 0);
  h.runtime.useRealtime(); h.runtime.start(); h.raf(90016); h.raf(95000);
  assert.equal(h.app.MilliSecs(), before); assert.equal(h.runtime.diagnostics.frames, 0);
  h.runtime.setTimeScale(1); h.raf(95017);
  assert.equal(h.runtime.diagnostics.frames, 1); assert.equal(h.target.MovieFinished(), 0);
  h.runtime.stop();
});

test('speed and clock-mode transitions never jump, and stop/start do not catch up stopped wall time', () => {
  const h = fixture(); h.runtime.step(6); const start = h.app.MilliSecs();
  h.runtime.setTimeScale(2); assert.equal(h.app.MilliSecs(), start);
  h.runtime.step(3); const scaled = h.app.MilliSecs(); assert.ok(Math.abs(scaled - start - 100) <= 1);
  h.wall(100000); h.runtime.useRealtime(); assert.equal(h.app.MilliSecs(), scaled);
  h.runtime.start(); h.raf(100017); assert.equal(h.runtime.diagnostics.frames, 14);
  h.runtime.stop(); const stopped = h.app.MilliSecs(); h.wall(200000);
  h.runtime.start(); assert.equal(h.app.MilliSecs(), stopped); h.raf(200017);
  assert.equal(h.runtime.diagnostics.frames, 16); h.runtime.stop();
});

test('controller stop/advance(0)/useRealtime transactions retain the scaled clock and paused speed', () => {
  const h = fixture(); h.runtime.setTimeScale(2); h.runtime.step(6);
  let wall = 20000;
  for (let index = 0; index < 4; index++) {
    const before = h.app.MilliSecs(); h.runtime.stop(); h.runtime.advance(0);
    h.wall(wall); h.runtime.useRealtime(); h.runtime.start();
    assert.equal(h.app.MilliSecs(), before); assert.equal(h.runtime.getStatus().timeScale, 2);
    h.raf(wall + 17); wall += 10000;
  }
  h.runtime.stop(); h.runtime.setTimeScale(0); const paused = h.app.MilliSecs();
  h.runtime.advance(0); h.wall(wall); h.runtime.useRealtime(); h.runtime.start(); h.raf(wall + 5000);
  assert.equal(h.app.MilliSecs(), paused); assert.equal(h.runtime.getStatus().timeScale, 0);
  h.runtime.stop();
});

test('realtime stalls and extreme frame rates have bounded work and no unbounded backlog', () => {
  const h = fixture({ rate: 10000 }); h.runtime.setTimeScale(20); h.runtime.start();
  h.raf(61000); assert.equal(h.runtime.diagnostics.frames, 150);
  assert.equal(h.runtime.diagnostics.timing.droppedWallMilliseconds, 59750);
  assert.ok(h.runtime.diagnostics.timing.droppedSimulationMilliseconds > 4900);
  h.raf(61001); assert.equal(h.runtime.diagnostics.frames, 300);
  assert.equal(h.runtime.diagnostics.timing.largestFrameBatch, 150); h.runtime.stop();
});

test('scaled RAF yields after its soft CPU budget and drops whole-frame debt without replay', () => {
  const h = fixture({ workPerFrame: 10 }); h.runtime.setTimeScale(20); h.runtime.start();
  h.raf(1017);
  assert.equal(h.runtime.diagnostics.frames, 3, 'complete frames consume 30 ms before yielding');
  assert.equal(h.runtime.diagnostics.timing.budgetLimitedBatches, 1);
  assert.equal(h.runtime.diagnostics.timing.largestFrameBatch, 3);
  assert.ok(h.runtime.diagnostics.timing.droppedSimulationMilliseconds > 280);
  h.runtime.stop(); h.runtime.advance(0);
  assert.equal(h.runtime.diagnostics.frames, 3, 'unserved whole frames do not catch up later');

  const single = fixture({ workPerFrame: 100 }); single.runtime.setTimeScale(20); single.runtime.start();
  single.raf(1017); assert.equal(single.runtime.diagnostics.frames, 1, 'one expensive complete frame is always allowed');
  assert.equal(single.runtime.diagnostics.timing.budgetLimitedBatches, 1); single.runtime.stop();
});

test('fake CPU cost does not limit deterministic manual advance or step', () => {
  const h = fixture({ workPerFrame: 100 }); h.runtime.setTimeScale(20);
  h.runtime.advance(1000); assert.equal(h.runtime.diagnostics.frames, 1200);
  h.runtime.step(1); assert.equal(h.runtime.diagnostics.frames, 1220);
  assert.equal(h.runtime.diagnostics.timing.budgetLimitedBatches, 0);
  assert.equal(h.runtime.diagnostics.timing.droppedSimulationMilliseconds, 0);
});

test('real generated simulation and RNG at 20x match the same number of original 1x frames', () => {
  const baseline = fixture({ generated: true }), fast = fixture({ generated: true });
  baseline.runtime.step(600);
  fast.runtime.setTimeScale(20); fast.runtime.step(30);
  assert.deepEqual(gameSnapshot(fast), gameSnapshot(baseline));
  assert.equal(fast.runtime.diagnostics.errors.length, 0);
});

test('zero speed cannot advance real generated simulation, draw side effects or RNG', () => {
  const h = fixture({ generated: true }); h.runtime.step(3);
  const before = gameSnapshot(h); h.runtime.setTimeScale(0); h.runtime.advance(60000); h.runtime.step(600);
  assert.deepEqual(gameSnapshot(h), before);
});
