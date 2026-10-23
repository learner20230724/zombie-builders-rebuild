'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const GameConfig = require('../src/game-config.js');
const CustomRules = require('../src/custom-rules.js');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const json = file => JSON.parse(read(file));
const plain = value => JSON.parse(JSON.stringify(value));
const defaults = () => GameConfig.fromDocuments(Object.fromEntries(
  ['units','zombies','buildings','powers','levels'].map(kind => [kind,json('config/'+kind+'.json')])));
function items(list) {
  const result=[], iterator=list.bbObjectEnumerator();
  while(iterator.bbHasNext()) result.push(iterator.bbNextObject());
  return result;
}
function configWithWaves(waves) {
  const config=defaults();
  for(const level of config.levels) {
    level.waves.forEach((wave,index)=>{wave.id='stage-'+level.id+'-wave-'+(index+1);});
    level.reinforcements=[];
  }
  config.levels[0].waves=plain(waves);
  return config;
}
function fixture(config=configWithWaves([
  {id:'a',type:1,count:5,delay:0},
  {id:'b',type:4,count:3,delay:0},
  {id:'c',type:2,count:2,delay:0}
]),rules) {
  const manifest=json('public/assets/manifest.json');
  const drawing=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name) {
    const image=manifest.images[name]; assert.ok(image,name);
    return {Width:()=>image.width,Height:()=>image.height};
  }},{get:(target,key)=>target[key] || (()=>0)});
  const input=new Proxy({},{get:()=>()=>0});
  const audio={LoadSample:name=>({name}),PlaySample:sample=>({sample}),StopChannel:()=>0};
  class App {
    GraphicsDevice(){return drawing;} InputDevice(){return input;} AudioDevice(){return audio;}
    SetUpdateRate(){return 0;} MilliSecs(){return 0;}
  }
  const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class {},
    ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,PlayMovie:()=>0,MovieFinished:()=>1,
    EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0});
  vm.runInContext(read('src/generated-game.js'),target);
  GameConfig.install(target,config);
  if(rules!==undefined) CustomRules.install(target,rules);
  target.bb_Init(); target.bb_Main();
  const port=target.ZTPGamePort,device=port.state.bb_mojo_app_device;
  device.OnCreate(); device.OnUpdate();
  const game=port.state.bb_Game; game.bbPlayGame(1);
  return {target,game,port,mob:port.bb_ZombieMob,
    // A zero-delay queue consumes one opportunity each time its sixty-tick
    // clock crosses the original threshold. No battle/animation update occurs.
    consume(count=1){while(count-->0){port.bb_ZombieMob.bbticks=60;port.bb_ZombieMob.bbUpdate();}}};
}
function progress(h){return GameConfig.getWaveProgress(h.target);}
function groups(h){const p=progress(h);return (p.current?[p.current]:[]).concat(p.upcomingGroups);}
function mainGroups(h){return groups(h).filter(group=>group.source==='wave');}
function queue(h){return items(h.mob.bbqueue).map(wave=>[wave.bbtype,wave.bbcount,wave.bbdelay,wave.bbtime]);}
function immutableSnapshot(h){return plain({queue:queue(h),clock:h.mob.bbticks,
  configuration:GameConfig.getCurrent(h.target),progress:progress(h),
  seed:h.port.state.bb_std_random_Seed,zombies:items(h.game.bbzombies).map(z=>[z.bbunit.bbtype,z.bbhealth,z.bbxpos])});}
function apply(h,config){return GameConfig.applyLiveWaves(h.target,config);}

test('wave identities migrate deterministically, remain detached and are unique only within a stage',()=>{
  const input=defaults();
  for(const level of input.levels)for(const wave of level.waves)delete wave.id;
  const checked=GameConfig.validate(input);
  assert.equal(checked.levels[0].waves[0].id,'stage-1-wave-1');
  assert.equal(checked.levels[3].waves[2].id,'stage-4-wave-3');
  assert.equal(input.levels[0].waves[0].id,undefined,'migration does not mutate the caller');
  checked.levels[0].waves[0].id='shared';checked.levels[1].waves[0].id='shared';
  assert.equal(GameConfig.validate(checked).levels[1].waves[0].id,'shared');
  checked.levels[0].waves[1].id='shared';
  assert.throws(()=>GameConfig.validate(checked),/waves\[1\]\.id|duplicate.*id/i);
  for(const bad of ['', 'two words', '../escape', 'x'.repeat(81), 3, null]) {
    const wrong=defaults();wrong.levels[0].waves[0].id=bad;
    assert.throws(()=>GameConfig.validate(wrong),/waves\[0\]\.id/);
  }
});

test('initial progress reports queue source, identity, original index and total without exposing mutable state',()=>{
  const h=fixture(),p=progress(h);
  assert.equal(p.stage,1);assert.equal(p.current.id,'a');assert.equal(p.current.index,0);
  assert.equal(p.current.type,1);assert.equal(p.current.total,5);assert.equal(p.current.consumed,0);
  assert.equal(p.current.spawned,0);assert.equal(p.current.remaining,5);assert.equal(p.current.delay,0);
  assert.notEqual(p.current.enabled,false);assert.equal(p.current.source,'wave');
  assert.deepEqual(p.upcomingGroups.map(group=>group.id),['b','c']);
  assert.equal(p.remainingTotal,10);assert.equal(p.completedGroups,0);assert.deepEqual(p.completed,[]);assert.deepEqual(p.pending,[]);
  p.current.remaining=999;p.upcomingGroups[0].id='changed';p.completed.push('invented');
  assert.equal(progress(h).current.remaining,5);assert.equal(progress(h).upcomingGroups[0].id,'b');assert.deepEqual(progress(h).completed,[]);
});

test('consumption counts opportunities separately from actual successful zombie spawns and waits',()=>{
  const h=fixture(configWithWaves([{id:'a',type:1,count:3,delay:0},{id:'wait',type:0,count:2,delay:0}]));
  h.consume();assert.equal(progress(h).current.consumed,1);assert.equal(progress(h).current.spawned,1);
  const original=h.game.bbAddZombie;h.game.bbAddZombie=()=>null;
  h.consume();assert.equal(progress(h).current.consumed,2);assert.equal(progress(h).current.spawned,1);
  h.game.bbAddZombie=original;h.consume();
  assert.equal(progress(h).current.id,'wait');assert.deepEqual(progress(h).completed,['a']);
  h.consume();assert.equal(progress(h).current.consumed,1);assert.equal(progress(h).current.spawned,0);
});

test('a disabled zombie-type filter consumes its wave without falsely counting a spawn',()=>{
  const rules=CustomRules.defaults();rules.zombieTypesEnabled[0]=false;
  const h=fixture(configWithWaves([{id:'filtered',type:1,count:2,delay:0}]),rules),before=items(h.game.bbzombies).length;
  h.consume();
  assert.equal(progress(h).current.consumed,1);assert.equal(progress(h).current.spawned,0);
  assert.equal(progress(h).current.remaining,1);assert.equal(items(h.game.bbzombies).length,before);
  h.consume();assert.equal(progress(h).current,null);assert.deepEqual(progress(h).completed,['filtered']);
});

test('same-ID edits preserve consumed progress, wall-clock phase, group elapsed time and live monsters',()=>{
  const h=fixture();h.consume(2);
  const first=items(h.mob.bbqueue)[0];first.bbtime=1.25;h.mob.bbticks=37;
  const seed=h.port.state.bb_std_random_Seed,bodies=items(h.game.bbzombies),draft=GameConfig.getCurrent(h.target);
  Object.assign(draft.levels[0].waves[0],{count:8,type:4,delay:7});
  const report=apply(h,draft),p=progress(h);
  assert.equal(report.requiresNewBattle,false);assert.ok(Array.isArray(report.applied));assert.ok(Array.isArray(report.deferred));assert.ok(Array.isArray(report.notes));
  assert.equal(h.mob.bbticks,37);assert.equal(items(h.mob.bbqueue)[0].bbtime,1.25);
  assert.equal(p.current.id,'a');assert.equal(p.current.total,8);assert.equal(p.current.consumed,2);
  assert.equal(p.current.spawned,2);assert.equal(p.current.remaining,6);assert.equal(p.current.type,4);assert.equal(p.current.delay,7);
  assert.deepEqual(queue(h)[0],[4,6,7,1.25]);assert.deepEqual(items(h.game.bbzombies),bodies);assert.equal(h.port.state.bb_std_random_Seed,seed);
  assert.deepEqual(plain(report.progress),plain(p));
});

test('shrinking the current group below consumed removes only its unconsumed remainder',()=>{
  const h=fixture();h.consume(3);
  const bodies=items(h.game.bbzombies),draft=GameConfig.getCurrent(h.target);draft.levels[0].waves[0].count=2;
  assert.equal(apply(h,draft).requiresNewBattle,false);
  assert.equal(progress(h).current.id,'b');assert.ok(progress(h).completed.includes('a'));
  assert.deepEqual(items(h.game.bbzombies),bodies);assert.deepEqual(queue(h).map(row=>row.slice(0,2)),[[4,3],[2,2]]);
});

test('future waves follow draft identity order, and a newly inserted identity starts from zero',()=>{
  const h=fixture();h.consume();const draft=GameConfig.getCurrent(h.target);
  const [a,b,c]=draft.levels[0].waves;draft.levels[0].waves=[a,c,{id:'fresh',type:5,count:4,delay:0},b];
  apply(h,draft);
  assert.deepEqual(mainGroups(h).map(group=>group.id),['a','c','fresh','b']);
  assert.deepEqual(mainGroups(h).map(group=>group.index),[0,1,2,3]);
  const fresh=mainGroups(h).find(group=>group.id==='fresh');
  assert.equal(fresh.consumed,0);assert.equal(fresh.spawned,0);assert.equal(fresh.remaining,4);
  assert.equal(progress(h).current.consumed,1);assert.equal(progress(h).remainingTotal,13);
});

test('a completed identity never replays in this battle even when its count increases or it is moved',()=>{
  const h=fixture(configWithWaves([{id:'done',type:1,count:1,delay:0},{id:'later',type:4,count:2,delay:0}]));
  h.consume();const draft=GameConfig.getCurrent(h.target);draft.levels[0].waves[0].count=100;
  draft.levels[0].waves.reverse();const bodies=items(h.game.bbzombies),report=apply(h,draft);
  assert.equal(report.requiresNewBattle,false);assert.ok(report.deferred.length>0 || report.notes.length>0);
  assert.deepEqual(mainGroups(h).map(group=>group.id),['later']);assert.deepEqual(progress(h).completed,['done']);
  assert.equal(progress(h).completedGroups,1);assert.deepEqual(items(h.game.bbzombies),bodies);
  const repeated=apply(h,draft);
  assert.ok(repeated.deferred.length>0,'an identical re-apply still reports the unapplied closed-group change');
  assert.ok(repeated.notes.length>0);assert.deepEqual(mainGroups(h).map(group=>group.id),['later']);
  const next=GameConfig.getCurrent(h.target);next.levels[0].waves.push({id:'actually-new',type:1,count:3,delay:0});
  apply(h,next);assert.deepEqual(mainGroups(h).map(group=>group.id),['later','actually-new']);
  h.game.bbResetGame(1);
  assert.deepEqual(mainGroups(h).map(group=>[group.id,group.remaining]),[['later',2],['done',100],['actually-new',3]]);
  assert.deepEqual(progress(h).completed,[]);
});

test('disabling and removing a partially consumed identity retain progress for a later re-enable/re-add',()=>{
  const h=fixture();h.consume(2);const original=GameConfig.getCurrent(h.target),draft=plain(original);
  draft.levels[0].waves[0].enabled=false;apply(h,draft);
  assert.deepEqual(mainGroups(h).map(group=>group.id),['b','c']);assert.ok(!progress(h).completed.includes('a'));
  assert.equal(items(h.game.bbzombies).length,3,'base plus two existing zombies stay on the field');
  draft.levels[0].waves[0].enabled=true;apply(h,draft);
  assert.equal(progress(h).current.id,'a');assert.equal(progress(h).current.consumed,2);assert.equal(progress(h).current.remaining,3);
  draft.levels[0].waves=draft.levels[0].waves.filter(wave=>wave.id!=='a');apply(h,draft);
  assert.deepEqual(mainGroups(h).map(group=>group.id),['b','c']);
  draft.levels[0].waves.unshift(original.levels[0].waves[0]);apply(h,draft);
  assert.equal(progress(h).current.id,'a');assert.equal(progress(h).current.consumed,2);assert.equal(progress(h).current.remaining,3);
});

test('front reinforcements stay in front of edited main waves and never count toward their consumption',()=>{
  const h=fixture();h.consume();h.mob.bbSpawn(5,2,0);const reinforcement=items(h.mob.bbqueue)[0];
  assert.equal(progress(h).current.source,'reinforcement');
  const draft=GameConfig.getCurrent(h.target);draft.levels[0].waves.reverse();apply(h,draft);
  assert.equal(items(h.mob.bbqueue)[0],reinforcement);assert.equal(progress(h).current.source,'reinforcement');
  assert.deepEqual(mainGroups(h).map(group=>group.id),['c','b','a']);
  assert.equal(mainGroups(h).find(group=>group.id==='a').consumed,1);
  h.consume();assert.equal(progress(h).current.source,'reinforcement');assert.equal(progress(h).current.consumed,1);
  assert.equal(mainGroups(h).find(group=>group.id==='a').consumed,1);
  h.consume();assert.equal(progress(h).current.id,'c');assert.equal(progress(h).current.consumed,0);
});

test('interleaved reinforcement identity cannot be mistaken for a main wave at the same queue index',()=>{
  const h=fixture(configWithWaves([{id:'a',type:1,count:1,delay:0},{id:'b',type:2,count:2,delay:0}]));
  const [a,b]=items(h.mob.bbqueue);h.mob.bbSpawn(4,1,0);const reinforcement=items(h.mob.bbqueue)[0];
  h.mob.bbqueue.bbClear();for(const group of [a,reinforcement,b])h.mob.bbqueue.bbAddLast(group);
  assert.deepEqual(groups(h).map(group=>group.source),['wave','reinforcement','wave']);
  h.consume();assert.equal(progress(h).current.source,'reinforcement');assert.deepEqual(progress(h).completed,['a']);
  h.consume();assert.equal(progress(h).current.id,'b');assert.equal(progress(h).current.consumed,0);assert.equal(progress(h).current.spawned,0);
});

test('legacy missing-ID drafts require a new battle rather than guessing queue identities',()=>{
  const h=fixture();h.consume();const draft=GameConfig.getCurrent(h.target);delete draft.levels[0].waves[1].id;
  const before=immutableSnapshot(h),report=apply(h,draft);
  assert.equal(report.requiresNewBattle,true);assert.equal(typeof report.reason,'string');assert.ok(report.reason.length>0);
  assert.deepEqual(immutableSnapshot(h),before);
});

test('external raw Mob.Init invalidates the known main-queue identity and cannot silently reconcile',()=>{
  const h=fixture();h.mob.bbInit([1,5,0,4,3,0,2,2,0]);h.mob.bbticks=29;
  const draft=GameConfig.getCurrent(h.target),before=immutableSnapshot(h);draft.levels[0].waves[0].count=9;
  const report=apply(h,draft);
  assert.equal(report.requiresNewBattle,true);assert.equal(typeof report.reason,'string');assert.deepEqual(immutableSnapshot(h),before);
});

test('invalid live-wave input fails atomically before changing queue, clocks, config or progress',()=>{
  const h=fixture();h.consume();h.mob.bbticks=21;const before=immutableSnapshot(h);
  for(const change of [c=>c.levels[0].waves[0].count=0,c=>c.levels[0].waves[1].id='a',c=>c.units[0].cost=-1]) {
    const wrong=GameConfig.getCurrent(h.target);change(wrong);assert.throws(()=>apply(h,wrong),/GameConfig/);
    assert.deepEqual(immutableSnapshot(h),before);
  }
});

test('the original pause dialog can apply waves without advancing clocks, but menu edits need a new battle',()=>{
  const h=fixture();h.consume();h.game.bbPauseGame();h.mob.bbticks=23;
  const draft=GameConfig.getCurrent(h.target);draft.levels[0].waves[0].count=7;
  assert.equal(apply(h,draft).requiresNewBattle,false);assert.equal(progress(h).current.remaining,6);
  assert.equal(h.game.bbmainState,6);assert.equal(h.mob.bbticks,23);
  h.game.bbmainState=1;const before=immutableSnapshot(h),next=GameConfig.getCurrent(h.target);next.levels[0].waves[0].count=8;
  assert.equal(apply(h,next).requiresNewBattle,true);assert.deepEqual(immutableSnapshot(h),before);
});

test('disabled entire main queues and idempotent repeated applies are safe without resurrecting completed waves',()=>{
  const h=fixture(configWithWaves([{id:'only',type:1,count:2,delay:0}])),draft=GameConfig.getCurrent(h.target);
  draft.levels[0].waves[0].enabled=false;apply(h,draft);
  assert.equal(progress(h).current,null);assert.deepEqual(progress(h).upcomingGroups,[]);assert.equal(progress(h).remainingTotal,0);
  const before=immutableSnapshot(h);for(let i=0;i<5;i++)assert.equal(apply(h,draft).requiresNewBattle,false);
  assert.deepEqual(immutableSnapshot(h),before);
  draft.levels[0].waves[0].enabled=true;apply(h,draft);h.consume(2);
  assert.equal(progress(h).current,null);assert.deepEqual(progress(h).completed,['only']);
  const after=immutableSnapshot(h);apply(h,draft);assert.deepEqual(immutableSnapshot(h),after);
});
