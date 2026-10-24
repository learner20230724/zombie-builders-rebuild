'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const GameConfig=require('../src/game-config.js');
const CustomRules=require('../src/custom-rules.js');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const json=name=>JSON.parse(read(name));
const plain=value=>JSON.parse(JSON.stringify(value));
const ZERO={pending:0,actors:0,powerups:0,projectiles:0,explosions:0,charging:0};
const LIMIT=2147483647;
function defaults(){return GameConfig.fromDocuments(Object.fromEntries(
  ['units','zombies','buildings','powers','levels'].map(kind=>[kind,json('config/'+kind+'.json')])));}
function entries(list){const result=[],iterator=list.bbObjectEnumerator();while(iterator.bbHasNext())result.push(iterator.bbNextObject());return result;}
// Real generated actors, linked lists, powers and RNG; only platform I/O is replaced.
function fixture(configuration=defaults()){
  const manifest=json('public/assets/manifest.json');
  const graphics=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){
    const image=manifest.images[name];assert.ok(image,name);return {Width:()=>image.width,Height:()=>image.height};
  }},{get:(o,k)=>o[k]||(()=>0)});
  const input=new Proxy({},{get:()=>()=>0});
  const audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
  class App{GraphicsDevice(){return graphics;}InputDevice(){return input;}AudioDevice(){return audio;}SetUpdateRate(){return 0;}MilliSecs(){return 0;}}
  const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class {},ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,
    PlayMovie:()=>0,MovieFinished:()=>1,EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0});
  vm.runInContext(read('src/generated-game.js'),target);GameConfig.install(target,configuration);
  const rules=CustomRules.defaults();rules.automaticSpawning=false;CustomRules.install(target,rules);
  target.bb_Init();target.bb_Main();const port=target.ZTPGamePort,device=port.state.bb_mojo_app_device;
  device.OnCreate();device.OnUpdate();const game=port.state.bb_Game;game.bbPlayGame(1);
  return {target,game,port,ticks(n=1){while(n-->0)game.bbGameTick(0);}};
}
function report(h,id,options){return GameConfig.cancelPowerEffects(h.target,id,options);}
function soldiers(h){return entries(h.game.bbpeople).filter(body=>body!==h.game.bbpeoplebase);}
function cast(h,id){h.game.bbAddPower(h.game.bbpowers[id]);}
function stable(h){const g=h.game,mob=h.port.bb_ZombieMob;return plain({
  cash:g.bbztp.bbcash,xp:g.bbztp.bbxp,force:g.bbztp.bbforce,maxForce:g.bbztp.bbmaxforce,
  clock:[g.bbgameticks,g.bbgametime,g.bbupdates,g.bbgamespeed,g.bbsixtyiths,g.bbzombieclock,g.bbzombiegroan],
  state:g.bbmainState,stats:[g.bbkinlost,g.bbzombieskilled],
  units:Array.from(g.bbunits,u=>[u.bborders,u.bbbusy]),buildings:Array.from(g.bbbuildings,b=>[b.bborders,b.bbbusy]),
  waveClock:mob.bbticks,waves:entries(mob.bbqueue).map(w=>[w.bbtype,w.bbcount,w.bbdelay,w.bbtime]),seed:h.port.state.bb_std_random_Seed,
  config:GameConfig.getCurrent(h.target),rules:CustomRules.snapshot(h.target)});}
function snapshot(h){const g=h.game;return plain({stable:stable(h),pending:GameConfig.getPowerProgress(h.target),
  lists:['bbpeople','bbzombies','bbpombies','bbpowerups','bbbottles','bbexplosions','bbflinglist','bbdeathlist']
    .map(key=>[key,entries(g[key]).map(body=>({type:body.bbunit?body.bbunit.bbtype:body.bbtype,health:body.bbhealth,mode:body.bbmode,x:body.bbxpos,y:body.bbypos,damage:body.bbdamage,angry:body.bbisangry}))]),
  powers:Array.from(g.bbpowers,p=>[p.bbbusy,p.bbcooldown,p.bbcooltime])});}
function castAll(h){cast(h,0);cast(h,1);cast(h,2);}

test('cancel API strictly validates skill IDs/options without changing any state',()=>{
  const h=fixture();castAll(h);const before=snapshot(h);
  for(const id of [-1,3,0.5,'0','All',null,{},[],NaN,Infinity,true]){
    assert.throws(()=>report(h,id));assert.deepEqual(snapshot(h),before);
  }
  for(const options of [null,[],true,'all',{extra:true},{validateOnly:1},{validateOnly:'true'}]){
    assert.throws(()=>report(h,'all',options));assert.deepEqual(snapshot(h),before);
  }
  assert.throws(()=>GameConfig.cancelPowerEffects({},'all'));
});

test('Angry Mob cancellation follows provenance across lists and Object.assign clones, not anger alone',()=>{
  const h=fixture(),g=h.game;cast(h,0);const summoned=soldiers(h),source=summoned[0];
  const trained=g.bbAddPerson(g.bbunits[0]),manual=g.bbAddPerson(g.bbunits[4]);manual.bbAnger();
  const clone=Object.assign(new h.port.bb_Person(),source);
  g.bbpeople.bbRemove(source);g.bbzombies.bbAddLast(clone);
  g.bbpeople.bbRemove(summoned[1]);g.bbpombies.bbAddLast(summoned[1]);
  const before=stable(h),baseHP=[g.bbpeoplebase.bbhealth,g.bbzombiebase.bbhealth];
  assert.deepEqual(report(h,0),{...ZERO,actors:16});
  assert.deepEqual(soldiers(h),[trained,manual]);
  assert.deepEqual(entries(g.bbzombies),[g.bbzombiebase]);assert.deepEqual(entries(g.bbpombies),[]);
  assert.deepEqual([g.bbpeoplebase.bbhealth,g.bbzombiebase.bbhealth],baseHP);
  assert.deepEqual(stable(h),before);assert.deepEqual(report(h,0),ZERO);
});

test('harvester cancellation removes only harvesters and its selected charge',()=>{
  const h=fixture(),g=h.game;castAll(h);const angry=soldiers(h),jets=entries(g.bbpowerups).filter(p=>p.bbtype===2);
  g.bbpowers[0].bbbusy=11;g.bbpowers[1].bbbusy=22;g.bbpowers[2].bbbusy=33;
  const cooldowns=Array.from(g.bbpowers,p=>p.bbcooldown),before=stable(h);
  assert.deepEqual(report(h,1),{...ZERO,powerups:1,charging:1});
  assert.deepEqual(entries(g.bbpowerups),jets);assert.deepEqual(soldiers(h),angry);
  assert.deepEqual(Array.from(g.bbpowers,p=>p.bbbusy),[11,0,33]);
  assert.deepEqual(Array.from(g.bbpowers,p=>p.bbcooldown),cooldowns);assert.deepEqual(stable(h),before);
});

test('airstrike cancellation preserves bomber bottles, harvesters, troops and corpse projectiles',()=>{
  const h=fixture(),g=h.game;castAll(h);
  g.bbAddBottle(0,100,-100,0,0,0);g.bbAddBottle(0,200,-100,0,0,1);g.bbAddFling(2,500,0);
  const bomber=entries(g.bbbottles)[0],harvester=entries(g.bbpowerups).find(p=>p.bbtype===1),angry=soldiers(h),flings=entries(g.bbflinglist),before=stable(h);
  assert.deepEqual(report(h,2),{...ZERO,powerups:3,projectiles:1});
  assert.deepEqual(entries(g.bbbottles),[bomber]);assert.deepEqual(entries(g.bbpowerups),[harvester]);
  assert.deepEqual(entries(g.bbflinglist),flings);assert.deepEqual(soldiers(h),angry);assert.deepEqual(stable(h),before);
  assert.deepEqual(report(h,2),ZERO);
});

test('airstrike cancellation removes only explosion visuals tagged by the real bomb impact loop',()=>{
  const h=fixture(),g=h.game;
  g.bbAddBottle(0,-1000,1,0,0,0);g.bbAddBottle(0,-2000,1,0,0,1);
  const unrelated=new h.port.bb_Explosion().bbExplosion_new(0,h.port.bb_Cell.bbcells(g.bbexplosionsheet),-3000,0,1);
  g.bbexplosions.bbAddLast(unrelated);h.ticks();
  assert.equal(entries(g.bbbottles).length,0);assert.equal(entries(g.bbexplosions).length,3);
  const before=stable(h);assert.deepEqual(report(h,2),{...ZERO,explosions:1});
  const remaining=entries(g.bbexplosions);assert.equal(remaining.length,2);assert.ok(remaining.includes(unrelated));
  assert.ok(remaining.some(e=>e.bbxpos===-1000));assert.deepEqual(stable(h),before);
});

test('all/default cancellation clears all three skills but leaves normal troops, bases and bomber shots',()=>{
  for(const id of ['all',undefined]){
    const h=fixture(),g=h.game;castAll(h);const normal=g.bbAddPerson(g.bbunits[3]);
    g.bbAddBottle(0,100,-100,0,0,0);g.bbAddBottle(0,200,-100,0,0,1);const bomber=entries(g.bbbottles)[0];
    for(const power of g.bbpowers)power.bbbusy=7;
    const before=stable(h),cooldowns=Array.from(g.bbpowers,p=>p.bbcooldown);
    assert.deepEqual(report(h,id),{...ZERO,actors:16,powerups:4,projectiles:1,charging:3});
    assert.deepEqual(soldiers(h),[normal]);assert.deepEqual(entries(g.bbzombies),[g.bbzombiebase]);
    assert.deepEqual(entries(g.bbpowerups),[]);assert.deepEqual(entries(g.bbbottles),[bomber]);
    assert.deepEqual(Array.from(g.bbpowers,p=>p.bbbusy),[0,0,0]);assert.deepEqual(Array.from(g.bbpowers,p=>p.bbcooldown),cooldowns);
    assert.deepEqual(stable(h),before);assert.deepEqual(report(h,id),ZERO);
  }
});

test('validateOnly returns the same cancellation report without mutating pending work, nodes, actors or charges',()=>{
  const c=defaults();c.powers[0].effect.shovelCount=100;c.powers[0].effect.shotgunCount=0;
  const h=fixture(c),g=h.game;cast(h,0);cast(h,1);g.bbpowers[0].bbbusy=99;
  const before=snapshot(h),lists=[g.bbpeople,g.bbzombies,g.bbpombies,g.bbpowerups,g.bbbottles,g.bbexplosions];
  const dry=report(h,'all',{validateOnly:true});assert.deepEqual(dry,{...ZERO,pending:68,actors:32,powerups:1,charging:1});
  assert.deepEqual(snapshot(h),before);assert.deepEqual([g.bbpeople,g.bbzombies,g.bbpombies,g.bbpowerups,g.bbbottles,g.bbexplosions],lists);
  assert.deepEqual(report(h,'all'),dry);assert.equal(GameConfig.getPowerProgress(h.target).pendingTotal,0);
});

test('huge pending counts cancel by compact groups and dead summons award no XP, cash or population refund',()=>{
  const c=defaults();for(const key of ['shovelCount','shotgunCount','survivalistCount','bomberCount','preacherCount'])c.powers[0].effect[key]=LIMIT;
  const h=fixture(c),g=h.game;cast(h,0);
  for(const body of soldiers(h)){body.bbhealth=0;body.bbmode=14;}
  const before=stable(h);assert.deepEqual(report(h,0),{...ZERO,pending:5*LIMIT-32,actors:32});
  assert.deepEqual(stable(h),before);assert.equal(GameConfig.getPowerProgress(h.target).pendingTotal,0);assert.deepEqual(soldiers(h),[]);
  const stats=[g.bbztp.bbxp,g.bbztp.bbcash,g.bbztp.bbforce,g.bbkinlost,g.bbzombieskilled];h.ticks();
  assert.deepEqual([g.bbztp.bbxp,g.bbztp.bbcash,g.bbztp.bbforce,g.bbkinlost,g.bbzombieskilled],stats);
});

test('pending cancellation distinguishes survivalist type 2 from airstrike type 2 and preserves the other source',()=>{
  for(const selected of [0,2]){
    const c=defaults();Object.assign(c.powers[0].effect,{shovelCount:0,shotgunCount:0,survivalistCount:LIMIT});c.powers[2].effect.jetCount=LIMIT;
    const h=fixture(c),g=h.game;cast(h,0);cast(h,2);
    assert.equal(soldiers(h).length,64);assert.equal(entries(g.bbpowerups).length,0);
    assert.deepEqual(GameConfig.getPowerProgress(h.target).groups.map(group=>[group.type,group.source]),[[2,'angry-mob'],[2,'airstrike']]);
    const before=stable(h);
    assert.deepEqual(report(h,selected),{...ZERO,pending:selected===0?LIMIT-64:LIMIT,actors:selected===0?64:0});
    assert.deepEqual(stable(h),before);
    const pending=GameConfig.getPowerProgress(h.target);assert.equal(pending.groups.length,1);
    assert.equal(pending.groups[0].source,selected===0?'airstrike':'angry-mob');
    assert.equal(pending.pendingTotal,selected===0?LIMIT:LIMIT-64);
    h.ticks();assert.equal(GameConfig.getPowerProgress(h.target).pendingTotal,pending.pendingTotal-32);
    assert.equal(selected===0?entries(g.bbpowerups).length:soldiers(h).length,selected===0?32:96);
  }
});

test('charging-only cancellation works during native pause, keeps cooldowns and never refunds XP',()=>{
  const h=fixture(),g=h.game;
  for(const power of g.bbpowers){power.bbbusy=100+power.bbtype;power.bbcooldown=500+power.bbtype;}
  g.bbunits[0].bborders=3;g.bbunits[0].bbbusy=7;g.bbPauseGame();
  const before=stable(h),cooldowns=Array.from(g.bbpowers,p=>p.bbcooldown);
  assert.deepEqual(report(h,1),{...ZERO,charging:1});assert.equal(g.bbmainState,6);
  assert.deepEqual(Array.from(g.bbpowers,p=>p.bbbusy),[100,0,102]);assert.deepEqual(Array.from(g.bbpowers,p=>p.bbcooldown),cooldowns);
  assert.deepEqual(stable(h),before);
});

test('frozen selected actor, charge, list field, sentinel and node links reject both dry and real cancellation atomically',()=>{
  const freezeCases={
    actor:g=>Object.defineProperty(soldiers({game:g})[0],'bbhealth',{writable:false}),
    charge:g=>Object.defineProperty(g.bbpowers[1],'bbbusy',{writable:false}),
    listField:g=>Object.defineProperty(g,'bbpeople',{writable:false}),
    listHead:g=>Object.defineProperty(g.bbpeople,'bb_head',{writable:false}),
    sentinel:g=>Object.freeze(g.bbpeople.bb_head),
    selectedNode:g=>Object.freeze(g.bbpeople.bb_head.bb_succ.bb_succ),
    neighborNode:g=>Object.freeze(g.bbpeople.bb_head.bb_succ)
  };
  for(const [name,freeze] of Object.entries(freezeCases))for(const validateOnly of [true,false]){
    const c=defaults();c.powers[0].effect.shovelCount=100;c.powers[0].effect.shotgunCount=0;
    const h=fixture(c),g=h.game;cast(h,0);cast(h,1);g.bbpowers[1].bbbusy=77;g.bbPauseGame();freeze(g);
    const before=snapshot(h),people=entries(g.bbpeople),powerups=entries(g.bbpowerups);
    assert.throws(()=>report(h,'all',{validateOnly}),/writ|不可写|read.only/i,name+' dry='+validateOnly);
    assert.deepEqual(snapshot(h),before,name+' must preserve every state field');
    assert.deepEqual(entries(g.bbpeople),people);assert.deepEqual(entries(g.bbpowerups),powerups);
  }
});

test('unselected frozen actor fields do not block a scoped cancellation',()=>{
  const h=fixture(),g=h.game;cast(h,0);const normal=g.bbAddPerson(g.bbunits[0]);
  Object.freeze(normal);Object.freeze(g.bbpeoplebase);Object.freeze(g.bbzombiebase);
  assert.deepEqual(report(h,0),{...ZERO,actors:16});assert.deepEqual(soldiers(h),[normal]);
  assert.deepEqual(entries(g.bbzombies),[g.bbzombiebase]);
});

test('expanded power progress is exact, detached, strictly optional and selectively updates after cancellation',()=>{
  const c=defaults();c.powers[0].effect.shovelCount=64;c.powers[0].effect.shotgunCount=0;
  const h=fixture(c),g=h.game;
  // Create one genuinely airstrike-tagged explosion before pending dispatches,
  // then add vehicles before the mob so its remaining 32 stay queued.
  g.bbAddBottle(0,-2000,1,0,0,1);h.ticks();cast(h,2);cast(h,1);cast(h,0);
  g.bbAddPerson(g.bbunits[0]);g.bbAddBottle(0,600,-100,0,0,1);g.bbAddBottle(0,700,-100,0,0,0);
  for(const power of g.bbpowers)power.bbbusy=10;
  const defaultProgress={pendingTotal:32,groups:[{type:0,count:32,source:'angry-mob'}]};
  const byPower=[
    {id:0,...ZERO,pending:32,actors:32,charging:1},
    {id:1,...ZERO,powerups:1,charging:1},
    {id:2,...ZERO,powerups:3,projectiles:1,explosions:1,charging:1}
  ];
  const expected={...defaultProgress,byPower,activeTotal:38},before=snapshot(h);
  assert.deepEqual(GameConfig.getPowerProgress(h.target),defaultProgress);
  assert.deepEqual(GameConfig.getPowerProgress(h.target,{}),defaultProgress);
  assert.deepEqual(GameConfig.getPowerProgress(h.target,{includeActive:false}),defaultProgress);
  const expanded=GameConfig.getPowerProgress(h.target,{includeActive:true});assert.deepEqual(expanded,expected);
  assert.equal(expanded.activeTotal,expanded.byPower.reduce((sum,p)=>sum+p.actors+p.powerups+p.projectiles+p.explosions,0));
  expanded.byPower[0].actors=-1;expanded.byPower[2].projectiles=0;expanded.byPower.push({id:9});expanded.groups[0].count=0;
  assert.deepEqual(GameConfig.getPowerProgress(h.target,{includeActive:true}),expected);
  for(const options of [null,[],{includeActive:'true'},{includeActive:1},{unknown:true}]){
    assert.throws(()=>GameConfig.getPowerProgress(h.target,options));assert.deepEqual(snapshot(h),before);
  }
  assert.deepEqual(snapshot(h),before,'all progress reads and detached edits leave the game untouched');
  assert.deepEqual(report(h,1),{...ZERO,powerups:1,charging:1});
  const after=GameConfig.getPowerProgress(h.target,{includeActive:true});
  assert.deepEqual(after.byPower[0],byPower[0]);assert.deepEqual(after.byPower[1],{id:1,...ZERO});assert.deepEqual(after.byPower[2],byPower[2]);
  assert.equal(after.activeTotal,37);assert.deepEqual(GameConfig.getPowerProgress(h.target),defaultProgress);
});
