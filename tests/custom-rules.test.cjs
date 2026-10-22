'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const CustomRules = require('../src/custom-rules.js');
const GameConfig = require('../src/game-config.js');
const root = path.resolve(__dirname,'..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
const json = name => JSON.parse(read(name));
const config = () => GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map(kind => [kind,json('config/'+kind+'.json')])));
const plain = value => JSON.parse(JSON.stringify(value));
function entries(list) {
  const result=[], iterator=list.bbObjectEnumerator();
  while(iterator.bbHasNext()) result.push(iterator.bbNextObject());
  return result;
}
function fixture(rules=CustomRules.defaults(), install=true, configuration=config()) {
  const manifest=json('public/assets/manifest.json');
  const drawing=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){const i=manifest.images[name];assert.ok(i,name);return {Width:()=>i.width,Height:()=>i.height};}}, {get:(o,k)=>o[k]||(()=>0)});
  const input=new Proxy({}, {get:()=>()=>0});
  const audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
  class App { GraphicsDevice(){return drawing;} InputDevice(){return input;} AudioDevice(){return audio;} SetUpdateRate(){return 0;} MilliSecs(){return 0;} }
  const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class {},ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,
    PlayMovie:()=>0,MovieFinished:()=>1,EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0});
  vm.runInContext(read('src/generated-game.js'),target);
  GameConfig.install(target,configuration);
  if(install) CustomRules.install(target,rules);
  target.bb_Init();target.bb_Main();
  const device=target.ZTPGamePort.state.bb_mojo_app_device;device.OnCreate();device.OnUpdate();
  const game=target.ZTPGamePort.state.bb_Game;game.bbPlayGame(1);
  return {target,game,port:target.ZTPGamePort,ticks(n=1){for(let i=0;i<n;i++)game.bbGameTick(0);}};
}
function queue(h) {
  return {ticks:h.port.bb_ZombieMob.bbticks,items:entries(h.port.bb_ZombieMob.bbqueue).map(x=>[x.bbtype,x.bbcount,x.bbdelay,x.bbtime])};
}
function view(h) {
  const g=h.game;
  return plain({queue:queue(h),cash:g.bbztp.bbcash,xp:g.bbztp.bbxp,ticks:g.bbgameticks,marker:g.bbzombiehealth,
    people:entries(g.bbpeople).map(x=>[x.bbunit.bbtype,x.bbhealth,x.bbxpos,x.bbmode]),
    zombies:entries(g.bbzombies).map(x=>[x.bbunit.bbtype,x.bbhealth,x.bbxpos,x.bbmode]),
    seed:h.port.state.bb_std_random_Seed});
}
function change(h, edit) { const rules=CustomRules.snapshot(h.target);edit(rules);CustomRules.update(h.target,rules); }
function readyWave(h,type=1,count=1) { const mob=h.port.bb_ZombieMob;mob.bbInit([type,count,0]);mob.bbticks=60; }
function flingAtImpact(h,x=500) {
  h.game.bbAddFling(2,x+7.5,0);
  const fling=entries(h.game.bbflinglist).at(-1);fling.bbfling=fling.bbanimrate*13-1;
  return fling;
}

test('defaults and snapshots are independent validated copies in CommonJS and browser',()=>{
  const a=CustomRules.defaults(),b=CustomRules.defaults();a.abilities.corpseThrowing=false;a.zombieTypesEnabled[0]=false;
  assert.equal(b.abilities.corpseThrowing,true);assert.equal(b.zombieTypesEnabled[0],true);
  const context=vm.createContext({});vm.runInContext(read('src/custom-rules.js'),context);
  assert.deepEqual(plain(context.CustomRules.validate(b)),b);
  const h=fixture();const snapshot=CustomRules.snapshot(h.target);snapshot.automaticSpawning=false;
  assert.equal(CustomRules.snapshot(h.target).automaticSpawning,true);
});

test('early schemaVersion 1 rules gain only newly introduced default fields',()=>{
  const legacy=CustomRules.defaults();delete legacy.economy;delete legacy.abilities.harvesterDamagePerTick;delete legacy.abilities.harvesterRange;delete legacy.abilities.ghoulLongLeap;
  assert.deepEqual(CustomRules.validate(legacy),CustomRules.defaults());
  legacy.abilities.ghoulLongLeap=false;assert.equal(CustomRules.validate(legacy).abilities.ghoulLongLeap,false);
});

test('strict schema rejects unknown, sparse, inherited, accessors and pollution fields atomically',()=>{
  const invalid=[
    [r=>r.schemaVersion=2,/schemaVersion/],[r=>r.automaticSpawning=1,/automaticSpawning/],
    [r=>r.zombieTypesEnabled=[true],/exactly 5/],[r=>delete r.zombieTypesEnabled[2],/required field/],
    [r=>r.abilities.unknown=true,/unknown field/],[r=>r.abilities.fatAreaAttack='false',/fatAreaAttack/],
    [r=>r.abilities.ghoulLongLeap='false',/ghoulLongLeap/],
    [r=>r.abilities.harvesterDamagePerTick=-1,/harvesterDamagePerTick/],[r=>r.abilities.harvesterRange=Infinity,/harvesterRange/],
    [r=>r.economy.salvageIntervalTicks=0,/salvageIntervalTicks/],[r=>r.economy.populationPerTrailer=1.5,/populationPerTrailer/],
    [r=>r.economy.salvagePayout=1000001,/salvagePayout/],[r=>r.economy.__proto__={bad:true},/plain JSON object/],
    [r=>Object.defineProperty(r,'automaticSpawning',{enumerable:true,get(){throw Error('accessor was called');}}),/expected a JSON value/],
    [r=>Object.setPrototypeOf(r,{automaticSpawning:true}),/plain JSON object/],
    [r=>Object.setPrototypeOf(r,Object.assign(Object.create(null),{bad:true})),/plain JSON object/],
    [r=>Object.defineProperty(r,'__proto__',{value:{polluted:true},enumerable:true}),/unknown field/],
    [r=>Object.defineProperty(r.abilities,'constructor',{value:{prototype:{polluted:true}},enumerable:true}),/unknown field/],
    [r=>r[Symbol('extra')]=true,/unknown field/]
  ];
  for(const [mutate,error] of invalid){const r=CustomRules.defaults();mutate(r);assert.throws(()=>CustomRules.validate(r),error);}
  const h=fixture(),r=CustomRules.defaults();r.corpseSpawnOnImpact=0;
  assert.throws(()=>CustomRules.update(h.target,r),/corpseSpawnOnImpact/);
  assert.deepEqual(CustomRules.snapshot(h.target),CustomRules.defaults());
  assert.equal({}.polluted,undefined);
});

test('default wrappers preserve deterministic ordinary queue/combat state',()=>{
  const baseline=fixture(undefined,false),wrapped=fixture();
  baseline.game.bbAddPerson(baseline.game.bbunits[0]);wrapped.game.bbAddPerson(wrapped.game.bbunits[0]);
  for(const count of [1,60,100,300]) {baseline.ticks(count);wrapped.ticks(count);assert.deepEqual(view(wrapped),view(baseline));}
});

test('automatic pause freezes wave clocks and counts but not battle or live movement',()=>{
  const h=fixture();readyWave(h,1,2);const zombie=h.game.bbAddZombie(h.game.bbzunits[0]);zombie.bbxpos=1000;
  change(h,r=>r.automaticSpawning=false);const before=plain(queue(h)),tick=h.game.bbgameticks;
  h.ticks(80);
  assert.deepEqual(plain(queue(h)),before);assert.equal(h.game.bbgameticks,tick+80);assert.ok(zombie.bbxpos<1000);
  assert.equal(entries(h.game.bbzombies).length,2);
  change(h,r=>r.automaticSpawning=true);h.ticks();assert.equal(entries(h.game.bbzombies).length,3);
});

test('disabled automatic types consume scheduled waves; manual spawning still works',()=>{
  const h=fixture();change(h,r=>r.zombieTypesEnabled[3]=false);readyWave(h,4,2);
  const before=h.port.state.bb_std_random_Seed;h.port.bb_ZombieMob.bbUpdate();
  assert.equal(entries(h.game.bbzombies).length,1);assert.equal(h.port.state.bb_std_random_Seed,before);
  assert.equal(entries(h.port.bb_ZombieMob.bbqueue)[0].bbcount,1);
  const manual=CustomRules.beginManualSpawn(h.target,()=>h.game.bbAddZombie(h.game.bbzunits[3]));
  assert.equal(manual.bbunit.bbtype,35);assert.equal(entries(h.game.bbzombies).length,2);
});

test('disabled reinforcement crossings are consumed without hardcoded or deferred spawns',()=>{
  for(const field of ['baseReinforcements','automaticSpawning']){
    const h=fixture();change(h,r=>r[field]=false);const before=plain(queue(h));
    h.game.bbzombiehealth=16000;h.game.bbzombiebase.bbhealth=12000;h.ticks();
    assert.equal(entries(h.port.bb_ZombieMob.bbqueue).length,before.items.length);
    assert.equal(h.game.bbzombiehealth,12000);
    change(h,r=>r[field]=true);h.ticks();
    assert.equal(entries(h.port.bb_ZombieMob.bbqueue).length,before.items.length);
  }
});

test('re-enabled thresholds still trigger future crossings with original call order',()=>{
  const h=fixture();change(h,r=>r.baseReinforcements=false);
  h.game.bbzombiehealth=16000;h.game.bbzombiebase.bbhealth=12000;h.ticks();
  change(h,r=>r.baseReinforcements=true);h.game.bbzombiebase.bbhealth=8000;h.ticks();
  const q=entries(h.port.bb_ZombieMob.bbqueue);
  assert.deepEqual(q.slice(0,2).map(x=>x.bbtype),[4,1]);assert.equal(q[1].bbcount,30);
});

test('damage late in a disabled tick consumes its crossing before re-enabling',()=>{
  for(const field of ['automaticSpawning','baseReinforcements']) {
    const h=fixture();change(h,r=>r[field]=false);
    h.game.bbzombiebase.bbhealth=h.game.bbzombiehealth=13100;
    h.game.bbAddBottle(0,h.game.bbzombiebase.bbxpos,1,0,0,0);
    const count=entries(h.port.bb_ZombieMob.bbqueue).length;h.ticks();
    assert.equal(h.game.bbzombiebase.bbhealth,13000);assert.equal(h.game.bbzombiehealth,13000);
    change(h,r=>r[field]=true);h.ticks();assert.equal(entries(h.port.bb_ZombieMob.bbqueue).length,count);
  }
});

test('custom salvage income and interval are consumed by the real economy leaf',()=>{
  const h=fixture();change(h,r=>{r.economy.salvagePayout=7;r.economy.salvageIntervalTicks=10;r.automaticSpawning=false;});
  const g=h.game;g.bbAddWealth(9);assert.equal(g.bbztp.bbcash,100);assert.equal(g.bbcoins,9);
  g.bbAddWealth(1);assert.equal(g.bbztp.bbcash,107);assert.equal(g.bbcoins,0);
  g.bbztp.bbbuildingcount[1]=2;h.ticks(5);assert.equal(g.bbztp.bbcash,114);assert.equal(g.bbcoins,0);
  g.bbcoins=5;change(h,r=>r.economy.salvageIntervalTicks=20);assert.equal(g.bbcoins,10);
  g.bbAddWealth(9);assert.equal(g.bbztp.bbcash,114);g.bbAddWealth(1);assert.equal(g.bbztp.bbcash,121);
  g.bbztp.bbcash=2147483646;g.bbAddWealth(20);assert.equal(g.bbztp.bbcash,2147483647);
});

test('custom trailer capacity applies immediately, survives ticks and affects actual purchasing',()=>{
  const h=fixture();change(h,r=>{r.economy.populationPerTrailer=17;r.automaticSpawning=false;});
  const g=h.game;assert.equal(g.bbztp.bbmaxforce,17);g.bbztp.bbbuildingcount[0]=3;h.ticks();assert.equal(g.bbztp.bbmaxforce,51);
  g.bbztp.bbforce=50;g.bbztp.bbcash=1000;g.bbBuyUnit(g.bbunits[0]);assert.equal(g.bbztp.bbforce,51);
  const cash=g.bbztp.bbcash;g.bbBuyUnit(g.bbunits[0]);assert.equal(g.bbztp.bbcash,cash);
  g.bbResetGame();assert.equal(g.bbztp.bbmaxforce,17);
  change(h,r=>r.economy.populationPerTrailer=5);assert.equal(g.bbztp.bbmaxforce,5);
});

test('custom harvester damage and range affect real targets exactly once and exclude the base',()=>{
  for(const custom of [false,true]) {
    const h=fixture();change(h,r=>{r.automaticSpawning=false;if(custom){r.abilities.harvesterDamagePerTick=7;r.abilities.harvesterRange=300;}});
    const targets=[550,750,900].map(x=>{const z=h.game.bbAddZombie(h.game.bbzunits[0]);z.bbxpos=x;z.bbhealth=1000;z.bbmode=16;return z;});
    h.game.bbAddPower(h.game.bbpowers[1]);const power=entries(h.game.bbpowerups)[0];power.bbxpos=500;
    const baseHealth=h.game.bbzombiebase.bbhealth;h.ticks();
    assert.deepEqual(targets.map(z=>z.bbhealth),custom?[993,993,1000]:[900,1000,1000]);
    assert.equal(power.bbtype,1);assert.equal(h.game.bbzombiebase.bbhealth,baseHealth);
    h.ticks();assert.deepEqual(targets.map(z=>z.bbhealth),custom?[986,986,1000]:[800,1000,1000]);assert.equal(power.bbtype,1);
  }
});

test('harvester type masking restores even if later update throws',()=>{
  const h=fixture();change(h,r=>{r.automaticSpawning=false;r.abilities.harvesterDamagePerTick=7;});
  h.game.bbAddPower(h.game.bbpowers[1]);const power=entries(h.game.bbpowerups)[0];power.bbxpos=500;
  const original=h.game.bbzombiebase.bbUpdate;h.game.bbzombiebase.bbUpdate=()=>{throw Error('intentional later update');};
  assert.throws(()=>h.ticks(),/intentional later update/);assert.equal(power.bbtype,1);
  h.game.bbzombiebase.bbUpdate=original;assert.doesNotThrow(()=>h.ticks());assert.equal(power.bbtype,1);
});

test('corpse impact spawn can be disabled without suppressing its explosion damage',()=>{
  for(const enabled of [true,false]){
    const h=fixture();change(h,r=>{r.automaticSpawning=false;r.corpseSpawnOnImpact=enabled;});
    const person=h.game.bbAddPerson(h.game.bbunits[2]);person.bbxpos=500;person.bbhealth=1000;person.bbmode=16;
    const before=entries(h.game.bbzombies).length;flingAtImpact(h);h.ticks();
    assert.equal(entries(h.game.bbflinglist).length,0);assert.equal(person.bbhealth,500);
    assert.equal(entries(h.game.bbzombies).length,before+(enabled?1:0));
  }
});

test('automatic type suppression does not affect independent corpse spawns',()=>{
  const h=fixture();change(h,r=>{r.automaticSpawning=false;r.zombieTypesEnabled.fill(false);});
  flingAtImpact(h);h.ticks();assert.equal(entries(h.game.bbzombies).length,2);
});

test('corpse tags do not leak to unrelated direct or manual calls after a tick',()=>{
  const h=fixture();change(h,r=>r.corpseSpawnOnImpact=false);flingAtImpact(h);h.ticks();
  assert.ok(h.game.bbAddZombie(h.game.bbzunits[0]));
  assert.ok(CustomRules.withManualSpawn(h.target,()=>h.game.bbAddZombie(h.game.bbzunits[0])));
});

test('lingering corpse impact after a win cannot dereference a rejected spawn',()=>{
  const h=fixture();h.game.bbGameOver(1);flingAtImpact(h,900);
  assert.doesNotThrow(()=>h.ticks());
  assert.equal(entries(h.game.bbzombies).length,0);assert.equal(entries(h.game.bbflinglist).length,0);
});

test('manual override scopes nest and clean up even when callback throws',()=>{
  const h=fixture();change(h,r=>r.zombieTypesEnabled[0]=false);readyWave(h);
  assert.throws(()=>CustomRules.beginManualSpawn(h.target,()=>{CustomRules.beginManualSpawn(h.target,()=>{throw Error('intentional');});}),/intentional/);
  h.port.bb_ZombieMob.bbUpdate();assert.equal(entries(h.game.bbzombies).length,1);
  assert.throws(()=>CustomRules.beginManualSpawn(h.target,null),/synchronous function/);
});

test('install is idempotent and reinitialization keeps one hook chain',()=>{
  const h=fixture(),mobUpdate=h.port.bb_ZombieMob.bbUpdate,add=h.port.bb_Zomba.prototype.bbAddZombie,init=h.target.bb_Init;
  const r=CustomRules.defaults();r.automaticSpawning=false;
  CustomRules.install(h.target,r);assert.equal(h.port.bb_ZombieMob.bbUpdate,mobUpdate);assert.equal(h.port.bb_Zomba.prototype.bbAddZombie,add);assert.equal(h.target.bb_Init,init);
  h.target.bb_Init();assert.equal(CustomRules.snapshot(h.target).automaticSpawning,false);
});

test('preacher conversion switch suppresses real conversion but not its cast timing',()=>{
  for(const enabled of [true,false]) {
    const h=fixture();change(h,r=>{r.automaticSpawning=false;r.abilities.preacherConversion=enabled;});
    const person=h.game.bbAddPerson(h.game.bbunits[4]);person.bbxpos=500;person.bbmode=6;person.bbspell=50*person.bbanimrate-1;
    const zombie=h.game.bbAddZombie(h.game.bbzunits[0]);zombie.bbxpos=600;
    h.ticks(2);assert.equal(entries(h.game.bbpombies).length,enabled?1:0);assert.equal(person.bbspell,50*person.bbanimrate+1);
  }
});

test('fat area attack switch blocks only the real pound hit event',()=>{
  for(const enabled of [true,false]){
    const h=fixture();change(h,r=>{r.automaticSpawning=false;r.abilities.fatAreaAttack=enabled;});
    const person=h.game.bbAddPerson(h.game.bbunits[0]);person.bbxpos=500;person.bbmode=16;person.bbhealth=100;
    const zombie=h.game.bbAddZombie(h.game.bbzunits[3]);zombie.bbxpos=550;zombie.bbmode=10;zombie.bbpound=14*zombie.bbanimrate-1;
    h.ticks(2);assert.equal(person.bbhealth,enabled?40:100);assert.equal(zombie.bbhit,0);
  }
});

test('corpse throwing switch blocks the real launch hit but not unrelated fat events',()=>{
  for(const enabled of [true,false]){
    const h=fixture();change(h,r=>{r.automaticSpawning=false;r.abilities.corpseThrowing=enabled;});
    const zombie=h.game.bbAddZombie(h.game.bbzunits[4]);zombie.bbxpos=1000;zombie.bbmode=11;zombie.bblaunch=39*zombie.bbanimrate-1;
    h.ticks(2);assert.equal(entries(h.game.bbflinglist).length,enabled?1:0);assert.equal(zombie.bbhit,0);
  }
});

test('ghoul long-leap toggle controls actual far-distance selection without freezing walking',()=>{
  for(const enabled of [true,false]) {
    const h=fixture();change(h,r=>{r.automaticSpawning=false;r.abilities.ghoulLongLeap=enabled;});
    const person=h.game.bbAddPerson(h.game.bbunits[0]);person.bbxpos=500;person.bbmode=16;
    const ghoul=h.game.bbAddZombie(h.game.bbzunits[1]);ghoul.bbxpos=908;
    h.ticks();assert.equal(ghoul.bbmode,enabled?7:0);assert.equal(ghoul.bbxpos,enabled?908:907.5);
    if(!enabled){h.ticks(5);assert.ok(ghoul.bbxpos<907.5);assert.equal(ghoul.bbmode,0);}
  }
});

test('ghoul long-leap toggle leaves close-range jump bites and other attacks unchanged',()=>{
  const h=fixture();change(h,r=>r.abilities.ghoulLongLeap=false);
  const ghoul=h.game.bbAddZombie(h.game.bbzunits[1]);ghoul.bbmode=8;ghoul.bbjump=16*ghoul.bbanimrate-1;
  ghoul.bbUpdate();assert.equal(ghoul.bbmode,0);assert.equal(ghoul.bbhit,1);
  const fat=h.game.bbAddZombie(h.game.bbzunits[3]);fat.bbmode=10;fat.bbpound=14*fat.bbanimrate-1;
  fat.bbUpdate();assert.equal(fat.bbmode,10);assert.equal(fat.bbhit,1);
});

test('disabling a long leap mid-air restores its origin height and preserves movement direction',()=>{
  const h=fixture(),ghoul=h.game.bbAddZombie(h.game.bbzunits[1]);
  ghoul.bbxpos=900;ghoul.bbypos=7;ghoul.bbmode=7;ghoul.bbjump=43;ghoul.bbdirection=-1;
  for(let i=0;i<3;i++)ghoul.bbUpdate();assert.notEqual(ghoul.bbypos,7);
  const x=ghoul.bbxpos;change(h,r=>r.abilities.ghoulLongLeap=false);ghoul.bbUpdate();
  assert.equal(ghoul.bbmode,0);assert.equal(ghoul.bbjump,0);assert.equal(ghoul.bbypos,7);
  assert.equal(ghoul.bbdirection,-1);assert.equal(ghoul.bbxpos,x+ghoul.bbwalkspeed);
});

test('enabled ghoul final leap displacement remains identical to the original',()=>{
  const original=fixture(undefined,false),wrapped=fixture();
  const result=h=>{const z=h.game.bbAddZombie(h.game.bbzunits[1]);z.bbxpos=900;z.bbmode=7;z.bbjump=32*z.bbanimrate-1;z.bbUpdate();return [z.bbxpos,z.bbypos,z.bbmode,z.bbjump,z.bbwalk];};
  assert.deepEqual(result(wrapped),result(original));
});

test('large automatic wave and corpse impact respect entity safety ceiling without a null crash',()=>{
  const h=fixture();change(h,r=>r.automaticSpawning=false);
  const person=h.game.bbpeoplebase;
  for(let i=0;i<998;i++)h.game.bbpeople.bbAddLast(person);
  assert.equal(entries(h.game.bbpeople).length+entries(h.game.bbzombies).length,1000);
  assert.equal(h.game.bbAddZombie(h.game.bbzunits[3]),null);
  flingAtImpact(h,900);h.ticks();assert.equal(entries(h.game.bbzombies).length,1);assert.equal(entries(h.game.bbflinglist).length,0);
});

test('entity list ceiling also covers oversized mob skills without touching effect or wave lists',()=>{
  const c=config();c.powers[0].effect.shovelCount=1000;c.powers[0].effect.shotgunCount=1000;
  const h=fixture(undefined,true,c);h.game.bbAddPower(h.game.bbpowers[0]);
  assert.equal(entries(h.game.bbpeople).length+entries(h.game.bbzombies).length+entries(h.game.bbpombies).length,CustomRules.ENTITY_LIMIT);
  const other=new h.port.bb_std_list_List().bbList_new();
  for(let i=0;i<1001;i++)other.bbAddLast(i);
  assert.equal(entries(other).length,1001);
});

test('entity list ceiling covers training completion and still permits converted transfers',()=>{
  const h=fixture();change(h,r=>r.automaticSpawning=false);
  const person=h.game.bbpeoplebase;
  for(let i=0;i<998;i++)h.game.bbpeople.bbAddLast(person);
  h.game.bbunits[0].bbbusy=1;h.game.bbunits[0].bborders=1;h.ticks();
  assert.equal(h.game.bbunits[0].bborders,1);assert.equal(h.game.bbunits[0].bbbusy,1);
  assert.equal(entries(h.game.bbpeople).length+entries(h.game.bbzombies).length,CustomRules.ENTITY_LIMIT);
  h.game.bbzombies.bbRemove(h.game.bbzombiebase);
  const zombie=h.game.bbAddZombie(h.game.bbzunits[0]);
  assert.ok(zombie);h.game.bbzombies.bbRemove(zombie);h.game.bbpombies.bbAddLast(zombie);
  assert.equal(entries(h.game.bbpombies).length,1);
  assert.equal(entries(h.game.bbpeople).length+entries(h.game.bbzombies).length+entries(h.game.bbpombies).length,CustomRules.ENTITY_LIMIT);
});

test('a real purchased training order waits at the ceiling and finishes when a slot opens',()=>{
  const c=config();c.powers[0].effect.shovelCount=1000;c.powers[0].effect.shotgunCount=0;
  const h=fixture(undefined,true,c);change(h,r=>r.automaticSpawning=false);h.game.bbAddPower(h.game.bbpowers[0]);
  const unit=h.game.bbunits[0];h.game.bbBuyUnit(unit);const cash=h.game.bbztp.bbcash,force=h.game.bbztp.bbforce;
  assert.equal(unit.bborders,1);unit.bbbusy=1;
  h.ticks(3);assert.equal(unit.bborders,1);assert.equal(unit.bbbusy,1);assert.equal(h.game.bbztp.bbcash,cash);assert.equal(h.game.bbztp.bbforce,force);
  const angry=entries(h.game.bbpeople).find(person=>person.bbisangry);assert.ok(angry);h.game.bbpeople.bbRemove(angry);
  h.ticks();assert.equal(unit.bborders,0);assert.equal(unit.bbbusy,0);assert.equal(h.game.bbztp.bbcash,cash);assert.equal(h.game.bbztp.bbforce,force);
  assert.equal(entries(h.game.bbpeople).length+entries(h.game.bbzombies).length,CustomRules.ENTITY_LIMIT);
  assert.equal(entries(h.game.bbpeople).filter(person=>person.bbunit.bbtype===0 && !person.bbisangry).length,1);
});

test('lifecycle rejects missing generated runtime and late installation',()=>{
  assert.throws(()=>CustomRules.install({},CustomRules.defaults()),/generated-game/);
  assert.throws(()=>CustomRules.snapshot({}),/install must run first/);
  const h=fixture(undefined,false);assert.throws(()=>CustomRules.install(h.target),/before bb_Main/);
});
