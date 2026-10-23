'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {inside, parseArguments, makeRunDirectory, rectanglesOverlap, expectedIncome, PRESET_NAME, PRESET_FILENAME} = require('../scripts/test-desktop.cjs');
const {presetFilename} = require('../src/settings-ui.js');

test('desktop QA argument parser defaults to a project-output fixture without loading Electron', () => {
  const root = path.resolve('desktop-qa-argument-root');
  assert.deepEqual(parseArguments([], root), {output: path.join(root, 'output', 'playwright')});
  assert.equal(parseArguments(['--help'], root).help, true);
  const selected = parseArguments(['--executable', 'game.exe', '--relocated-executable', 'moved/game.exe', '--output', 'output/qa'], root);
  assert.equal(selected.executable, path.join(root, 'game.exe'));
  assert.equal(selected.relocatedExecutable, path.join(root, 'moved', 'game.exe'));
  assert.match(PRESET_NAME, /[\u3400-\u9fff]/); assert.ok(PRESET_NAME.includes(' '));
  assert.equal(presetFilename(PRESET_NAME), PRESET_FILENAME);
});

test('desktop QA refuses artifact escapes, missing values, ambiguous relocation, and unknown arguments', () => {
  const root = path.resolve('desktop-qa-argument-root');
  for (const args of [
    ['--output', '..'], ['--output', 'output'], ['--output', 'output/../private'],
    ['--executable'], ['--output', '--help'], ['--unknown'], ['--relocated-executable', 'game.exe']
  ]) assert.throws(() => parseArguments(args, root));
  assert.equal(inside(path.join(root, 'output'), path.join(root, 'output-sibling')), false);
  assert.equal(inside(path.join(root, 'output'), path.join(root, 'output', 'qa')), true);
});

test('desktop QA creates only unique retained directories within its declared output root', async () => {
  // Fixtures are retained, like the real QA run. This test never recursively
  // removes a directory and cannot touch a real Electron userData directory.
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ztp-desktop-qa-arguments-'));
  const parent = path.join(root, 'output', 'playwright');
  const first = await makeRunDirectory(parent, root), second = await makeRunDirectory(parent, root);
  assert.notEqual(first, second); assert.equal(inside(parent, first), true);
  await assert.rejects(makeRunDirectory(path.join(root, 'private'), root), /output/);
  await fs.writeFile(path.join(root, 'output', 'not-directory'), 'fixture');
  await assert.rejects(makeRunDirectory(path.join(root, 'output', 'not-directory', 'nested'), root), /real directory/);
});

test('desktop QA geometry and income oracles distinguish overlap and contributions above the original five-yard layout', () => {
  const game = {left: 0, top: 0, right: 800, bottom: 600};
  assert.equal(rectanglesOverlap(game, {left: 800, top: 0, right: 1200, bottom: 600}), false);
  assert.equal(rectanglesOverlap(game, {left: 0, top: 600, right: 800, bottom: 1000}), false);
  assert.equal(rectanglesOverlap(game, {left: 799.5, top: 0, right: 1200, bottom: 600}), false);
  assert.equal(rectanglesOverlap(game, {left: 790, top: 0, right: 1200, bottom: 600}), true);
  const before = {ticks: 100, cash: 1000, coins: 599};
  assert.deepEqual(expectedIncome(before, 220, 6), {cash: 1100, coins: 119});
  assert.deepEqual(expectedIncome(before, 220, 8), {cash: 1100, coins: 359});
  assert.notDeepEqual(expectedIncome(before, 220, 6), expectedIncome(before, 220, 5));
});
