'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const GameConfig=require('../src/game-config.js'),CustomRules=require('../src/custom-rules.js'),Factions=require('../src/factions.js'),SpawnQueue=require('../src/spawn-queue.js');
const ENTITY_LIMIT=SpawnQueue.ENTITY_LIMIT,TROOP_SLOTS=ENTITY_LIMIT-2;
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8'),json=name=>JSON.parse(read(name));
function config(){return GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map(kind=>[kind,json('config/'+kind+'.json')])));}
function entries(list){const a=[],it=list.bbObjectEnumerator();while(it.bbHasNext())a.push(it.bbNextObject());return a;}
function fixture(queued=true,edit){
  const c=config();for(const kind of ['units','zombies'])for(const unit of c[kind].slice(0,5)){unit.moveSpeed=0;if('damage'in unit)unit.damage=0;}if(edit)edit(c);
  const r=CustomRules.defaults();r.automaticSpawning=false;r.baseReinforcements=false;
  const manifest=json('public/assets/manifest.json');
  const drawing=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){const i=manifest.images[name];assert.ok(i,name);return {Width:()=>i.width,Height:()=>i.height};}}, {get:(o,k)=>o[k]||(()=>0)});
  const input=new Proxy({}, {get:()=>()=>0}),audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
  class App{GraphicsDevice(){return drawing;}InputDevice(){return input;}AudioDevice(){return audio;}SetUpdateRate(){return 0;}MilliSecs(){return 0;}}
  const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class{},ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,PlayMovie:()=>0,MovieFinished:()=>1,EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0});
  vm.runInContext(read('src/generated-game.js'),target);GameConfig.install(target,c);CustomRules.install(target,r);Factions.install(target);if(queued)SpawnQueue.install(target);
  target.bb_Init();target.bb_Main();const port=target.ZTPGamePort,device=port.state.bb_mojo_app_device;device.OnCreate();device.OnUpdate();const game=port.state.bb_Game;game.bbPlayGame(1);
  return {target,port,game,c,ticks(n=1){for(let i=0;i<n;i++)game.bbGameTick(0);},enqueue(side,kind,type,count,rate){return SpawnQueue.enqueue(target,side,{kind,type},count,rate===undefined?{}:{rate});},
    spawn(side,kind,type,count){return CustomRules.withManualSpawn(target,()=>Factions.spawn(target,side,{kind,type},count));},state(){return SpawnQueue.snapshot(target);}};
}
function view(h){const g=h.game;return {seed:h.port.state.bb_std_random_Seed,ticks:g.bbgameticks,cash:g.bbztp.bbcash,xp:g.bbztp.bbxp,
  people:entries(g.bbpeople).map(b=>[b.bbunit.bbtype,b.bbhealth,b.bbxpos,b.bbmode]),zombies:entries(g.bbzombies).map(b=>[b.bbunit.bbtype,b.bbhealth,b.bbxpos,b.bbmode])};}
// Capacity fixtures need real, distinct native bodies, not thousands of
// attacking sprites. Mode 16 is inert in the recovered update state machine;
// these still execute its real update/list logic when a queue tick is tested.
function fillIdleEnemySlots(h,count){
  const bodies=[];
  for(let i=0;i<count;i++){
    const body=new h.port.bb_Zombie().bbZombie_new(0,h.game.bbzunits[0],null);
    body.bbmode=16;body.bbwalkspeed=0;h.game.bbzombies.bbAddLast(body);bodies.push(body);
  }
  return bodies;
}

test('all actor admission paths share ten-thousand slots and the old thousand boundary no longer blocks queued work',()=>{
  assert.equal(ENTITY_LIMIT,10000);assert.equal(Factions.ENTITY_LIMIT,ENTITY_LIMIT);assert.equal(CustomRules.ENTITY_LIMIT,ENTITY_LIMIT);
  const h=fixture();fillIdleEnemySlots(h,998);const job=h.enqueue('enemy','zombie',1,3,1000000);
  h.ticks();assert.equal(h.state().recent.find(item=>item.id===job.id).spawned,3);
  assert.equal(h.state().entityCount,1003);assert.equal(h.state().capacity,ENTITY_LIMIT-1003);
  assert.equal(h.state().blocked,null);assert.equal(CustomRules.getEntityCapacity(h.target),ENTITY_LIMIT-1003);
});

test('optional queue adapter preserves ordinary deterministic battles without pending jobs',()=>{
  const a=fixture(false),b=fixture();for(const h of [a,b]){h.game.bbAddPerson(h.game.bbunits[0]);h.game.bbAddZombie(h.game.bbzunits[0]);h.ticks(1200);}assert.deepEqual(view(b),view(a));
});

test('independent batches are compact above 1000 and enqueue consumes no random values or active slots',()=>{
  const h=fixture(),seed=h.port.state.bb_std_random_Seed;
  const first=h.enqueue('enemy','zombie',0,2147483647,0.1),second=h.enqueue('friendly','unit',4,1000,2);
  assert.notEqual(first.id,second.id);assert.equal(h.state().pendingJobs,2);assert.equal(h.state().totalPending,2147484647);
  assert.equal(h.port.state.bb_std_random_Seed,seed);assert.equal(Factions.list(h.target).length,0);assert.ok(JSON.stringify(h.state()).length<2500);
  first.descriptor.type=3;assert.equal(h.state().jobs[0].descriptor.type,0);assert.equal(h.state().jobs[1].rate,2);
});

test('all twenty camp/species combinations queue at the proper world edge with captured identity',()=>{
  const h=fixture();for(const side of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++)h.enqueue(side,kind,type,2,1000000);
  h.ticks(2);assert.equal(h.state().totalSpawned,40);assert.equal(h.state().pendingJobs,0);assert.equal(h.state().recent.length,20);
  for(const job of h.state().recent){assert.equal(job.spawned,2);assert.equal(job.status,'completed');assert.equal(job.firstSpawn.x,job.side==='friendly'?0:1600);assert.equal(job.firstSpawn.kind,job.descriptor.kind);assert.equal(job.firstSpawn.type,job.descriptor.type);assert.equal(Factions.list(h.target,{side:job.side,...job.descriptor}).length,2);}
});

test('0.1 ordinary zombies and 2 fast zombies per game second dispatch concurrently',()=>{
  const h=fixture(),slow=h.enqueue('enemy','zombie',0,1000,0.1),fast=h.enqueue('enemy','zombie',1,1000,2);
  h.ticks(600);let jobs=h.state().jobs;assert.equal(jobs.find(j=>j.id===slow.id).spawned,0);assert.equal(jobs.find(j=>j.id===fast.id).spawned,10);
  h.ticks(600);jobs=h.state().jobs;assert.equal(jobs.find(j=>j.id===slow.id).spawned,1);assert.equal(jobs.find(j=>j.id===fast.id).spawned,20);
  assert.equal(Factions.list(h.target,{side:'enemy',kind:'zombie',type:0}).length,1);assert.equal(Factions.list(h.target,{side:'enemy',kind:'zombie',type:1}).length,20);
});

test('rate 0 pauses only its own batch and changing the default never rewrites captured rates',()=>{
  const h=fixture(),a=h.enqueue('enemy','zombie',0,10,0),b=h.enqueue('friendly','unit',1,10,120);
  SpawnQueue.setDefaultRate(h.target,0.1);const c=h.enqueue('enemy','unit',2,10);h.ticks(2);
  assert.equal(h.state().jobs.find(j=>j.id===a.id).spawned,0);assert.equal(h.state().jobs.find(j=>j.id===b.id).spawned,2);assert.equal(h.state().jobs.find(j=>j.id===c.id).rate,0.1);
  SpawnQueue.updateRate(h.target,a.id,120);h.ticks();assert.equal(h.state().jobs.find(j=>j.id===a.id).spawned,1);assert.equal(h.state().jobs.find(j=>j.id===b.id).rate,120);
});

test('editing one live rate resets only its fractional credit and does not create burst debt',()=>{
  const h=fixture(),a=h.enqueue('enemy','zombie',0,1000,60),b=h.enqueue('friendly','unit',0,1000,60);h.ticks();
  SpawnQueue.updateRate(h.target,a.id,30);h.ticks();assert.equal(h.state().jobs.find(j=>j.id===a.id).spawned,0);assert.equal(h.state().jobs.find(j=>j.id===b.id).spawned,1);
  h.ticks(3);assert.equal(h.state().jobs.find(j=>j.id===a.id).spawned,1);
  SpawnQueue.updateRate(h.target,a.id,1000000);const before=h.state().totalSpawned;h.ticks();assert.ok(h.state().totalSpawned-before<=32);
});

test('shared per-tick budget round-robins fairly rather than allowing a slow or huge head to block others',()=>{
  const h=fixture();for(let i=0;i<64;i++)h.enqueue('enemy','zombie',i%4,2,1000000);
  h.ticks();assert.equal(h.state().totalSpawned,32);assert.equal(h.state().jobs.filter(j=>j.spawned===1).length,32);
  h.ticks();assert.equal(h.state().totalSpawned,64);assert.equal(h.state().jobs.every(j=>j.spawned===1),true);
  h.ticks(2);assert.equal(h.state().totalSpawned,128);assert.equal(h.state().jobs.length,0);assert.equal(h.state().recent.length,32);
});

test('brief scheduler contention retains bounded due actors so many low-rate streams do not lose half their rate',()=>{
  const h=fixture();for(let i=0;i<64;i++)h.enqueue('enemy','zombie',0,10,1);
  h.ticks(120);assert.equal(h.state().totalSpawned,32);h.ticks();assert.equal(h.state().totalSpawned,64);assert.equal(h.state().jobs.every(job=>job.spawned===1),true);
  h.ticks(119);assert.equal(h.state().totalSpawned,96);h.ticks();assert.equal(h.state().totalSpawned,128);assert.equal(h.state().jobs.every(job=>job.spawned===2),true);
});

test('live cap retains remainder, accepts later batches, and resumes without catch-up bursts',()=>{
  const h=fixture(),old=fillIdleEnemySlots(h,TROOP_SLOTS);const a=h.enqueue('enemy','zombie',1,1000,1000000),b=h.enqueue('friendly','unit',2,10,120);
  h.ticks(5);assert.equal(h.state().totalSpawned,0);assert.equal(h.state().totalPending,1010);assert.equal(h.state().blocked,'entity-limit');
  h.game.bbzombies.bbRemove(old[0]);h.ticks();
  assert.equal(h.state().totalSpawned,1);assert.equal(h.state().jobs.find(j=>j.id===a.id).spawned,1);assert.equal(h.state().jobs.find(j=>j.id===b.id).spawned,0);
  h.game.bbzombies.bbRemove(old[1]);h.ticks();assert.equal(h.state().jobs.find(j=>j.id===b.id).spawned,1);assert.equal(h.state().capacity,0);
});

test('queue snapshots expose exact shared occupancy including bases and scan membership only once',()=>{
  const h=fixture();h.enqueue('enemy','zombie',0,1000,120);
  let scans=0;
  for(const list of [h.game.bbpeople,h.game.bbpombies,h.game.bbzombies]){
    const original=list.bbObjectEnumerator;list.bbObjectEnumerator=function(){scans++;return original.apply(this,arguments);};
  }
  const empty=h.state();assert.equal(scans,3);assert.equal(empty.entityCount,2);assert.equal(empty.baseCount,2);
  assert.equal(empty.entityLimit,ENTITY_LIMIT);assert.equal(empty.capacity,TROOP_SLOTS);assert.equal(empty.blocked,null);
  const bodies=fillIdleEnemySlots(h,TROOP_SLOTS);scans=0;
  const full=h.state();assert.equal(scans,3);assert.equal(full.entityCount,ENTITY_LIMIT);assert.equal(full.baseCount,2);
  assert.equal(full.capacity,0);assert.equal(full.blocked,'entity-limit');assert.equal(full.totalPending,1000);
  h.game.bbzombies.bbRemove(bodies[0]);scans=0;
  const freed=h.state();assert.equal(scans,3);assert.equal(freed.entityCount,ENTITY_LIMIT-1);assert.equal(freed.capacity,1);assert.equal(freed.blocked,null);
});

test('queue backpressure distinguishes native pause, runtime pause, rate pause, ended and absent battles from full capacity',()=>{
  const h=fixture(),job=h.enqueue('enemy','zombie',0,10,120);
  const expect=reason=>{const value=h.state();assert.equal(value.blocked,reason);assert.equal(value.entityCount,2);assert.equal(value.capacity,TROOP_SLOTS);};
  expect(null);h.game.bbmainState=6;expect('game-paused');h.game.bbmainState=2;
  h.target.ZTPRuntime={getStatus:()=>({running:false})};expect('runtime-paused');h.target.ZTPRuntime={getStatus:()=>({running:true})};
  SpawnQueue.updateRate(h.target,job.id,0);expect('rate-paused');SpawnQueue.updateRate(h.target,job.id,120);
  for(const mode of [2,6])for(const key of ['bbpeoplebase','bbzombiebase']){
    const base=h.game[key],hp=base.bbhealth;h.game.bbmainState=mode;base.bbhealth=0;
    expect('battle-ended');base.bbhealth=hp;
  }
  // Menu/intro/leaderboard states are not completed battles even if an old
  // base reference still has zero health after returning from a score screen.
  const menuHp=h.game.bbzombiebase.bbhealth;
  for(const mode of [0,1,5]){h.game.bbmainState=mode;h.game.bbzombiebase.bbhealth=0;expect('no-active-battle');}
  h.game.bbzombiebase.bbhealth=menuHp;h.game.bbmainState=2;expect(null);
  assert.equal(h.state().totalSpawned,0);assert.equal(h.state().totalPending,10);
});

test('actual native victory and defeat keep pending jobs marked battle-ended after GameOver removes the bases',()=>{
  for(const won of [0,1]){
    const h=fixture(),job=h.enqueue('enemy','zombie',0,10,120);h.game.bbGameOver(won);
    assert.equal(h.game.bbmainState,won?3:4);
    const ended=h.state();assert.equal(ended.blocked,'battle-ended');assert.equal(ended.baseCount,0);assert.equal(ended.entityCount,0);
    assert.equal(ended.capacity,ENTITY_LIMIT);assert.equal(ended.paused,false);assert.equal(ended.jobs[0].id,job.id);assert.equal(ended.totalPending,10);
    h.ticks(2);assert.equal(h.state().blocked,'battle-ended');assert.equal(h.state().totalSpawned,0);assert.equal(h.state().totalPending,10);
  }
});

test('paid native training completes before manual queue can claim the last entity slot',()=>{
  const h=fixture();fillIdleEnemySlots(h,TROOP_SLOTS-1);h.enqueue('enemy','zombie',3,1000,1000000);
  const unit=h.game.bbunits[0];unit.bborders=1;unit.bbbusy=1;h.game.bbztp.bbforce=1;h.ticks();
  assert.equal(unit.bborders,0);assert.equal(Factions.list(h.target,{side:'friendly',kind:'unit',type:0}).length,1);assert.equal(h.state().totalSpawned,0);assert.equal(h.state().capacity,0);
});

test('disabled automatic types do not suppress explicit queue batches',()=>{
  const h=fixture(),rules=CustomRules.snapshot(h.target);rules.zombieTypesEnabled.fill(false);CustomRules.update(h.target,rules);h.enqueue('enemy','zombie',3,1,120);h.ticks();assert.equal(h.state().totalSpawned,1);assert.equal(Factions.list(h.target,{kind:'zombie',type:3}).length,1);
});

test('native pause, runtime/editor stop, victory, defeat and dead bases do not dispatch queued actors',()=>{
  for(const mode of [6,3,4]){const h=fixture();h.enqueue('enemy','zombie',0,10,120);h.game.bbmainState=mode;h.ticks(10);assert.equal(h.state().totalSpawned,0);}
  const h=fixture();h.enqueue('enemy','zombie',0,10,60);h.ticks();h.target.ZTPRuntime={getStatus:()=>({running:false})};h.ticks(10);assert.equal(h.state().totalSpawned,0);
  h.target.ZTPRuntime={getStatus:()=>({running:true})};h.ticks();assert.equal(h.state().totalSpawned,0);h.ticks();assert.equal(h.state().totalSpawned,1);
  for(const base of ['bbpeoplebase','bbzombiebase']){const p=fixture();p.enqueue('enemy','zombie',0,10,120);p.game[base].bbhealth=0;p.ticks();assert.equal(p.state().totalSpawned,0);}
});

test('native pause drops pre-pause fractional credit and cannot release a delayed burst on resume',()=>{
  const h=fixture();h.enqueue('enemy','zombie',0,10,60);h.ticks();h.game.bbmainState=6;h.ticks(100);h.game.bbmainState=2;h.ticks();assert.equal(h.state().totalSpawned,0);h.ticks();assert.equal(h.state().totalSpawned,1);
});

test('cancelling one/all batches keeps already spawned actors, retains bounded history and removes only pending work',()=>{
  const h=fixture(),a=h.enqueue('enemy','zombie',0,1000,120),b=h.enqueue('friendly','unit',0,1000,120);h.ticks();
  const cancelled=SpawnQueue.cancel(h.target,a.id);assert.equal(cancelled.length,1);assert.equal(cancelled[0].cancelledCount,999);assert.equal(cancelled[0].spawned,1);
  assert.equal(h.state().totalPending,999);assert.equal(Factions.list(h.target).length,2);h.ticks();assert.equal(h.state().jobs.find(j=>j.id===b.id).spawned,2);
  SpawnQueue.cancel(h.target);assert.equal(h.state().pendingJobs,0);assert.equal(h.state().totalCancelled,1997);assert.equal(Factions.list(h.target).length,3);assert.equal(SpawnQueue.cancel(h.target,'spawn-9999').length,0);
});

test('reset clears all pending jobs, progress and fractional debt but keeps the configured new-batch default',()=>{
  const h=fixture(),a=h.enqueue('enemy','zombie',0,1000,60);SpawnQueue.setDefaultRate(h.target,3);h.ticks();h.game.bbPlayGame(1);
  assert.equal(h.state().jobs.length,0);assert.equal(h.state().recent.length,0);assert.equal(h.state().totalRequested,0);assert.equal(h.state().totalSpawned,0);assert.equal(h.state().defaultRate,3);
  const b=h.enqueue('friendly','unit',0,1,60);assert.notEqual(a.id,b.id);h.ticks();assert.equal(h.state().totalSpawned,0);h.ticks();assert.equal(h.state().totalSpawned,1);
});

test('strict request/rate schema rejects malformed values atomically without executing getters',()=>{
  const h=fixture(),seed=h.port.state.bb_std_random_Seed,valid={kind:'zombie',type:0},accessor={kind:'zombie'};
  Object.defineProperty(accessor,'type',{enumerable:true,get(){throw Error('getter evaluated');}});
  for(const args of [['neutral',valid,1],['enemy',{kind:'unit',type:5},1],['enemy',{kind:'zombie',type:0,extra:1},1],['enemy',accessor,1],['enemy',Object.create(valid),1],['enemy',valid,0],['enemy',valid,1.2],['enemy',valid,2147483648],['enemy',valid,1,{rate:Infinity}],['enemy',valid,1,{rate:-1}],['enemy',valid,1,{rate:'1'}],['enemy',valid,1,{extra:1}]])assert.throws(()=>SpawnQueue.enqueue(h.target,...args),/SpawnQueue/);
  const options={};Object.defineProperty(options,'rate',{enumerable:true,get(){throw Error('getter evaluated');}});assert.throws(()=>SpawnQueue.enqueue(h.target,'enemy',valid,1,options),/SpawnQueue/);
  for(const value of [-1,Infinity,NaN,'1',1000001])assert.throws(()=>SpawnQueue.setDefaultRate(h.target,value),/SpawnQueue/);
  assert.equal(h.state().totalRequested,0);assert.equal(h.port.state.bb_std_random_Seed,seed);assert.equal(h.state().defaultRate,120);
  const job=h.enqueue('enemy','zombie',0,5,0.1),before=h.state();
  for(const call of [()=>SpawnQueue.updateRate(h.target,job.id,NaN),()=>SpawnQueue.updateRate(h.target,'bad',1),()=>SpawnQueue.updateRate(h.target,'spawn-99999',1),()=>SpawnQueue.cancel(h.target,{} )])assert.throws(call,/SpawnQueue/);
  assert.deepEqual(h.state(),before);
});

test('snapshots and recent history are independent JSON values without internal credit storage',()=>{
  const h=fixture();h.enqueue('enemy','zombie',0,1,120);h.ticks();const s=h.state();s.recent[0].descriptor.type=4;s.recent[0].firstSpawn.x=-999;
  assert.equal(h.state().recent[0].descriptor.type,0);assert.equal(h.state().recent[0].firstSpawn.x,1600);assert.equal('_credit'in h.state().recent[0],false);assert.equal('_due'in h.state().recent[0],false);
  const context=vm.createContext({});vm.runInContext(read('src/spawn-queue.js'),context);assert.equal(context.SpawnQueue.DEFAULT_RATE,120);assert.equal(context.SpawnQueue.MAX_COUNT,2147483647);
});

test('10000 compact pending batches preserve wide actor totals and the technical job guard is atomic',()=>{
  const h=fixture(),seed=h.port.state.bb_std_random_Seed;
  for(let i=0;i<10000;i++)h.enqueue('enemy','zombie',0,2147483647,0);
  const before=h.state();assert.equal(before.pendingJobs,10000);assert.equal(before.totalPending,21474836470000);assert.equal(Number.isSafeInteger(before.totalPending),true);
  assert.throws(()=>h.enqueue('friendly','unit',0,1,1),/too many pending batches/);assert.equal(h.state().totalPending,before.totalPending);assert.equal(h.port.state.bb_std_random_Seed,seed);
});

test('queue installation is idempotent, rejects late installation, and rejects enqueue outside a live battle',()=>{
  const h=fixture();assert.equal(SpawnQueue.install(h.target),h.target);h.enqueue('enemy','zombie',0,1,120);h.ticks();assert.equal(h.state().totalSpawned,1);
  const late=fixture(false);assert.throws(()=>SpawnQueue.install(late.target),/before bb_Main/);assert.throws(()=>SpawnQueue.snapshot(late.target),/install must run first/);
  h.game.bbmainState=1;assert.throws(()=>h.enqueue('enemy','zombie',0,1,120),/active battle/);
});
