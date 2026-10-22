'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeStrategyOptions,historicalStrategyForStage}=require('../scripts/playthrough.cjs');

test('historical farmers policy builds all requested trailers before Farm',()=>{
  const old=normalizeStrategyOptions({trailers:9});
  assert.equal(old.techTrailers,9);
  assert.match(old.strategyNormalization.techTrailersOrigin,/historical/);
  assert.equal(normalizeStrategyOptions({trailers:9,techTrailers:2}).techTrailers,2);
  assert.equal(normalizeStrategyOptions().techTrailers,6);
});

test('normalization preserves explicit false and zero strategy values',()=>{
  const options=normalizeStrategyOptions({openingShovels:0,earlyFarm:false,fastest:false});
  assert.equal(options.openingShovels,0);
  assert.equal(options.earlyFarm,false);
  assert.equal(options.fastest,false);
});

test('historical stage resolution uses its own recorded strategy',()=>{
  const report={options:{openingShovels:5,trailers:6},stages:[
    {stage:1,won:true},
    {stage:2,won:true,strategy:{openingShovels:0,techTrailers:2}},
  ]};
  assert.equal(historicalStrategyForStage(report,1).techTrailers,6);
  assert.equal(historicalStrategyForStage(report,1).openingShovels,5);
  assert.equal(historicalStrategyForStage(report,2).techTrailers,2);
  assert.equal(historicalStrategyForStage(report,2).openingShovels,0);
  assert.throws(()=>historicalStrategyForStage(report,3),/No winning historical stage/);
});

test('unbounded or non-progressing campaign options are rejected',()=>{
  for(const value of [0,-1,NaN,Infinity]){
    for(const key of ['maxTicks','decisionFrames','decisionTicks','snapshotTicks'])
      assert.throws(()=>normalizeStrategyOptions({[key]:value}),/Invalid strategy/);
  }
});
