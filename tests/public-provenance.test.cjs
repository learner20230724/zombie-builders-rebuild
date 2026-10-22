'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = 'reference/simplified/scripts/main.as';
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

function assertPublicSource(source) {
  assert.equal(typeof source, 'string');
  assert.ok(!path.win32.isAbsolute(source) && !path.posix.isAbsolute(source),
    'Public provenance must not contain an absolute filesystem path');
  assert.doesNotMatch(source, /^(?:[a-z]:|~|file:|%USERPROFILE%|\$(?:HOME|\{HOME\}))/i,
    'Public provenance must not contain a local drive, home directory, or file URL');
  assert.equal(source, SOURCE, 'Public provenance must use the repository-relative source');
}

test('public provenance JSON has only a repository-relative source', () => {
  assertPublicSource(JSON.parse(read('data/provenance.json')).source);
});

test('generated data SOURCE literal has only a repository-relative source', () => {
  // Parse the JSON literal as text; do not import or execute generated code.
  const matches = [...read('src/data.js').matchAll(/^export const SOURCE = (\{.*\});\r?$/gm)];
  assert.equal(matches.length, 1, 'Expected one generated SOURCE JSON literal');
  assertPublicSource(JSON.parse(matches[0][1]).source);
});

test('source privacy guard rejects local path forms on every host platform', () => {
  for (const source of [
    'C:\\Users\\Example\\main.as', 'C:/Users/Example/main.as', 'C:main.as',
    '\\\\example-server\\share\\main.as', '//example-server/share/main.as',
    '/home/example/main.as', '/Users/Example/main.as',
    '~/main.as', '~example/main.as', '%USERPROFILE%/main.as',
    '$HOME/main.as', '${HOME}/main.as', 'file:///C:/Users/Example/main.as'
  ]) {
    assert.throws(() => assertPublicSource(source), assert.AssertionError);
  }
  assertPublicSource(SOURCE);
});
