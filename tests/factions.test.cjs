'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const GameConfig=require('../src/game-config.js'),CustomRules=require('../src/custom-rules.js'),Factions=require('../src/factions.js');
const TROOP_SLOTS=CustomRules.ENTITY_LIMIT-2;
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8'),json=name=>JSON.parse(read(name));
function config(){return GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map(kind=>[kind,json('config/'+kind+'.json')])));}
function entries(list){const a=[],it=list.bbObjectEnumerator();while(it.bbHasNext())a.push(it.bbNextObject());return a;}
function fixture(edit,adapt=true){
 const c=config();if(edit)edit(c);const r=CustomRules.defaults();r.automaticSpawning=false;r.baseReinforcements=false;
 const manifest=json('public/assets/manifest.json'),draws=[];
 const drawing=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){const i=manifest.images[name];assert.ok(i,name);return {Width:()=>i.width,Height:()=>i.height};}}, {get:(o,k)=>o[k]||((...args)=>{draws.push([k,...args]);return 0;})});
 const input=new Proxy({}, {get:()=>()=>0}),audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
 class App{GraphicsDevice(){return drawing;}InputDevice(){return input;}AudioDevice(){return audio;}SetUpdateRate(){return 0;}MilliSecs(){return 0;}}
 const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class{},ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,PlayMovie:()=>0,MovieFinished:()=>1,EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0});
 vm.runInContext(read('src/generated-game.js'),target);GameConfig.install(target,c);CustomRules.install(target,r);if(adapt)Factions.install(target);
 target.bb_Init();target.bb_Main();const port=target.ZTPGamePort,device=port.state.bb_mojo_app_device;device.OnCreate();device.OnUpdate();const game=port.state.bb_Game;game.bbPlayGame(1);
 return {target,port,game,c,draws,ticks(n=1){for(let i=0;i<n;i++)game.bbGameTick(0);},spawn(camp,kind,type,count=1){return CustomRules.withManualSpawn(target,()=>Factions.spawn(target,camp,{kind,type},count));}};
}
function stationary(c){for(const kind of ['units','zombies'])for(const item of c[kind].slice(0,5)){item.moveSpeed=0;if('damage'in item)item.damage=0;}}
function place(body,x){body.bbxpos=x;body.bbypos=0;body.bblayer=0;return body;}
function until(h,fn,max=2000){for(let n=0;n<max;n++){if(fn())return n;h.ticks();}assert.fail('expected real engine event within '+max+' ticks');}

test('all twenty camp/species combinations spawn with original species stats and no population reservation',()=>{
 const h=fixture();for(const camp of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++){
  const before=h.game.bbztp.bbforce,actors=h.spawn(camp,kind,type,2);assert.equal(actors.length,2);
  for(const b of actors){assert.equal(b.bbunit.bbtype,type+(kind==='zombie'?32:0));assert.equal(Factions.getSide(h.target,b),camp);assert.equal(b.bbxpos,camp==='friendly'?0:1600);assert.equal(GameConfig.getMaximumHealth(h.target,b),h.c[kind==='unit'?'units':'zombies'][type].health);}
  assert.equal(h.game.bbztp.bbforce,before);assert.equal(Factions.list(h.target,{side:camp,kind,type}).length,2);
 }assert.equal(Factions.list(h.target).length,40);assert.equal(Factions.list(h.target,{includeBases:true}).length,42);
});

test('installing adapter alone keeps native battles and random stream exactly unchanged',()=>{
 const a=fixture(null,false),b=fixture();for(const h of [a,b]){h.game.bbAddPerson(h.game.bbunits[0]);h.game.bbAddZombie(h.game.bbzunits[0]);h.ticks(1200);}
 function view(h){return {seed:h.port.state.bb_std_random_Seed,xp:h.game.bbztp.bbxp,p:entries(h.game.bbpeople).map(b=>[b.bbunit.bbtype,b.bbxpos,b.bbhealth,b.bbmode]),z:entries(h.game.bbzombies).map(b=>[b.bbunit.bbtype,b.bbxpos,b.bbhealth,b.bbmode])};}
 assert.deepEqual(view(a),view(b));
});

test('batch capacity includes every camp/species, bases and converted actors; invalid input is atomic',()=>{
 const h=fixture(),seed=h.port.state.bb_std_random_Seed;
 for(const request of [['bad',{kind:'unit',type:0},1],['friendly',{kind:'unit',type:5},1],['enemy',{kind:'zombie',type:1},0],['enemy',{kind:'unit',type:0},Infinity]])assert.throws(()=>Factions.spawn(h.target,...request),/Factions/);
 assert.equal(h.port.state.bb_std_random_Seed,seed);
 // Unique inert native bodies exercise the exact 10,000 membership boundary
 // without creating 9,998 animated adapters just to test a three-slot clamp.
 for(let i=0;i<TROOP_SLOTS-3;i++){
  const body=new h.port.bb_Zombie().bbZombie_new(0,h.game.bbzunits[0],null);body.bbmode=16;h.game.bbzombies.bbAddLast(body);
 }
 assert.equal(Factions.validateSpawn(h.target,'enemy',{kind:'unit',type:0},2147483647).capacity,3);
 assert.equal(h.spawn('enemy','unit',0,2147483647).length,3);assert.equal(h.spawn('friendly','zombie',3,1).length,0);assert.equal(CustomRules.getEntityCapacity(h.target),0);
 assert.equal(Factions.list(h.target,{includeBases:true}).length,10000);
});

test('native paused battle permits cross-side spawning without unpausing',()=>{const h=fixture();h.game.bbmainState=6;assert.equal(h.spawn('enemy','unit',2).length,1);assert.equal(h.spawn('friendly','zombie',4).length,1);assert.equal(h.game.bbmainState,6);});

test('enemy pickup gunner fires naturally at friendly zombie and never its own camp',()=>{
 const h=fixture(c=>{stationary(c);c.units[2].damage=5;c.zombies[0].health=1000;});
 const gun=place(h.spawn('enemy','unit',2)[0],900),victim=place(h.spawn('friendly','zombie',0)[0],800),witness=place(h.spawn('enemy','unit',0)[0],800);
 until(h,()=>victim.bbhealth<1000,100);assert.equal(victim.bbhealth,995);assert.equal(witness.bbhealth,50);assert.equal(gun.bbmode,5);
});

test('enemy shovel and farmer retain native animation hit timing and damage friendly humans',()=>{
 for(const type of [0,1]){const h=fixture(c=>{stationary(c);c.units[type].damage=17;c.units[0].health=1000;});
 const enemy=place(h.spawn('enemy','unit',type)[0],700),victim=place(h.spawn('friendly','unit',0)[0],type===0?675:600);
 until(h,()=>victim.bbhealth<1000,200);assert.equal(victim.bbhealth,983);assert.ok(enemy.bbskin.bbframe>1);}
});

test('enemy preacher converts paid human identity once, releases reserved population and flips real combat camp',()=>{
 const h=fixture(c=>stationary(c)),g=h.game;const human=g.bbAddPerson(g.bbunits[0]);g.bbztp.bbforce=1;place(human,650);
 const priest=place(h.spawn('enemy','unit',4)[0],900);
 until(h,()=>Factions.getSide(h.target,human)==='enemy',250);assert.equal(g.bbztp.bbforce,0);assert.equal(human.bbunit.bbtype,0);assert.ok(entries(g.bbzombies).includes(human));assert.ok(!entries(g.bbpeople).includes(human));
 assert.equal(Factions.convert(h.target,human,'enemy'),false);assert.equal(g.bbztp.bbforce,0);assert.equal(priest.bbunit.bbtype,4);
 assert.equal(Factions.convert(h.target,human,'friendly'),true);assert.equal(human.bbunit.bbtype,0);assert.equal(g.bbztp.bbforce,0);assert.equal(Factions.getSide(h.target,human),'friendly');
});

test('enemy preacher converts friendly fat zombie while friendly native preacher converts enemy human',()=>{
 const h=fixture(c=>stationary(c)),fat=place(h.spawn('friendly','zombie',3)[0],700);place(h.spawn('enemy','unit',4)[0],900);
 until(h,()=>Factions.getSide(h.target,fat)==='enemy',250);assert.equal(fat.bbdirection,1);
 const second=fixture(c=>stationary(c)),enemy=place(second.spawn('enemy','unit',0)[0],850);place(second.spawn('friendly','unit',4)[0],600);
 until(second,()=>Factions.getSide(second.target,enemy)==='friendly',250);assert.equal(enemy.bbunit.bbtype,0);assert.equal(enemy.bbdirection,-1);
});

test('conversion toggle blocks both original and mirrored priest without disabling animation',()=>{
 for(const camp of ['friendly','enemy']){const h=fixture(c=>stationary(c)),r=CustomRules.snapshot(h.target);r.abilities.preacherConversion=false;CustomRules.update(h.target,r);
 const victim=place(h.spawn(camp==='friendly'?'enemy':'friendly','unit',0)[0],camp==='friendly'?850:650);place(h.spawn(camp,'unit',4)[0],camp==='friendly'?600:900);h.ticks(450);assert.equal(Factions.getSide(h.target,victim),camp==='friendly'?'enemy':'friendly');}
});

test('friendly fat naturally applies original pooled AOE to enemy humans only',()=>{
 const h=fixture(c=>{stationary(c);c.zombies[3].damage=60;c.units[0].health=10;c.units[1].health=1000;});
 place(h.spawn('friendly','zombie',3)[0],500);const a=place(h.spawn('enemy','unit',0)[0],555),b=place(h.spawn('enemy','unit',1)[0],575),friend=place(h.spawn('friendly','unit',1)[0],575);
 until(h,()=>a.bbhealth===0,100);assert.equal(b.bbhealth,950);assert.equal(friend.bbhealth,1000);
});

test('enemy bomber projectile travels left, damages only friendly actors and retains shot-side after conversion',()=>{
 const h=fixture(c=>{stationary(c);c.units[0].health=1000;}),bomber=place(h.spawn('enemy','unit',3)[0],900),victim=place(h.spawn('friendly','unit',0)[0],500),friend=place(h.spawn('enemy','unit',0)[0],500);
 until(h,()=>entries(h.game.bbbottles).length>0,100);const bottle=entries(h.game.bbbottles)[0];assert.equal(bottle.bbvelx,-4);Factions.convert(h.target,bomber,'friendly');
 until(h,()=>victim.bbhealth<1000,200);assert.equal(victim.bbhealth,900);assert.equal(friend.bbhealth,1000);
});

test('friendly corpse really throws right, hurts enemies not allies and spawns friendly zombie at impact',()=>{
 const h=fixture(c=>{stationary(c);c.units[0].health=1000;}),corpse=place(h.spawn('friendly','zombie',4)[0],400),victim=place(h.spawn('enemy','unit',0)[0],1160),friend=place(h.spawn('friendly','unit',0)[0],1160);
 until(h,()=>entries(h.game.bbflinglist).length>0,500);const fling=entries(h.game.bbflinglist)[0],x=fling.bbxpos;h.ticks();assert.equal(fling.bbxpos,x+7.5);
 until(h,()=>victim.bbhealth<1000,130);assert.equal(victim.bbhealth,500);assert.equal(friend.bbhealth,1000);
 const spawned=Factions.list(h.target,{side:'friendly',kind:'zombie',type:0});assert.equal(spawned.length,1);assert.ok(spawned[0].bbxpos>=1179&&spawned[0].bbxpos<=1181);assert.equal(corpse.bbdirection,-1);
});

test('friendly corpse impact-spawn switch suppresses extra actor without suppressing the actual blast',()=>{
 const h=fixture(c=>{stationary(c);c.units[0].health=1000;}),r=CustomRules.snapshot(h.target);r.corpseSpawnOnImpact=false;CustomRules.update(h.target,r);
 place(h.spawn('friendly','zombie',4)[0],400);const victim=place(h.spawn('enemy','unit',0)[0],1160);until(h,()=>victim.bbhealth<1000,650);assert.equal(victim.bbhealth,500);assert.equal(Factions.list(h.target,{side:'friendly',kind:'zombie',type:0}).length,0);
});

test('enemy corpse damages converted friendly zombies and keeps impact newborn enemy',()=>{
 const h=fixture(c=>{stationary(c);c.zombies[0].health=1000;}),corpse=place(h.spawn('enemy','zombie',4)[0],1200),victim=place(h.spawn('friendly','zombie',0)[0],420),friend=place(h.spawn('enemy','unit',0)[0],420);
 until(h,()=>victim.bbhealth<1000,650);assert.equal(victim.bbhealth,500);assert.equal(friend.bbhealth,50);assert.equal(Factions.list(h.target,{side:'enemy',kind:'zombie',type:0}).length,1);assert.equal(corpse.bbdirection,1);
});

test('cross humans retain live source-species HP ratios, speed and template damage on either allegiance',()=>{
 const h=fixture(c=>stationary(c)),a=h.spawn('enemy','unit',2)[0],b=h.spawn('friendly','zombie',3)[0];a.bbhealth=200;b.bbhealth=500;
 const c=GameConfig.getCurrent(h.target);c.units[2].health=800;c.units[2].damage=11;c.units[2].moveSpeed=2;c.zombies[3].health=2000;
 GameConfig.updateLive(h.target,c,{healthPolicy:'ratio',multipliers:{units:{health:1.5,moveSpeed:1.5,damage:2},zombies:{health:1.5,moveSpeed:1,damage:1}}});
 assert.equal(a.bbhealth,600);assert.equal(GameConfig.getMaximumHealth(h.target,a),1200);assert.equal(a.bbwalkspeed,3);assert.equal(a.bbunit.bbdamage,22);assert.equal(b.bbhealth,1500);assert.equal(GameConfig.getMaximumHealth(h.target,b),3000);
 Factions.convert(h.target,a,'friendly');assert.equal(a.bbhealth,600);assert.equal(a.bbunit.bbdamage,22);
});

test('mirrored enemy humans and friendly catapult render without invalid geometry; reset removes custom actors',()=>{
 const h=fixture();const a=h.spawn('enemy','unit',2)[0],b=h.spawn('friendly','zombie',4)[0];a.bbDraw(0,808);b.bbDraw(0,808);h.game.bbRenderHorde();
 for(const call of h.draws)for(const item of call)if(typeof item==='number')assert.ok(Number.isFinite(item));
 h.game.bbPlayGame(1);assert.equal(Factions.list(h.target).length,0);assert.equal(Factions.getSide(h.target,a),null);
});


test('strict species/list JSON and frozen destination preflights preserve actors and RNG',()=>{
 const h=fixture(),seed=h.port.state.bb_std_random_Seed;
 const inherited=Object.create({kind:'unit',type:0}),accessor={kind:'unit'};
 Object.defineProperty(accessor,'type',{get(){throw Error('accessor evaluated');},enumerable:true});
 for(const selection of [inherited,accessor,{kind:'unit',type:0,extra:1}])assert.throws(()=>Factions.spawn(h.target,'enemy',selection),/Factions/);
 assert.throws(()=>Factions.list(h.target,Object.create({side:'enemy'})),/Factions/);
 Object.freeze(h.game.bbpombies.bb_head);
 assert.throws(()=>h.spawn('enemy','unit',0),/read-only/);assert.equal(Factions.list(h.target).length,0);assert.equal(h.port.state.bb_std_random_Seed,seed);
});

test('failed cross-camp conversion preflight cannot remove a paid actor or refund population',()=>{
 const h=fixture(),body=h.game.bbAddPerson(h.game.bbunits[0]);h.game.bbztp.bbforce=1;
 Object.defineProperty(body,'bbunit',{writable:false});
 assert.throws(()=>Factions.convert(h.target,body,'enemy'),/read-only/);
 assert.equal(Factions.getSide(h.target,body),'friendly');assert.equal(h.game.bbztp.bbforce,1);assert.equal(body.bbunit.bbtype,0);
});

test('enemy-human death awards once with int32 saturation, converted-human death gives no extra XP',()=>{
 const h=fixture(c=>{c.units[0].health=2000000000;}),a=h.spawn('enemy','unit',0)[0],b=h.spawn('enemy','unit',0)[0];
 a.bbhealth=b.bbhealth=0;a.bbmode=b.bbmode=14;h.ticks();assert.equal(h.game.bbztp.bbxp,2147483647);assert.equal(h.game.bbzombieskilled,2);h.ticks();assert.equal(h.game.bbzombieskilled,2);
 const c=h.spawn('enemy','unit',0)[0];Factions.convert(h.target,c,'friendly');c.bbhealth=0;c.bbmode=14;h.ticks();assert.equal(h.game.bbztp.bbxp,2147483647);assert.equal(h.game.bbzombieskilled,2);
});

test('corpse throwing disabled prevents actual friendly projectile creation',()=>{
 const h=fixture(c=>{stationary(c);c.units[0].health=1000;}),r=CustomRules.snapshot(h.target);r.abilities.corpseThrowing=false;CustomRules.update(h.target,r);
 place(h.spawn('friendly','zombie',4)[0],400);const victim=place(h.spawn('enemy','unit',0)[0],1160);h.ticks(650);assert.equal(entries(h.game.bbflinglist).length,0);assert.equal(victim.bbhealth,1000);
});
