'use strict';
// Integration tests use the recovered game classes, not mock health/damage math.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const GameConfig = require('../src/game-config.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const plain = value => JSON.parse(JSON.stringify(value));
const defaults = () => GameConfig.fromDocuments(Object.fromEntries(
  ['units', 'zombies', 'buildings', 'powers', 'levels'].map(kind => [kind, json('config/' + kind + '.json')])));
const multipliers = (units = {}, zombies = {}) => ({
  units: {health: 1, moveSpeed: 1, damage: 1, ...units},
  zombies: {health: 1, moveSpeed: 1, damage: 1, ...zombies}
});
function items(list) {
  const result = [], iterator = list.bbObjectEnumerator();
  while (iterator.bbHasNext()) result.push(iterator.bbNextObject());
  return result;
}
function fixture(config = defaults(), groups = multipliers()) {
  const manifest = json('public/assets/manifest.json');
  const drawing = new Proxy({Width: () => 800, Height: () => 600, LoadSurface(name) {
    const image = manifest.images[name]; assert.ok(image, name);
    return {Width: () => image.width, Height: () => image.height};
  }}, {get: (target, key) => target[key] || (() => 0)});
  const input = new Proxy({}, {get: () => () => 0});
  const audio = {LoadSample: name => ({name}), PlaySample: sample => ({sample}), StopChannel: () => 0};
  class App {
    GraphicsDevice() { return drawing; } InputDevice() { return input; } AudioDevice() { return audio; }
    SetUpdateRate() { return 0; } MilliSecs() { return 0; }
  }
  const target = vm.createContext({console, gxtkApp: App, gxtkSurfaceListener: class {},
    ReadInt: () => 0, WriteInt: () => 0, FlushInts: () => 0, PlayMovie: () => 0,
    MovieFinished: () => 1, EndMovie: () => 0, ShowMochi: () => 0, ShowMochiScores: () => 0,
    HideMochiScores: () => 0, MochiState: () => 0, Redirect: () => 0});
  vm.runInContext(read('src/generated-game.js'), target);
  GameConfig.install(target, config, {multipliers: groups});
  target.bb_Init(); target.bb_Main();
  const device = target.ZTPGamePort.state.bb_mojo_app_device;
  device.OnCreate(); device.OnUpdate();
  const game = target.ZTPGamePort.state.bb_Game;
  game.bbPlayGame(1);
  return {target, game, port: target.ZTPGamePort};
}
function snapshot(h) {
  const g = h.game;
  return plain({config: GameConfig.getCurrent(h.target),
    raw: [h.target.bb_data_unitdata, h.target.bb_data_zombiedata, h.target.bb_leveldata_level1],
    units: g.bbunits.map(u => [u.bbhealth, u.bbdamage]), zombies: g.bbzunits.map(u => [u.bbhealth, u.bbdamage]),
    people: items(g.bbpeople).map(p => [p.bbunit.bbtype, p.bbhealth, p.bbwalkspeed, p.bbmode, GameConfig.getMaximumHealth(h.target, p)]),
    enemies: items(g.bbzombies).map(p => [p.bbunit.bbtype, p.bbhealth, p.bbwalkspeed, p.bbmode, GameConfig.getMaximumHealth(h.target, p)]),
    converted: items(g.bbpombies).map(p => [p.bbunit.bbtype, p.bbhealth, p.bbwalkspeed, p.bbmode, GameConfig.getMaximumHealth(h.target, p)]),
    bases: [g.bbpeoplebase.bbhealth, g.bbzombiebase.bbhealth],
    stage: [g.bbZombieHealthMultiplier, g.bbZombieDamageMultiplier], seed: h.port.state.bb_std_random_Seed,
    waveProgress: GameConfig.getWaveProgress(h.target),
    queue: items(h.port.bb_ZombieMob.bbqueue).map(w => [w.bbtype, w.bbcount, w.bbdelay, w.bbtime]),
    economy: [g.bbztp.bbcash, g.bbztp.bbxp, g.bbztp.bbforce], ticks: g.bbgameticks});
}

test('army multiplier documents are strict, detached and have all-one defaults', () => {
  assert.deepEqual(GameConfig.validateMultipliers(), multipliers());
  const original = multipliers({health: 1.5}, {damage: 2});
  const result = GameConfig.validateMultipliers(original);
  assert.deepEqual(result, original);
  original.units.health = 9;
  assert.equal(result.units.health, 1.5, 'validation does not retain callers mutable settings');
  for (const bad of [null, [], '1', {}, {units: {health: 1}},
    {...multipliers(), extra: 1}, multipliers({extra: 1}), multipliers({}, {health: '2'}),
    multipliers({health: 0}), multipliers({health: -1}), multipliers({moveSpeed: -1}),
    multipliers({}, {damage: -1}), multipliers({health: NaN}), multipliers({moveSpeed: Infinity}),
    multipliers({}, {damage: 2147483648})]) {
    assert.throws(() => GameConfig.validateMultipliers(bad), /GameConfig/);
  }
  assert.deepEqual(GameConfig.validateMultipliers(multipliers({health: 1e-20, moveSpeed: 0, damage: 0})),
    multipliers({health: 1e-20, moveSpeed: 0, damage: 0}), 'only composed effective values impose gameplay bounds');
});

test('all-one multipliers retain raw tables and raw source configuration exactly', () => {
  const config = defaults(), before = plain(config);
  const compiled = GameConfig.compile(config), explicit = GameConfig.compile(config, {multipliers: multipliers()});
  assert.deepEqual(explicit.raw, compiled.raw);
  assert.deepEqual(explicit.config, before);
  assert.deepEqual(explicit.multipliers, multipliers());
  const h = fixture(config);
  assert.deepEqual(GameConfig.getCurrent(h.target), before);
  assert.deepEqual(config, before);
  for (const kind of ['units', 'zombies']) for (let id = 0; id < 5; id++) {
    const template = kind === 'units' ? h.game.bbunits[id] : h.game.bbzunits[id];
    const body = kind === 'units' ? h.game.bbAddPerson(template) : h.game.bbAddZombie(template);
    assert.equal(body.bbhealth, config[kind][id].health);
    assert.equal(body.bbwalkspeed, config[kind][id].moveSpeed);
    assert.equal(GameConfig.getMaximumHealth(h.target, body), body.bbhealth);
  }
});

test('independent army health and speed affect all five kinds without touching either base', () => {
  const config = defaults(), groups = multipliers({health: 1.5, moveSpeed: 2, damage: 3},
    {health: 2, moveSpeed: 1.5, damage: 4});
  const h = fixture(config, groups), g = h.game;
  assert.deepEqual(GameConfig.getCurrent(h.target), config, 'the editor source remains unmultiplied');
  assert.equal(g.bbpeoplebase.bbhealth, config.units[5].health);
  assert.equal(g.bbzombiebase.bbhealth, config.zombies[5].health);
  for (let id = 0; id < 5; id++) {
    const person = g.bbAddPerson(g.bbunits[id]), zombie = g.bbAddZombie(g.bbzunits[id]);
    assert.equal(person.bbhealth, Math.trunc(config.units[id].health * 1.5));
    assert.equal(person.bbwalkspeed, config.units[id].moveSpeed * 2);
    assert.equal(zombie.bbhealth, Math.trunc(config.zombies[id].health * 2));
    assert.equal(zombie.bbwalkspeed, config.zombies[id].moveSpeed * 1.5);
    assert.equal(GameConfig.getMaximumHealth(h.target, person), person.bbhealth);
    assert.equal(GameConfig.getMaximumHealth(h.target, zombie), zombie.bbhealth);
  }
  for (let id = 0; id < 3; id++) assert.equal(g.bbunits[id].bbdamage, config.units[id].damage * 3);
  for (let id = 0; id < 4; id++) assert.equal(g.bbzunits[id].bbdamage, config.zombies[id].damage * 4);
  assert.equal(g.bbunits[4].bbdamage, 0, 'the preacher does not gain an invented direct damage attack');
});

test('zombie group HP multiplies independently with the original integer stage factor before final truncation', () => {
  const config = defaults(); config.levels[0].zombieHealthMultiplier = 2.9;
  config.levels[0].zombieDamageMultiplier = 2.3;
  const h = fixture(config, multipliers({}, {health: 1.5, damage: 1.5})), g = h.game;
  assert.equal(g.bbZombieHealthMultiplier, 2.9);
  assert.equal(g.bbzunits[0].bbhealth, 37.5, 'a fractional multiplied template must not truncate prematurely');
  const zombie = g.bbAddZombie(g.bbzunits[0]);
  assert.equal(zombie.bbhealth, 75, '25 × 1.5 × trunc(2.9) is 75, not 74');
  assert.equal(GameConfig.getMaximumHealth(h.target, zombie), 75);
  assert.equal(g.bbzunits[0].bbdamage, 15);
  assert.equal(Math.trunc(g.bbzunits[0].bbdamage * g.bbZombieDamageMultiplier), 34,
    'group damage retains the recovered stage damage arithmetic');
  assert.equal(g.bbzombiebase.bbhealth, config.zombies[5].health, 'the base ignores both army and stage HP multipliers');
});

test('army projectiles scale only new launches, while air-strike bombs retain their independent effect', () => {
  const h = fixture(defaults(), multipliers({damage: 1.5}, {damage: 2})), g = h.game;
  g.bbAddBottle(0, 100, -10, 0, 0, 0); g.bbAddBottle(0, 200, -10, 0, 0, 1); g.bbAddFling(0, 100, 0);
  const [bottle, airstrike] = items(g.bbbottles), [corpse] = items(g.bbflinglist);
  assert.equal(bottle.bbdamage, 150); assert.equal(airstrike.bbdamage, 500); assert.equal(corpse.bbdamage, 1000);
  GameConfig.updateLive(h.target, defaults(), {multipliers: multipliers({damage: 2}, {damage: 3})});
  assert.equal(bottle.bbdamage, 150); assert.equal(corpse.bbdamage, 1000);
  g.bbAddBottle(0, 300, -10, 0, 0, 0); g.bbAddFling(0, 300, 0);
  assert.equal(items(g.bbbottles)[2].bbdamage, 200); assert.equal(items(g.bbflinglist)[1].bbdamage, 1500);
});

test('real combat applies army damage once and keeps the independent stage factor on converted zombies', () => {
  const config = defaults();
  config.units[0].health = 1000; config.units[0].damage = 7;
  config.zombies[0].health = 1000; config.zombies[0].damage = 11;
  config.levels[0].zombieDamageMultiplier = 2.3;
  const h = fixture(config, multipliers({damage: 1.5}, {damage: 1.5})), g = h.game;
  const person = g.bbAddPerson(g.bbunits[0]);
  const enemy = g.bbAddZombie(g.bbzunits[0]);
  const converted = g.bbAddZombie(g.bbzunits[0]);
  g.bbzombies.bbRemove(converted); g.bbpombies.bbAddLast(converted); converted.bbTurn();
  person.bbxpos = converted.bbxpos = 500; enemy.bbxpos = 530;
  person.bbmode = 1; enemy.bbmode = converted.bbmode = 9;
  for (const body of [person, enemy, converted]) { body.bbHitKey = () => 1; body.bbUpdate = () => 0; }
  g.bbGameTick(0);
  assert.equal(person.bbhealth, 963, 'trunc(11 × 1.5 × 2.3) is 37 enemy damage');
  assert.equal(enemy.bbhealth, 953, '10 shovel damage plus 37 converted zombie damage');
  assert.equal(converted.bbhealth, 1000, 'conversion changes allegiance, not damage-group identity');
});

test('live ratio updates preserve anger, stop states, converted zombie origin and never resurrect dead actors', () => {
  const h = fixture(), g = h.game, config = defaults();
  const person = g.bbAddPerson(g.bbunits[0]); person.bbhealth = 25; person.bbAnger();
  const stopped = g.bbAddPerson(g.bbunits[4]); stopped.bbwalkspeed = 0;
  const dead = g.bbAddPerson(g.bbunits[1]); dead.bbhealth = 0; dead.bbmode = 14;
  const zombie = g.bbAddZombie(g.bbzunits[0]); zombie.bbhealth = 10;
  const converted = g.bbAddZombie(g.bbzunits[3]);
  g.bbzombies.bbRemove(converted); g.bbpombies.bbAddLast(converted); converted.bbTurn(); converted.bbhealth = 500;
  const dying = g.bbAddZombie(g.bbzunits[1]); dying.bbmode = 15; dying.bbhealth = 5;
  const groups = multipliers({health: 2, moveSpeed: 3}, {health: 1.5, moveSpeed: 2});
  GameConfig.updateLive(h.target, config, {multipliers: groups});
  assert.equal(person.bbhealth, 50);
  assert.equal(person.bbwalkspeed, config.units[0].moveSpeed * 3 * config.powers[0].effect.angerSpeedMultiplier);
  assert.equal(person.bbisangry, 1); assert.equal(stopped.bbwalkspeed, 0);
  assert.equal(dead.bbhealth, 0); assert.equal(dead.bbmode, 14);
  assert.equal(zombie.bbhealth, 15); assert.equal(zombie.bbwalkspeed, 0.5);
  assert.equal(converted.bbhealth, 750); assert.equal(converted.bbwalkspeed, 0.8); assert.equal(converted.bbdirection, -1);
  assert.equal(dying.bbhealth, 5); assert.equal(dying.bbmode, 15);
  const first = snapshot(h);
  GameConfig.updateLive(h.target, config, {multipliers: groups});
  assert.deepEqual(snapshot(h), first, 'reapplying the same values does not multiply accumulated values twice');
});

test('new-only records true per-actor maxima and a later ratio update uses those maxima', () => {
  const h = fixture(), g = h.game, config = defaults();
  const old = g.bbAddPerson(g.bbunits[0]); old.bbhealth = 20;
  const groups = multipliers({health: 2});
  GameConfig.updateLive(h.target, config, {multipliers: groups, healthPolicy: 'new-only'});
  assert.equal(old.bbhealth, 20); assert.equal(GameConfig.getMaximumHealth(h.target, old), 50);
  const later = g.bbAddPerson(g.bbunits[0]);
  assert.equal(later.bbhealth, 100); assert.equal(GameConfig.getMaximumHealth(h.target, later), 100);
  GameConfig.updateLive(h.target, config, {multipliers: groups, healthPolicy: 'ratio'});
  assert.equal(old.bbhealth, 40); assert.equal(GameConfig.getMaximumHealth(h.target, old), 100);
  assert.equal(later.bbhealth, 100);
  assert.equal(GameConfig.getMaximumHealth(h.target, g.bbpeoplebase), config.units[5].health);
});

test('zero movement and damage are supported, and removing a multiplier restores unscaled source values', () => {
  const h = fixture(defaults(), multipliers({moveSpeed: 0, damage: 0}, {moveSpeed: 0, damage: 0})), g = h.game;
  const person = g.bbAddPerson(g.bbunits[0]), zombie = g.bbAddZombie(g.bbzunits[0]);
  assert.equal(person.bbwalkspeed, 0); assert.equal(zombie.bbwalkspeed, 0);
  assert.equal(g.bbunits[0].bbdamage, 0); assert.equal(g.bbzunits[0].bbdamage, 0);
  GameConfig.updateLive(h.target, defaults(), {multipliers: multipliers()});
  const freshPerson = g.bbAddPerson(g.bbunits[0]), freshZombie = g.bbAddZombie(g.bbzunits[0]);
  assert.equal(freshPerson.bbwalkspeed, 0.5); assert.equal(freshZombie.bbwalkspeed, 0.25);
  assert.equal(g.bbunits[0].bbdamage, 10); assert.equal(g.bbzunits[0].bbdamage, 10);
});

test('combined health, damage, speed and stage overflow are rejected before any live mutation', () => {
  const h = fixture(), g = h.game;
  const person = g.bbAddPerson(g.bbunits[0]); person.bbhealth = 23;
  g.bbAddZombie(g.bbzunits[0]);
  const before = snapshot(h);
  const invalid = [
    [defaults(), multipliers({health: 2147483647})],
    [defaults(), multipliers({}, {health: 1e-20})],
    [defaults(), multipliers({damage: 2147483647})],
    [defaults(), multipliers({}, {damage: 2147483647})],
    [defaults(), multipliers({moveSpeed: 2147483647})]
  ];
  const stage = defaults(); stage.levels[0].zombieHealthMultiplier = 2;
  stage.zombies[0].health = 1073741823;
  invalid.push([stage, multipliers({}, {health: 1.01})]);
  for (const [config, groups] of invalid) {
    assert.throws(() => GameConfig.updateLive(h.target, config, {multipliers: groups}), /GameConfig/);
    assert.deepEqual(snapshot(h), before);
  }
});

test('compilation validates composed values even without an initialized game and never mutates source input', () => {
  const config = defaults(), before = plain(config);
  assert.throws(() => GameConfig.compile(config, {multipliers: multipliers({health: 2147483647})}), /GameConfig/);
  assert.deepEqual(config, before);
  const valid = GameConfig.compile(config, {multipliers: multipliers({health: 1.5}, {health: 1.5})});
  assert.deepEqual(valid.config, before);
  assert.deepEqual(valid.multipliers, multipliers({health: 1.5}, {health: 1.5}));
  assert.deepEqual(config, before);
});

test('ordinary live edits, wave reconciliation and battle reset retain selected army multipliers without compounding', () => {
  const config = defaults(); config.levels[0].zombieHealthMultiplier = 2.9;
  const h = fixture(config, multipliers({health: 2, damage: 3}, {health: 1.5, damage: 2})), g = h.game;
  const next = GameConfig.getCurrent(h.target);
  next.units[0].cost = 41; next.levels[0].waves[0].count = 123;
  GameConfig.updateLive(h.target, next);
  assert.equal(g.bbunits[0].bbcost, 41);
  assert.equal(g.bbAddPerson(g.bbunits[0]).bbhealth, 100);
  assert.equal(g.bbAddZombie(g.bbzunits[0]).bbhealth, 75);
  const result = GameConfig.applyLiveWaves(h.target, next);
  assert.equal(result.requiresNewBattle, false);
  assert.equal(GameConfig.getWaveProgress(h.target).current.total, 123);
  assert.equal(g.bbAddZombie(g.bbzunits[0]).bbhealth, 75);
  GameConfig.updateLive(h.target, next);
  g.bbResetGame(1);
  assert.equal(g.bbAddPerson(g.bbunits[0]).bbhealth, 100);
  assert.equal(g.bbAddZombie(g.bbzunits[0]).bbhealth, 75);
  assert.equal(g.bbunits[0].bbdamage, 30);
  assert.equal(g.bbzunits[0].bbdamage, 20);
  assert.equal(g.bbpeoplebase.bbhealth, next.units[5].health);
  assert.equal(g.bbzombiebase.bbhealth, next.zombies[5].health);
  assert.deepEqual(GameConfig.getCurrent(h.target), next);
});

test('validation composes source health, stage and army multipliers before checking the effective integer range', () => {
  const config = defaults();
  config.zombies[0].health = 2000000000;
  for (const level of config.levels) level.zombieHealthMultiplier = 2;
  const groups = multipliers({}, {health: 0.5}), before = plain(config);
  assert.throws(() => GameConfig.validate(config), /GameConfig/, 'the unscaled source-stage product overflows');
  assert.deepEqual(GameConfig.validate(config, {multipliers: groups}), config);
  const compiled = GameConfig.compile(config, {multipliers: groups});
  assert.deepEqual(compiled.config, config);
  assert.deepEqual(compiled.multipliers, groups);
  const h = fixture(config, groups);
  const zombie = h.game.bbAddZombie(h.game.bbzunits[0]);
  assert.equal(zombie.bbhealth, 2000000000, '2e9 × trunc(2) × 0.5 fits the engine');
  assert.equal(GameConfig.getMaximumHealth(h.target, zombie), 2000000000);
  assert.deepEqual(config, before, 'composition must not rewrite the raw source health');
});

test('live validate-only plans report valid changes without changing actors, source, tables, waves or random state', () => {
  const h = fixture(), g = h.game;
  const person = g.bbAddPerson(g.bbunits[0]); person.bbhealth = 25;
  const zombie = g.bbAddZombie(g.bbzunits[0]); zombie.bbhealth = 10;
  const next = GameConfig.getCurrent(h.target);
  next.units[0].health = 80; next.units[0].cost = 41;
  next.levels[0].waves[0].count = 99;
  const groups = multipliers({health: 1.5, moveSpeed: 2, damage: 3}, {health: 2});
  const before = snapshot(h), queue = h.port.bb_ZombieMob.bbqueue, head = queue.bbFirst();
  const report = GameConfig.updateLive(h.target, next, {multipliers: groups, validateOnly: true});
  assert.ok(report.applied.includes('$.units[0].health'));
  assert.ok(report.applied.includes('$multipliers.units.health'));
  assert.ok(report.deferred.includes('$.levels[0].waves'));
  assert.deepEqual(snapshot(h), before);
  assert.equal(h.port.bb_ZombieMob.bbqueue, queue);
  assert.equal(h.port.bb_ZombieMob.bbqueue.bbFirst(), head);
  assert.equal(g.bbAddPerson(g.bbunits[0]).bbhealth, 50, 'dry runs do not promote new constructor rules');
  const committed = GameConfig.updateLive(h.target, next, {multipliers: groups});
  assert.deepEqual(committed, report);
  assert.equal(person.bbhealth, 60);
  assert.equal(zombie.bbhealth, 20);
});

test('wave validate-only composes the incoming raw source with incoming multipliers, never the obsolete live source', () => {
  const h = fixture(), next = GameConfig.getCurrent(h.target);
  for (const zombie of next.zombies.slice(0, 5)) zombie.health = 1000000000;
  for (const level of next.levels) level.zombieHealthMultiplier = 1;
  next.levels[0].waves[0].count = 99;
  const groups = multipliers({}, {health: 1e-8});
  assert.throws(() => GameConfig.compile(GameConfig.getCurrent(h.target), {multipliers: groups}), /GameConfig/,
    'the previous raw health would round down to zero under the new multiplier');
  assert.doesNotThrow(() => GameConfig.compile(next, {multipliers: groups}), 'new raw health produces a valid final HP of 10');
  const before = snapshot(h), queue = h.port.bb_ZombieMob.bbqueue, head = queue.bbFirst();
  const report = GameConfig.applyLiveWaves(h.target, next, {validateOnly: true, multipliers: groups});
  assert.equal(report.requiresNewBattle, false);
  assert.ok(report.applied.includes('$.levels[0].waves'));
  assert.deepEqual(snapshot(h), before);
  assert.equal(h.port.bb_ZombieMob.bbqueue, queue);
  assert.equal(h.port.bb_ZombieMob.bbqueue.bbFirst(), head);
  const liveReport = GameConfig.updateLive(h.target, next, {validateOnly: true, multipliers: groups});
  assert.ok(liveReport.applied.includes('$.zombies[0].health'));
  assert.deepEqual(snapshot(h), before);
});

test('frozen living actors and unit templates fail both dry-run and real preflight without partial updates', () => {
  for (const frozenKind of ['body', 'template']) {
    const h = fixture(), person = h.game.bbAddPerson(h.game.bbunits[0]); person.bbhealth = 25;
    h.game.bbAddZombie(h.game.bbzunits[0]);
    Object.freeze(frozenKind === 'body' ? person : h.game.bbunits[0]);
    const next = GameConfig.getCurrent(h.target); next.units[0].cost = 41;
    const groups = multipliers({health: 2, moveSpeed: 2, damage: 2}), before = snapshot(h);
    assert.throws(() => GameConfig.updateLive(h.target, next, {multipliers: groups, validateOnly: true}), /not writable/);
    assert.deepEqual(snapshot(h), before, frozenKind + ' dry-run must not mutate');
    assert.throws(() => GameConfig.updateLive(h.target, next, {multipliers: groups}), /not writable/);
    assert.deepEqual(snapshot(h), before, frozenKind + ' real commit must not half-apply');
  }
});

test('frozen wave nodes fail dry-run and real preflight without replacing queues or promoting source state', () => {
  const h = fixture(), next = GameConfig.getCurrent(h.target);
  next.levels[0].waves[0].count += 10;
  const queue = h.port.bb_ZombieMob.bbqueue, head = queue.bbFirst(); Object.freeze(head);
  const before = snapshot(h);
  for (const options of [{validateOnly: true}, undefined]) {
    assert.throws(() => GameConfig.applyLiveWaves(h.target, next, options), /not writable/);
    assert.deepEqual(snapshot(h), before);
    assert.equal(h.port.bb_ZombieMob.bbqueue, queue);
    assert.equal(h.port.bb_ZombieMob.bbqueue.bbFirst(), head);
  }
});

test('validation and dry-run options reject strings, unknown fields and nonboolean toggles without mutation', () => {
  const h = fixture(), config = GameConfig.getCurrent(h.target), before = snapshot(h);
  const calls = [
    () => GameConfig.validate(config, 'yes'),
    () => GameConfig.validate(config, {validateOnly: true}),
    () => GameConfig.validate(config, {multipliers: multipliers(), unknown: true}),
    () => GameConfig.compile(config, 'yes'),
    () => GameConfig.updateLive(h.target, config, 'yes'),
    () => GameConfig.updateLive(h.target, config, {validateOnly: 'true'}),
    () => GameConfig.updateLive(h.target, config, {validateOnly: 1}),
    () => GameConfig.updateLive(h.target, config, {validateOnly: true, unknown: 1}),
    () => GameConfig.applyLiveWaves(h.target, config, 'yes'),
    () => GameConfig.applyLiveWaves(h.target, config, {validateOnly: 'true'}),
    () => GameConfig.applyLiveWaves(h.target, config, {validateOnly: 1}),
    () => GameConfig.applyLiveWaves(h.target, config, {multipliers: multipliers()}),
    () => GameConfig.applyLiveWaves(h.target, config, {validateOnly: false, multipliers: multipliers()}),
    () => GameConfig.applyLiveWaves(h.target, config, {validateOnly: true, unknown: 1})
  ];
  for (const call of calls) {
    assert.throws(call, /GameConfig/);
    assert.deepEqual(snapshot(h), before);
  }
});
