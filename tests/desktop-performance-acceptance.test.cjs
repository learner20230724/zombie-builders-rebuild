'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateQueueOccupancy,validateBaseStress}=require('../scripts/acceptance-performance-v043.cjs');
const good=()=>({limitPerSide:256,leftovers:[0,0],healthAfterHits:[2107483647,2107483647],
  actualSeed:123,expectedSeed:123,firstSideParticles:256,secondSideParticles:256,baseParticles:512,deathVisuals:7});

test('native queue occupancy acceptance includes bases and the precise remaining capacity',()=>{
  validateQueueOccupancy({entityLimit:1000,entityCount:2,baseCount:2,capacity:998},2);
  validateQueueOccupancy({entityLimit:1000,entityCount:1000,baseCount:2,capacity:0},1000);
  assert.throws(()=>validateQueueOccupancy({entityLimit:1000,entityCount:998,baseCount:2,capacity:0},1000));
  assert.throws(()=>validateQueueOccupancy({entityLimit:1000,entityCount:2,baseCount:2,capacity:1000},2));
});

test('native high-damage acceptance refuses capped actual damage, shared RNG drift and absent deaths',()=>{
  validateBaseStress(good());
  for(const edit of [
    record=>{record.healthAfterHits[0]=2147483647-1024;},
    record=>{record.leftovers[1]=1;},record=>{record.actualSeed++;},
    record=>{record.firstSideParticles=257;record.baseParticles++;},
    record=>{record.secondSideParticles=0;record.baseParticles=256;},
    record=>{record.deathVisuals=0;}
  ]){const record=good();edit(record);assert.throws(()=>validateBaseStress(record));}
});
