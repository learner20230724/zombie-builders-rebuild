'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const GameConfig = require('../src/game-config.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const defaults = () => GameConfig.fromDocuments(Object.fromEntries(
  ['units', 'zombies', 'buildings', 'powers', 'levels'].map(kind => [kind, json('config/' + kind + '.json')])));
const INT_MAX = 2147483647;
const GENERATED_SHA256 = '9ac747685871fa237dacb9a469cb78dbf7b635f21c3c593aa033da3d4cc5239b';
function items(list) {
  const result = [], iterator = list.bbObjectEnumerator();
  while (iterator.bbHasNext()) result.push(iterator.bbNextObject());
  return result;
}
// Only host drawing/audio/input/storage are substituted. Damage, debris,
// random generation, actors and win/loss transitions are recovered classes.
function fixture(config = defaults(), options, installed = true) {
  const manifest = json('public/assets/manifest.json');
  const drawing = new Proxy({Width: () => 800, Height: () => 600, LoadSurface(name) {
    const image = manifest.images[name]; assert.ok(image, name);
    return {Width: () => image.width, Height: () => image.height};
  }}, {get: (target, key) => target[key] || (() => 0)});
  const input = new Proxy({}, {get: () => () => 0});
  const audio = {LoadSample: name => ({name}), PlaySample: sample => ({sample}), StopChannel: () => 0};
  let millis = 0;
  class App {
    GraphicsDevice() { return drawing; } InputDevice() { return input; } AudioDevice() { return audio; }
    SetUpdateRate() { return 0; } MilliSecs() { return millis; }
  }
  const target = vm.createContext({console, gxtkApp: App, gxtkSurfaceListener: class {},
    ReadInt: () => 0, WriteInt: () => 0, FlushInts: () => 0, PlayMovie: () => 0,
    MovieFinished: () => 1, EndMovie: () => 0, ShowMochi: () => 0, ShowMochiScores: () => 0,
    HideMochiScores: () => 0, MochiState: () => 0, Redirect: () => 0});
  vm.runInContext(read('src/generated-game.js'), target);
  if (installed) GameConfig.install(target, config, options);
  target.bb_Init(); target.bb_Main();
  const port = target.ZTPGamePort, device = port.state.bb_mojo_app_device;
  device.OnCreate(); device.OnUpdate();
  const game = port.state.bb_Game; game.bbPlayGame(1);
  return {target, game, port, advance() { millis += 20; device.OnUpdate(); }};
}
function debris(h) {
  return items(h.game.bbbodyparts).map(part => {
    assert.equal(part.bbsheet, h.game.bbbitsheet, 'base debris retains its original sprite sheet');
    return [part.bblayer, part.bbframe, part.bbxpos, part.bbypos,
      part.bbvelx, part.bbvely, part.bbbounce, part.bbrecycle];
  });
}

test('large-damage safety does not change the recovered generated source', () => {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'src/generated-game.js'))).digest('hex');
  assert.equal(actual, GENERATED_SHA256);
});

test('ordinary base-damage debris and RNG exactly match the uninstalled recovered leaf', () => {
  // Never call the uninstalled leaf with extreme damage: the regression is an
  // unbounded allocation loop, not merely a numeric-health discrepancy.
  const original = fixture(undefined, undefined, false), configured = fixture();
  for (const damage of [500, 1000, 60]) for (const x of [20, 1480]) {
    original.game.bbbodyparts.bbClear(); configured.game.bbbodyparts.bbClear();
    original.port.setRandomSeed(0x1234567); configured.port.setRandomSeed(0x1234567);
    original.game.bbDamageBase(damage, x); configured.game.bbDamageBase(damage, x);
    assert.deepEqual(debris(configured), debris(original), 'debris sequence for damage=' + damage + ', x=' + x);
    assert.equal(configured.port.state.bb_std_random_Seed, original.port.state.bb_std_random_Seed,
      'ordinary hits consume exactly the same random sequence');
    assert.equal(configured.game.bbpeoplebase.bbhealth, 4000, 'the cosmetic leaf does not itself change base HP');
    assert.equal(configured.game.bbzombiebase.bbhealth, 16000);
  }
});

test('an int32-maximum hit kills the player base at full damage with bounded cosmetic allocations and normal defeat', () => {
  const config = defaults(); config.units[5].health = INT_MAX;
  const h = fixture(config), g = h.game, before = items(g.bbbodyparts).length;
  assert.equal(g.bbpeoplebase.bbhealth, INT_MAX);
  const leftover = g.bbpeoplebase.bbInfect(INT_MAX);
  const added = items(g.bbbodyparts).length - before;
  assert.equal(leftover, 0); assert.equal(g.bbpeoplebase.bbhealth, 0); assert.equal(g.bbpeoplebase.bbmode, 14);
  assert.ok(added > 0 && added <= 256, '1024 cosmetic damage allocates at most 256 debris parts, not damage-proportional millions');
  assert.equal(g.bbzombiebase.bbhealth, config.zombies[5].health);
  assert.equal(g.bbmainState, 2);
  h.advance();
  assert.equal(g.bbmainState, 4, 'the next ordinary application update enters defeat');
  assert.ok(!items(g.bbpeople).includes(g.bbpeoplebase));
});

test('an int32-maximum hit kills the zombie base at full damage with bounded cosmetic allocations and normal victory', () => {
  const config = defaults(); config.zombies[5].health = INT_MAX;
  const h = fixture(config), g = h.game, before = items(g.bbbodyparts).length;
  assert.equal(g.bbzombiebase.bbhealth, INT_MAX);
  const leftover = g.bbzombiebase.bbSmack(INT_MAX, 1);
  const added = items(g.bbbodyparts).length - before;
  assert.equal(leftover, 0); assert.equal(g.bbzombiebase.bbhealth, 0); assert.equal(g.bbzombiebase.bbmode, 14);
  assert.ok(added > 0 && added <= 256, 'only base-hit visuals are capped; actual damage remains int32 maximum');
  assert.equal(g.bbpeoplebase.bbhealth, config.units[5].health);
  assert.equal(g.bbmainState, 2);
  h.advance();
  assert.equal(g.bbmainState, 3, 'the next ordinary application update enters victory');
  assert.ok(!items(g.bbzombies).includes(g.bbzombiebase));
});

test('a composed maximum-damage shovel attack goes through the real combat tick without an allocation explosion', () => {
  const config = defaults(); config.units[0].damage = 1000000; config.zombies[5].health = INT_MAX;
  const groups = {units: {health: 1, moveSpeed: 1, damage: INT_MAX / 1000000},
    zombies: {health: 1, moveSpeed: 1, damage: 1}};
  assert.equal(config.units[0].damage * groups.units.damage, INT_MAX, 'the fixture reaches the actual integer limit exactly');
  const h = fixture(config, {multipliers: groups}), g = h.game;
  const attacker = g.bbAddPerson(g.bbunits[0]);
  attacker.bbxpos = 1410; attacker.bbmode = 1; attacker.bbHitKey = () => 1; attacker.bbUpdate = () => 0;
  const before = items(g.bbbodyparts).length;
  g.bbGameTick(0);
  assert.equal(g.bbunits[0].bbdamage, INT_MAX);
  assert.equal(g.bbzombiebase.bbhealth, 0, 'combat must not accidentally clamp real HP damage to the cosmetic budget');
  assert.equal(g.bbzombiebase.bbmode, 14);
  const added = items(g.bbbodyparts).length - before;
  assert.ok(added > 0 && added <= 256, 'one maximum combat hit remains within the debris budget');
  attacker.bbHitKey = () => 0;
  h.advance();
  assert.equal(g.bbmainState, 3);
});
