/* Natural campaign bot: recovered game methods and ordinary enabled purchases.
 * No entity, currency, population, XP, cooldown or wave state is modified.
 * Display/audio/input/storage use game-test-harness's platform substitutions.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {createHarness} = require('./game-test-harness.cjs');
const root = path.resolve(__dirname, '..');

function normalizeStrategyOptions(input = {}) {
  // Historical reports predate later knobs. In particular, the original
  // farmers policy built ALL requested trailers before Farm House. Leaving a
  // missing techTrailers undefined silently changes that historical policy.
  const defaults = {
    seed: 1234, maxTicks: 144000, stages: 1, fastest: false, renderEachFrame: false,
    policy: 'farmers', decisionFrames: 10, decisionTicks: 24, snapshotTicks: 1200,
    openingShovels: 5, openingRushX: 9999, defenseCount: 4, defenseX: 850,
    farmerTarget: 10, earlyFarmers: 0, screenAfterFarmers: 2, screenShovels: 0,
    earlyFarm: false, militaryTrailer: false, mobFirst: false,
    yards: 5, trailers: 6, techTrailers: 6,
    earlyShovels: 3, emergencyShovels: 5, lateShovels: 6, farmers: 2,
    bombers: 4, trucks: 4, preachers: 2, dangerX: 700, mobThreshold: 10,
    defenseCountLate: null, skipFullScreen: false, farmerPriority: false,
    bomberFirst: false, earlyBombers: 2, powerMode: 'all', powerX: 600,
    reserveAirEnemyHP: 0, reserveAirAfterTick: 0,
  };
  if (input.policy === 'early-truck') Object.assign(defaults, {
    openingShovels: 0, yards: 5, trailers: 8, techTrailers: 2,
    defenseCount: 4, defenseX: 650, earlyFarmers: 0,
    trucks: 2, bombers: 3, farmers: 4, lateShovels: 10, mobThreshold: 15,
  });
  if (input.policy === 'economy-shovel') Object.assign(defaults, {
    // Preserve the standalone economy-shovel policy's option names/defaults.
    // Winning plans carry the complete explicit options, not these defaults.
    opening: 5, rushX: 9999, yards: 5, trailers: 15, defense: 3,
    quietDefense: 0, defenseX: 600, powers: 'mob-first', powerCount: 15,
    powerX: 400, exclusivePowers: true, capBuffer: 0,
    buildTrailersFirst: false, frames: 5, decisionFrames: 5, maxTicks: 180000,
    emergencyMob: false, firstHeavyMob: false,
  });
  const normalized = {...defaults, ...input};
  if (input.policy === 'economy-shovel')
    normalized.decisionFrames = input.decisionFrames ?? input.frames ?? defaults.frames;
  normalized.techTrailers = input.techTrailers ??
    (input.policy === 'early-truck' ? defaults.techTrailers : input.trailers ?? defaults.trailers);
  for (const field of ['maxTicks', 'decisionFrames', 'decisionTicks', 'snapshotTicks']) {
    assert.ok(Number.isFinite(normalized[field]) && normalized[field] > 0, `Invalid strategy ${field}`);
  }
  normalized.strategyNormalization = input.strategyNormalization || {
    version: 'playthrough-v1-historical-defaults',
    defaultedFields: Object.keys(defaults).filter(key => input[key] === undefined),
    techTrailersOrigin: input.techTrailers !== undefined ? 'explicit' :
      input.trailers !== undefined ? 'historical trailers target (original policy)' : 'default 6',
  };
  return normalized;
}

function historicalStrategyForStage(report, stage, visited = new Set()) {
  const record = report.stages.find(item => item.stage === stage && item.won);
  assert.ok(record, 'No winning historical stage ' + stage);
  if (record.strategy) return normalizeStrategyOptions(record.strategy);
  if (report.resumedFromNaturalEvidence) {
    const file = path.resolve(root, report.resumedFromNaturalEvidence);
    assert.ok(!visited.has(file), 'Historical evidence cycle');
    visited.add(file);
    const parent = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parent.stages.some(item => item.stage === stage && item.won))
      return historicalStrategyForStage(parent, stage, visited);
  }
  return normalizeStrategyOptions(report.options || {});
}

function listItems(list) {
  const out = [], it = list.bbObjectEnumerator();
  while (it.bbHasNext()) out.push(it.bbNextObject());
  return out;
}
function snapshot(h) {
  const g = h.game;
  const people = listItems(g.bbpeople), zombies = listItems(g.bbzombies);
  const normal = people.filter(p => p.bbunit.bbtype !== 5 && !p.bbwaszombie && !p.bbisangry && p.bbmode < 14);
  const enemies = zombies.filter(z => z.bbunit.bbtype !== 37 && z.bbmode < 14);
  const ownCounts = Array.from({length: 5}, (_, i) => normal.filter(p => p.bbunit.bbtype === i).length);
  return {
    ticks: g.bbgameticks, officialSeconds: g.bbgameticks / 120,
    milliseconds: h.getMillis(), state: g.bbmainState,
    cash: g.bbztp.bbcash, xp: g.bbztp.bbxp, force: g.bbztp.bbforce,
    populationLimit: g.bbztp.bbmaxforce,
    buildings: Array.from(g.bbztp.bbbuildingcount),
    buildingOrders: g.bbbuildings.map(b => b.bborders),
    unitOrders: g.bbunits.slice(0, 5).map(u => u.bborders), ownCounts,
    peopleCount: people.length, zombieCount: enemies.length,
    nearestEnemy: enemies.length ? Math.min(...enemies.map(z => z.bbxpos)) : 1600,
    enemyTypes: Array.from({length: 5}, (_, i) => enemies.filter(z => z.bbunit.bbtype === i + 32).length),
    baseHealth: g.bbpeoplebase.bbhealth, enemyBaseHealth: g.bbzombiebase.bbhealth,
    baseMode: g.bbpeoplebase.bbmode, enemyBaseMode: g.bbzombiebase.bbmode,
    kills: g.bbzombieskilled, losses: g.bbkinlost,
    powerBusy: g.bbpowers.map(p => p.bbbusy),
    powerCooldowns: g.bbpowers.map(p => p.bbcooldown),
    records: Array.from(g.bbrecords),
  };
}

function click(h, x, y) {
  h.inputState.x = x; h.inputState.y = y;
  h.inputState.down.add(1);
  h.inputState.hits.set(1, 1);
  h.tick();
  if (!h.renderEachFrame) h.draw();
  h.inputState.down.delete(1);
}
function setFastestLegally(h) {
  for (let attempt = 0; h.game.bbgamespeed !== 4 && attempt < 4; attempt++) click(h, 620, 18);
  assert.equal(h.game.bbgamespeed, 4);
}

function createBot(h, options, events) {
  const g = h.game;
  let initialShovelsPurchased = 0;
  let mobsPurchased = 0;
  function record(kind, item, before) {
    events.push({ticks: g.bbgameticks, kind, type: item.bbtype, name: item.bbname || ['Angry Mob', 'Harvester', 'Air Strike'][item.bbtype],
      cashBefore: before.cash, cashAfter: g.bbztp.bbcash,
      xpBefore: before.xp, xpAfter: g.bbztp.bbxp,
      forceBefore: before.force, forceAfter: g.bbztp.bbforce});
  }
  function buy(kind, index) {
    const item = ({unit: g.bbunits, building: g.bbbuildings, power: g.bbpowers})[kind][index];
    item.bbUpdate(g.bbztp);
    if (!item.bbenabled) return false;
    const before = {cash: g.bbztp.bbcash, xp: g.bbztp.bbxp, force: g.bbztp.bbforce,
      orders: item.bborders, busy: item.bbbusy};
    if (kind === 'unit') g.bbBuyUnit(item);
    else if (kind === 'building') g.bbBuyBuilding(item);
    else g.bbBuyPower(item);
    const purchased = kind === 'power' ? item.bbbusy > before.busy : item.bborders > before.orders;
    assert.ok(purchased, `Enabled purchase unexpectedly rejected: ${kind} ${index}`);
    record(kind, item, before);
    if (kind === 'power' && index === 0) mobsPurchased++;
    return true;
  }
  function act() {
    if (g.bbmainState !== 2) return;
    const s = snapshot(h);
    const counts = s.ownCounts.map((n, i) => n + g.bbunits[i].bborders);
    const b = s.buildings;
    const under = i => b[i] + g.bbbuildings[i].bborders;
    const pending = i => g.bbbuildings[i].bborders > 0;
    const dangerous = s.nearestEnemy < options.dangerX;

    if (options.policy === 'economy-shovel') {
      // Literal decision-order port of strategy-economy-shovel.cjs: powers
      // first, a small front-dependent screen, five income yards, population
      // trailers only when full, then Shovel Men. No farm or military tech.
      const z = listItems(g.bbzombies).filter(z => z.bbunit.bbtype !== 37 && z.bbmode < 14);
      const p = listItems(g.bbpeople).filter(p => p.bbunit.bbtype === 0 && !p.bbisangry && !p.bbwaszombie && p.bbmode < 14);
      const front = z.reduce((x, zombie) => Math.min(x, zombie.bbxpos), 9999);
      const shovels = p.length + g.bbunits[0].bborders;
      const anyBusy = g.bbpowers.some(power => power.bbbusy);
      if (!options.exclusivePowers || !anyBusy) {
        if (options.powers === 'late-repeat-mob') {
          if (mobsPurchased === 0) buy('power', 0);
          else if ((z.some(zombie => zombie.bbunit.bbtype >= 35) && front < (options.repeatMobX || 9999)) || g.bbzombiebase.bbhealth < (options.repeatMobBase || 0)) {
            if (!buy('power', 1) && !buy('power', 2)) buy('power', 0);
          }
        } else if (options.powers === 'harvest-after-first') {
          if (mobsPurchased === 0) {
            if (g.bbztp.bbxp >= (options.firstMobMinXP || 3000) && front < (options.firstMobX || 9999)) buy('power', 0);
          } else if (options.firstHeavyMob && mobsPurchased === 1 && !anyBusy && g.bbztp.bbxp >= 3000 && g.bbztp.bbxp < 4000 && z.some(zombie => zombie.bbunit.bbtype === 35) && buy('power', 0)) {
            // Optional TEST-BOT, single heavy-phase XP-deadlock breaker.
            // The successful normal purchase raises mobsPurchased to two.
            events[events.length - 1].reason = 'firstHeavyMob';
            events[events.length - 1].heavyState = {baseHealth: g.bbpeoplebase.bbhealth, front, anyBusy,
              enemies: z.filter(zombie => zombie.bbunit.bbtype === 35).map(zombie => ({x: zombie.bbxpos, hp: zombie.bbhealth}))};
          } else if (options.emergencyMob && !anyBusy && g.bbpeoplebase.bbhealth < 700 && front < 400 && g.bbztp.bbxp >= 3000 && buy('power', 0)) {
            // Optional TEST-BOT survival decision, not a game-rule change.
            // Still uses Update/enabled/Buy and the original XP/cooldown gates.
            events[events.length - 1].reason = 'emergencyMob';
            events[events.length - 1].emergencyState = {baseHealth: g.bbpeoplebase.bbhealth, front, anyBusy};
          } else if (g.bbpowers[1].bbcooldown || g.bbpowers[1].bbbusy) {
            if (!options.reserveDuringHarvestCooldown) {
              buy('power', 0);
              if (z.length > 30) buy('power', 2);
            } else if (options.airSurplusXP && g.bbztp.bbxp >= options.airSurplusXP && front < (options.airTriggerX || 9999) && (z.length >= (options.airEnemyCount || 5) || front < (options.airDangerX || 800)) && (!options.airWaitForHarvestExit || !listItems(g.bbpowerups).some(power => power.bbtype === 1 && power.bbmode !== 15))) {
              buy('power', 2);
            }
          } else if (!options.holdHarvest || z.some(zombie => zombie.bbunit.bbtype >= 35) || front < 500 || z.length > 35) buy('power', 1);
        } else if (options.powers === 'always') {
          for (const i of [0, 1, 2]) buy('power', i);
        } else if (options.powers === 'mob-first') {
          if (!buy('power', 0) && z.length >= options.powerCount) {
            if (!buy('power', 1)) buy('power', 2);
          }
        } else if (options.powers === 'air-first') {
          if (z.length >= options.powerCount || front < options.powerX) {
            if (!buy('power', 2) && !buy('power', 1)) buy('power', 0);
          }
        } else if (z.length >= options.powerCount || front < options.powerX) {
          if (!buy('power', 0) && !buy('power', 1)) buy('power', 2);
        }
      }
      if (initialShovelsPurchased < options.opening) {
        if (initialShovelsPurchased === 0 && front > options.rushX) return;
        if (buy('unit', 0)) initialShovelsPurchased++;
        return;
      }
      if (under(1) < (options.minimumYardsFirst || 0)) { buy('building', 1); return; }
      if (under(0) < (options.minimumTrailersFirst || 0)) { buy('building', 0); return; }
      const phaseDefense = b[1] < 3 && options.defenseBefore3Yards !== undefined ? options.defenseBefore3Yards : options.defense;
      const target = front < options.defenseX ? phaseDefense : options.quietDefense;
      if (shovels < target) { buy('unit', 0); return; }
      if (under(1) < options.yards) { buy('building', 1); return; }
      if (under(0) < options.trailers && (g.bbztp.bbforce >= g.bbztp.bbmaxforce - options.capBuffer || options.buildTrailersFirst)) {
        if (buy('building', 0)) return;
        if (options.buildTrailersFirst) return;
      }
      buy('unit', 0);
      return;
    }

    if (options.policy === 'early-truck') {
      const people = listItems(g.bbpeople).filter(p => p.bbunit.bbtype !== 5 && !p.bbisangry && !p.bbwaszombie && p.bbmode < 14);
      const queued = g.bbunits.reduce((total, unit) => total + unit.bborders, 0);
      const front = s.nearestEnemy;
      if ((options.reserveAirEnemyHP && s.enemyBaseHealth < options.reserveAirEnemyHP) ||
          (options.reserveAirAfterTick && g.bbgameticks >= options.reserveAirAfterTick)) buy('power', 2);
      else if (options.powerMode === 'all') for (let i = 0; i < 3; i++) buy('power', i);
      else if (s.zombieCount >= options.mobThreshold || front < options.powerX) {
        for (const i of options.powerMode === 'air' ? [2, 1, 0] : [0, 1, 2]) buy('power', i);
      }
      if (initialShovelsPurchased < options.openingShovels) {
        if (front < options.openingRushX && buy('unit', 0)) initialShovelsPurchased++;
      } else if (under(1) < 2) buy('building', 1);
      else if (b[2] && counts[1] < options.earlyFarmers && options.farmerPriority) {
        if (!buy('unit', 1) && g.bbztp.bbforce + 2 > g.bbztp.bbmaxforce && under(0) < options.trailers) buy('building', 0);
      } else if (people.length + queued < (b[1] >= options.yards && options.defenseCountLate !== null ? options.defenseCountLate : options.defenseCount) && front < options.defenseX && (!options.skipFullScreen || g.bbztp.bbforce < g.bbztp.bbmaxforce)) buy('unit', 0);
      else if (under(1) < options.yards) buy('building', 1);
      else if (under(0) < options.techTrailers) buy('building', 0);
      else if (!under(2)) buy('building', 2);
      else if (!b[2]) {}
      else if (counts[1] < options.earlyFarmers) {
        if (!buy('unit', 1) && g.bbztp.bbforce + 2 > g.bbztp.bbmaxforce && under(0) < options.trailers) buy('building', 0);
      } else if (options.bomberFirst && !under(4)) buy('building', 4);
      else if (options.bomberFirst && b[4] && counts[3] < options.earlyBombers) buy('unit', 3);
      else if (!under(3)) buy('building', 3);
      else if (!b[3]) {}
      else if (counts[2] < options.trucks) {
        if (!buy('unit', 2) && g.bbztp.bbforce + 5 > g.bbztp.bbmaxforce && under(0) < options.trailers) buy('building', 0);
      } else if (options.bombers && !under(4)) buy('building', 4);
      else if (options.bombers && b[4] && counts[3] < options.bombers) {
        if (!buy('unit', 3) && g.bbztp.bbforce + 2 > g.bbztp.bbmaxforce && under(0) < options.trailers) buy('building', 0);
      } else if (counts[1] < options.farmers) {
        if (!buy('unit', 1) && g.bbztp.bbforce + 2 > g.bbztp.bbmaxforce && under(0) < options.trailers) buy('building', 0);
      } else if (under(0) < options.trailers) buy('building', 0);
      else if (counts[0] < options.lateShovels) buy('unit', 0);
      return;
    }

    if (options.policy === 'farmers') {
      // Successful savings-first opening: total initial purchases, not a costly
      // requirement to perpetually keep five shovels alive while saving yards.
      const people = listItems(g.bbpeople).filter(p => p.bbunit.bbtype !== 5);
      const normal = people.filter(p => !p.bbisangry && !p.bbwaszombie);
      const queued = g.bbunits.reduce((total, unit) => total + unit.bborders, 0);
      const front = listItems(g.bbzombies).filter(z => z.bbunit.bbtype !== 37)
        .reduce((minimum, z) => Math.min(minimum, z.bbxpos), 9999);
      for (let i = 0; i < 3; i++) buy('power', i);
      if (initialShovelsPurchased < options.openingShovels) {
        if (initialShovelsPurchased === 0 && front > options.openingRushX) return;
        if (buy('unit', 0)) initialShovelsPurchased++;
      } else if (under(1) < 2) buy('building', 1);
      else if (options.militaryTrailer && under(0) < 2) buy('building', 0);
      else if (normal.length + queued < options.defenseCount && front < options.defenseX) buy('unit', 0);
      else if (options.earlyFarm && under(0) < 2) buy('building', 0);
      else if (options.earlyFarm && !b[2]) buy('building', 2);
      else if (options.earlyFarm && normal.filter(p => p.bbunit.bbtype === 1).length + g.bbunits[1].bborders < 2) {
        if (!buy('unit', 1) && g.bbztp.bbforce + 2 > g.bbztp.bbmaxforce && under(0) < options.trailers) buy('building', 0);
      }
      else if (b[2] && counts[1] >= options.screenAfterFarmers && counts[0] < options.screenShovels) {
        if (g.bbztp.bbforce >= g.bbztp.bbmaxforce && under(0) < options.trailers) buy('building', 0);
        else buy('unit', 0);
      }
      else if (under(1) < options.yards) buy('building', 1);
      else if (options.mobFirst && mobsPurchased === 0) {
        if (g.bbztp.bbforce >= g.bbztp.bbmaxforce && under(0) < options.trailers && buy('building', 0)) return;
        buy('unit', 0);
      }
      else if (under(0) < options.techTrailers) buy('building', 0);
      else if (!b[2]) buy('building', 2);
      else if (normal.filter(p => p.bbunit.bbtype === 1).length + g.bbunits[1].bborders < options.earlyFarmers) {
        if (!buy('unit', 1) && g.bbztp.bbforce + 2 > g.bbztp.bbmaxforce && under(0) < options.trailers) buy('building', 0);
      }
      else if (under(0) < options.trailers) buy('building', 0);
      else if (normal.filter(p => p.bbunit.bbtype === 1).length + g.bbunits[1].bborders < options.farmerTarget) {
        if (!buy('unit', 1) && g.bbztp.bbforce + 2 > g.bbztp.bbmaxforce && under(0) < options.trailers) buy('building', 0);
      } else if (under(0) < options.trailers) buy('building', 0);
      else buy('unit', 0);
      return;
    }

    // Powers use the same availability gates as UI. They do not bypass locks.
    if (s.zombieCount >= options.mobThreshold || s.nearestEnemy < 500 || s.enemyBaseHealth < 13000) {
      if (s.zombieCount >= 10 || s.enemyTypes[3] || s.enemyTypes[4]) buy('power', 2);
      if (s.zombieCount >= 6 || s.enemyTypes[3] || s.enemyTypes[4]) buy('power', 1);
      buy('power', 0);
    }

    if (b[1] < options.yards) {
      // Hold a modest force while investing in permanent income.
      const target = dangerous ? Math.min(s.populationLimit, options.emergencyShovels) : options.earlyShovels;
      while (counts[0] < target && buy('unit', 0)) counts[0]++;
      if (under(1) < options.yards && !pending(1)) buy('building', 1);
      return;
    }

    // Tech priority: Farm -> Still for splash -> Garage -> Chapel.
    if (!under(2)) buy('building', 2);
    if (b[2] && !under(4)) buy('building', 4);
    if (b[2] && under(4) && !under(3)) buy('building', 3);
    if (b[3] && !under(5)) buy('building', 5);
    if (under(0) < options.trailers && (s.force >= s.populationLimit - 2 || b[2])) buy('building', 0);

    // Mixed line: cheap screen, splash bombers, then trucks and conversion.
    if (b[4] && counts[3] < options.bombers) while (counts[3] < options.bombers && buy('unit', 3)) counts[3]++;
    if (b[3] && counts[2] < options.trucks) while (counts[2] < options.trucks && buy('unit', 2)) counts[2]++;
    if (b[5] && counts[4] < options.preachers) while (counts[4] < options.preachers && buy('unit', 4)) counts[4]++;
    if (b[2] && !b[4] && counts[1] < options.farmers) while (counts[1] < options.farmers && buy('unit', 1)) counts[1]++;
    const target = dangerous ? options.lateShovels : options.earlyShovels;
    while (counts[0] < target && buy('unit', 0)) counts[0]++;
  }
  return {act};
}

function playStage(h, stage, options) {
  options = normalizeStrategyOptions(options);
  const g = h.game;
  assert.equal(g.bbmainState, 1, 'Natural stage starts from menu');
  if (stage > 1) assert.ok(g.bbrecords[stage - 2] > 0, 'Previous stage must be naturally won');
  const events = [], history = [];
  g.bbPlayGame(stage);
  h.context.ZTPGamePort.setRandomSeed(options.seed);
  assert.equal(g.bbztp.bbcash, 100);
  assert.equal(g.bbztp.bbxp, 0);
  assert.equal(g.bbztp.bbforce, 0);
  assert.equal(g.bbpeoplebase.bbhealth, 4000);
  assert.equal(g.bbzombiebase.bbhealth, 16000);
  const initial = snapshot(h);
  if (options.fastest) setFastestLegally(h);
  const bot = createBot(h, options, events);
  const start = process.hrtime.bigint();
  let nextDecision = 0, nextSnapshot = 0;
  while (g.bbmainState === 2 && g.bbgameticks < options.maxTicks) {
    if (options.policy !== 'balanced' || g.bbgameticks >= nextDecision) {
      bot.act();
      nextDecision = g.bbgameticks + options.decisionTicks;
    }
    if (g.bbgameticks >= nextSnapshot) {
      history.push(snapshot(h));
      nextSnapshot = g.bbgameticks + options.snapshotTicks;
    }
    h.tick(options.policy !== 'balanced' ? options.decisionFrames : 1);
  }
  const final = snapshot(h);
  history.push(final);
  const won = g.bbmainState === 3 && g.bbzombiebase.bbmode === 14 && g.bbrecords[stage - 1] === g.bbgameticks;
  const result = {stage, seed: options.seed, strategy: {...options}, won, wallSeconds: Number(process.hrtime.bigint() - start) / 1e9,
    initial, final, events, history, naturalStorageWrites: h.writes.slice()};
  process.stdout.write(JSON.stringify({stage, won, ticks: final.ticks, seconds: final.officialSeconds,
    base: final.baseHealth, enemyBase: final.enemyBaseHealth, cash: final.cash,
    buildings: final.buildings, kills: final.kills, losses: final.losses,
    wallSeconds: result.wallSeconds}) + '\n');
  if (won) g.bbQuitGame();
  return result;
}

function main() {
  const args = process.argv.slice(2);
  const get = (name, fallback) => {
    const arg = args.find(x => x.startsWith(`--${name}=`));
    return arg ? arg.slice(name.length + 3) : fallback;
  };
  const cliDefaults = normalizeStrategyOptions({policy: get('policy', 'farmers')});
  const options = {
    seed: Number(get('seed', 1234)), maxTicks: Number(get('max-ticks', cliDefaults.maxTicks)),
    renderEachFrame: get('render-each-frame', 'false') === 'true',
    stages: Number(get('stages', 1)), fastest: get('fastest', 'false') !== 'false',
    policy: get('policy', 'farmers'), decisionFrames: Number(get('decision-frames', cliDefaults.decisionFrames)),
    openingShovels: Number(get('opening-shovels', cliDefaults.openingShovels)), defenseCount: Number(get('defense-count', cliDefaults.defenseCount)),
    openingRushX: Number(get('opening-rush-x', 9999)),
    defenseX: Number(get('defense-x', cliDefaults.defenseX)), farmerTarget: Number(get('farmer-target', 10)),
    earlyFarmers: Number(get('early-farmers', cliDefaults.earlyFarmers)),
    screenAfterFarmers: Number(get('screen-after-farmers', 2)),
    screenShovels: Number(get('screen-shovels', 0)),
    earlyFarm: get('early-farm', 'false') === 'true',
    militaryTrailer: get('military-trailer', 'false') === 'true',
    mobFirst: get('mob-first', 'false') === 'true',
    decisionTicks: Number(get('decision-ticks', 24)), snapshotTicks: 1200,
    yards: Number(get('yards', cliDefaults.yards)), trailers: Number(get('trailers', cliDefaults.trailers)),
    techTrailers: Number(get('tech-trailers', get('trailers', cliDefaults.techTrailers))),
    earlyShovels: Number(get('early-shovels', 3)), emergencyShovels: Number(get('emergency-shovels', 5)),
    lateShovels: Number(get('late-shovels', cliDefaults.lateShovels)), farmers: Number(get('farmers', cliDefaults.farmers)),
    bombers: Number(get('bombers', cliDefaults.bombers)), trucks: Number(get('trucks', cliDefaults.trucks)),
    preachers: Number(get('preachers', 2)), dangerX: Number(get('danger-x', 700)),
    mobThreshold: Number(get('mob-threshold', cliDefaults.mobThreshold)),
    defenseCountLate: get('defense-count-late', '') === '' ? null : Number(get('defense-count-late', '')),
    skipFullScreen: get('skip-full-screen', 'false') === 'true',
    farmerPriority: get('farmer-priority', 'false') === 'true',
    bomberFirst: get('bomber-first', 'false') === 'true',
    earlyBombers: Number(get('early-bombers', cliDefaults.earlyBombers)),
    powerMode: get('power-mode', cliDefaults.powerMode), powerX: Number(get('power-x', cliDefaults.powerX)),
    reserveAirEnemyHP: Number(get('reserve-air-enemy-hp', 0)), reserveAirAfterTick: Number(get('reserve-air-after-tick', 0)),
  };
  const resume = get('resume', '');
  let priorStages = [], storage;
  if (resume) {
    const prior = JSON.parse(fs.readFileSync(path.resolve(root, resume), 'utf8'));
    priorStages = prior.stages.filter(stage => stage.won).map(stage =>
      ({...stage, strategy: historicalStrategyForStage(prior, stage.stage)}));
    assert.ok(priorStages.length, 'Resume must contain a previous natural victory');
    priorStages.forEach((stage, index) => {
      assert.equal(stage.stage, index + 1);
      assert.equal(stage.final.state, 3);
      assert.equal(stage.final.enemyBaseHealth, 0);
      assert.equal(stage.final.records[index], stage.final.ticks);
    });
    storage = new Map();
    for (const write of priorStages.at(-1).naturalStorageWrites) {
      if (!write.flush) storage.set(`${write.namespace}:${write.key}`, write.value);
    }
    priorStages.at(-1).final.records.forEach((record, index) =>
      assert.equal(storage.get(`ZTPBestScores:${index}`) || 0, record));
  }
  const h = createHarness({storage, renderEachFrame: options.renderEachFrame});
  h.context.ZTPGamePort.setRandomSeed(options.seed);
  const sourceSha256 = {};
  for (const file of ['src/generated-game.js', 'scripts/game-test-harness.cjs', 'scripts/playthrough.cjs'])
    sourceSha256[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
  const report = {policy: 'Normal enabled purchases and real recovered game methods only', sourceSha256,
    forbiddenMutations: ['cash', 'XP', 'HP', 'cooldowns', 'population', 'waves', 'records', 'game methods'],
    options, resumedFromNaturalEvidence: resume || null, complete: false, stages: priorStages};
  const out = path.resolve(root, get('output', 'evidence/playthrough/latest.json'));
  fs.mkdirSync(path.dirname(out), {recursive: true});
  const save = () => fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  for (let stage = priorStages.length + 1; stage <= options.stages; stage++) {
    const result = playStage(h, stage, options);
    report.stages.push(result);
    save();
    if (!result.won) break;
  }
  report.wonAllRequested = report.stages.length === options.stages && report.stages.every(x => x.won);
  report.renderedAllRequested = report.wonAllRequested && report.stages.every(x => x.strategy.renderEachFrame === true);
  report.complete = true;
  save();
  process.stdout.write('Evidence: ' + out + '\n');
  if (!report.wonAllRequested) process.exitCode = 1;
}
if (require.main === module) main();
module.exports = {createBot, playStage, snapshot, normalizeStrategyOptions, historicalStrategyForStage};
