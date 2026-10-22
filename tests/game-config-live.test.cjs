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
  const result = [], iterator = list.bbObjectEnumerator();
  while (iterator.bbHasNext()) result.push(iterator.bbNextObject());
  return result;
}
function fixture(config = defaults(), start = true, rules) {
  const manifest = json('public/assets/manifest.json');
  const drawing = new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name) {
    const image = manifest.images[name]; assert.ok(image,name);
    return {Width:()=>image.width,Height:()=>image.height};
  }},{get:(target,key)=>target[key] || (()=>0)});
  const input = new Proxy({},{get:()=>()=>0});
  const audio = {LoadSample:name=>({name}),PlaySample:sample=>({sample}),StopChannel:()=>0};
  class App {
    GraphicsDevice(){return drawing;} InputDevice(){return input;} AudioDevice(){return audio;}
    SetUpdateRate(){return 0;} MilliSecs(){return 0;}
  }
  const target = vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class {},
    ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,PlayMovie:()=>0,MovieFinished:()=>1,
    EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0});
  vm.runInContext(read('src/generated-game.js'),target);
  GameConfig.install(target,config);
  if(rules !== undefined) CustomRules.install(target,rules);
  target.bb_Init(); target.bb_Main();
  const device = target.ZTPGamePort.state.bb_mojo_app_device;
  device.OnCreate(); device.OnUpdate();
  const game = target.ZTPGamePort.state.bb_Game;
  if (start) game.bbPlayGame(1);
  return {target,game,port:target.ZTPGamePort,ticks(count=1){while(count-->0)game.bbGameTick(0);}};
}
function snapshot(h) {
  const g=h.game;
  return plain({configuration:GameConfig.getCurrent(h.target),
    raw:[h.target.bb_data_unitdata,h.target.bb_data_buildingdata,h.target.bb_leveldata_level1],
    unit:g.bbunits[0],building:g.bbbuildings[0],power:g.bbpowers[0],
    people:items(g.bbpeople).map(p=>({type:p.bbunit.bbtype,health:p.bbhealth,speed:p.bbwalkspeed,mode:p.bbmode})),
    zombies:items(g.bbzombies).map(p=>({type:p.bbunit.bbtype,health:p.bbhealth,speed:p.bbwalkspeed,mode:p.bbmode})),
    cash:g.bbztp.bbcash,xp:g.bbztp.bbxp,force:g.bbztp.bbforce,
    queue:items(h.port.bb_ZombieMob.bbqueue).map(w=>[w.bbtype,w.bbcount,w.bbdelay,w.bbtime]),
    seed:h.port.state.bb_std_random_Seed});
}

test('getCurrent is a detached full configuration and requires an installed boundary',()=>{
  const h=fixture(),c=GameConfig.getCurrent(h.target);
  assert.deepEqual(c,defaults()); c.units[0].cost=1; c.levels[0].waves.length=0;
  assert.deepEqual(GameConfig.getCurrent(h.target),defaults());
  assert.throws(()=>GameConfig.getCurrent({ZTPGamePort:{}}),/install or apply/);
  assert.throws(()=>GameConfig.updateLive({ZTPGamePort:{}},defaults()),/install or apply/);
});

test('live templates, living HP ratios, converted allies, anger and temporary stops synchronize',()=>{
  const h=fixture(),g=h.game,c=defaults();
  const person=g.bbAddPerson(g.bbunits[0]);person.bbhealth=25;person.bbAnger();person.bbxpos=321;person.bbmode=1;person.bbswing=9;
  const priest=g.bbAddPerson(g.bbunits[4]);priest.bbwalkspeed=0;
  const zombie=g.bbAddZombie(g.bbzunits[0]);zombie.bbhealth=5;zombie.bbmode=9;zombie.bbwail=7;
  const converted=g.bbAddZombie(g.bbzunits[3]);g.bbzombies.bbRemove(converted);g.bbpombies.bbAddLast(converted);converted.bbTurn();converted.bbhealth=500;
  Object.assign(c.units[0],{cost:17,buildTicks:29,health:200,damage:39,moveSpeed:2,hitRadius:33,hitOffset:9,name:'Custom Shovel'});
  c.units[4].moveSpeed=2;c.zombies[0].health=100;c.zombies[0].moveSpeed=1;c.zombies[3].health=2000;c.zombies[3].moveSpeed=0.8;
  c.powers[0].effect.angerSpeedMultiplier=2;c.buildings[0].cost=7;c.powers[0].xp=5;
  const result=GameConfig.updateLive(h.target,c);
  assert.equal(g.bbunits[0].bbcost,17);assert.equal(g.bbunits[0].bbbuildtime,29);assert.equal(g.bbunits[0].bbhealth,200);
  assert.equal(g.bbunits[0].bbdamage,39);assert.equal(g.bbunits[0].bbhitradius,33);assert.equal(g.bbunits[0].bbhitoffset,9);
  assert.equal(g.bbunits[0].bbname,'Custom Shovel');assert.equal(person.bbunit,g.bbunits[0]);
  assert.equal(person.bbhealth,100);assert.equal(person.bbwalkspeed,4);assert.equal(person.bbxpos,321);
  assert.equal(person.bbmode,1);assert.equal(person.bbswing,9);assert.equal(person.bbisangry,1);
  assert.equal(priest.bbwalkspeed,0,'the preacher intentionally stopped in its state machine stays stopped');
  assert.equal(zombie.bbhealth,20);assert.equal(zombie.bbwalkspeed,1);assert.equal(zombie.bbmode,9);assert.equal(zombie.bbwail,7);
  assert.equal(converted.bbhealth,1000);assert.equal(converted.bbwalkspeed,0.8);assert.equal(converted.bbdirection,-1);
  assert.equal(g.bbbuildings[0].bbcost,7);assert.equal(g.bbpowers[0].bbxp,5);
  assert.ok(result.applied.includes('$.units[0].damage'));assert.deepEqual(result.deferred,[]);
});

test('HP ratio never resurrects corpses and respects original integer level-health multiplication',()=>{
  const h=fixture(),g=h.game,c=defaults();
  const dead=g.bbAddPerson(g.bbunits[0]);dead.bbhealth=0;dead.bbmode=14;
  const dying=g.bbAddZombie(g.bbzunits[0]);dying.bbmode=15;dying.bbhealth=5;
  const enemy=g.bbAddZombie(g.bbzunits[0]);enemy.bbhealth=10;
  c.units[0].health=100;c.zombies[0].health=50;c.levels[0].zombieHealthMultiplier=2.9;c.levels[0].zombieDamageMultiplier=2.3;
  GameConfig.updateLive(h.target,c);
  assert.equal(dead.bbhealth,0);assert.equal(dead.bbmode,14);assert.equal(dying.bbhealth,5);assert.equal(dying.bbmode,15);
  assert.equal(enemy.bbhealth,40);assert.equal(g.bbAddZombie(g.bbzunits[0]).bbhealth,100);
  assert.equal(g.bbZombieHealthMultiplier,2.9);assert.equal(g.bbZombieDamageMultiplier,2.3);
});

test('new-only keeps individual max HP and base bars, later ratio uses the true old maximum',()=>{
  const h=fixture(),g=h.game,c=defaults();
  const person=g.bbAddPerson(g.bbunits[0]);person.bbhealth=20;
  g.bbpeoplebase.bbhealth=2000;
  c.units[0].health=100;c.units[5].health=8000;
  GameConfig.updateLive(h.target,c,{healthPolicy:'new-only'});
  assert.equal(person.bbhealth,20);assert.equal(g.bbpeoplebase.bbhealth,2000);
  const later=g.bbAddPerson(g.bbunits[0]);assert.equal(later.bbhealth,100);
  const bars=[];g.bbblitrect4=(...args)=>bars.push(args);g.bbDrawHealth();
  assert.equal(bars[1][3],110,'old base is still half of its own 4000 max');
  GameConfig.updateLive(h.target,c,{healthPolicy:'ratio'});
  assert.equal(person.bbhealth,40);assert.equal(later.bbhealth,100);assert.equal(g.bbpeoplebase.bbhealth,4000);
});

test('production and cooldown retain percentages without changing paid orders, resources or population',()=>{
  const h=fixture(),g=h.game,c=defaults();
  g.bbztp.bbcash=5000;g.bbztp.bbxp=10000;g.bbBuyUnit(g.bbunits[0]);g.bbBuyUnit(g.bbunits[0]);
  g.bbBuyBuilding(g.bbbuildings[0]);g.bbBuyPower(g.bbpowers[0]);
  g.bbunits[0].bbbusy=25;g.bbbuildings[0].bbbusy=100;g.bbpowers[0].bbbusy=75;
  g.bbpowers[1].bbcooldown=5000;
  const paid=[g.bbztp.bbcash,g.bbztp.bbxp,g.bbztp.bbforce,g.bbunits[0].bborders,g.bbbuildings[0].bborders];
  c.units[0].buildTicks=100;c.units[0].cost=1;c.units[0].people=4;
  c.buildings[0].buildTicks=600;c.buildings[0].cost=1;
  c.powers[0].buildTicks=300;c.powers[0].xp=0;c.powers[1].cooldownTicks=2000;
  const result=GameConfig.updateLive(h.target,c,{preserveTimerProgress:true});
  assert.equal(g.bbunits[0].bbbusy,50);assert.equal(g.bbbuildings[0].bbbusy,200);assert.equal(g.bbpowers[0].bbbusy,150);
  assert.equal(g.bbpowers[1].bbcooldown,1000);
  assert.deepEqual([g.bbztp.bbcash,g.bbztp.bbxp,g.bbztp.bbforce,g.bbunits[0].bborders,g.bbbuildings[0].bborders],paid);
  assert.equal(g.bbunits[0].bbpeople,1);assert.ok(result.deferred.includes('$.units[0].people'));
  h.ticks(50);assert.equal(g.bbunits[0].bborders,1);assert.equal(g.bbunits[0].bbbusy,100);
  assert.equal(items(g.bbpeople).filter(p=>p.bbunit.bbtype===0).length,1,'the paid order still produces once');
});

test('live projectiles keep launched damage while the next bottle and corpse use new values',()=>{
  const h=fixture(),g=h.game,c=defaults();
  g.bbAddBottle(0,100,-10,0,0,0);g.bbAddFling(0,100,0);
  const bottle=items(g.bbbottles)[0],corpse=items(g.bbflinglist)[0];
  c.units[3].projectileDamage=23;c.zombies[4].projectileDamage=37;
  GameConfig.updateLive(h.target,c);
  assert.equal(bottle.bbdamage,100);assert.equal(corpse.bbdamage,500);
  g.bbAddBottle(0,100,-10,0,0,0);g.bbAddFling(0,100,0);
  assert.equal(items(g.bbbottles)[1].bbdamage,23);assert.equal(items(g.bbflinglist)[1].bbdamage,37);
});

test('structural values, wave order and reinforcements defer until the next reset and then reach real templates',()=>{
  const h=fixture(),g=h.game,c=defaults(),mob=h.port.bb_ZombieMob;
  const oldQueue=items(mob.bbqueue).map(w=>[w.bbtype,w.bbcount,w.bbdelay]),cash=g.bbztp.bbcash;
  c.units[0].people=3;c.units[1].dependency=3;c.buildings[0].maximum=9;c.buildings[2].dependency=1;
  c.powers[1].unlockAfterStage=0;c.levels[0].startingCash=987;c.levels[0].startingXp=654;
  c.levels[0].waves=[{type:4,count:2,delay:1},{type:2,count:1,delay:0,enabled:false}];
  c.levels[0].reinforcements=[{threshold:14000,calls:[{type:5,count:3,delay:2}]}];
  const result=GameConfig.updateLive(h.target,c);
  assert.equal(result.deferred.length,9);assert.equal(g.bbunits[0].bbpeople,1);assert.equal(g.bbunits[1].bbdependency,2);
  assert.equal(g.bbbuildings[0].bbmaximum,15);assert.equal(g.bbbuildings[2].bbdependency,0);
  assert.equal(g.bbpowers[1].bblocked,1);assert.equal(g.bbztp.bbcash,cash);
  assert.deepEqual(items(mob.bbqueue).map(w=>[w.bbtype,w.bbcount,w.bbdelay]),oldQueue);
  assert.deepEqual(plain(h.target.bb_leveldata_level1),GameConfig.compile(defaults()).raw.bb_leveldata_level1);
  assert.deepEqual(GameConfig.getCurrent(h.target),c);
  g.bbResetGame(1);
  assert.equal(g.bbunits[0].bbpeople,3);assert.equal(g.bbunits[1].bbdependency,3);
  assert.equal(g.bbbuildings[0].bbmaximum,9);assert.equal(g.bbbuildings[2].bbdependency,1);
  assert.equal(g.bbpowers[1].bblocked,0);assert.equal(g.bbztp.bbcash,987);assert.equal(g.bbztp.bbxp,654);
  assert.deepEqual(items(mob.bbqueue).map(w=>[w.bbtype,w.bbcount,w.bbdelay]),[[4,2,1]]);
  g.bbzombiehealth=16000;g.bbzombiebase.bbhealth=14000;h.ticks();
  assert.deepEqual(items(mob.bbqueue).map(w=>[w.bbtype,w.bbcount,w.bbdelay]),[[5,3,2],[4,2,1]]);
  assert.deepEqual(GameConfig.updateLive(h.target,c).deferred,[]);
});

test('pending changes remain reported across live edits and can be reverted before reset',()=>{
  const h=fixture(),c=defaults();c.units[0].people=3;
  GameConfig.updateLive(h.target,c);const second=GameConfig.getCurrent(h.target);second.units[0].damage=21;
  const result=GameConfig.updateLive(h.target,second);
  assert.deepEqual(result.deferred,['$.units[0].people']);assert.equal(h.game.bbunits[0].bbpeople,1);
  second.units[0].people=1;assert.deepEqual(GameConfig.updateLive(h.target,second).deferred,[]);
  h.game.bbResetGame(1);assert.equal(h.game.bbunits[0].bbpeople,1);assert.equal(h.game.bbunits[0].bbdamage,21);
});

test('pause dialog and still-running result screens keep structural settings deferred',()=>{
  for(const state of [2,3,4,6]) {
    const h=fixture(),c=defaults();h.game.bbmainState=state;
    c.units[0].people=3;c.buildings[0].maximum=9;c.levels[0].waves[0].enabled=false;
    const result=GameConfig.updateLive(h.target,c);
    assert.equal(h.game.bbunits[0].bbpeople,1);assert.equal(h.game.bbbuildings[0].bbmaximum,15);
    assert.deepEqual(result.deferred,['$.units[0].people','$.buildings[0].maximum','$.levels[0].waves']);
    if(state===6){h.game.bbContinueGame();assert.equal(h.game.bbmainState,2);assert.equal(h.game.bbunits[0].bbpeople,1);}
  }
});

test('reducing enemy-base HP can retain old absolute reinforcement thresholds safely until reset',()=>{
  const h=fixture(),g=h.game,c=defaults();g.bbzombiebase.bbhealth=8000;g.bbzombiehealth=8000;
  c.zombies[5].health=8000;
  for(const level of c.levels)level.reinforcements=[{threshold:6000,calls:[{type:4,count:1,delay:0}]}];
  const result=GameConfig.updateLive(h.target,c);
  assert.equal(g.bbzombiebase.bbhealth,4000);assert.equal(g.bbzombiehealth,4000);
  assert.ok(result.deferred.includes('$.levels[0].reinforcements'));
  const queueLength=items(h.port.bb_ZombieMob.bbqueue).length;
  h.ticks();assert.equal(items(h.port.bb_ZombieMob.bbqueue).length,queueLength,'a live resize itself does not trigger old threshold reinforcements');
  g.bbResetGame(1);assert.equal(g.bbzombiebase.bbhealth,8000);
  g.bbzombiehealth=8000;g.bbzombiebase.bbhealth=6000;h.ticks();
  assert.equal(items(h.port.bb_ZombieMob.bbqueue)[0].bbtype,4);
});

test('already-fired reinforcements never replay after a live base-HP increase, but reset permits them again',()=>{
  const c=defaults();c.levels[0].waves=[];
  c.levels[0].reinforcements=[{threshold:13000,calls:[{type:4,count:1,delay:1000}]}];
  const h=fixture(c),g=h.game,mob=h.port.bb_ZombieMob;
  g.bbzombiehealth=16000;g.bbzombiebase.bbhealth=13000;h.ticks();
  assert.equal(items(mob.bbqueue).length,1);assert.equal(items(mob.bbqueue)[0].bbtype,4);
  const next=GameConfig.getCurrent(h.target);next.zombies[5].health=32000;
  GameConfig.updateLive(h.target,next,{healthPolicy:'ratio'});
  assert.equal(g.bbzombiebase.bbhealth,26000);assert.equal(g.bbzombiehealth,26000);
  mob.bbInit([]);g.bbzombiebase.bbhealth=13000;h.ticks();
  assert.deepEqual(items(mob.bbqueue),[],'a second downward crossing in the same match does not replay');
  g.bbResetGame(1);assert.equal(g.bbzombiebase.bbhealth,32000);
  g.bbzombiehealth=32000;g.bbzombiebase.bbhealth=13000;h.ticks();
  assert.equal(items(mob.bbqueue).length,1,'a new match has a fresh fired-threshold set');
});

test('blocked base reinforcements do not consume a threshold or backfill it on re-enable',()=>{
  const c=defaults();c.levels[0].waves=[];
  c.levels[0].reinforcements=[{threshold:13000,calls:[{type:4,count:1,delay:1000}]}];
  const rules=CustomRules.defaults();rules.baseReinforcements=false;
  const h=fixture(c,true,rules),g=h.game,mob=h.port.bb_ZombieMob;
  g.bbzombiehealth=16000;g.bbzombiebase.bbhealth=13000;h.ticks();
  assert.deepEqual(items(mob.bbqueue),[]);assert.equal(g.bbzombiehealth,13000);
  rules.baseReinforcements=true;CustomRules.update(h.target,rules);h.ticks();
  assert.deepEqual(items(mob.bbqueue),[],'re-enabling at the old low health does not backfill');
  g.bbzombiebase.bbhealth=14000;h.ticks();g.bbzombiebase.bbhealth=13000;h.ticks();
  assert.equal(items(mob.bbqueue).length,1,'a genuinely new crossing can fire because the earlier blocked call did not insert');
});

test('disabled waves and reinforcement calls are omitted, and an entirely disabled queue updates safely',()=>{
  const c=defaults();
  c.levels[0].waves.forEach(w=>w.enabled=false);
  c.levels[0].reinforcements=[{threshold:14000,calls:[{type:4,count:2,delay:0,enabled:false}]}];
  const compiled=GameConfig.compile(c);assert.deepEqual(compiled.raw.bb_leveldata_level1,[]);
  assert.deepEqual(compiled.reinforcements[0][0].calls,[]);
  const h=fixture(c);assert.deepEqual(items(h.port.bb_ZombieMob.bbqueue),[]);
  h.game.bbzombiehealth=16000;h.game.bbzombiebase.bbhealth=14000;h.ticks(240);
  assert.deepEqual(items(h.port.bb_ZombieMob.bbqueue),[]);assert.equal(items(h.game.bbzombies).length,1);
  const wrong=defaults();wrong.levels[0].waves[0].enabled=0;
  assert.throws(()=>GameConfig.compile(wrong),/waves\[0\]\.enabled: expected a boolean/);
});

test('all waves may be deleted and an empty saved wave list resets and updates safely',()=>{
  const c=defaults();
  for(const level of c.levels){level.waves=[];level.reinforcements=[];}
  assert.deepEqual(GameConfig.compile(c).raw.bb_leveldata_level1,[]);
  const h=fixture(c);h.ticks(120);
  assert.deepEqual(items(h.port.bb_ZombieMob.bbqueue),[]);
  assert.equal(items(h.game.bbzombies).length,1);
  const next=defaults();const other=fixture(next);
  const result=GameConfig.updateLive(other.target,c);
  assert.ok(result.deferred.includes('$.levels[0].waves'));
  other.game.bbResetGame(1);other.ticks(120);
  assert.deepEqual(items(other.port.bb_ZombieMob.bbqueue),[]);
  assert.equal(items(other.game.bbzombies).length,1);
});

test('no-op live updates are exactly idempotent even for awkward floating timer ratios',()=>{
  const c=defaults();c.units[0].buildTicks=25;const h=fixture(c),g=h.game;
  g.bbunits[0].bbbusy=7;g.bbunits[0].bborders=1;
  const person=g.bbAddPerson(g.bbunits[0]);person.bbwalkspeed=0.123456789;person.bbhealth=17;
  const before=snapshot(h);
  for(let i=0;i<20;i++)assert.deepEqual(GameConfig.updateLive(h.target,c),{applied:[],deferred:[]});
  assert.deepEqual(snapshot(h),before);
});

test('invalid input, invalid options and unwritable runtime fail before any live mutation',()=>{
  const h=fixture(),c=defaults();c.units[0].people=3;GameConfig.updateLive(h.target,c);
  const before=snapshot(h),invalid=GameConfig.getCurrent(h.target);invalid.units[0].cost=-1;
  assert.throws(()=>GameConfig.updateLive(h.target,invalid),/units\[0\]\.cost/);assert.deepEqual(snapshot(h),before);
  for(const options of [{healthPolicy:'heal'},{preserveTimerProgress:'yes'},{unknown:1},null]) {
    assert.throws(()=>GameConfig.updateLive(h.target,c,options),/GameConfig \$options/);assert.deepEqual(snapshot(h),before);
  }
  const valid=GameConfig.getCurrent(h.target);valid.units[0].cost=1;valid.zombies[0].health=200;
  Object.defineProperty(h.game.bbpowers[0],'bbxp',{writable:false});
  assert.throws(()=>GameConfig.updateLive(h.target,valid),/not writable/);assert.deepEqual(snapshot(h),before);
});

test('menu updates apply structure immediately and future global reinitialization keeps the latest configuration',()=>{
  const h=fixture(defaults(),false),c=defaults();h.game.bbmainState=1;
  c.units[0].people=3;c.units[0].cost=7;c.levels[0].startingCash=123;c.levels[0].waves.forEach(w=>w.enabled=false);
  assert.deepEqual(GameConfig.updateLive(h.target,c).deferred,[]);assert.equal(h.game.bbunits[0].bbpeople,3);
  h.game.bbPlayGame(1);assert.equal(h.game.bbztp.bbcash,123);assert.deepEqual(items(h.port.bb_ZombieMob.bbqueue),[]);
  h.target.bb_Init();h.target.bb_Main();
  const device=h.port.state.bb_mojo_app_device;device.OnCreate();device.OnUpdate();
  const game=h.port.state.bb_Game;game.bbPlayGame(1);
  assert.equal(game.bbunits[0].bbpeople,3);assert.equal(game.bbunits[0].bbcost,7);assert.equal(game.bbztp.bbcash,123);
  assert.deepEqual(items(h.port.bb_ZombieMob.bbqueue),[]);
});
