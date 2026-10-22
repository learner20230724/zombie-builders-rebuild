/* Behavioral assertions against recovered AS3, not a second implementation.
 * Source citations below refer to reference/simplified/scripts/main.as.
 * Only the platform is stubbed by game-test-harness; no game method is mocked.
 * Fixture changes position, health and animation counters to exercise boundaries
 * without waiting for a full match. The real methods resolve every interaction. */
'use strict';
const assert = require('node:assert/strict');
const {createHarness} = require('./game-test-harness.cjs');

let passed = 0;
const failures = [];
function test(name, body) {
  try {body(); passed++;}
  catch (error) {failures.push({name, error: error.stack}); console.error('FAIL ' + name + '\n' + error.stack);}
}
function items(list) {
  const result = [], iterator = list.bbObjectEnumerator();
  while (iterator.bbHasNext()) result.push(iterator.bbNextObject());
  return result;
}
function includes(list, value) {return items(list).includes(value);}
function arena(difficulty = 1) {
  const h = createHarness();
  h.game.bbPlayGame(difficulty);
  // Isolate units from bases and timed waves, without replacing their methods.
  h.game.bbmainState = 5;
  h.game.bbpeople.bbClear(); h.game.bbzombies.bbClear(); h.game.bbpombies.bbClear();
  return h;
}
function person(h, index, x = 400) {
  const p = h.game.bbAddPerson(h.game.bbunits[index]);
  p.bbxpos = x;
  return p;
}
function zombie(h, index, x = 600) {
  const z = h.game.bbAddZombie(h.game.bbzunits[index]);
  z.bbxpos = x;
  return z;
}
function personRight(p) {return (p.bbxpos + p.bbunit.bbhitoffset + p.bbunit.bbhitradius) | 0;}
function zombieLeft(z) {return (z.bbxpos + z.bbunit.bbhitoffset - z.bbunit.bbhitradius) | 0;}
function placeZombieEdge(z, edge) {z.bbxpos = edge - z.bbunit.bbhitoffset + z.bbunit.bbhitradius;}
function animate(body, ticks) {for (let i = 0; i < ticks; i++) body.bbUpdate();}
function soundNames(h) {return h.sounds.map(channel => channel.sample.name);}

// AS3 7396-7445, 6997-7069: constructor movement/animation modes and base health.
test('all human constructors preserve health, speed, animation and base mode', () => {
  const h = arena();
  const expected = [[50, .5, 21, 0], [100, .328125, 30, 0], [400, 1.2, 1, 0], [80, .25, 28, 0], [100, .4, 26, 0]];
  expected.forEach(([health, speed, cycle, mode], i) => {
    const p = person(h, i);
    assert.deepEqual([p.bbhealth, p.bbwalkspeed, p.bbwalkcycle, p.bbmode, p.bbanimrate], [health, speed, cycle, mode, 4]);
  });
  assert.equal(h.game.bbpeoplebase.bbhealth, 4000);
  assert.equal(h.game.bbpeoplebase.bbmode, 16);
});
test('all zombie constructors preserve source health coercion and movement in all four levels', () => {
  const expected = [[25, .25, 42, 4, 1], [60, .5, 21, 4, 1], [150, 1.5, 13, 4, 1], [1000, .4, 39, 4, 1], [1500, .0625, 42, 10, 2.3]];
  for (let level = 1; level <= 4; level++) {
    const h = arena(level);
    assert.equal(h.game.bbZombieDamageMultiplier, 1 + .25 * (level - 1));
    expected.forEach(([health, speed, cycle, rate, scale], i) => {
      const z = zombie(h, i);
      // Recovered expression is health *= (multiplier | 0), NOT (health * multiplier) | 0.
      assert.deepEqual([z.bbhealth, z.bbwalkspeed, z.bbwalkcycle, z.bbanimrate, z.bbscale, z.bbmode, z.bbdirection], [health, speed, cycle, rate, scale, 0, 1]);
    });
    assert.equal(h.game.bbzombiebase.bbhealth, 16000);
    assert.equal(h.game.bbzombiebase.bbmode, 16);
  }
});

// AS3 7491-7615: exact animation event frames, consumed once by bbHitKey.
for (const spec of [
  {index: 0, mode: 1, event: 24, reset: 52, label: 'shovel'},
  {index: 1, mode: 3, event: 16, reset: 141, label: 'shotgun'},
  {index: 3, mode: 4, event: 44, reset: 200, label: 'bomber'},
  {index: 4, mode: 6, event: 200, reset: 336, label: 'preacher'},
]) test(spec.label + ' hits at its original animation boundary and then returns to walking', () => {
  const h = arena(), p = person(h, spec.index);
  p.bbmode = spec.mode;
  animate(p, spec.event - 1);
  assert.equal(p.bbHitKey(), 0, 'No early hit');
  p.bbUpdate();
  assert.equal(p.bbHitKey(), 1, 'Hit on exact frame');
  assert.equal(p.bbHitKey(), 0, 'Hit is edge-triggered, not sticky');
  animate(p, spec.reset - spec.event - 1);
  assert.equal(p.bbmode, spec.mode);
  p.bbUpdate();
  assert.equal(p.bbmode, 0);
});
test('survivalist truck fires every eight ticks for exactly seven shots', () => {
  const h = arena(), p = person(h, 2), shots = [];
  p.bbmode = 5;
  for (let tick = 1; tick <= 57; tick++) {
    p.bbUpdate();
    if (p.bbHitKey()) shots.push(tick);
  }
  assert.deepEqual(shots, [8, 16, 24, 32, 40, 48, 56]);
  assert.equal(p.bbmode, 0);
});

// AS3 7117-7201: zombie animation event timing, including ghoul's return-to-walk hit.
for (const spec of [
  {index: 0, mode: 9, event: 16, reset: 96, label: 'zombie'},
  {index: 1, mode: 8, event: 64, reset: 64, label: 'jumping ghoul melee'},
  {index: 2, mode: 12, event: 16, reset: 40, label: 'fast zombie'},
  {index: 3, mode: 10, event: 56, reset: 116, label: 'big fat zombie'},
  {index: 4, mode: 11, event: 390, reset: 511, label: 'corpse thrower'},
]) test(spec.label + ' attack timing matches the recovered animation', () => {
  const h = arena(), z = zombie(h, spec.index);
  z.bbmode = spec.mode;
  animate(z, spec.event - 1);
  assert.equal(z.bbHitKey(), 0);
  z.bbUpdate();
  assert.equal(z.bbHitKey(), 1);
  assert.equal(z.bbHitKey(), 0);
  if (spec.reset > spec.event) {
    animate(z, spec.reset - spec.event - 1);
    assert.equal(z.bbmode, spec.mode);
    z.bbUpdate();
  }
  assert.equal(z.bbmode, 0);
});

// AS3 2764-2814, 3042-3118: distance gates use the hitbox edges, strict inequalities.
for (const spec of [
  {index: 0, distance: 15, mode: 1, outside: 16},
  {index: 1, distance: 239, mode: 3, outside: 240},
  {index: 2, distance: 139, mode: 5, outside: 140},
  {index: 3, distance: 301, mode: 4, outside: 300},
  {index: 4, distance: 319, mode: 6, outside: 320},
]) test('human unit ' + spec.index + ' attack-acquisition hitbox boundary', () => {
  for (const [distance, expected] of [[spec.distance, spec.mode], [spec.outside, 0]]) {
    const h = arena(), p = person(h, spec.index), z = zombie(h, 0);
    placeZombieEdge(z, personRight(p) + distance);
    h.gameTick();
    assert.equal(p.bbmode, expected, 'edge distance ' + distance);
  }
});
for (const spec of [
  {index: 0, distance: 15, mode: 9, outside: 16},
  {index: 1, distance: 15, mode: 8, outside: 16},
  {index: 2, distance: 15, mode: 12, outside: 16},
  {index: 3, distance: 19, mode: 10, outside: 20},
  {index: 4, distance: 501, mode: 11, outside: 500},
]) test('zombie unit ' + (32 + spec.index) + ' attack-acquisition hitbox boundary', () => {
  for (const [distance, expected] of [[spec.distance, spec.mode], [spec.outside, 0]]) {
    const h = arena(), p = person(h, 4), z = zombie(h, spec.index);
    // Keep the human in a real non-attacking animation to prevent conversion.
    p.bbmode = 4;
    placeZombieEdge(z, personRight(p) + distance);
    h.gameTick();
    assert.equal(z.bbmode, expected, 'edge distance ' + distance);
  }
});
test('jumping ghoul enters its special leap only between 360 and 400 edge units', () => {
  for (const [distance, mode] of [[360, 0], [361, 7], [399, 7], [400, 0]]) {
    const h = arena(), p = person(h, 0), z = zombie(h, 1);
    placeZombieEdge(z, personRight(p) + distance);
    h.gameTick();
    assert.equal(z.bbmode, mode, 'distance ' + distance);
  }
});

// AS3 2816-2913: real attack dispatch, target ordering and spillover.
test('shovel damage spills across nearby zombies but excludes a leaping ghoul', () => {
  const h = arena(), p = person(h, 0), a = zombie(h, 0, 420), b = zombie(h, 0, 430), leap = zombie(h, 1);
  a.bbhealth = 5; placeZombieEdge(leap, 425); leap.bbmode = 7;
  p.bbmode = 1; p.bbhit = 1;
  h.gameTick();
  assert.equal(a.bbhealth, 0);
  assert.equal(b.bbhealth, 20);
  assert.equal(leap.bbhealth, 60);
  assert.equal(p.bbHitKey(), 0);
  assert.equal(a.bbsmackstyle, 1);
});
test('shotgun chooses nearest positive-distance target, not list order or a target behind', () => {
  const h = arena(), p = person(h, 1), far = zombie(h, 0, 650), near = zombie(h, 0, 500), behind = zombie(h, 0, 350);
  p.bbmode = 3; p.bbhit = 1;
  h.gameTick();
  assert.deepEqual([far.bbhealth, near.bbhealth, behind.bbhealth], [25, 10, 25]);
  assert.equal(near.bbsmackstyle, 3);
});
test('truck transfers its five-damage budget to successive nearest living targets', () => {
  const h = arena(), p = person(h, 2), far = zombie(h, 0, 500), near = zombie(h, 0, 450), second = zombie(h, 0, 460);
  near.bbhealth = 3; second.bbhealth = 3;
  p.bbmode = 5; p.bbhit = 1;
  h.gameTick();
  assert.deepEqual([near.bbhealth, second.bbhealth, far.bbhealth], [0, 1, 25]);
  assert.equal(near.bbsmackstyle, 2);
});
test('moonshine bomber emits a real ballistic bottle with original 100 damage, not unit-table 60', () => {
  const h = arena(), p = person(h, 3);
  p.bbmode = 4; p.bbhit = 1;
  h.gameTick();
  const [b] = items(h.game.bbbottles);
  assert.equal(h.count(h.game.bbbottles), 1);
  assert.deepEqual([b.bbxpos, b.bbypos, b.bbvelx, b.bbvely, b.bbdamage, b.bbexplode], [412, -64, 4, -4, 100, 0]);
  b.bbUpdate();
  assert.deepEqual([b.bbxpos, b.bbypos, b.bbvelx, b.bbvely], [416, -68, 4, -3.9]);
});
test('bottle explosion uses a shared damage budget, strict radius 100, and the exact 500-damage base exception', () => {
  const h = arena(), a = zombie(h, 0, 500), b = zombie(h, 0, 510), outside = zombie(h, 0, 600);
  h.game.bbzombies.bbAddLast(h.game.bbzombiebase); h.game.bbzombiebase.bbxpos = 500;
  h.game.bbExplodeBottle(0, 500, 0, 30);
  assert.deepEqual([a.bbhealth, b.bbhealth, outside.bbhealth, h.game.bbzombiebase.bbhealth], [0, 20, 25, 16000]);
  h.game.bbExplodeBottle(0, 500, 0, 500);
  assert.equal(h.game.bbzombiebase.bbhealth, 15520, 'A preceding target consumes 20, so remaining 480 no longer meets the literal 500-damage exception');
  h.game.bbzombies.bbClear(); h.game.bbzombies.bbAddLast(h.game.bbzombiebase);
  h.game.bbzombiebase.bbhealth = 16000;
  h.game.bbExplodeBottle(0, 500, 0, 500);
  assert.equal(h.game.bbzombiebase.bbhealth, 16000);
  h.game.bbExplodeBottle(0, 500, 0, 100);
  assert.equal(h.game.bbzombiebase.bbhealth, 15900, '100-damage bomber bottles can damage base');
});

// AS3 3120-3209: damage includes AS3 integer truncation; fat zombie is area spillover.
for (const spec of [{index: 0, mode: 9, damage: 10}, {index: 1, mode: 8, damage: 16}, {index: 2, mode: 12, damage: 20}, {index: 3, mode: 10, damage: 60}]) {
  test('zombie ' + (32 + spec.index) + ' damages humans using the level multiplier', () => {
    for (let level = 1; level <= 4; level++) {
      const h = arena(level), p = person(h, 0), z = zombie(h, spec.index);
      p.bbhealth = 200;
      p.bbmode = 4;
      placeZombieEdge(z, personRight(p) + 10);
      z.bbmode = spec.mode; z.bbhit = 1;
      h.gameTick();
      assert.equal(p.bbhealth, 200 - ((spec.damage * (1 + .25 * (level - 1))) | 0));
    }
  });
}
test('fat zombie attack spills across humans in list order within strict radius 80', () => {
  const h = arena(), a = person(h, 0), b = person(h, 0, 390), outside = person(h, 0, 330), z = zombie(h, 3);
  for (const p of [a, b, outside]) p.bbmode = 4;
  placeZombieEdge(z, 420); z.bbmode = 10; z.bbhit = 1;
  h.gameTick();
  assert.deepEqual([a.bbhealth, b.bbhealth, outside.bbhealth], [0, 40, 50]);
});
test('corpse thrower launches a 104-tick 500-damage projectile that spawns a normal zombie on landing', () => {
  const h = arena(), z = zombie(h, 4, 1200);
  z.bbmode = 11; z.bbhit = 1;
  h.gameTick();
  const [fling] = items(h.game.bbflinglist);
  assert.deepEqual([fling.bbxpos, fling.bbfling, fling.bbdamage, fling.bbanimrate], [1200, 0, 500, 8]);
  z.bbmode = 14; // Remove launcher via its real death handling to isolate landing.
  const victim = person(h, 2, 420); victim.bbmode = 4;
  h.gameTick(103);
  assert.equal(h.count(h.game.bbflinglist), 1);
  assert.equal(victim.bbhealth, 400);
  h.gameTick();
  assert.equal(h.count(h.game.bbflinglist), 0);
  assert.equal(victim.bbhealth, 0);
  assert.ok(items(h.game.bbzombies).some(spawn => spawn.bbunit.bbtype === 32 && Math.abs(spawn.bbxpos - 420) < 1));
  assert.deepEqual(items(h.game.bbexplosions).map(explosion => explosion.bbzoom), [4, 1, 3], 'Launcher death, landing and victim truck death');
});

// AS3 7447-7475 and 6967-6993: all health/death and damage-overflow transitions.
for (let index = 0; index < 6; index++) test('human ' + index + ' infection clamps health, returns overflow, and marks death', () => {
  const h = arena(), p = index === 5 ? h.game.bbpeoplebase : person(h, index), max = p.bbhealth;
  assert.equal(p.bbInfect(7), 0);
  assert.equal(p.bbhealth, max - 7);
  if (index === 3) assert.deepEqual([p.bbmode, p.bbsmack], [2, 3]);
  if (index === 5) {assert.equal(p.bbshake, 44); assert.ok(h.count(h.game.bbbodyparts) > 0);}
  assert.equal(p.bbInfect(max - 7 + 13), 13);
  assert.equal(p.bbhealth, 0);
  assert.equal(p.bbmode, 14);
});
for (let index = 0; index < 6; index++) test('zombie ' + (32 + index) + ' damage clamps health, returns overflow, and marks death', () => {
  const h = arena(), z = index === 5 ? h.game.bbzombiebase : zombie(h, index), max = z.bbhealth;
  assert.equal(z.bbSmack(7, 2), 0);
  assert.equal(z.bbhealth, max - 7);
  assert.equal(z.bbsmack, 1);
  assert.equal(z.bbsmackstyle, 2);
  if (index === 5) {assert.equal(z.bbshake, 44); assert.ok(h.count(h.game.bbbodyparts) > 0);}
  assert.equal(z.bbSmack(max - 7 + 13, 3), 13);
  assert.equal(z.bbhealth, 0);
  assert.equal(z.bbmode, 14);
  assert.equal(z.bbsmackstyle, 3);
});
for (let index = 0; index < 5; index++) test('human ' + index + ' death frees population, increments kin loss and creates the correct effect', () => {
  const h = arena(), p = person(h, index);
  h.game.bbmainState = 2;
  h.game.bbztp.bbforce = 20;
  p.bbInfect(p.bbhealth);
  h.gameTick();
  assert.equal(p.bbmode, 15);
  assert.equal(includes(h.game.bbpeople, p), false);
  assert.equal(h.game.bbkinlost, 1);
  assert.equal(h.game.bbztp.bbforce, 20 - p.bbunit.bbpeople);
  assert.equal(h.count(h.game.bbdeathlist), [1, 1, 0, 0, 1][index]);
  assert.equal(h.count(h.game.bbexplosions), [0, 0, 1, 2, 0][index]);
});
test('angry mob and was-zombie human deaths do not debit purchased population', () => {
  const h = arena(), angry = person(h, 0), wasZombie = person(h, 0);
  h.game.bbztp.bbforce = 10;
  angry.bbAnger(); wasZombie.bbwaszombie = 1;
  angry.bbInfect(50); wasZombie.bbInfect(50);
  h.gameTick();
  assert.equal(h.game.bbztp.bbforce, 10);
});
for (let index = 0; index < 5; index++) test('hostile zombie ' + (32 + index) + ' death awards base-health XP once and increments kill count', () => {
  const h = arena(), z = zombie(h, index);
  h.game.bbmainState = 2;
  z.bbSmack(z.bbhealth, 1);
  h.gameTick();
  assert.equal(includes(h.game.bbzombies, z), false);
  assert.equal(h.game.bbzombieskilled, 1);
  assert.equal(h.game.bbztp.bbxp, [25, 60, 150, 1000, 1500][index]);
  h.gameTick();
  assert.equal(h.game.bbzombieskilled, 1);
  assert.equal(h.game.bbztp.bbxp, [25, 60, 150, 1000, 1500][index]);
  if (index === 4) assert.equal(h.count(h.game.bbexplosions), 1);
  else assert.ok(h.count(h.game.bbbodyparts) > 0);
});

// AS3 2914-2944: preacher prioritizes highest type, then latest equal type,
// spends UNIT maximum-health budget 1000, and reverses the zombie's allegiance.
test('preacher chooses the strongest eligible type, latest equal-type target, and spends maximum-health budget', () => {
  const h = arena(), p = person(h, 4), weak = zombie(h, 0), fatA = zombie(h, 3), fatB = zombie(h, 3);
  placeZombieEdge(weak, personRight(p) + 20);
  placeZombieEdge(fatA, personRight(p) + 100);
  placeZombieEdge(fatB, personRight(p) + 300);
  fatA.bbhealth = 1; fatB.bbhealth = 1;
  p.bbmode = 6; p.bbhit = 1;
  h.gameTick();
  assert.deepEqual(items(h.game.bbpombies), [fatB]);
  assert.equal(includes(h.game.bbzombies, fatB), false);
  assert.equal(includes(h.game.bbzombies, fatA), true);
  assert.equal(includes(h.game.bbzombies, weak), true);
  assert.equal(fatB.bbdirection, -1);
  assert.equal(fatB.bbhealth, 1, 'Conversion does not heal');
});
test('preacher converts several zombies until a final target exhausts or overshoots its 1000-health budget', () => {
  const h = arena(), p = person(h, 4), targets = [];
  for (let i = 0; i < 8; i++) {const z = zombie(h, 2); placeZombieEdge(z, personRight(p) + 20 + i * 30); targets.push(z);}
  p.bbmode = 6; p.bbhit = 1; h.gameTick();
  assert.equal(h.count(h.game.bbpombies), 7, 'Seven 150-health targets consume 1050 from a 1000 budget');
  assert.equal(h.count(h.game.bbzombies), 1);
  assert.equal(includes(h.game.bbzombies, targets[0]), true, 'Equal-type scan selects later entries first');
  assert.equal(h.game.bbztp.bbxp, 0, 'Conversion itself gives no kill XP');
});
test('preacher excludes throwers, airborne ghouls, removed units, already-friendly direction, behind and 320-distance targets', () => {
  const h = arena(), p = person(h, 4), casterEdge = personRight(p);
  const thrower = zombie(h, 4), airborne = zombie(h, 1), removed = zombie(h, 0), friendly = zombie(h, 0), behind = zombie(h, 0), outside = zombie(h, 0), eligible = zombie(h, 0);
  for (const z of [thrower, airborne, removed, friendly]) placeZombieEdge(z, casterEdge + 100);
  airborne.bbmode = 7; removed.bbmode = 15; friendly.bbdirection = -1;
  placeZombieEdge(behind, casterEdge - 1); placeZombieEdge(outside, casterEdge + 320); placeZombieEdge(eligible, casterEdge + 319);
  p.bbmode = 6; p.bbhit = 1; h.gameTick();
  assert.deepEqual(items(h.game.bbpombies), [eligible]);
  assert.equal(includes(h.game.bbzombies, thrower), true);
  assert.equal(includes(h.game.bbzombies, airborne), true);
  assert.equal(includes(h.game.bbzombies, friendly), true);
  assert.equal(includes(h.game.bbzombies, behind), true);
  assert.equal(includes(h.game.bbzombies, outside), true);
});
for (const spec of [{index: 0, mode: 9, damage: 10}, {index: 1, mode: 8, damage: 16}, {index: 2, mode: 12, damage: 20}, {index: 3, mode: 10, damage: 60}]) test('converted zombie ' + (32 + spec.index) + ' attacks hostiles and dies without kill/XP credit', () => {
  const h = arena(), converted = zombie(h, spec.index, 400), target = zombie(h, 3, 500);
  h.game.bbzombies.bbRemove(converted); h.game.bbpombies.bbAddLast(converted); converted.bbTurn();
  const right = (converted.bbxpos - converted.bbunit.bbhitoffset + converted.bbunit.bbhitradius) | 0;
  placeZombieEdge(target, right + 10);
  converted.bbmode = spec.mode; converted.bbhit = 1; h.gameTick();
  assert.equal(target.bbhealth, 1000 - spec.damage);
  converted.bbSmack(converted.bbhealth, 1); h.gameTick();
  assert.equal(includes(h.game.bbpombies, converted), false);
  assert.equal(h.game.bbztp.bbxp, 0);
  assert.equal(h.game.bbzombieskilled, 0);
});

// AS3 1590-1592, 2233-2310, 4599-4620, 6257-6286: three powers.
for (let index = 0; index < 3; index++) test('power ' + index + ' XP purchase, 150-tick activation, cooldown and reset', () => {
  const h = arena(), power = h.game.bbpowers[index];
  power.bblocked = 0;
  const cost = [3000, 4000, 5000][index], cooldown = [5000, 10000, 10000][index];
  assert.deepEqual([power.bbxp, power.bbbuildtime, power.bbcooltime], [cost, 150, cooldown]);
  h.game.bbztp.bbxp = cost - 1; power.bbUpdate(h.game.bbztp);
  assert.equal(power.bbenabled, 0);
  h.game.bbBuyPower(power); assert.equal(power.bbbusy, 0); assert.equal(h.game.bbztp.bbxp, cost - 1);
  h.game.bbztp.bbxp = cost + 100; power.bbUpdate(h.game.bbztp);
  assert.equal(power.bbenabled, 1);
  h.game.bbBuyPower(power);
  assert.deepEqual([h.game.bbztp.bbxp, power.bbbusy, power.bbcooldown], [100, 150, 0]);
  h.game.bbztp.bbxp = cost + 100;
  h.game.bbBuyPower(power);
  assert.equal(h.game.bbztp.bbxp, cost + 100, 'No duplicate debit while charging');
  h.gameTick(149);
  assert.equal(power.bbbusy, 1);
  assert.equal(h.count(h.game.bbpowerups) + h.count(h.game.bbpeople), 0, 'No effect before 150 ticks');
  h.game.bbmainState = 2; h.game.bbgametime = 1000;
  h.gameTick();
  assert.deepEqual([power.bbbusy, power.bbcooldown], [0, cooldown - 1], 'Cooldown decrements during activation tick');
  power.bbUpdate(h.game.bbztp); assert.equal(power.bbenabled, 0);
  h.game.bbBuyPower(power); assert.equal(h.game.bbztp.bbxp, cost + 100, 'Cooldown blocks debit');
  if (index === 0) {
    const mob = items(h.game.bbpeople);
    assert.equal(mob.length, 16);
    assert.equal(mob.filter(p => p.bbunit.bbtype === 0).length, 12);
    assert.equal(mob.filter(p => p.bbunit.bbtype === 1).length, 4);
    assert.ok(mob.every(p => p.bbisangry === 1));
    assert.equal(mob[0].bbwalkspeed, .75);
    assert.equal(h.game.bbztp.bbforce, 0, 'Angry mob requires no population');
    assert.ok(soundNames(h).includes('angry_mob.mp3'));
  } else if (index === 1) {
    const [harvester] = items(h.game.bbpowerups);
    assert.equal(h.count(h.game.bbpowerups), 1);
    assert.deepEqual([harvester.bbtype, harvester.bbxpos, harvester.bbwalkspeed, harvester.bbwalkcycle], [1, -99.4, .6, 4]);
  } else {
    const jets = items(h.game.bbpowerups);
    assert.equal(jets.length, 3);
    assert.deepEqual(jets.map(jet => [jet.bbtype, jet.bbxpos, jet.bbypos, jet.bbwalkspeed]), [[2, -222, -440, 6], [2, -350, -480, 6], [2, -478, -400, 6]]);
    assert.ok(soundNames(h).includes('airstrike.mp3'));
  }
  power.bbcooldown = 1; h.gameTick();
  power.bbUpdate(h.game.bbztp); assert.equal(power.bbenabled, 1);
  h.game.bbBuyPower(power); assert.equal(power.bbbusy, 150);
  power.bbReset(); assert.deepEqual([power.bbbusy, power.bbcooldown], [0, 0]);
});
test('harvester deals 100 per tick within forward 220-edge range and excludes the zombie base', () => {
  const h = arena(), power = h.game.bbpowers[1];
  h.game.bbAddPower(power);
  const [harvester] = items(h.game.bbpowerups);
  harvester.bbxpos = 400;
  const inside = zombie(h, 3), outside = zombie(h, 3), behind = zombie(h, 3);
  placeZombieEdge(inside, 619); placeZombieEdge(outside, 620); placeZombieEdge(behind, 399);
  h.game.bbzombies.bbAddLast(h.game.bbzombiebase); h.game.bbzombiebase.bbxpos = 500;
  h.gameTick();
  assert.deepEqual([inside.bbhealth, outside.bbhealth, behind.bbhealth, h.game.bbzombiebase.bbhealth], [900, 1000, 1000, 16000]);
  assert.deepEqual([harvester.bbharvest, harvester.bbpeak], [100, 100]);
});
test('airstrike jets emit smoke and 500-damage ballistic bombs, cross the playfield, and leave an isolated base intact', () => {
  const h = arena();
  h.game.bbzombies.bbAddLast(h.game.bbzombiebase);
  h.game.bbAddPower(h.game.bbpowers[2]);
  h.context.ZTPGamePort.setRandomSeed(1234);
  h.gameTick(60);
  const bombs = items(h.game.bbbottles);
  assert.ok(bombs.length > 0, 'Seeded real jet update must emit bombs');
  assert.ok(h.count(h.game.bbsmokelist) > 0);
  assert.ok(bombs.every(bomb => bomb.bbdamage === 500 && bomb.bbvelx === 0 && bomb.bbypos < 0));
  assert.equal(h.game.bbzombiebase.bbhealth, 16000);
  h.gameTick(340);
  assert.equal(h.count(h.game.bbpowerups), 0, 'Every jet is removed after crossing x=1700');
  assert.equal(h.game.bbzombiebase.bbhealth, 16000, 'Only 500-damage bombs reach an otherwise empty zombie-base list');
});
for (let index = 0; index < 3; index++) test('power ' + index + ' is purchased once through its real rendered UI button', () => {
  const storage = new Map([['ZTPBestScores:0', 1000], ['ZTPBestScores:1', 1000]]);
  const h = createHarness({storage}); h.game.bbPlayGame(1);
  h.game.bbztp.bbxp = 20000;
  h.inputState.x = 638 + 49 * index + 20; h.inputState.y = 84;
  h.game.bbmousehit = 1; h.draw();
  assert.equal(h.game.bbpowers[index].bbbusy, 150);
  assert.equal(h.game.bbztp.bbxp, 20000 - [3000, 4000, 5000][index]);
  h.game.bbmousehit = 1; h.draw();
  assert.equal(h.game.bbztp.bbxp, 20000 - [3000, 4000, 5000][index], 'A second click while charging cannot debit again');
});

// AS3 1452-1458, 1988-1990, 2101-2131, 3397-3406, 3915-3922:
// base destruction, all levels, best-score saving, reload and progression locks.
for (let level = 1; level <= 4; level++) {
  test('level ' + level + ' enemy-base destruction wins and saves only its best time', () => {
    const h = createHarness(); h.game.bbPlayGame(level);
    h.game.bbgameticks = 1200 + level;
    h.game.bbzombiebase.bbSmack(16000, 3);
    h.device.OnUpdate();
    assert.equal(h.game.bbmainState, 3);
    assert.equal(h.game.bbrecords[level - 1], 1200 + level);
    assert.equal(h.storage.get('ZTPBestScores:' + (level - 1)), 1200 + level);
    assert.equal(h.writes.length, 5);
    assert.equal(h.writes.filter(write => write.flush).length, 1);
    assert.equal(includes(h.game.bbpeople, h.game.bbpeoplebase), false);
    assert.equal(includes(h.game.bbzombies, h.game.bbzombiebase), false);
    h.game.bbPlayGame(level); h.game.bbgameticks = 1300; h.game.bbGameOver(1);
    assert.equal(h.writes.length, 5, 'A slower win must not overwrite the best time');
    h.game.bbPlayGame(level); h.game.bbgameticks = 1100; h.game.bbGameOver(1);
    assert.equal(h.writes.length, 10);
    const rebooted = createHarness({storage: h.storage});
    assert.equal(rebooted.game.bbrecords[level - 1], 1100);
  });
  test('level ' + level + ' friendly-base destruction loses without writing a win record', () => {
    const h = createHarness(); h.game.bbPlayGame(level);
    h.game.bbgameticks = 1200;
    h.game.bbpeoplebase.bbInfect(4000);
    h.device.OnUpdate();
    assert.equal(h.game.bbmainState, 4);
    assert.deepEqual(Array.from(h.game.bbrecords), [0, 0, 0, 0]);
    assert.equal(h.writes.length, 0);
    assert.equal(includes(h.game.bbpeople, h.game.bbpeoplebase), false);
    assert.equal(includes(h.game.bbzombies, h.game.bbzombiebase), false);
  });
}
test('stored wins unlock exactly the next menu level and the first two super-weapon prerequisites', () => {
  const storage = new Map();
  for (let completed = 0; completed <= 4; completed++) {
    const h = createHarness({storage});
    for (let menuLevel = 1; menuLevel <= 4; menuLevel++) {
      h.inputState.x = 600; h.inputState.y = 16 + 92 * (menuLevel - 1) + 30;
      h.draw();
      assert.equal(h.game.bbmenuitem, menuLevel <= completed + 1 ? menuLevel : 0, 'completed=' + completed + ', menuLevel=' + menuLevel);
    }
    h.game.bbPlayGame(1);
    assert.deepEqual(Array.from(h.game.bbpowers, power => power.bblocked), [0, completed >= 1 ? 0 : 1, completed >= 2 ? 0 : 1]);
    h.game.bbztp.bbxp = 10000;
    for (const power of h.game.bbpowers) {power.bbUpdate(h.game.bbztp); assert.equal(power.bbenabled, power.bblocked ? 0 : 1);}
    if (completed < 4) {h.game.bbPlayGame(completed + 1); h.game.bbgameticks = 1000 + completed; h.game.bbGameOver(1);}
  }
});
test('a locked super-weapon cannot be bought through its actual rendered UI button', () => {
  const h = createHarness(); h.game.bbPlayGame(1); h.game.bbztp.bbxp = 20000;
  for (const index of [1, 2]) {
    h.inputState.x = 638 + 49 * index + 20; h.inputState.y = 84;
    h.game.bbmousehit = 1; h.draw();
    assert.equal(h.game.bbpowers[index].bbbusy, 0);
    assert.equal(h.game.bbztp.bbxp, 20000);
  }
});
test('simultaneous base destruction preserves original sequential loss-then-win precedence', () => {
  const h = createHarness(); h.game.bbPlayGame(1); h.game.bbgameticks = 3600;
  h.game.bbpeoplebase.bbInfect(4000); h.game.bbzombiebase.bbSmack(16000, 3);
  h.device.OnUpdate();
  assert.equal(h.game.bbmainState, 3);
  assert.equal(h.game.bbrecords[0], 3600);
  assert.equal(h.writes.length, 5);
  h.gameTick(120);
  assert.equal(h.game.bbgameticks, 3600, 'Stats continue rendering/updating without advancing match time');
  assert.equal(h.game.bbrecords[0], 3600);
});

console.log(JSON.stringify({passed: failures.length === 0, behavioralCases: passed, failed: failures.length, scope: ['all unit constructors, acquisition, animation hits, damage and death', 'preacher conversion and friendly combat', 'three powers, XP costs, charge, cooldown and effects', 'four-level win/loss, best scores, persistence and progression']}, null, 2));
if (failures.length) process.exitCode = 1;
