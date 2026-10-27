'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const GameConfig=require('../src/game-config.js'),CustomRules=require('../src/custom-rules.js'),Factions=require('../src/factions.js'),SpawnQueue=require('../src/spawn-queue.js');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8'),json=name=>JSON.parse(read(name));
const plain=value=>JSON.parse(JSON.stringify(value)),COUNT_KEYS=['shovelCount','shotgunCount','survivalistCount','bomberCount','preacherCount'];
function defaults(){return GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map(k=>[k,json('config/'+k+'.json')])));}
function entries(list){const result=[],it=list.bbObjectEnumerator();while(it.bbHasNext())result.push(it.bbNextObject());return result;}
function stationary(c){for(const kind of ['units','zombies'])for(const actor of c[kind].slice(0,5)){actor.moveSpeed=0;actor.health=10000;if('damage'in actor)actor.damage=0;}}
function fixture(edit,editRules,adapt=true,withRules=true){
  const c=defaults();if(edit)edit(c);const r=CustomRules.defaults();r.automaticSpawning=false;r.baseReinforcements=false;if(editRules)editRules(r);
  const manifest=json('public/assets/manifest.json'),draws=[];
  const drawing=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){const i=manifest.images[name];assert.ok(i,name);return {Width:()=>i.width,Height:()=>i.height};}},{get:(o,k)=>o[k]||((...args)=>{draws.push([k,...args]);return 0;})});
  const input=new Proxy({},{get:()=>()=>0}),audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
  class App{GraphicsDevice(){return drawing;}InputDevice(){return input;}AudioDevice(){return audio;}SetUpdateRate(){return 0;}MilliSecs(){return 0;}}
  const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class{},ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,PlayMovie:()=>0,MovieFinished:()=>1,EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0});
  vm.runInContext(read('src/generated-game.js'),target);GameConfig.install(target,c);if(withRules)CustomRules.install(target,r);if(adapt)Factions.install(target);SpawnQueue.install(target);
  target.bb_Init();target.bb_Main();const port=target.ZTPGamePort,device=port.state.bb_mojo_app_device;device.OnCreate();device.OnUpdate();const game=port.state.bb_Game;game.bbPlayGame(1);
  return {target,port,game,c,r,draws,ticks(n=1){while(n-->0)game.bbGameTick(0);},spawn(side,kind,type,count=1){return CustomRules.withManualSpawn(target,()=>Factions.spawn(target,side,{kind,type},count));}};
}
function cast(h,id,side,options={}){return GameConfig.releaseSandboxPower(h.target,id,{side,...options});}
function snapshot(h){const g=h.game;return plain({seed:h.port.state.bb_std_random_Seed,main:g.bbmainState,cash:g.bbztp.bbcash,xp:g.bbztp.bbxp,force:g.bbztp.bbforce,time:[g.bbgameticks,g.bbgametime,g.bbupdates],powers:Array.from(g.bbpowers,p=>[p.bbbusy,p.bbcooldown,p.bblocked]),pending:GameConfig.getPowerProgress(h.target),config:GameConfig.getCurrent(h.target),lists:['bbpeople','bbpombies','bbzombies','bbpowerups','bbbottles','bbexplosions'].map(k=>[k,entries(g[k]).map(b=>[b.bbunit?.bbtype??b.bbtype,b.bbxpos,b.bbypos,b.bbhealth,b.bbmode])])});}
function place(body,x){body.bbxpos=x;body.bbypos=0;body.bblayer=0;return body;}
function skillState(h){return plain({xp:h.game.bbztp.bbxp,force:h.game.bbztp.bbforce,powers:Array.from(h.game.bbpowers,p=>[p.bbbusy,p.bbcooldown,p.bblocked])});}
function bombFromJet(h,side){
  cast(h,2,side);const jet=entries(h.game.bbpowerups)[0];place(jet,800);jet.bbypos=-520;
  for(let n=0;n<120;n++){h.ticks();const bottle=entries(h.game.bbbottles)[0];if(bottle)return {jet,bottle};}
  assert.fail('actual jet should create a bomb');
}

test('sandbox skills strictly reject invalid IDs/options and non-battle state atomically',()=>{
  const h=fixture(),before=snapshot(h);
  for(const id of [-1,3,1.5,'1',null,NaN,Infinity]){assert.throws(()=>cast(h,id,'friendly'));assert.deepEqual(snapshot(h),before);}
  for(const opts of [undefined,null,[],{},true,{side:'both'},{side:'friendly',extra:1},{side:'enemy',validateOnly:1}]){assert.throws(()=>GameConfig.releaseSandboxPower(h.target,1,opts));assert.deepEqual(snapshot(h),before);}
  for(const main of [0,1,3,4,5]){h.game.bbmainState=main;const old=snapshot(h);assert.throws(()=>cast(h,1,'enemy'),/active battle/);assert.deepEqual(snapshot(h),old);}
});

test('validateOnly and Factions.validateSpawn are pure, including native pause state',()=>{
  const h=fixture();h.game.bbmainState=6;const before=snapshot(h);
  for(const side of ['friendly','enemy'])for(let id=0;id<3;id++){
    const report=cast(h,id,side,{validateOnly:true});assert.equal(report.spawned,0);assert.equal(report.pending,report.requested);assert.equal(report.side,side);assert.deepEqual(snapshot(h),before);
  }
  assert.equal(Factions.validateSpawn(h.target,'enemy',{kind:'unit',type:4},2147483647).capacity,CustomRules.ENTITY_LIMIT-2);assert.deepEqual(snapshot(h),before);
  const report=cast(h,1,'enemy');assert.equal(report.spawned,1);assert.equal(h.game.bbmainState,6);
});

test('all six immediate releases ignore unlock/XP/charge/CD and preserve normal skill state',()=>{
  const h=fixture();h.game.bbztp.bbxp=0;for(const p of h.game.bbpowers){p.bbbusy=91;p.bbcooldown=123;p.bblocked=1;}const before=skillState(h);
  for(const side of ['friendly','enemy'])for(let id=0;id<3;id++){
    const report=cast(h,id,side);assert.equal(report.spawned,report.requested);assert.equal(report.pending,0);assert.deepEqual(skillState(h),before);
  }
  assert.equal(Factions.list(h.target,{side:'friendly'}).length,16);assert.equal(Factions.list(h.target,{side:'enemy'}).length,16);assert.equal(entries(h.game.bbpowerups).length,8);
});

test('both Angry Mobs use all five current configured human counts, anger and allegiance',()=>{
  const h=fixture(c=>COUNT_KEYS.forEach((k,i)=>c.powers[0].effect[k]=i+1));
  for(const side of ['friendly','enemy']){
    assert.equal(cast(h,0,side).requested,15);
    for(let type=0;type<5;type++){
      const actors=Factions.list(h.target,{side,kind:'unit',type});assert.equal(actors.length,type+1);
      for(const body of actors){assert.equal(body.bbisangry,1);assert.equal(body.bbwalkspeed,h.c.units[type].moveSpeed*h.c.powers[0].effect.angerSpeedMultiplier);assert.equal(body.bbhealth,h.c.units[type].health);assert.ok(side==='enemy'?body.bbxpos>1600:body.bbxpos<0);}
    }
  }
  const before=Factions.list(h.target,{side:'enemy',kind:'unit',type:0})[0].bbxpos;h.ticks();assert.ok(Factions.list(h.target,{side:'enemy',kind:'unit',type:0})[0].bbxpos<before);
});

for(const side of ['friendly','enemy'])test(side+' harvester damages only the opposite camp, all species, once with custom rules',()=>{
  const h=fixture(stationary,r=>{r.abilities.harvesterDamagePerTick=17;r.abilities.harvesterRange=250;});const other=side==='friendly'?'enemy':'friendly';
  const x=side==='friendly'?600:900,vx=side==='friendly'?700:800;
  const human=place(h.spawn(other,'unit',0)[0],vx),zombie=place(h.spawn(other,'zombie',0)[0],vx),witness=place(h.spawn(side,'zombie',0)[0],vx);
  cast(h,1,side);const car=place(entries(h.game.bbpowerups)[0],x);h.ticks();
  assert.equal(human.bbhealth,9983);assert.equal(zombie.bbhealth,9983);assert.equal(witness.bbhealth,10000);assert.equal(car.bbtype,1);
  assert.ok(side==='enemy'?car.bbxpos<x:car.bbxpos>x);assert.ok(side==='enemy'?car.bbwalkspeed<0:car.bbwalkspeed>0);
  const bases=[h.game.bbpeoplebase.bbhealth,h.game.bbzombiebase.bbhealth];place(car,side==='friendly'?1450:200);h.ticks();assert.deepEqual([h.game.bbpeoplebase.bbhealth,h.game.bbzombiebase.bbhealth],bases);
});

test('harvester zero range, directional edge geometry and live speed preserve enemy direction',()=>{
  const h=fixture(c=>{stationary(c);c.zombies[4].hitOffset=120;},r=>{r.abilities.harvesterRange=0;r.abilities.harvesterDamagePerTick=9;});
  const victim=place(h.spawn('friendly','zombie',4)[0],800);cast(h,1,'enemy');const car=place(entries(h.game.bbpowerups)[0],900);h.ticks();assert.equal(victim.bbhealth,10000);
  const nextRules=CustomRules.snapshot(h.target);nextRules.abilities.harvesterRange=110;CustomRules.update(h.target,nextRules);
  // Friendly corpse-thrower center is x - 120: its right edge is 800, not1040.
  place(car,900);h.ticks();assert.equal(victim.bbhealth,9991);
  place(victim,1100);place(car,900);h.ticks();assert.equal(victim.bbhealth,9991,'behind the left-moving car is not a target');
  cast(h,2,'enemy');const next=GameConfig.getCurrent(h.target);next.powers[1].effect.moveSpeed=3;next.powers[2].effect.moveSpeed=9;GameConfig.updateLive(h.target,next);
  assert.equal(car.bbwalkspeed,-3);for(const jet of entries(h.game.bbpowerups).filter(p=>p.bbtype===2))assert.equal(jet.bbwalkspeed,-9);
});

for(const side of ['friendly','enemy'])for(const kind of ['unit','zombie'])test(side+' real jet drops a sourced bomb damaging opposite '+kind+' without friendly fire',()=>{
  const h=fixture(c=>{stationary(c);c.powers[2].effect.jetCount=1;});const {jet,bottle}=bombFromJet(h,side),other=side==='friendly'?'enemy':'friendly';
  assert.ok(side==='enemy'?jet.bbxpos<800:jet.bbxpos>800);assert.equal(bottle.bbdamage,500);assert.ok(bottle.bbxpos>=0&&bottle.bbxpos<=1600);
  const victim=place(h.spawn(other,kind,0)[0],bottle.bbxpos),witness=place(h.spawn(side,kind,0)[0],bottle.bbxpos);bottle.bbypos=1;h.ticks();
  assert.equal(victim.bbhealth,9500);assert.equal(witness.bbhealth,10000);assert.ok(!entries(h.game.bbbottles).includes(bottle));
  const cancelled=GameConfig.cancelPowerEffects(h.target,2);assert.ok(cancelled.explosions>=1);assert.equal(cancelled.powerups,1);
});

for(const side of ['friendly','enemy'])test(side+' airstrike base immunity remains symmetric with the original skill rule',()=>{
  const h=fixture(c=>{stationary(c);c.powers[2].effect.jetCount=1;}),{bottle}=bombFromJet(h,side);
  const base=side==='friendly'?h.game.bbzombiebase:h.game.bbpeoplebase,hp=base.bbhealth;place(base,bottle.bbxpos);bottle.bbypos=1;h.ticks();assert.equal(base.bbhealth,hp);
});

test('enemy vehicles are rendered mirrored, produce blood on the trailing side, and leave through the left edge',()=>{
  const h=fixture();cast(h,1,'enemy');const car=place(entries(h.game.bbpowerups)[0],800);car.bbharvest=50;car.bbpeak=50;h.draws.length=0;car.bbDraw(0,0);
  assert.ok(h.draws.some(d=>d[0]==='SetMatrix'&&d[1]<0),'real drawing matrix mirrors the sprite');
  const blood=h.game.bbblood;assert.ok(blood.bbcount>0);for(let i=0;i<blood.bbcount;i++){assert.ok(blood.bbxy[i*4]>800);assert.ok(blood.bbxy[i*4+2]>0);}
  cast(h,2,'enemy');for(const body of entries(h.game.bbpowerups))body.bbxpos=-99.9;h.ticks();assert.equal(entries(h.game.bbpowerups).length,0);
});

test('sandbox harvester type and projectile source are restored after a later original tick exception',()=>{
  const h=fixture();cast(h,1,'enemy');const car=entries(h.game.bbpowerups)[0],base=h.game.bbzombiebase,update=base.bbUpdate;
  base.bbUpdate=()=>{throw new Error('fixture later update failure');};assert.throws(()=>h.ticks(),/fixture later/);base.bbUpdate=update;
  assert.equal(car.bbtype,1);assert.ok(car.bbwalkspeed<0);h.game.bbAddBottle(0,100,-100,4,0,1);assert.equal(entries(h.game.bbbottles)[0].bbxpos,100,'enemy source cannot leak to an unrelated call');
});

test('huge both-camp skill requests remain compact and retain independent actor/effect capacity',()=>{
  const h=fixture(c=>{c.powers[0].effect.shovelCount=2147483647;c.powers[0].effect.shotgunCount=0;c.powers[2].effect.jetCount=2147483647;});
  const mob=cast(h,0,'enemy');assert.equal(mob.spawned,32);assert.equal(mob.pending,2147483615);assert.equal(GameConfig.getPowerProgress(h.target).groups[0].side,'enemy');
  const jet=cast(h,2,'friendly');assert.equal(jet.spawned,0,'older actor group owns the immediate 32 allocation budget');
  h.spawn('friendly','zombie',0,1);
  // Exercise full actor-list accounting without constructing or fighting an
  // unrelated 10,000-actor army in this skill/effect-capacity guard test.
  const remaining=CustomRules.getEntityCapacity(h.target);
  for(let i=0;i<remaining;i++)h.game.bbpeople.bbAddLast(h.game.bbpeoplebase);
  assert.equal(CustomRules.getEntityCapacity(h.target),0);h.ticks();
  assert.equal(entries(h.game.bbpowerups).length,32,'full actors must not block a jet request');assert.ok(GameConfig.getPowerProgress(h.target).pendingTotal>2147483647);
  const report=GameConfig.cancelPowerEffects(h.target,'all');assert.ok(report.pending>2147483647);assert.equal(GameConfig.getPowerProgress(h.target).pendingTotal,0);
});

test('cancel by skill follows summoned actors through allegiance and clears both sides but not normal troops/bottles',()=>{
  const h=fixture();for(const side of ['friendly','enemy'])for(let id=0;id<3;id++)cast(h,id,side);
  const enemy=Factions.list(h.target,{side:'enemy',kind:'unit',type:0})[0];assert.ok(Factions.convert(h.target,enemy,'friendly'));
  const ordinary=h.spawn('enemy','unit',3)[0];h.game.bbAddBottle(0,100,-100,0,0,0);const bottle=entries(h.game.bbbottles)[0];const before=skillState(h);
  const mob=GameConfig.cancelPowerEffects(h.target,0);assert.equal(mob.actors,32);assert.deepEqual(Factions.list(h.target),[ordinary]);assert.deepEqual(skillState(h),before);
  const all=GameConfig.cancelPowerEffects(h.target,'all');assert.equal(all.powerups,8);assert.deepEqual(entries(h.game.bbbottles),[bottle]);assert.deepEqual(Factions.list(h.target),[ordinary]);
});

test('dry and committed releases reject any immutable pending-dispatch list without queue or RNG changes',()=>{
  for(const key of ['bbpeople','bbpombies','bbzombies','bbpowerups']){
    const h=fixture(c=>{c.powers[0].effect.shovelCount=1001;c.powers[0].effect.shotgunCount=0;});cast(h,0,'enemy');Object.freeze(h.game[key].bb_head);const before=snapshot(h);
    for(const validateOnly of [true,false]){assert.throws(()=>cast(h,2,'friendly',{validateOnly}),/writable|read-only/);assert.deepEqual(snapshot(h),before);}
  }
  const h=fixture(null,null,false),before=snapshot(h);assert.throws(()=>cast(h,0,'enemy'),/install/);assert.deepEqual(snapshot(h),before);
});

test('missing CustomRules is rejected before any skill request is published',()=>{
  const h=fixture(null,null,true,false),before=snapshot(h);
  for(const side of ['friendly','enemy'])for(let id=0;id<3;id++)for(const validateOnly of [true,false]){
    assert.throws(()=>cast(h,id,side,{validateOnly}),/CustomRules.*install/);assert.deepEqual(snapshot(h),before);
  }
});

test('zero-count current configuration and later live edits are honored without changing normal cast semantics',()=>{
  const h=fixture(c=>{COUNT_KEYS.forEach(k=>c.powers[0].effect[k]=0);c.powers[2].effect.jetCount=0;});
  for(const side of ['friendly','enemy'])for(const id of [0,2])assert.deepEqual(cast(h,id,side),{powerId:id,side,requested:0,spawned:0,pending:0});
  const next=GameConfig.getCurrent(h.target);next.powers[0].effect.preacherCount=2;next.powers[2].effect.jetCount=2;GameConfig.updateLive(h.target,next);
  assert.equal(cast(h,0,'enemy').requested,2);assert.equal(cast(h,2,'friendly').requested,2);
  const normal=h.game.bbpowers[1];normal.bbcooldown=0;h.game.bbAddPower(normal);assert.equal(normal.bbcooldown,normal.bbcooltime);
  const car=entries(h.game.bbpowerups).find(p=>p.bbtype===1);assert.ok(car.bbxpos<0);assert.ok(car.bbwalkspeed>0);
});

function unlocked(h){const c=GameConfig.getCurrent(h.target);for(const u of c.units)if('dependency'in u)u.dependency=0;for(const b of c.buildings)b.dependency=0;for(const p of c.powers)p.unlockAfterStage=0;return c;}
test('sandboxUnlocks explicitly applies all prerequisites and power locks now but keeps population deferred',()=>{
  const h=fixture(),next=unlocked(h);next.units[0].people=3;const before=snapshot(h);
  GameConfig.updateLive(h.target,next,{sandboxUnlocks:true,validateOnly:true});assert.deepEqual(snapshot(h),before);
  const report=GameConfig.updateLive(h.target,next,{sandboxUnlocks:true});assert.ok(report.deferred.includes('$.units[0].people'));assert.equal(h.game.bbunits[0].bbpeople,1);
  for(const u of h.game.bbunits.slice(0,5))assert.equal(u.bbdependency,0);for(const b of h.game.bbbuildings)assert.equal(b.bbdependency,0);for(const p of h.game.bbpowers)assert.equal(p.bblocked,0);
  GameConfig.updateLive(h.target,next);for(const u of h.game.bbunits.slice(0,5))assert.equal(u.bbdependency,0,'next live edits do not restore old dependencies');
});

test('sandboxUnlocks rejects partial unlocks and immutable locks atomically',()=>{
  const h=fixture(),before=snapshot(h);assert.throws(()=>GameConfig.updateLive(h.target,h.c,{sandboxUnlocks:true}),/every/);assert.deepEqual(snapshot(h),before);
  assert.throws(()=>GameConfig.updateLive(h.target,unlocked(h),{sandboxUnlocks:1}),/boolean/);assert.deepEqual(snapshot(h),before);
  Object.defineProperty(h.game.bbpowers[2],'bblocked',{writable:false});const frozen=snapshot(h);assert.throws(()=>GameConfig.updateLive(h.target,unlocked(h),{sandboxUnlocks:true}),/writable/);assert.deepEqual(snapshot(h),frozen);
});
