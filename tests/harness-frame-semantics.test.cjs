'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createHarness} = require('../scripts/game-test-harness.cjs');
const {runtimeHarness} = require('../scripts/audit-render-sideeffects.cjs');

test('KeyHit is repeatable during a frame and expires only at EndUpdate', () => {
  const h = createHarness();
  h.input.OnKeyDown(65);
  assert.equal(h.input.KeyDown(65), 1);
  assert.equal(h.input.KeyHit(65), 1);
  assert.equal(h.input.KeyHit(65), 1);
  h.input.OnKeyDown(65); // OS key repeat must not become another hit.
  assert.equal(h.input.KeyHit(65), 1);
  h.tick();
  assert.equal(h.input.KeyHit(65), 0);
  assert.equal(h.input.KeyDown(65), 1);
  h.input.OnKeyUp(65);
  assert.equal(h.input.KeyDown(65), 0);
});

test('rapid press/release, repeat, alias and expiry trace matches real runtime input', () => {
  const h = createHarness(), r = runtimeHarness();
  const original = new r.context.gxtkInput();
  function trace(input) {
    const result = [];
    const read = () => result.push([input.KeyDown(1), input.KeyHit(1), input.KeyHit(1), input.KeyHit(224)]);
    input.OnKeyDown(1); read();
    input.OnKeyDown(1); read();
    input.OnKeyUp(1); read();
    input.OnKeyDown(1); read();
    input.EndUpdate(); read();
    input.OnKeyUp(1); input.OnKeyDown(1); input.OnKeyUp(1); read();
    input.EndUpdate(); read();
    return result;
  }
  const expected = [[1,1,1,1], [1,1,1,1], [0,1,1,1], [1,2,2,2], [1,0,0,0], [0,1,1,1], [0,0,0,0]];
  assert.deepEqual(trace(original), expected);
  assert.deepEqual(trace(h.input), expected);
});

test('unqueried key hits expire and InvokeOnUpdate clears them even on exceptions', () => {
  const h = createHarness();
  h.input.OnKeyDown(65); h.tick();
  assert.equal(h.input.KeyHit(65), 0);
  // A synthetic platform App tests the wrapper's finally, not a game override.
  const app = new h.context.gxtkApp();
  app.OnUpdate = () => {throw new Error('platform-wrapper-fixture');};
  h.input.OnKeyUp(65); h.input.OnKeyDown(65);
  assert.throws(() => app.InvokeOnUpdate(), /platform-wrapper-fixture/);
  assert.equal(h.input.KeyHit(65), 0);
});

test('default tick stays update-only; renderEachFrame renders once per frame', () => {
  const update = createHarness(), full = createHarness({renderEachFrame: true});
  update.game.bbPlayGame(1); full.game.bbPlayGame(1);
  assert.equal(update.renderEachFrame, false);
  const beforeUpdate = update.game.bbframecount, beforeFull = full.game.bbframecount;
  update.tick(3); full.tick(3);
  assert.equal(update.game.bbframecount, beforeUpdate);
  assert.equal(full.game.bbframecount, beforeFull + 3);
  assert.equal(full.game.bbgameticks, update.game.bbgameticks);
});

test('mouse hit survives input expiry for one Render UI action, but not a held repeat', () => {
  const h = createHarness({renderEachFrame: true}), g = h.game;
  g.bbPlayGame(1);
  h.input.OnMouseMove(620, 18); h.input.OnKeyDown(1);
  assert.equal(g.bbgamespeed, 2);
  h.tick();
  assert.equal(g.bbgamespeed, 3);
  assert.equal(h.input.KeyHit(1), 0);
  assert.equal(g.bbmousehit, 0);
  h.tick();
  assert.equal(g.bbgamespeed, 3);
  h.input.OnKeyUp(1); h.input.OnKeyDown(1); h.tick();
  assert.equal(g.bbgamespeed, 4);
  // A fully released tap is not a held-on-button action in the original UI.
  h.input.OnKeyUp(1); h.input.OnKeyDown(1); h.input.OnKeyUp(1); h.tick();
  assert.equal(g.bbgamespeed, 4);
});
