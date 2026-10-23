'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const styles = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const rule = selector => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return styles.match(new RegExp(`(?:^|[}\\s])${escaped}\\{([^}]+)\\}`))[1];
};

test('game page contains only the game and temporary status, not explanatory copy', () => {
  const main = html.match(/<main>([\s\S]*?)<\/main>/)[1];
  assert.match(main, /<canvas\b[^>]*id="game"[^>]*width="800"[^>]*height="600"/);
  assert.match(main, /<canvas\b[^>]*tabindex="0"[^>]*aria-label="[^"]+"/);
  assert.match(main, /<div id="status" role="status">/);
  assert.doesNotMatch(main, /<(?:p|h[1-6]|header|footer|button)\b/);
});

test('canvas can grow beyond its logical size while fitting either viewport axis', () => {
  const canvas = rule('canvas');
  assert.match(canvas, /width:min\(100vw,calc\(var\(--viewport-height\) \* 4 \/ 3\)\)/);
  assert.match(canvas, /height:min\(var\(--viewport-height\),calc\(100vw \* 3 \/ 4\)\)/);
  assert.match(canvas, /aspect-ratio:4\/3/);
  assert.doesNotMatch(canvas, /(?:max-width|width):[^;]*800px/);
  assert.match(styles, /--viewport-height:100vh/);
  assert.match(styles, /@supports\(height:100dvh\)/);
  assert.match(rule('html,body'), /overflow:hidden/);
  assert.match(rule('main'), /place-items:center/);
  assert.match(rule('main'), /container-type:size/);
  assert.doesNotMatch(rule('main'), /height:var\(--viewport-height\)/, 'Dock bottom inset must be able to shrink the available game height');
  assert.match(styles, /@supports\(width:1cqw\)\{canvas\{width:min\(100cqw,calc\(100cqh \* 4 \/ 3\)\);height:min\(100cqh,calc\(100cqw \* 3 \/ 4\)\)/);
});

test('loading and errors overlay the canvas without reserving viewport space', () => {
  assert.match(rule('#status'), /position:absolute/);
  assert.match(rule('#status'), /pointer-events:none/);
  assert.match(rule('#status:empty'), /display:none/);
  assert.doesNotMatch(html, /(?:ondblclick|requestFullscreen|addEventListener)/);
});
