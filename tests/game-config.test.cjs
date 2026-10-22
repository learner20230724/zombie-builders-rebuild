'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const GameConfig = require('../src/game-config.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const json = file => JSON.parse(read(file));
const documents = () => Object.fromEntries(['units','zombies','buildings','powers','levels'].map(kind => [kind,json('config/'+kind+'.json')]));
const defaults = () => GameConfig.fromDocuments(documents());
const plain = value => JSON.parse(JSON.stringify(value));
function entries(list) {
  const result = [], iterator = list.bbObjectEnumerator();
  while (iterator.bbHasNext()) result.push(iterator.bbNextObject());
  return result;
}

// Self-contained port-only fixture: only platform display/audio/storage/input
// are substituted. No ABC, Flash, native execution, or strategy simulation.
function fixture(config) {
  const manifest = json('public/assets/manifest.json'), draws = [];
  const drawing = new Proxy({
    Width: () => 800, Height: () => 600,
    LoadSurface(name) { const image=manifest.images[name]; assert.ok(image,name); return {Width:()=>image.width,Height:()=>image.height}; }
  },{get:(target,key)=>target[key] || ((...args)=>{draws.push([key,...args]);return 0;})});
  const input = new Proxy({}, {get:()=>()=>0});
  const audio = {LoadSample:name=>({name}),PlaySample:sample=>({sample}),StopChannel:()=>0};
  class App {
    GraphicsDevice(){return drawing;} InputDevice(){return input;} AudioDevice(){return audio;}
    SetUpdateRate(){return 0;} MilliSecs(){return 0;}
  }
  const context = vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class {},
    ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,PlayMovie:()=>0,MovieFinished:()=>1,
    EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,
    MochiState:()=>0,Redirect:()=>0});
  vm.runInContext(read('src/generated-game.js'),context);
  if (config) GameConfig.install(context,config);
  function start(usePort=false) {
    (usePort ? context.ZTPGamePort.bb_Init : context.bb_Init)();
    context.bb_Main();
    const device=context.ZTPGamePort.state.bb_mojo_app_device;
    device.OnCreate(); device.OnUpdate();
    return context.ZTPGamePort.state.bb_Game;
  }
  let game=start();
  return {context,draws,get game(){return game;},restart(usePort){game=start(usePort);return game;},
    ticks(count=1){for(let i=0;i<count;i++) game.bbGameTick(0);}};
}
function queue(h) {
  const mob=h.context.ZTPGamePort.bb_ZombieMob;
  return {ticks:mob.bbticks,queue:entries(mob.bbqueue).map(item=>({type:item.bbtype,count:item.bbcount,delay:item.bbdelay,time:item.bbtime})),
    healthMarker:h.game.bbzombiehealth,health:h.game.bbzombiebase.bbhealth,
    zombies:entries(h.game.bbzombies).map(z=>({type:z.bbunit.bbtype,x:z.bbxpos,health:z.bbhealth})),
    random:h.context.ZTPGamePort.state.bb_std_random_Seed};
}

test('all default compiled raw cells exactly match the recovered baseline',()=>{
  const compiled=GameConfig.compile(defaults()), raw=json('data/raw.json');
  assert.equal(Object.keys(compiled.raw).length,18);
  for(const [key,value] of Object.entries(compiled.raw)) assert.deepEqual(value,raw[key],key);
  assert.equal(compiled.reinforcements.flat().length,12);
  assert.deepEqual(compiled.config.units.map(u=>u.id),[0,1,2,3,4,5]);
  assert.ok(Object.isFrozen(compiled.config.units[0]));
  assert.ok(Object.isFrozen(compiled.raw.bb_data_unitdata));
  assert.throws(()=>compiled.config.units[0].cost=999,TypeError);
});

test('plain browser script and CommonJS support cross-realm documents',()=>{
  const context=vm.createContext({}); vm.runInContext(read('src/game-config.js'),context);
  assert.equal(typeof context.GameConfig.install,'function');
  assert.deepEqual(plain(context.GameConfig.fromDocuments(documents())),defaults());
});

test('strict validation reports JSON paths for malformed or inconsistent configuration',()=>{
  const invalid=[
    [c=>c.units[0].coast=5,/\$\.units\[0\]\.coast: unknown field/],
    [c=>c.units[0].health='5',/\$\.units\[0\]\.health: expected a finite integer/],
    [c=>c.units[0].health=NaN,/\$\.units\[0\]\.health/],
    [c=>c.units[0].health=0,/\$\.units\[0\]\.health/],
    [c=>c.units[1].id=0,/\$\.units\[1\]\.id: duplicate id/],
    [c=>c.zombies[0].type=0,/\$\.zombies\[0\]\.type: fixed runtime type/],
    [c=>c.units[0].speed=99,/\$\.units\[0\]\.speed: unknown field/],
    [c=>c.units[0].targets=4,/\$\.units\[0\]\.targets: unknown field/],
    [c=>c.zombies[0].cost=5,/\$\.zombies\[0\]\.cost: unknown field/],
    [c=>c.zombies[4].damage=5,/\$\.zombies\[4\]\.damage: unknown field/],
    [c=>c.units[0].dependency=6,/\$\.units\[0\]\.dependency/],
    [c=>c.units[0].people=0,/\$\.units\[0\]\.people/],
    [c=>c.buildings[0].maximum=16,/\$\.buildings\[0\]\.maximum/],
    [c=>{c.buildings[2].dependency=3;c.buildings[3].dependency=2;},/cyclic building prerequisites/],
    [c=>c.units[1].key=c.units[0].key,/\$\.units\[1\]\.key: duplicate key/],
    [c=>c.powers[2].unlockAfterStage=5,/\$\.powers\[2\]\.unlockAfterStage/],
    [c=>c.powers[1].effect.moveSpeed=Infinity,/\$\.powers\[1\]\.effect\.moveSpeed/],
    [c=>c.powers[2].effect.bombDamage=99,/\$\.powers\[2\]\.effect\.bombDamage: unknown field/],
    [c=>c.levels[0].waves[0].type=6,/\$\.levels\[0\]\.waves\[0\]\.type/],
    [c=>c.levels[0].waves[0].count=0,/\$\.levels\[0\]\.waves\[0\]\.count/],
    [c=>c.levels[0].waves[0].delay=-1,/\$\.levels\[0\]\.waves\[0\]\.delay/],
    [c=>c.levels[0].reinforcements[0].threshold=16000,/\$\.levels\[0\]\.reinforcements\[0\]\.threshold/],
    [c=>c.levels[0].reinforcements[1].threshold=13000,/duplicate health threshold/],
    [c=>c.levels[0].reinforcements[0].calls[0].type=0,/\.calls\[0\]\.type/],
    [c=>{c.zombies[0].health=100000000;c.levels[0].zombieHealthMultiplier=22;},/\$\.levels\[0\]\.zombieHealthMultiplier: effective health overflows/],
    [c=>{c.zombies[0].damage=100000000;c.levels[0].zombieDamageMultiplier=22;},/\$\.levels\[0\]\.zombieDamageMultiplier: effective damage overflows/],
    [c=>c.units.pop(),/\$\.units: expected an array/]
  ];
  for(const [change,error] of invalid){const c=defaults();change(c);assert.throws(()=>GameConfig.validate(c),error);}
  const docs=documents();docs.units.schemaVersion=2;
  assert.throws(()=>GameConfig.fromDocuments(docs),/\$documents\.units\.schemaVersion/);
  assert.throws(()=>GameConfig.validate({...defaults(),schemaVersion:2}),/\$\.schemaVersion/);
});

test('configured costs, exact ticks, speed, starting economy, bases and health UI take effect',()=>{
  const c=defaults();
  Object.assign(c.units[0],{cost:19,buildTicks:29,moveSpeed:1.25,health:91,damage:22});
  c.units[1].buildTicks=59;c.buildings[0].buildTicks=29;c.buildings[1].buildTicks=101;
  c.units[5].health=8000;c.zombies[5].health=20000;c.zombies[0].moveSpeed=2.25;
  c.levels[0].startingCash=321;c.levels[0].startingXp=654;
  const h=fixture(c),g=h.game;g.bbPlayGame(1);
  assert.equal(g.bbztp.bbcash,321);assert.equal(g.bbztp.bbxp,654);
  assert.equal(g.bbpeoplebase.bbhealth,8000);assert.equal(g.bbzombiebase.bbhealth,20000);
  assert.equal(g.bbunits[0].bbbuildtime,29);assert.equal(g.bbunits[1].bbbuildtime,59);
  assert.equal(g.bbbuildings[0].bbbuildtime,29);assert.equal(g.bbbuildings[1].bbbuildtime,101);
  const person=g.bbAddPerson(g.bbunits[0]);assert.equal(person.bbwalkspeed,1.25);assert.equal(person.bbhealth,91);
  assert.equal(g.bbAddZombie(g.bbzunits[0]).bbwalkspeed,2.25);
  g.bbBuyUnit(g.bbunits[0]);assert.equal(g.bbztp.bbcash,302);
  h.ticks(28);assert.equal(g.bbunits[0].bbbusy,1);h.ticks();assert.equal(g.bbunits[0].bbbusy,0);
  g.bbpeoplebase.bbhealth=4000;g.bbzombiebase.bbhealth=10000;
  const bars=[];g.bbblitrect4=(...args)=>bars.push(args);g.bbDrawHealth();
  assert.equal(bars[1][3],110);assert.equal(bars[3][3],110);
});

test('installation survives both global and port bb_Init reinitialization without stacked hooks',()=>{
  const c=defaults();c.units[0].cost=7;c.units[0].moveSpeed=0.75;c.powers[0].effect.angerSpeedMultiplier=2;
  const h=fixture(c);
  for(const viaPort of [false,true,false]){
    const g=h.restart(viaPort);g.bbPlayGame(1);assert.equal(g.bbunits[0].bbcost,7);
    const person=g.bbAddPerson(g.bbunits[0]);person.bbAnger();assert.equal(person.bbwalkspeed,1.5);
    assert.equal(h.context.bb_Init,h.context.ZTPGamePort.bb_Init);
  }
  assert.throws(()=>GameConfig.apply(h.context,c),/before bb_Main/);
  assert.throws(()=>GameConfig.install(h.context,c),/before bb_Main/);
  h.context.bb_Init();GameConfig.apply(h.context,c);h.context.bb_Main();
  assert.equal(h.context.bb_data_unitdata[0],7);
  const fresh=vm.createContext({gxtkApp:class {},gxtkSurfaceListener:class {}});
  vm.runInContext(read('src/generated-game.js'),fresh);
  assert.throws(()=>GameConfig.apply(fresh,c),/requires bb_Init first/);
});

test('powers use configured charge, cooldown, unlock and actual effect parameters',()=>{
  const c=defaults();
  for(const p of c.powers){p.xp=0;p.buildTicks=3;p.cooldownTicks=17;p.unlockAfterStage=0;}
  Object.assign(c.powers[0].effect,{shovelCount:2,shotgunCount:1,angerSpeedMultiplier:2});
  c.powers[1].effect.moveSpeed=1.3;Object.assign(c.powers[2].effect,{jetCount:2,moveSpeed:9});
  const h=fixture(c),g=h.game;g.bbPlayGame(1);
  assert.deepEqual(Array.from(g.bbpowers,p=>p.bblocked),[0,0,0]);
  const power=g.bbpowers[0];g.bbBuyPower(power);h.ticks(2);
  assert.equal(power.bbbusy,1);assert.equal(entries(g.bbpeople).filter(p=>p.bbisangry).length,0);
  h.ticks();const angry=entries(g.bbpeople).filter(p=>p.bbisangry);
  assert.equal(angry.length,3);assert.equal(power.bbcooldown,16);
  assert.equal(angry.filter(p=>p.bbunit.bbtype===0).length,2);
  assert.equal(angry.find(p=>p.bbunit.bbtype===0).bbwalkspeed,1);
  g.bbAddPower(g.bbpowers[1]);g.bbAddPower(g.bbpowers[2]);
  const effects=entries(g.bbpowerups);
  assert.equal(effects.filter(p=>p.bbtype===1).length,1);
  assert.equal(effects.find(p=>p.bbtype===1).bbwalkspeed,1.3);
  assert.equal(effects.filter(p=>p.bbtype===2).length,2);
  assert.ok(effects.filter(p=>p.bbtype===2).every(p=>p.bbwalkspeed===9));
  const locked=defaults();locked.powers[0].unlockAfterStage=4;
  const other=fixture(locked);other.game.bbPlayGame(1);assert.equal(other.game.bbpowers[0].bblocked,1);
  other.game.bbrecords[3]=123;other.game.bbResetGame(1);assert.equal(other.game.bbpowers[0].bblocked,0);
});

test('bomber projectileDamage changes real explosion damage, not air-strike bombs or base immunity',()=>{
  const c=defaults();c.units[3].projectileDamage=23;c.zombies[0].health=1000;
  const h=fixture(c),g=h.game;g.bbPlayGame(1);
  g.bbAddBottle(0,100,-1,0,0,0);g.bbAddBottle(0,100,-1,0,0,1);
  const [bottle,bomb]=entries(g.bbbottles);assert.equal(bottle.bbdamage,23);assert.equal(bomb.bbdamage,500);
  const zombie=g.bbAddZombie(g.bbzunits[0]);zombie.bbxpos=100;
  g.bbExplodeBottle(0,100,0,bottle.bbdamage);assert.equal(zombie.bbhealth,977);
  g.bbExplodeBottle(0,g.bbzombiebase.bbxpos,0,bomb.bbdamage);assert.equal(g.bbzombiebase.bbhealth,16000);
  const equal=defaults();equal.units[3].projectileDamage=500;
  const actual=fixture(equal);actual.game.bbPlayGame(1);
  actual.game.bbAddBottle(0,actual.game.bbzombiebase.bbxpos,1,0,0,0);actual.ticks();
  assert.equal(actual.game.bbzombiebase.bbhealth,15500,'bomber 500 still hits the enemy base');
  actual.game.bbAddBottle(0,actual.game.bbzombiebase.bbxpos,1,0,0,1);actual.ticks();
  assert.equal(actual.game.bbzombiebase.bbhealth,15500,'air-strike 500 still excludes the enemy base');
  actual.game.bbExplodeBottle(0,actual.game.bbzombiebase.bbxpos,1,500);
  assert.equal(actual.game.bbzombiebase.bbhealth,15500,'direct call does not inherit the consumed bomber source');
  const leaf=new actual.context.ZTPGamePort.bb_Bottle().bbBottle_new(0,actual.game.bbbottle,actual.game.bbzombiebase.bbxpos,1,0,0,0);
  leaf.bbUpdate(); // Outside the original loops, this is NOT explosion provenance.
  actual.game.bbExplodeBottle(0,leaf.bbxpos,leaf.bbypos,500);
  assert.equal(actual.game.bbzombiebase.bbhealth,15500,'standalone Update leaves no source tag');
  const idle=new actual.context.ZTPGamePort.bb_Bottle().bbBottle_new(0,actual.game.bbbottle,0,-100,0,0,0);
  idle.bbUpdate();actual.game.bbExplodeBottle(0,actual.game.bbzombiebase.bbxpos,1,500);
  assert.equal(actual.game.bbzombiebase.bbhealth,15500,'non-exploding updates leave no source tag');
  function putOneHealthBeforeBase(h){const game=h.game;game.bbztp.bbxp=0;
    game.bbzunits[0].bbhealth=1;const enemy=game.bbAddZombie(game.bbzunits[0]);enemy.bbxpos=game.bbzombiebase.bbxpos;
    game.bbzombies.bbRemove(game.bbzombiebase);game.bbzombies.bbAddLast(game.bbzombiebase);
  }
  const through=defaults();through.units[3].projectileDamage=501;
  const custom=fixture(through);custom.game.bbPlayGame(1);putOneHealthBeforeBase(custom);
  custom.game.bbAddBottle(0,custom.game.bbzombiebase.bbxpos,1,0,0,0);custom.ticks();
  assert.equal(custom.game.bbzombiebase.bbhealth,15500,'bomber remaining 500 is not mistaken for an air-strike');
  const baseline=fixture(),configured=fixture(defaults());
  for(const candidate of [baseline,configured]){candidate.game.bbPlayGame(1);putOneHealthBeforeBase(candidate);
    candidate.game.bbAddBottle(0,candidate.game.bbzombiebase.bbxpos,1,0,0,1);candidate.ticks();}
  assert.equal(baseline.game.bbzombiebase.bbhealth,15501,'original air-strike remaining 499 can hit a later base');
  assert.equal(configured.game.bbzombiebase.bbhealth,baseline.game.bbzombiebase.bbhealth);
});

test('corpse-thrower projectileDamage changes an actual landing hit without altering default raw metadata',()=>{
  const c=defaults();c.zombies[4].projectileDamage=37;
  const h=fixture(c),g=h.game;g.bbPlayGame(1);
  g.bbAddFling(0,g.bbpeoplebase.bbxpos+7.5,0);
  const corpse=entries(g.bbflinglist)[0];assert.equal(corpse.bbdamage,37);
  corpse.bbfling=13*corpse.bbanimrate-1;h.ticks();
  assert.equal(g.bbpeoplebase.bbhealth,3963);
  assert.equal(GameConfig.compile(c).raw.bb_data_zombiedata[44],100,'unused original table cell remains lossless');
});

test('all three default power dispatches preserve original positions, random draws and effects',()=>{
  function snapshot(h){const g=h.game;return {
    people:entries(g.bbpeople).map(p=>({type:p.bbunit.bbtype,layer:p.bblayer,x:p.bbxpos,y:p.bbypos,speed:p.bbwalkspeed,angry:p.bbisangry,health:p.bbhealth})),
    powerups:entries(g.bbpowerups).map(p=>({type:p.bbtype,layer:p.bblayer,x:p.bbxpos,y:p.bbypos,speed:p.bbwalkspeed,cycle:p.bbwalkcycle,rate:p.bbanimrate,mode:p.bbmode})),
    powers:Array.from(g.bbpowers,p=>({build:p.bbbuildtime,xp:p.bbxp,cool:p.bbcooldown,cooltime:p.bbcooltime})),
    random:h.context.ZTPGamePort.state.bb_std_random_Seed
  };}
  for(let type=0;type<3;type++){
    const baseline=fixture(),configured=fixture(defaults());
    for(const h of [baseline,configured]){h.game.bbPlayGame(1);h.context.ZTPGamePort.setRandomSeed(77);h.game.bbAddPower(h.game.bbpowers[type]);}
    assert.deepEqual(snapshot(configured),snapshot(baseline),'power '+type);
  }
});

test('default reinforcements match original full queues, wave pops and markers at all 12 thresholds',()=>{
  for(let stage=1;stage<=4;stage++){
    const baseline=fixture(),configured=fixture(defaults());
    for(const h of [baseline,configured]){h.game.bbPlayGame(stage);h.context.ZTPGamePort.setRandomSeed(321);}
    for(const threshold of [13000,9000,5000]){
      for(const h of [baseline,configured]){
        const mob=h.context.ZTPGamePort.bb_ZombieMob;
        mob.bbInit([1,1,0]);mob.bbticks=60;
        h.game.bbzombiehealth=threshold+1;h.game.bbzombiebase.bbhealth=threshold;h.ticks();
      }
      assert.deepEqual(queue(configured),queue(baseline),'stage '+stage+', threshold '+threshold);
    }
    // A fresh match also verifies one hit crossing all three thresholds. HP
    // restoration after already-fired thresholds is a custom-mode operation;
    // its intentionally non-replaying behavior is covered by the live suite.
    const combinedBaseline=fixture(),combinedConfigured=fixture(defaults());
    for(const h of [combinedBaseline,combinedConfigured]){
      h.game.bbPlayGame(stage);h.context.ZTPGamePort.setRandomSeed(321);
      h.game.bbzombiehealth=16000;h.game.bbzombiebase.bbhealth=4000;h.ticks();
    }
    assert.deepEqual(queue(combinedConfigured),queue(combinedBaseline),'stage '+stage+', simultaneous threshold crossing');
    for(const h of [combinedBaseline,combinedConfigured])h.ticks();
    assert.deepEqual(queue(combinedConfigured),queue(combinedBaseline),'stage '+stage+', no crossing');
  }
});

test('custom waves and reinforcements replace hardcoded calls and retain original integer delay consumption',()=>{
  const c=defaults();
  c.levels[0].waves=[{type:0,count:1,delay:0.9},{type:2,count:2,delay:1.9}];
  c.levels[0].reinforcements=[{threshold:14000,calls:[{type:2,count:2,delay:0.9},{type:4,count:3,delay:1.9}]}];
  const h=fixture(c),g=h.game;g.bbPlayGame(1);const mob=h.context.ZTPGamePort.bb_ZombieMob;
  assert.deepEqual(entries(mob.bbqueue).map(w=>w.bbdelay),[0,1]);
  mob.bbticks=60;g.bbzombiehealth=16000;g.bbzombiebase.bbhealth=13000;h.ticks();
  assert.deepEqual(entries(mob.bbqueue).map(w=>[w.bbtype,w.bbcount,w.bbdelay,w.bbtime]),[[4,3,1,0],[2,2,0,0],[2,2,1,0]]);
  assert.equal(g.bbzombiehealth,13000);
  h.ticks();assert.equal(entries(mob.bbqueue).length,3);
});

test('level multipliers preserve original pre-multiply integer health conversion',()=>{
  const c=defaults();c.levels[0].zombieHealthMultiplier=2.9;c.levels[0].zombieDamageMultiplier=2.3;
  const h=fixture(c);h.game.bbPlayGame(1);
  assert.equal(h.game.bbAddZombie(h.game.bbzunits[0]).bbhealth,50);
  assert.equal(h.game.bbZombieDamageMultiplier,2.3);
  const d=fixture(defaults());d.game.bbPlayGame(4);
  assert.equal(d.game.bbAddZombie(d.game.bbzunits[0]).bbhealth,25);
});
