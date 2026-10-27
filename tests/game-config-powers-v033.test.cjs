'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const GameConfig = require('../src/game-config.js');
const CustomRules = require('../src/custom-rules.js');
const root = path.resolve(__dirname,'..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const json = name => JSON.parse(read(name));
const plain = value => JSON.parse(JSON.stringify(value));
const COUNT_LIMIT = 2147483647;
const COUNT_KEYS = ['shovelCount','shotgunCount','survivalistCount','bomberCount','preacherCount'];
function defaults() {
  return GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels']
    .map(kind => [kind,json('config/'+kind+'.json')])));
}
function entries(list) {
  const result=[],iterator=list.bbObjectEnumerator();
  while(iterator.bbHasNext())result.push(iterator.bbNextObject());
  return result;
}
// Only platform I/O is stubbed: all actors, sprites, power dispatch, game ticks,
// list operations, random draws and resets are the actual generated game.
function fixture(configuration=defaults(), options={}) {
  const manifest=json('public/assets/manifest.json');
  const drawing=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){
    const image=manifest.images[name];assert.ok(image,name);
    return {Width:()=>image.width,Height:()=>image.height};
  }},{get:(o,k)=>o[k]||(()=>0)});
  const input=new Proxy({},{get:()=>()=>0});
  const audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
  class App {
    GraphicsDevice(){return drawing;}InputDevice(){return input;}AudioDevice(){return audio;}
    SetUpdateRate(){return 0;}MilliSecs(){return 0;}
  }
  const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class {},ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,
    PlayMovie:()=>0,MovieFinished:()=>1,EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0});
  vm.runInContext(read('src/generated-game.js'),target);
  if(options.configured!==false)GameConfig.install(target,configuration);
  if(options.rules!==false){const rules=CustomRules.defaults();rules.automaticSpawning=false;CustomRules.install(target,rules);}
  target.bb_Init();target.bb_Main();
  const port=target.ZTPGamePort,device=port.state.bb_mojo_app_device;
  device.OnCreate();device.OnUpdate();const game=port.state.bb_Game;game.bbPlayGame(1);
  return {target,port,game,ticks(n=1){while(n-->0)game.bbGameTick(0);}};
}
function soldiers(h){return entries(h.game.bbpeople).filter(p=>p!==h.game.bbpeoplebase);}
function configWithCounts(...counts){const c=defaults();COUNT_KEYS.forEach((key,i)=>c.powers[0].effect[key]=counts[i]||0);return c;}
function progress(h){return GameConfig.getPowerProgress(h.target);}
function castMob(h){h.game.bbAddPower(h.game.bbpowers[0]);}
function fillActorCapacity(h) {
  // Capacity accounting counts list slots. Keep seven independent original
  // actors for the subsequent slot-release test, then use a native inactive
  // actor reference for the remaining slots. No attack/update is stubbed and
  // this does not pretend to benchmark 9,998 independently fighting troops.
  const g=h.game;
  for(let i=0;i<8;i++){const body=g.bbAddPerson(g.bbunits[0]);assert.ok(body);body.bbmode=16;}
  const filler=entries(g.bbpeople).at(-1),count=CustomRules.getEntityCapacity(h.target);
  for(let i=0;i<count;i++)g.bbpeople.bbAddLast(filler);
}

test('v0.3.3 Angry Mob accepts five int32 counts and legacy absent extras mean zero',()=>{
  const legacy=defaults();for(const key of COUNT_KEYS.slice(2))delete legacy.powers[0].effect[key];
  const validated=GameConfig.validate(legacy);
  for(const key of COUNT_KEYS.slice(2)){
    assert.equal(validated.powers[0].effect[key]||0,0);
    assert.equal(key in validated.powers[0].effect,false,'legacy source fingerprint keeps absent '+key+' absent');
  }
  const c=configWithCounts(COUNT_LIMIT,COUNT_LIMIT,COUNT_LIMIT,COUNT_LIMIT,COUNT_LIMIT);
  c.powers[2].effect.jetCount=COUNT_LIMIT;
  const result=GameConfig.validate(c);
  for(const key of COUNT_KEYS)assert.equal(result.powers[0].effect[key],COUNT_LIMIT);
  assert.equal(result.powers[2].effect.jetCount,COUNT_LIMIT);
  const h=fixture(legacy);castMob(h);assert.equal(soldiers(h).length,16);
  assert.deepEqual(soldiers(h).map(p=>p.bbunit.bbtype),[...Array(12).fill(0),...Array(4).fill(1)]);
  assert.equal(progress(h).pendingTotal,0);
});

test('v0.3.3 power counts remain strict finite nonnegative integers',()=>{
  for(const key of COUNT_KEYS)for(const value of [-1,1.5,'2',NaN,Infinity,COUNT_LIMIT+1]){
    const c=defaults();c.powers[0].effect[key]=value;
    assert.throws(()=>GameConfig.validate(c),new RegExp('powers\\[0\\]\\.effect\\.'+key),key+'='+value);
  }
  for(const value of [-1,1.5,'2',NaN,Infinity,COUNT_LIMIT+1]){
    const c=defaults();c.powers[2].effect.jetCount=value;
    assert.throws(()=>GameConfig.validate(c),/powers\[2\]\.effect\.jetCount/);
  }
});

test('v0.3.3 default dispatch is bytecode-baseline equivalent in actors, RNG and effects',()=>{
  function view(h){const g=h.game;return plain({
    people:entries(g.bbpeople).map(p=>({type:p.bbunit.bbtype,layer:p.bblayer,x:p.bbxpos,y:p.bbypos,speed:p.bbwalkspeed,angry:p.bbisangry,health:p.bbhealth})),
    effects:entries(g.bbpowerups).map(p=>({type:p.bbtype,layer:p.bblayer,x:p.bbxpos,y:p.bbypos,speed:p.bbwalkspeed,mode:p.bbmode})),
    powers:Array.from(g.bbpowers,p=>[p.bbcooldown,p.bbcooltime]),seed:h.port.state.bb_std_random_Seed});}
  for(const type of [0,1,2]){
    const original=fixture(undefined,{configured:false,rules:false}),configured=fixture(undefined,{rules:false});
    for(const h of [original,configured]){h.port.setRandomSeed(77);h.game.bbAddPower(h.game.bbpowers[type]);}
    assert.deepEqual(view(configured),view(original),'power '+type);
  }
});

test('v0.3.3 Angry Mob actually produces all five friendly classes with their sprites and anger',()=>{
  const c=configWithCounts(1,1,1,1,1);c.powers[0].effect.angerSpeedMultiplier=2.25;
  const h=fixture(c),g=h.game;castMob(h);const people=soldiers(h);
  assert.deepEqual(people.map(p=>p.bbunit.bbtype),[0,1,2,3,4]);
  const sheets=[g.bbshovelman,g.bbshotgunman,g.bbtrucksheet,g.bbbombersheet,g.bbpreachersheet];
  for(const p of people){const id=p.bbunit.bbtype;
    assert.equal(p.bbunit,g.bbunits[id]);assert.equal(p.bbskin.bbsheet,sheets[id]);
    assert.equal(p.bbisangry,1);assert.equal(p.bbwalkspeed,c.units[id].moveSpeed*2.25);
    assert.equal(p.bbhealth,c.units[id].health);
  }
  assert.equal(progress(h).pendingTotal,0);
});

test('v0.3.3 a billion-scale mob allocates at most 32 immediately and 32 per game tick',()=>{
  const h=fixture(configWithCounts(COUNT_LIMIT)),g=h.game;castMob(h);
  assert.equal(soldiers(h).length,32);
  assert.deepEqual(plain(progress(h)),{pendingTotal:COUNT_LIMIT-32,groups:[{type:0,count:COUNT_LIMIT-32,source:'angry-mob'}]});
  const detached=progress(h);detached.pendingTotal=0;detached.groups[0].count=0;
  assert.equal(progress(h).pendingTotal,COUNT_LIMIT-32,'progress is a detached snapshot');
  h.ticks();assert.equal(soldiers(h).length,64);assert.equal(progress(h).pendingTotal,COUNT_LIMIT-64);
  h.ticks(2);assert.equal(soldiers(h).length,128);assert.equal(progress(h).pendingTotal,COUNT_LIMIT-128);
  assert.equal(g.bbpowers[0].bbcooldown,g.bbpowers[0].bbcooltime-3);
});

test('v0.3.3 mixed pending groups retain each type and drain across dispatch boundaries',()=>{
  const h=fixture(configWithCounts(35,35,35,35,35));castMob(h);
  assert.deepEqual(plain(progress(h)),{pendingTotal:143,groups:[
    {type:0,count:3,source:'angry-mob'},...Array.from({length:4},(_,i)=>({type:i+1,count:35,source:'angry-mob'}))]});
  for(let i=0;i<5;i++){
    const before=soldiers(h).length;h.ticks();assert.ok(soldiers(h).length-before<=32);
  }
  assert.equal(progress(h).pendingTotal,0);assert.equal(soldiers(h).length,175);
  for(let type=0;type<5;type++)assert.equal(soldiers(h).filter(p=>p.bbunit.bbtype===type).length,35);
});

test('v0.3.3 total pending counts stay exact when all five types exceed the int32 total',()=>{
  const h=fixture(configWithCounts(...Array(5).fill(COUNT_LIMIT)));castMob(h);
  assert.equal(soldiers(h).length,32);assert.equal(progress(h).pendingTotal,5*COUNT_LIMIT-32);
  assert.equal(progress(h).groups.length,5);
  h.ticks();assert.equal(progress(h).pendingTotal,5*COUNT_LIMIT-64);
});

test('v0.3.3 simultaneous completed power charges share the 32-object tick budget',()=>{
  const c=configWithCounts(70);c.powers[2].effect.jetCount=70;
  const h=fixture(c),g=h.game;
  g.bbpowers[0].bbbusy=1;g.bbpowers[2].bbbusy=1;
  h.ticks();assert.equal(soldiers(h).length+entries(g.bbpowerups).length,32);
  assert.equal(progress(h).pendingTotal,108);
  h.ticks();assert.equal(soldiers(h).length+entries(g.bbpowerups).length,64);
  assert.equal(progress(h).pendingTotal,76);
});

test('v0.3.3 an airstrike count above 1000 queues rather than blocking the game',()=>{
  const c=configWithCounts(0);c.powers[2].effect.jetCount=COUNT_LIMIT;
  const h=fixture(c),g=h.game;g.bbAddPower(g.bbpowers[2]);
  assert.equal(entries(g.bbpowerups).length,32);
  assert.deepEqual(plain(progress(h)),{pendingTotal:COUNT_LIMIT-32,groups:[{type:2,count:COUNT_LIMIT-32,source:'airstrike'}]});
  h.ticks();assert.equal(entries(g.bbpowerups).length,64);assert.equal(progress(h).pendingTotal,COUNT_LIMIT-64);
});

test('v0.3.3 a full effect field retains airstrike requests and does not consume RNG',()=>{
  const c=configWithCounts(0);c.powers[2].effect.jetCount=80;
  const h=fixture(c),g=h.game;
  for(let i=0;i<1000;i++)g.bbpowerups.bbAddLast(new h.port.bb_PowerUp().bbPowerUp_new(0,2,g.bbjetsheet,null));
  h.port.setRandomSeed(321);const before=h.port.state.bb_std_random_Seed;
  g.bbAddPower(g.bbpowers[2]);assert.equal(entries(g.bbpowerups).length,1000);
  assert.equal(progress(h).pendingTotal,80);assert.equal(h.port.state.bb_std_random_Seed,before);
  for(const power of entries(g.bbpowerups).slice(0,3))g.bbpowerups.bbRemove(power);
  h.ticks();assert.equal(entries(g.bbpowerups).length,1000);assert.equal(progress(h).pendingTotal,77);
});

test('v0.3.3 full field retains summoned units without RNG loss and drains after capacity is freed',()=>{
  const h=fixture(configWithCounts(80)),g=h.game;
  fillActorCapacity(h);
  assert.equal(CustomRules.getEntityCapacity(h.target),0);
  h.port.setRandomSeed(123);const before=h.port.state.bb_std_random_Seed;castMob(h);
  assert.equal(h.port.state.bb_std_random_Seed,before,'no random draw for a summon that cannot be created yet');
  assert.equal(progress(h).pendingTotal,80);assert.equal(soldiers(h).length,CustomRules.ENTITY_LIMIT-2);
  h.ticks();assert.equal(progress(h).pendingTotal,80,'a capped tick must not discard requested summons');
  for(const person of soldiers(h).slice(0,7))g.bbpeople.bbRemove(person);
  assert.equal(CustomRules.getEntityCapacity(h.target),7);
  h.ticks();assert.equal(CustomRules.getEntityCapacity(h.target),0);assert.equal(progress(h).pendingTotal,73);
  assert.equal(soldiers(h).filter(p=>p.bbisangry).length,7);
});

test('v0.3.3 a blocked huge mob must not starve an airstrike with available effect capacity',()=>{
  const c=configWithCounts(COUNT_LIMIT),h=fixture(c),g=h.game;
  fillActorCapacity(h);
  const control=fixture(c);control.port.setRandomSeed(4321);control.game.bbAddPower(control.game.bbpowers[2]);
  h.port.setRandomSeed(4321);const before=h.port.state.bb_std_random_Seed;castMob(h);
  assert.equal(progress(h).pendingTotal,COUNT_LIMIT);assert.equal(h.port.state.bb_std_random_Seed,before);
  g.bbAddPower(g.bbpowers[2]);
  assert.equal(soldiers(h).length,CustomRules.ENTITY_LIMIT-2);assert.equal(entries(g.bbpowerups).length,3);
  assert.deepEqual(plain(progress(h)),{pendingTotal:COUNT_LIMIT,groups:[{type:0,count:COUNT_LIMIT,source:'angry-mob'}]});
  assert.equal(h.port.state.bb_std_random_Seed,control.port.state.bb_std_random_Seed,
    'blocked mob consumes no RNG; only the three admitted jets do');
});

test('v0.3.3 blocked huge airstrike work must not starve an Angry Mob with available actor capacity',()=>{
  const c=configWithCounts(12,4);c.powers[2].effect.jetCount=COUNT_LIMIT;
  const h=fixture(c),g=h.game;
  for(let i=0;i<1000;i++)g.bbpowerups.bbAddLast(new h.port.bb_PowerUp().bbPowerUp_new(0,2,g.bbjetsheet,null));
  const control=fixture(c);control.port.setRandomSeed(7654);castMob(control);
  h.port.setRandomSeed(7654);const before=h.port.state.bb_std_random_Seed;g.bbAddPower(g.bbpowers[2]);
  assert.equal(progress(h).pendingTotal,COUNT_LIMIT);assert.equal(h.port.state.bb_std_random_Seed,before);
  castMob(h);
  assert.equal(soldiers(h).length,16);assert.equal(entries(g.bbpowerups).length,1000);
  assert.deepEqual(soldiers(h).map(p=>p.bbunit.bbtype),[...Array(12).fill(0),...Array(4).fill(1)]);
  assert.deepEqual(plain(progress(h)),{pendingTotal:COUNT_LIMIT,groups:[{type:2,count:COUNT_LIMIT,source:'airstrike'}]});
  assert.equal(h.port.state.bb_std_random_Seed,control.port.state.bb_std_random_Seed,
    'blocked jets consume no RNG; only the sixteen admitted soldiers do');
});

test('v0.3.3 reset discards old pending requests, and zero-count casts do not create actors',()=>{
  const h=fixture(configWithCounts(100)),g=h.game;castMob(h);assert.equal(progress(h).pendingTotal,68);
  g.bbResetGame(1);assert.equal(progress(h).pendingTotal,0);assert.equal(soldiers(h).length,0);
  h.ticks(2);assert.equal(soldiers(h).length,0,'old queued summons must not leak into the next match');
  GameConfig.updateLive(h.target,configWithCounts(0));
  const before=h.port.state.bb_std_random_Seed;castMob(h);
  assert.equal(soldiers(h).length,0);assert.equal(progress(h).pendingTotal,0);
  assert.equal(h.port.state.bb_std_random_Seed,before);
  GameConfig.updateLive(h.target,configWithCounts(0,0,0,0,3));castMob(h);
  assert.deepEqual(soldiers(h).map(p=>p.bbunit.bbtype),[4,4,4]);
});
