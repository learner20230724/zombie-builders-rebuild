'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const GameConfig=require('../src/game-config.js'),CustomRules=require('../src/custom-rules.js'),Factions=require('../src/factions.js'),
  SpawnQueue=require('../src/spawn-queue.js'),Customization=require('../src/customization.js'),DeathEffects=require('../src/death-effects.js');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8'),json=name=>JSON.parse(read(name));
function entries(list){const values=[],it=list.bbObjectEnumerator();while(it.bbHasNext())values.push(it.bbNextObject());return values;}
function fixture({install=true,custom=false}={}){
  const config=GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map(kind=>[kind,json('config/'+kind+'.json')])));
  for(const kind of ['units','zombies'])for(const item of config[kind].slice(0,5)){item.moveSpeed=0;if('damage' in item)item.damage=0;}
  const rules=CustomRules.defaults();rules.automaticSpawning=false;rules.baseReinforcements=false;
  const storage=new Map();if(custom)storage.set(Customization.constants.SESSION_KEY,JSON.stringify({schemaVersion:1,mode:'custom',config,rules,stage:1,selectedPresetId:null}));
  const manifest=json('public/assets/manifest.json'),draws=[];
  const drawing=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){const record=manifest.images[name];assert.ok(record,name);return {name,Width:()=>record.width,Height:()=>record.height};}},
    {get:(o,k)=>o[k]||((...args)=>{draws.push([k,...args.map(value=>typeof value==='object'?value?.name||null:value)]);return 0;})});
  const input=new Proxy({},{get:()=>()=>0}),audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
  class App{GraphicsDevice(){return drawing;}InputDevice(){return input;}AudioDevice(){return audio;}SetUpdateRate(){return 0;}MilliSecs(){return 0;}}
  const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class{},
    ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,PlayMovie:()=>0,MovieFinished:()=>1,EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0,
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    configureRuntime:()=>0,location:{reload:()=>0},ZTPRuntime:{getStatus:()=>({running:false}),stop:()=>0,advance:()=>0,useRealtime:()=>0,start:()=>0}});
  vm.runInContext(read('src/generated-game.js'),target);
  const prepared=Customization.prepare(config,config,target);
  GameConfig.install(target,prepared.configuration);CustomRules.install(target,custom?prepared.rules:rules);Factions.install(target);
  if(install)DeathEffects.install(target);
  target.Factions=Factions;target.SpawnQueue=SpawnQueue;target.DeathEffects=DeathEffects;SpawnQueue.install(target);
  target.bb_Init();target.bb_Main();const port=target.ZTPGamePort,device=port.state.bb_mojo_app_device;device.OnCreate();device.OnUpdate();
  const game=port.state.bb_Game,controller=Customization.attach(target,{prepared});if(!custom)game.bbPlayGame(1);
  return {target,port,device,game,controller,draws,tick(n=1){for(let i=0;i<n;i++)game.bbGameTick(0);},
    spawn(camp,kind,type){const b=CustomRules.withManualSpawn(target,()=>Factions.spawn(target,camp,{kind,type},1))[0];b.bbxpos=800;b.bbypos=0;b.bblayer=0;return b;}};
}
function visuals(h){return [...entries(h.game.bbdeathlist),...entries(h.game.bbbodyparts),...entries(h.game.bbexplosions)];}
function kill(h,body){if(typeof body.bbInfect==='function')body.bbInfect(body.bbhealth+1);else body.bbSmack(body.bbhealth+1,1);h.tick();}
function matrix(h){const c=h.port.state.bb_mojo_graphics_context;return [c.bbix,c.bbiy,c.bbjx,c.bbjy,c.bbtx,c.bbty,c.bbmatrixSp];}
function drawBasis(h,effect){
  h.port.bb_mojo_graphics_SetMatrix(1,0,0,1,0,0);
  const sheet=effect.bbsheet||effect.bbskin.bbsheet,original=sheet.bbblit,captured=[];
  sheet.bbblit=function(){captured.push(matrix(h));return original.apply(this,arguments);};
  try{effect.bbDraw(17,600);}finally{sheet.bbblit=original;}
  assert.deepEqual(matrix(h),[1,0,0,1,0,0,0]);assert.equal(captured.length,1);
  return captured[0];
}
function metrics(h){const g=h.game;return {seed:h.port.state.bb_std_random_Seed,xp:g.bbztp.bbxp,force:g.bbztp.bbforce,kills:g.bbzombieskilled,lost:g.bbkinlost,
  people:entries(g.bbpeople).map(b=>[b.bbunit.bbtype,b.bbxpos,b.bbhealth,b.bbmode]),
  enemy:entries(g.bbzombies).map(b=>[b.bbunit.bbtype,b.bbxpos,b.bbhealth,b.bbmode]),
  converted:entries(g.bbpombies).map(b=>[b.bbunit.bbtype,b.bbxpos,b.bbhealth,b.bbmode])};}
function visualData(e){return ['bbxpos','bbypos','bblayer','bbvelx','bbvely','bbframe','bbthrow','bbcloud','bbzoom','bbbrecycle','bbrecycle','bbbounce'].map(k=>e[k]);}

test('natural death draws all twenty camp/species combinations with current-camp orientation',()=>{
  for(const camp of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++){
    const h=fixture(),body=h.spawn(camp,kind,type);kill(h,body);const effects=visuals(h);assert.ok(effects.length,camp+'/'+kind+'/'+type);
    const flipped=(kind==='unit')===(camp==='enemy');
    for(const effect of effects){const basis=drawBasis(h,effect);assert.equal(basis[0],flipped?-1:1,camp+'/'+kind+'/'+type);assert.equal(basis[3],1);}
    assert.equal(Factions.getSide(h.target,body),null);
  }
});

test('mirroring does not change natural rewards, damage, population, random sequence or effect lifetime',()=>{
  for(const camp of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++){
    const a=fixture({install:false}),b=fixture();kill(a,a.spawn(camp,kind,type));kill(b,b.spawn(camp,kind,type));
    assert.deepEqual(metrics(a),metrics(b));const old=visuals(a),fixed=visuals(b);assert.equal(old.length,fixed.length);
    for(let i=0;i<old.length;i++){
      assert.equal(fixed[i].bbypos,old[i].bbypos);assert.equal(fixed[i].bblayer,old[i].bblayer);
      if(kind==='zombie'&&camp==='friendly'&&Number.isFinite(old[i].bbvelx))assert.equal(fixed[i].bbvelx,-old[i].bbvelx);
      else assert.deepEqual(visualData(fixed[i]),visualData(old[i]));
    }
    a.tick(12);b.tick(12);assert.deepEqual(metrics(a),metrics(b));
    if(kind==='zombie'&&camp==='friendly')for(let i=0;i<old.length;i++)if(Number.isFinite(old[i].bbvelx)){
      assert.equal(fixed[i].bbxpos,1600-old[i].bbxpos);assert.equal(fixed[i].bbvelx,-old[i].bbvelx);assert.equal(fixed[i].bbypos,old[i].bbypos);
    }
    a.tick(500);b.tick(500);assert.equal(visuals(a).length,0);assert.equal(visuals(b).length,0);assert.deepEqual(metrics(a),metrics(b));
  }
});

test('original native death rendering and random stream are byte-for-byte unchanged',()=>{
  const a=fixture({install:false}),b=fixture();
  for(const h of [a,b])for(const [camp,kind,type]of [['friendly','unit',0],['friendly','unit',1],['friendly','unit',4],['enemy','zombie',0],['enemy','zombie',1],['enemy','zombie',2],['enemy','zombie',3],['enemy','zombie',4]])kill(h,h.spawn(camp,kind,type));
  for(let frame=0;frame<300;frame++)for(const h of [a,b]){h.tick();h.game.bbRenderHorde();}
  assert.deepEqual(metrics(a),metrics(b));assert.deepEqual(a.draws,b.draws);
});

test('converted actors use their death-time camp, not constructor species or former camp',()=>{
  for(const kind of ['unit','zombie'])for(const from of ['friendly','enemy'])for(const to of ['friendly','enemy']){
    const h=fixture(),body=h.spawn(from,kind,0);if(from!==to)assert.equal(Factions.convert(h.target,body,to),true);
    kill(h,body);const expected=(kind==='unit')===(to==='enemy')?-1:1;
    for(const effect of visuals(h))assert.equal(drawBasis(h,effect)[0],expected,kind+'/'+from+'→'+to);
  }
});

test('single-side, typed and both-side sandbox clears render actual mirrored death visuals without rewards',()=>{
  for(const mode of ['friendly','enemy','both','typed']){
    const h=fixture({custom:true}),bodies=[];
    for(const camp of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++){
      const body=h.spawn(camp,kind,type);body.bbxpos+=bodies.length*5;bodies.push({body,camp,kind,type});
    }
    const before=metrics(h),seed=h.port.state.bb_std_random_Seed;
    const result=mode==='both'?h.controller.clearAllTroops():mode==='typed'?h.controller.clearEnemyTroops({kind:'unit',type:0}):mode==='friendly'?h.controller.clearFriendlyTroops():h.controller.clearEnemyTroops();
    assert.equal(result.count,mode==='both'?20:mode==='typed'?1:10);assert.equal(h.port.state.bb_std_random_Seed,seed);
    assert.equal(h.game.bbztp.bbxp,before.xp);assert.equal(h.game.bbzombieskilled,before.kills);assert.equal(h.game.bbkinlost,before.lost);
    for(const effect of visuals(h)){
      // Detached explosions have mirrored source offsets; map to the nearest
      // original actor. Stable 100px separation is unnecessary for sprites and
      // debris, whose origins identify the matching source exactly.
      const sheet=effect.bbsheet;
      const source=bodies.find(v=>v.body.bbxpos===effect.bbxpos&&((sheet===h.game.bbshoveldeathsheet&&v.type===0&&v.kind==='unit')||
        (sheet===h.game.bbshotgundeathsheet&&v.type===1&&v.kind==='unit')||(sheet===h.game.bbpreacherdeathsheet&&v.type===4&&v.kind==='unit')||
        (v.kind==='zombie'&&[h.game.bbzombiepartsheet,h.game.bbghoulpartsheet,h.game.bbfastzombiepartsheet,h.game.bbfatzombiepartsheet][v.type]===sheet)));
      if(source)assert.equal(drawBasis(h,effect)[0],(source.kind==='unit')===(source.camp==='enemy')?-1:1);
    }
    const initialVisuals=visuals(h);h.game.bbmainState=6;const state=initialVisuals.map(visualData);for(let i=0;i<20;i++)h.device.OnUpdate();assert.deepEqual(visuals(h).map(visualData),state);
    h.game.bbmainState=2;h.tick(600);const remaining=new Set(visuals(h));for(const effect of initialVisuals){assert.equal(effect.bbrecycle,1);assert.equal(remaining.has(effect),false);}if(mode==='both')assert.equal(remaining.size,0);
  }
});

test('manual mirrored bomber blast offsets and fragment velocities reflect once, including idempotent tagging',()=>{
  const h=fixture(),body=h.spawn('enemy','unit',3),part=new h.port.bb_BodyPart().bbBodyPart_new(0,h.game.bbzombiepartsheet,1,800,0,2,-3);
  body.bbxpos=800;
  const blast=new h.port.bb_Explosion().bbExplosion_new(0,h.port.bb_Cell.bbcells(h.game.bbexplosionsheet),790,0,2);
  DeathEffects.tag(h.target,blast,body);assert.equal(blast.bbxpos,810);DeathEffects.tag(h.target,blast,body);assert.equal(blast.bbxpos,810);assert.equal(drawBasis(h,blast)[0],-1);
  const zombie=h.spawn('friendly','zombie',0);DeathEffects.tag(h.target,part,zombie);assert.equal(part.bbvelx,-2);DeathEffects.tag(h.target,part,zombie);assert.equal(part.bbvelx,-2);assert.equal(drawBasis(h,part)[0],-1);
});

test('draw exception restores the caller matrix and death-context exceptions never tag unrelated visuals',()=>{
  const h=fixture(),body=h.spawn('enemy','unit',0);kill(h,body);const effect=entries(h.game.bbdeathlist)[0],sheet=effect.bbsheet,original=sheet.bbblit;
  h.port.bb_mojo_graphics_SetMatrix(2,0,0,3,5,7);const saved=matrix(h);sheet.bbblit=()=>{throw Error('drawing failed');};
  assert.throws(()=>effect.bbDraw(9,500),/drawing failed/);assert.deepEqual(matrix(h),saved);sheet.bbblit=original;
  const create=h.port.bb_Death.prototype.bbDeath_new;h.port.bb_Death.prototype.bbDeath_new=()=>{throw Error('death failed');};
  assert.throws(()=>h.game.bbBlowZombie(body),/death failed/);h.port.bb_Death.prototype.bbDeath_new=create;
  const unrelated=new h.port.bb_Death().bbDeath_new(h.game.bbshoveldeathsheet,0,600,0);assert.equal(drawBasis(h,unrelated)[0],1);
});

test('installation is idempotent and required before initialized gameplay; tagging validates without RNG',()=>{
  const h=fixture(),draw=h.port.bb_Death.prototype.bbDraw,seed=h.port.state.bb_std_random_Seed;
  assert.equal(DeathEffects.install(h.target),h.target);assert.equal(h.port.bb_Death.prototype.bbDraw,draw);
  assert.throws(()=>DeathEffects.tag(h.target,{},h.game.bbpeoplebase),/non-base/);assert.equal(h.port.state.bb_std_random_Seed,seed);
  const old=fixture({install:false});assert.throws(()=>DeathEffects.install(old.target),/before bb_Main/);
});

test('a readonly late hook rejects installation before any prototype method is changed',()=>{
  const target=vm.createContext({console,gxtkApp:class{},gxtkSurfaceListener:class{}});vm.runInContext(read('src/generated-game.js'),target);
  const port=target.ZTPGamePort,leaf=port.bb_Zomba.prototype.bbBlowZombie,death=port.bb_Death.prototype.bbDeath_new;
  Object.freeze(port.bb_Explosion.prototype);
  assert.throws(()=>DeathEffects.install(target),/read-only/);
  assert.equal(port.bb_Zomba.prototype.bbBlowZombie,leaf);assert.equal(port.bb_Death.prototype.bbDeath_new,death);
});
