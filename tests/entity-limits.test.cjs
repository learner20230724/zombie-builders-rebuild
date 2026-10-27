'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const GameConfig=require('../src/game-config.js'),CustomRules=require('../src/custom-rules.js');
const Factions=require('../src/factions.js'),SpawnQueue=require('../src/spawn-queue.js');

test('all army admission paths agree on the 10,000-object shared live limit',()=>{
  assert.equal(CustomRules.ENTITY_LIMIT,10000);
  assert.equal(Factions.ENTITY_LIMIT,CustomRules.ENTITY_LIMIT);
  assert.equal(SpawnQueue.ENTITY_LIMIT,CustomRules.ENTITY_LIMIT);
  assert.equal(GameConfig.ENTITY_SAFETY_LIMIT,CustomRules.ENTITY_LIMIT);
});

test('raising army capacity leaves effect, cosmetic and tick-dispatch budgets unchanged',()=>{
  assert.equal(GameConfig.POWER_EFFECT_SAFETY_LIMIT,1000);
  assert.equal(GameConfig.BASE_DEBRIS_LIMIT_PER_SIDE,256);
  assert.equal(GameConfig.POWER_DISPATCH_BUDGET,32);
  assert.equal(SpawnQueue.MAX_PER_TICK,32);
  assert.equal(SpawnQueue.MAX_COUNT,2147483647);
});
