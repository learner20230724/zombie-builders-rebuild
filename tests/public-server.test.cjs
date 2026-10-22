'use strict';
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
let server, base;
before(async () => {
  const {createGameServer} = await import('../scripts/server.mjs');
  server = createGameServer();
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) {server.closeAllConnections(); await new Promise(resolve => server.close(resolve));}
});
test('public game and health routes are available', async () => {
  for (const name of ['/', '/src/runtime.js', '/assets/manifest.json', '/public/vendor/BOX2D-LICENSE.txt']) {
    const response = await fetch(base + name, {signal:AbortSignal.timeout(5000)});
    assert.equal(response.status, 200, name); await response.arrayBuffer();
  }
  const health = await (await fetch(base + '/health')).json();
  assert.equal(health.project, 'zombie-builders-rebuild');
  assert.equal(health.port, server.address().port);
});
test('private and research files are not served', async () => {
  for (const name of ['/README.md', '/.git/config', '/scripts/server.mjs', '/reference/', '/original/game.swf', '/public/research/secret.json', '/assets/%2e%2e/%2e%2e/README.md']) {
    const response = await fetch(base + name, {signal:AbortSignal.timeout(5000)});
    assert.equal(response.status, 404, name); await response.arrayBuffer();
  }
});
test('HEAD and unsupported methods have explicit behavior', async () => {
  const head = await fetch(base + '/assets/manifest.json', {method:'HEAD'});
  assert.equal(head.status, 200); assert(Number(head.headers.get('content-length')) > 0);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  const post = await fetch(base + '/', {method:'POST'});
  assert.equal(post.status, 405); await post.arrayBuffer();
});
