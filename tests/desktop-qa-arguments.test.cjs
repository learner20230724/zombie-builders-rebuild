'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {inside, parseArguments, makeRunDirectory, PRESET_NAME, PRESET_FILENAME} = require('../scripts/test-desktop.cjs');
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
