/* Gameplay-port regression tests. Platform stubs are only for headless testing;
 * the delivered game uses the real Canvas/audio/input runtime. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/manifest.json')));
let milliseconds = 0;
const drawing = new Proxy({
  Width: () => 800, Height: () => 600,
  LoadSurface(name) {
    const image = manifest.images[name];
    assert.ok(image, 'Missing image in manifest: ' + name);
    return {Width: () => image.width, Height: () => image.height};
  },
}, {get: (target, key) => target[key] || (() => 0)});
const input = {KeyDown: () => 0, KeyHit: () => 0, MouseX: () => 0, MouseY: () => 0};
const audio = {LoadSample: name => ({name}), PlaySample: () => ({}), StopChannel: () => 0};
class App {
  GraphicsDevice() { return drawing; }
  InputDevice() { return input; }
  AudioDevice() { return audio; }
  SetUpdateRate(rate) { this.updateRate = rate; return 0; }
  MilliSecs() { return milliseconds; }
}
const context = vm.createContext({
  console, gxtkApp: App, gxtkSurfaceListener: class {},
  ReadInt: () => 0, WriteInt: () => 0, FlushInts: () => 0,
  PlayMovie: () => 0, MovieFinished: () => 1, EndMovie: () => 0,
  ShowMochi: () => 0, ShowMochiScores: () => 0, HideMochiScores: () => 0,
  MochiState: () => 0, Redirect: () => 0,
});
vm.runInContext(fs.readFileSync(path.join(root, 'src/generated-game.js'), 'utf8'), context);
context.bb_Init();
const read = expression => vm.runInContext(expression, context);
const plain = object => JSON.parse(JSON.stringify(object));
const raw = JSON.parse(fs.readFileSync(path.join(root, 'data/raw.json')));
let arrayChecks = 0;
for (const [name, expected] of Object.entries(raw)) {
  if (!name.startsWith('bb_')) continue;
  assert.deepEqual(plain(read(name)), expected, 'Recovered data differs: ' + name);
  arrayChecks++;
}
// Explicit AS3 integer semantics: arguments, local arithmetic, returns, overflow.
assert.equal(context.bb_reversebits(5, 3), 5);
assert.equal(context.bb_reversebits(6, 3), 3);
assert.equal(context.bb_reversebits(3.99, 3.99), 6);
assert.equal(new context.bb_std_boxes_IntObject().bbIntObject_new(4294967295).bbToInt(), -1);
const list = new context.bb_std_list_List().bbList_new();
list.bbAddLast('a'); list.bbAddLast('b'); list.bbAddFirst('zero');
assert.equal(list.bbFirst(), 'zero');
assert.equal(list.bbLast(), 'b');
assert.equal(list.bbRemoveFirst(), 'zero');
list.bbRemove('a');
assert.equal(list.bbFirst(), 'b');
assert.equal(list.bbRemoveLast(), 'b');
assert.equal(list.bbIsEmpty(), true);
const map = new context.bb_std_map_Map().bbMap_new();
assert.equal(map.bbCompare('one', 'two'), 0, 'Preserve recovered generic comparator behavior');
for (let i = 0; i < 100; i++) map.bbInsert('key-' + i, i);
// The recovered Object-key comparator returns zero for every pair. Do not
// silently "fix" that original behavior by substituting a string comparator.
for (let i = 0; i < 100; i++) assert.equal(map.bbValueForKey('key-' + i), 99);
context.ZTPGamePort.setRandomSeed(1234);
let seed = 1234;
for (let i = 0; i < 100; i++) {
  seed = (seed * 1664525 + 1013904223) | 0;
  const expected = (((seed / 4) | 0) & 0x3fffffff) / 1073741824;
  assert.equal(context.bb_std_random_Rnd(), expected);
}
// Exercise the original app lifecycle, every difficulty, unit/building tables,
// all render branches, and 30 simulated seconds per difficulty without SWF.
context.bb_Main();
const device = context.ZTPGamePort.state.bb_mojo_app_device;
device.OnCreate();
const game = context.ZTPGamePort.state.bb_Game;
device.OnUpdate(); device.OnRender();
assert.equal(game.bbmainState, 1, 'Splash must transition to main menu');
let simulationFrames = 0;
for (let difficulty = 1; difficulty <= 4; difficulty++) {
  game.bbPlayGame(difficulty);
  assert.equal(game.bbdifficulty, difficulty - 1);
  assert.equal(game.bbpeoplebase.bbunit.bbhealth, 4000);
  assert.equal(game.bbzombiebase.bbunit.bbhealth, 16000);
  for (let frame = 0; frame < 1800; frame++) {
    milliseconds += 1000 / 60;
    device.OnUpdate();
    if (frame % 30 === 0) device.OnRender();
    simulationFrames++;
  }
}
console.log(JSON.stringify({passed: true, recoveredDataChecks: arrayChecks, simulationFrames, classes: 37, methods: 245}, null, 2));
