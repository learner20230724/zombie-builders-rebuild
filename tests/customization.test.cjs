'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const GameConfig=require('../src/game-config.js');
const CustomRules=require('../src/custom-rules.js');
const Factions=require('../src/factions.js');
const SpawnQueue=require('../src/spawn-queue.js');
const Customization=require('../src/customization.js');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const baseline=()=>GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map(kind=>[kind,JSON.parse(read('config/'+kind+'.json'))])));
const constants=Customization.constants;
function noWaveIds(config) {const copy=plain(config);for(const level of copy.levels)for(const wave of level.waves)delete wave.id;return copy;}
function oldSourceFingerprint(config) {
  const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
  const text=JSON.stringify(canonical(noWaveIds(config))),lanes=[0x811c9dc5,0x9e3779b9,0x85ebca6b,0xc2b2ae35];
  for(let n=0;n<text.length;n++)for(let lane=0;lane<lanes.length;lane++)lanes[lane]=Math.imul(lanes[lane]^text.charCodeAt(n),0x01000193+lane*2);
  return text.length+':'+lanes.map(lane=>(lane>>>0).toString(16).padStart(8,'0')).join('');
}
function entries(list) {const values=[],it=list.bbObjectEnumerator();while(it.bbHasNext())values.push(it.bbNextObject());return values;}
function dispatch(h,count=1) {
  const mob=h.target.ZTPGamePort.bb_ZombieMob;
  for(let i=0;i<count;i++) {const head=entries(mob.bbqueue)[0];assert.ok(head,'dispatch requires a queued group');head.bbtime=1000;mob.bbticks=60;mob.bbUpdate();}
}
function fixture({storage=new Map(),external=baseline(),custom=false,throwStorage=false,throwWrites=false,finishIntro=true,timeScale=1,traceTiming=false}={}) {
  if(custom) storage.set(constants.SESSION_KEY,JSON.stringify({schemaVersion:1,mode:'custom',config:external,rules:CustomRules.defaults(),stage:1,selectedPresetId:null}));
  const manifest=JSON.parse(read('public/assets/manifest.json'));
  const drawing=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){const image=manifest.images[name];assert.ok(image,name);return {Width:()=>image.width,Height:()=>image.height};}},{get:(target,key)=>target[key]||(()=>0)});
  const input=new Proxy({},{get:()=>()=>0}), audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
  const updateRates=[],timingEvents=[];
  class App {GraphicsDevice(){return drawing;}InputDevice(){return input;}AudioDevice(){return audio;}SetUpdateRate(rate){this.updateRate=rate;updateRates.push(rate);timingEvents.push('rate:'+rate);return 0;}MilliSecs(){return 0;}}
  let namespace=constants.ORIGINAL_STORAGE, reloads=0, ended=0;
  const runtimeCalls=[],runtimeState={running:true,timeScale},events=[];
  const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class {},
    localStorage:{getItem:key=>{if(throwStorage)throw Error('storage off');return storage.get(key)||null;},setItem:(key,value)=>{if(throwStorage||throwWrites)throw Error('storage full');storage.set(key,value);}},
    ReadInt:(group,key)=>Number(storage.get(namespace+'/shared/'+group+'/'+key)||0)|0,
    WriteInt:(group,key,value)=>storage.set(namespace+'/shared/'+group+'/'+key,String(value|0)),FlushInts:()=>0,
    PlayMovie:()=>0,MovieFinished:()=>finishIntro?1:0,EndMovie:()=>{ended++;timingEvents.push('end-movie');},ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0,
    configureRuntime:options=>{if(runtimeState.running)throw Error('Stop the runtime before reconfiguring it');namespace=options.storageKey;},location:{reload:()=>{reloads++;}},
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},dispatchEvent:event=>events.push(event),
    ZTPRuntime:{getStatus:()=>({...runtimeState}),stop:()=>{runtimeCalls.push('stop');runtimeState.running=false;},advance:n=>runtimeCalls.push('advance:'+n),
      useRealtime:()=>runtimeCalls.push('realtime'),start:()=>{runtimeCalls.push('start');runtimeState.running=true;}}
  });
  vm.runInContext(read('src/generated-game.js'),target);
  const prepared=Customization.prepare(baseline(),external,target);
  namespace=prepared.storageKey;
  GameConfig.install(target,prepared.configuration,{multipliers:prepared.rules.multipliers});CustomRules.install(target,prepared.rules);
  target.Factions=Factions;Factions.install(target);target.SpawnQueue=SpawnQueue;SpawnQueue.install(target);
  if(traceTiming){const original=target.ZTPGamePort.bb_Zomba.prototype.bbPlayGame;target.ZTPGamePort.bb_Zomba.prototype.bbPlayGame=function(stage){timingEvents.push('play:'+stage);return original.apply(this,arguments);};}
  target.bb_Init();target.bb_Main();
  const device=target.ZTPGamePort.state.bb_mojo_app_device;device.OnCreate();device.OnUpdate();
  const beforeAttach={mainState:target.ZTPGamePort.state.bb_Game.bbmainState,updateRate:device.updateRate};
  const controller=Customization.attach(target,{prepared}),game=target.ZTPGamePort.state.bb_Game;
  return {target,controller,game,device,storage,events,runtimeCalls,prepared,beforeAttach,updateRates,timingEvents,get namespace(){return namespace;},get reloads(){return reloads;},get ended(){return ended;}};
}

test('custom auto-start ends an unfinished intro, restores the native 60 Hz rate, then starts gameplay',()=>{
  const h=fixture({custom:true,finishIntro:false,traceTiming:true});
  assert.deepEqual(h.beforeAttach,{mainState:0,updateRate:30});
  assert.deepEqual(h.updateRates,[30,60]);
  assert.deepEqual(h.timingEvents,['rate:30','end-movie','rate:60','play:1']);
  assert.equal(h.device.updateRate,60);assert.equal(h.game.bbmainState,2);assert.equal(h.game.bbdifficulty,0);
  assert.equal(h.ended,1);assert.deepEqual(h.runtimeCalls,[]);
});

test('the original intro keeps its original 30-to-60 Hz transition without a custom auto-start',()=>{
  const h=fixture({finishIntro:false,traceTiming:true}),seed=h.target.ZTPGamePort.state.bb_std_random_Seed;
  assert.equal(h.game.bbmainState,0);assert.equal(h.device.updateRate,30);assert.deepEqual(h.updateRates,[30]);
  assert.equal(h.ended,0);h.target.MovieFinished=()=>1;h.device.OnUpdate();
  assert.equal(h.game.bbmainState,1);assert.equal(h.device.updateRate,60);assert.deepEqual(h.updateRates,[30,60]);
  assert.deepEqual(h.timingEvents,['rate:30','end-movie','rate:60']);
  assert.equal(h.target.ZTPGamePort.state.bb_std_random_Seed,seed);assert.equal(h.namespace,constants.ORIGINAL_STORAGE);
});

test('custom fourth-stage reloads retain 60 Hz without changing time scale, scores or the reset random sequence',()=>{
  const storage=new Map([[constants.SESSION_KEY,JSON.stringify({schemaVersion:1,mode:'custom',config:baseline(),rules:CustomRules.defaults(),stage:4,selectedPresetId:null})],
    [constants.ORIGINAL_STORAGE+'/shared/ZTPBestScores/0','1234'],[constants.CUSTOM_STORAGE+'/shared/ZTPBestScores/2','9876']]);
  const scoreBytes=()=>[...storage].filter(([key])=>key.includes('/shared/ZTPBestScores/'));
  const originalScores=scoreBytes(),a=fixture({storage,finishIntro:false,timeScale:3.5,traceTiming:true});
  const seed=a.target.ZTPGamePort.state.bb_std_random_Seed;
  assert.equal(a.game.bbdifficulty,3);assert.equal(a.device.updateRate,60);assert.equal(a.target.ZTPRuntime.getStatus().timeScale,3.5);
  assert.deepEqual(a.timingEvents,['rate:30','end-movie','rate:60','play:4']);assert.deepEqual(scoreBytes(),originalScores);
  a.controller.startCustomBattle(4,a.controller.getDraft());assert.equal(a.reloads,1);
  const b=fixture({storage,finishIntro:false,timeScale:3.5,traceTiming:true});
  assert.equal(b.game.bbdifficulty,3);assert.equal(b.device.updateRate,60);assert.equal(b.target.ZTPRuntime.getStatus().timeScale,3.5);
  assert.deepEqual(b.timingEvents,['rate:30','end-movie','rate:60','play:4']);assert.deepEqual(b.runtimeCalls,[]);
  assert.deepEqual(scoreBytes(),originalScores);assert.equal(b.target.ZTPGamePort.state.bb_std_random_Seed,seed);
});

test('baseline starts original; external configuration edits are identified as custom',()=>{
  const h=fixture();assert.equal(h.prepared.mode,'original');assert.equal(h.namespace,constants.ORIGINAL_STORAGE);
  assert.equal(h.events[0].type,'customization-ready');assert.equal(h.events[0].detail,h.controller);
  const changed=baseline();changed.zombies[0].health=35;
  const c=fixture({external:changed});assert.equal(c.prepared.mode,'custom');assert.equal(c.namespace,constants.CUSTOM_STORAGE);
  assert.equal(c.controller.getState().config.zombies[0].health,35);
});

test('immutable original session overrides edited files; custom session is retained across upgrades',()=>{
  const changed=baseline();changed.zombies[0].health=77;
  const storage=new Map([[constants.SESSION_KEY,JSON.stringify({schemaVersion:1,mode:'original',stage:null})]]);
  const h=fixture({storage,external:changed});assert.equal(h.prepared.mode,'original');assert.equal(h.controller.getState().config.zombies[0].health,25);
  h.controller.startCustomBattle(4,{config:changed,rules:CustomRules.defaults()});assert.equal(h.reloads,1);
  const next=fixture({storage,external:changed});assert.equal(next.controller.getState().stage,4);assert.equal(next.game.bbmainState,2);assert.equal(next.game.bbzunits[0].bbhealth,77);
  assert.ok(next.ended>=1);
});

test('changing external JSON after a saved session takes precedence without deleting presets',()=>{
  const storage=new Map(),h=fixture({storage}),draft=h.controller.getDraft();
  draft.config.zombies[0].health=70;h.controller.savePreset('保留预设',draft);h.controller.startCustomBattle(3,draft);
  const edited=baseline();edited.zombies[0].health=88;
  const next=fixture({storage,external:edited});
  assert.equal(next.prepared.mode,'custom');assert.equal(next.controller.getState().config.zombies[0].health,88);
  assert.equal(next.controller.getState().isBattle,false);assert.equal(next.controller.listPresets().length,1);
  assert.ok(next.controller.getState().warnings.some(message=>message.includes('外置 JSON')));
});

test('upgrading a real v0.3.0 source fingerprint retains the selected custom health and economy',()=>{
  const external=baseline(),selected=noWaveIds(baseline()),rules=CustomRules.defaults();selected.zombies[0].health=321;rules.economy.salvagePayout=777;
  const storage=new Map([[constants.SESSION_KEY,JSON.stringify({schemaVersion:1,mode:'custom',config:selected,rules,stage:2,selectedPresetId:null,sourceFingerprint:oldSourceFingerprint(external)})]]);
  const h=fixture({storage,external});assert.equal(h.controller.getState().mode,'custom');assert.equal(h.controller.getState().stage,2);
  assert.equal(h.controller.getState().config.zombies[0].health,321);assert.equal(h.controller.getState().rules.economy.salvagePayout,777);
  assert.equal(h.controller.getState().warnings.some(text=>text.includes('外置 JSON')),false);
  assert.ok(h.controller.getState().config.levels[0].waves.every(wave=>wave.id.startsWith('legacy-untracked-')));
});

test('wave identity metadata alone neither changes original mode nor discards a selected session',()=>{
  const external=baseline();for(const level of external.levels)level.waves.forEach((wave,index)=>wave.id='identity-'+level.id+'-'+index);
  const h=fixture({external});assert.equal(h.prepared.mode,'original');assert.equal(h.namespace,constants.ORIGINAL_STORAGE);
  const draft=h.controller.getDraft();draft.config.zombies[0].health=432;h.controller.startCustomBattle(1,draft);
  const renamed=plain(external);for(const level of renamed.levels)level.waves.forEach((wave,index)=>wave.id='renamed-'+level.id+'-'+index);
  const next=fixture({storage:h.storage,external:renamed});assert.equal(next.controller.getState().config.zombies[0].health,432);
  assert.equal(next.controller.getState().warnings.some(text=>text.includes('外置 JSON')),false);
});

test('legacy fingerprint compatibility does not hide real external damage or wave-order changes',()=>{
  for(const edit of [config=>{config.zombies[0].damage=11;},config=>{[config.levels[0].waves[0],config.levels[0].waves[1]]=[config.levels[0].waves[1],config.levels[0].waves[0]];}]) {
    const original=baseline(),selected=noWaveIds(baseline()),rules=CustomRules.defaults();selected.zombies[0].health=321;rules.economy.salvagePayout=777;
    const storage=new Map([[constants.SESSION_KEY,JSON.stringify({schemaVersion:1,mode:'custom',config:selected,rules,stage:2,sourceFingerprint:oldSourceFingerprint(original)})]]);
    const external=baseline();edit(external);const h=fixture({storage,external});
    assert.equal(h.controller.getState().config.zombies[0].health,25);assert.equal(h.controller.getState().rules.economy.salvagePayout,50);
    assert.equal(h.controller.getState().isBattle,false);assert.ok(h.controller.getState().warnings.some(text=>text.includes('外置 JSON')));
  }
});

test('invalid stored sessions are ignored atomically, without deleting or partially applying them',()=>{
  const changed=baseline();changed.zombies[0].health=100;
  const invalid=JSON.stringify({schemaVersion:1,mode:'custom',config:changed,rules:CustomRules.defaults(),stage:99});
  const storage=new Map([[constants.SESSION_KEY,invalid]]),h=fixture({storage});
  assert.equal(h.prepared.mode,'original');assert.equal(h.controller.getState().config.zombies[0].health,25);
  assert.equal(storage.get(constants.SESSION_KEY),invalid);assert.ok(h.controller.getState().warnings.length);
});

test('saving, selecting, exporting and importing presets never applies them to the battle',()=>{
  const h=fixture({custom:true}),draft=h.controller.getDraft();draft.config.zombies[3].health=5678;
  const oldHealth=h.game.bbzunits[3].bbhealth,record=h.controller.savePreset('胖僵尸测试',draft);
  assert.equal(h.game.bbzunits[3].bbhealth,oldHealth);assert.equal(h.controller.listPresets().length,1);
  const loaded=h.controller.loadPreset(record.id);assert.equal(loaded.config.zombies[3].health,5678);
  assert.deepEqual(Object.keys(loaded).sort(),['config','rules']);assert.doesNotThrow(()=>h.controller.exportPreset(loaded));
  const exported=h.controller.exportPreset(draft,'胖僵尸测试'), imported=h.controller.importPreset(exported);
  assert.equal(imported.name,'胖僵尸测试');assert.equal(imported.config.zombies[3].health,5678);
  assert.equal(h.game.bbzunits[3].bbhealth,oldHealth);
  const renamed=h.controller.savePreset('重命名',draft,record.id);assert.equal(renamed.id,record.id);
  assert.equal(h.controller.listPresets()[0].name,'重命名');h.controller.deletePreset(record.id);
  assert.deepEqual(h.controller.listPresets(),[]);
});

test('preset import is strictly bounded and rejects pollution, unknown fields and bad names',()=>{
  const h=fixture(),draft=h.controller.getDraft(),document={schemaVersion:1,name:'规则',...draft};
  for(const value of [
    {...document,schemaVersion:2},{...document,name:''},{...document,name:'x\u0000'},
    {...document,name:'x'.repeat(81)},{...document,unknown:true}
  ])assert.throws(()=>h.controller.importPreset(JSON.stringify(value)),/Customization/);
  assert.throws(()=>h.controller.importPreset('{bad'),/invalid JSON/);
  assert.throws(()=>h.controller.importPreset(' '.repeat(constants.MAX_IMPORT_BYTES+1)),/2 MiB/);
  const polluted=h.controller.exportPreset(draft).replace('"schemaVersion": 1','"__proto__": {"polluted":true}, "schemaVersion": 1');
  assert.throws(()=>h.controller.importPreset(polluted),/unsafe object key/);assert.equal({}.polluted,undefined);
  const invalid=plain(document);invalid.config.zombies[0].health=-3;
  assert.throws(()=>h.controller.importPreset(JSON.stringify(invalid)),/zombies\[0\].health/);
  assert.deepEqual(h.controller.listPresets(),[]);
});

test('corrupt preset library is never silently overwritten by saving a new preset',()=>{
  const corrupt='{"schemaVersion":1,"presets":"bad"}',storage=new Map([[constants.PRESETS_KEY,corrupt]]),h=fixture({storage});
  assert.deepEqual(h.controller.listPresets(),[]);
  assert.throws(()=>h.controller.savePreset('test',h.controller.getDraft()),/invalid preset library/);
  assert.equal(storage.get(constants.PRESETS_KEY),corrupt);assert.ok(h.controller.getState().warnings.some(x=>x.includes('预设库')));
});

test('preset and session storage remain usable in memory when persistent storage fails',()=>{
  const h=fixture({throwStorage:true});const record=h.controller.savePreset('内存规则',h.controller.getDraft());
  assert.ok(h.controller.loadPreset(record.id).config);assert.equal(h.controller.listPresets()[0].name,'内存规则');assert.equal(h.controller.getState().storageAvailable,false);
  assert.ok(h.controller.getState().warnings.length);
});

test('quota failure never replaces newly edited in-memory presets with older persisted values',()=>{
  const storage=new Map(),first=fixture({storage}),record=first.controller.savePreset('旧规则',first.controller.getDraft());
  const original=storage.get(constants.PRESETS_KEY),h=fixture({storage,throwWrites:true}),draft=h.controller.loadPreset(record.id);
  draft.config.zombies[0].health=123;h.controller.savePreset('新规则',draft,record.id);
  assert.equal(h.controller.loadPreset(record.id).config.zombies[0].health,123);assert.equal(h.controller.listPresets()[0].name,'新规则');
  assert.equal(storage.get(constants.PRESETS_KEY),original);assert.equal(h.controller.getState().storageAvailable,false);
});

test('reload actions require durable sessions: quota and unavailable storage preserve the current mode, game and pause token',()=>{
  for(const failure of ['quota','unavailable']) for(const action of ['start','restore']) {
    const external=baseline();if(action==='restore')external.units[0].cost=75;
    const oldSession=JSON.stringify({schemaVersion:1,mode:action==='restore'?'custom':'original',config:external,rules:CustomRules.defaults(),stage:action==='restore'?1:null,selectedPresetId:null});
    const storage=new Map([[constants.SESSION_KEY,oldSession]]);
    const h=fixture({storage,external,throwWrites:failure==='quota',throwStorage:failure==='unavailable'});
    if(h.game.bbmainState!==2)h.game.bbPlayGame(1);
    const token=h.controller.pauseForEditor(),before=h.controller.getState(),originalStorage=[...storage],originalNamespace=h.namespace;
    const liveConfig=GameConfig.getCurrent(h.target),liveRules=CustomRules.snapshot(h.target),runtimeCalls=h.runtimeCalls.slice();
    const ticks=h.game.bbgameticks,health=h.game.bbzombiebase.bbhealth,cash=h.game.bbztp.bbcash;
    const draft=h.controller.getDraft();draft.config.units[0].cost=123;draft.rules.automaticSpawning=false;
    const attempt=()=>action==='start'?h.controller.startCustomBattle(4,draft):h.controller.restoreOriginal();
    assert.throws(attempt,/无法保存启动规则.*先导出规则/);
    assert.equal(h.reloads,0);assert.equal(h.namespace,originalNamespace);assert.deepEqual(h.controller.getState(),before);
    assert.deepEqual([...storage],originalStorage);assert.deepEqual(GameConfig.getCurrent(h.target),liveConfig);assert.deepEqual(CustomRules.snapshot(h.target),liveRules);
    assert.deepEqual(h.runtimeCalls,runtimeCalls);assert.equal(h.game.bbgameticks,ticks);assert.equal(h.game.bbzombiebase.bbhealth,health);assert.equal(h.game.bbztp.bbcash,cash);
    assert.equal(h.controller.resumeFromEditor(token),true);
    // Recovery can retry in the same window; a failed candidate must not leave
    // a poisoned pending mode, cached session, or invalidated pause lifecycle.
    h.target.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
    attempt();assert.equal(h.reloads,1);
    const persisted=JSON.parse(storage.get(constants.SESSION_KEY));
    assert.equal(persisted.mode,action==='start'?'custom':'original');
    assert.equal(persisted.stage,action==='start'?4:null);
    const next=fixture({storage,external});assert.equal(next.controller.getState().mode,persisted.mode);
    assert.equal(next.controller.getState().isBattle,action==='start');
  }
});

test('a rejected reload does not poison an existing in-memory session; live editing remains available',()=>{
  const storage=new Map([[constants.SESSION_KEY,JSON.stringify({schemaVersion:1,mode:'original',stage:null})]]),h=fixture({storage,throwWrites:true});
  h.game.bbPlayGame(1);const draft=h.controller.getDraft();draft.config.units[0].cost=123;draft.rules.automaticSpawning=false;
  assert.throws(()=>h.controller.startCustomBattle(4,draft),/无法保存启动规则/);
  assert.doesNotThrow(()=>h.controller.applyDraft(draft));assert.equal(h.controller.getState().mode,'custom');assert.equal(h.game.bbunits[0].bbcost,123);
  const before=h.controller.getState();assert.throws(()=>h.controller.restoreOriginal(),/无法保存启动规则/);
  assert.deepEqual(h.controller.getState(),before);assert.equal(h.reloads,0);
  h.target.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
  h.controller.applyRules(h.controller.getState().rules);
  const session=JSON.parse(storage.get(constants.SESSION_KEY));assert.equal(session.mode,'custom');assert.equal(session.config.units[0].cost,123);
  assert.equal(session.stage,1);assert.equal(session.rules.automaticSpawning,false);
});

test('preset quota and malformed in-memory JSON values cannot silently corrupt the library',()=>{
  const h=fixture(),draft=h.controller.getDraft();
  for(let i=0;i<constants.MAX_PRESETS;i++)h.controller.savePreset('规则 '+i,draft);
  assert.throws(()=>h.controller.savePreset('超额',draft),/25/);assert.equal(h.controller.listPresets().length,25);
  const unsafe={config:baseline(),rules:CustomRules.defaults()};
  Object.defineProperty(unsafe.config.units[0],'health',{enumerable:true,get(){throw Error('getter must not run');}});
  assert.throws(()=>h.controller.exportPreset(unsafe),/JSON data properties/);
  assert.equal(h.controller.listPresets().length,25);
});

test('applying live explicitly promotes the current original battle, preserving all original record bytes',()=>{
  const storage=new Map();storage.set(constants.ORIGINAL_STORAGE+'/shared/ZTPBestScores/0','777');
  storage.set(constants.CUSTOM_STORAGE+'/shared/ZTPBestScores/0','333');
  const h=fixture({storage});h.game.bbReadScores();h.game.bbPlayGame(1);
  const original=[...storage].filter(([key])=>key.startsWith(constants.ORIGINAL_STORAGE+'/'));
  const cfg=h.controller.getDraft().config;cfg.zombies[3].health=2222;
  const result=h.controller.applyLive(cfg,{healthPolicy:'ratio'});
  assert.equal(result.promoted,true);assert.equal(h.namespace,constants.CUSTOM_STORAGE);
  assert.equal(h.game.bbrecords[0],333);assert.equal(h.game.bbzunits[3].bbhealth,2222);
  h.game.bbgameticks=123;h.game.bbGameOver(1);
  assert.deepEqual([...storage].filter(([key])=>key.startsWith(constants.ORIGINAL_STORAGE+'/')),original);
  assert.equal(storage.get(constants.CUSTOM_STORAGE+'/shared/ZTPBestScores/0'),'123');
});

test('invalid live config is rejected before promotion; menu apply is rejected',()=>{
  const h=fixture(),cfg=h.controller.getDraft().config;
  assert.throws(()=>h.controller.applyLive(cfg),/先开始/);h.game.bbPlayGame(1);
  cfg.zombies[0].health=-1;assert.throws(()=>h.controller.applyLive(cfg),/health/);
  assert.equal(h.namespace,constants.ORIGINAL_STORAGE);assert.equal(h.controller.getState().mode,'original');
});

test('combined draft validation rejects either invalid half before any original promotion or mutation',()=>{
  for(const invalidPart of ['config','rules']) {
    const h=fixture();h.game.bbPlayGame(1);
    const draft=h.controller.getDraft(),initialStorage=[...h.storage],initialConfig=GameConfig.getCurrent(h.target),initialRules=CustomRules.snapshot(h.target);
    const initialCash=h.game.bbztp.bbcash,initialHealth=h.game.bbzombiebase.bbhealth,initialCost=h.game.bbunits[0].bbcost;
    draft.config.units[0].cost=987;draft.config.zombies[5].health=18000;
    if(invalidPart==='rules')draft.rules.abilities.harvesterRange=0.5;
    else draft.config.zombies[0].health=-1;
    assert.throws(()=>h.controller.validateDraft(draft),invalidPart==='rules'?/harvesterRange/:/health/);
    assert.throws(()=>h.controller.applyDraft(draft),invalidPart==='rules'?/harvesterRange/:/health/);
    assert.equal(h.namespace,constants.ORIGINAL_STORAGE);assert.equal(h.controller.getState().mode,'original');
    assert.deepEqual([...h.storage],initialStorage);assert.deepEqual(GameConfig.getCurrent(h.target),initialConfig);assert.deepEqual(CustomRules.snapshot(h.target),initialRules);
    assert.equal(h.game.bbztp.bbcash,initialCash);assert.equal(h.game.bbzombiebase.bbhealth,initialHealth);assert.equal(h.game.bbunits[0].bbcost,initialCost);
  }
});

test('combined draft validation is pure and combined apply updates both validated halves once',()=>{
  const h=fixture();h.game.bbPlayGame(1);
  const draft=h.controller.getDraft(),initialStorage=[...h.storage];draft.config.units[0].cost=75;draft.rules.automaticSpawning=false;draft.rules.abilities.harvesterRange=333;
  const checked=h.controller.validateDraft(draft);checked.config.units[0].cost=99;
  assert.equal(draft.config.units[0].cost,75);assert.equal(h.game.bbunits[0].bbcost,50);assert.deepEqual([...h.storage],initialStorage);
  const seen=[];h.controller.subscribe(snapshot=>seen.push({cost:snapshot.config.units[0].cost,automatic:snapshot.rules.automaticSpawning}));
  const result=h.controller.applyDraft(draft,{healthPolicy:'ratio'});
  assert.equal(result.promoted,true);assert.ok(Array.isArray(result.applied));assert.ok(Array.isArray(result.deferred));
  assert.equal(h.game.bbunits[0].bbcost,75);assert.equal(CustomRules.snapshot(h.target).automaticSpawning,false);assert.equal(result.rules.abilities.harvesterRange,333);
  assert.deepEqual(seen,[{cost:75,automatic:false}]);
  const session=JSON.parse(h.storage.get(constants.SESSION_KEY));assert.equal(session.config.units[0].cost,75);assert.equal(session.rules.automaticSpawning,false);
});

test('live apply owns a short frozen-clock transaction when the editor lets the game run',()=>{
  const h=fixture();h.game.bbPlayGame(1);const draft=h.controller.getDraft();draft.config.units[0].cost=65;
  assert.equal(h.controller.getBattleStatus().battleRunning,true);
  assert.doesNotThrow(()=>h.controller.applyDraft(draft));
  assert.deepEqual(h.runtimeCalls,['stop','advance:0','realtime','start']);assert.equal(h.controller.getBattleStatus().runtimeRunning,true);
  assert.equal(h.controller.getBattleStatus().editorPaused,false);assert.equal(h.game.bbunits[0].bbcost,65);
  const token=h.controller.pauseForEditor(),before=h.runtimeCalls.slice();draft.config.units[0].cost=66;
  h.controller.applyDraft(draft);assert.deepEqual(h.runtimeCalls,before);assert.equal(h.controller.getBattleStatus().editorPaused,true);
  assert.equal(h.controller.getBattleStatus().runtimeRunning,false);h.controller.resumeFromEditor(token);
  assert.equal(h.controller.getBattleStatus().battleRunning,true);
});

test('battle status distinguishes editor locks, native game pause and live building counts without changing simulation',()=>{
  const h=fixture({custom:true});h.game.bbbuildings[0].bborders=2;
  let status=h.controller.getBattleStatus();assert.equal(status.battleRunning,true);assert.equal(status.gamePaused,false);
  assert.deepEqual(status.buildings[0],{id:0,built:1,queued:2,maximum:15});assert.equal(status.entities.total,2);
  const ticks=h.game.bbgameticks,token=h.controller.pauseForEditor();status=h.controller.getBattleStatus();
  assert.equal(status.editorPauseCount,1);assert.equal(status.editorPaused,true);assert.equal(status.runtimeRunning,false);assert.equal(status.battleRunning,false);
  h.controller.resumeFromEditor(token);h.game.bbmainState=6;status=h.controller.getBattleStatus();
  assert.equal(status.runtimeRunning,true);assert.equal(status.gamePaused,true);assert.equal(status.battleRunning,false);
  assert.equal(h.game.bbgameticks,ticks);assert.deepEqual(h.controller.getState().battleStatus,status);
});

test('manual buttons create all five real types while automatic spawning is disabled',()=>{
  const h=fixture({custom:true}),rules=CustomRules.defaults();rules.automaticSpawning=false;rules.zombieTypesEnabled.fill(false);h.controller.applyRules(rules);
  for(let type=0;type<5;type++) {
    const before=entries(h.game.bbzombies).length,result=h.controller.spawnZombie(type);
    const zombie=entries(h.game.bbzombies).at(-1);
    assert.equal(entries(h.game.bbzombies).length,before+1);assert.equal(zombie.bbunit.bbtype,32+type);
    assert.equal(zombie.bbhealth,h.game.bbzunits[type].bbhealth);assert.equal(result.count,1);assert.equal(zombie.bbxpos,1600);assert.ok(zombie.bbxpos>h.game.bbzombiebase.bbxpos);
  }
  const fat=entries(h.game.bbzombies).find(z=>z.bbunit.bbtype===35);assert.ok(fat.bbskin);assert.equal(fat.bbhealth,1000);
  const x=fat.bbxpos;h.game.bbGameTick(0);assert.ok(fat.bbxpos<x);
});

test('manual spawning cannot alter original mode or exceed batch/entity safety limits',()=>{
  const h=fixture();h.game.bbPlayGame(1);assert.throws(()=>h.controller.spawnZombie(3),/先应用/);
  h.controller.applyLive(h.controller.getDraft().config);
  for(const args of [[-1,1],[5,1],[3,0],[3,999],[3,1.5]])assert.throws(()=>h.controller.spawnZombie(...args),/0–4/);
  const originalAdd=h.game.bbzombies.bbAddLast;
  // Use harmless shared entities to reach the cap without 1000 sprite constructors.
  for(let i=0;i<998;i++)originalAdd.call(h.game.bbzombies,{bbunit:{bbtype:32}});
  assert.throws(()=>h.controller.spawnZombie(3),/1000/);
});

function clearFixture() {
  const h=fixture({custom:true}),g=h.game;
  g.bbztp.bbbuildingcount[0]=100;g.bbztp.bbcash=1000000;
  // Use the real purchase/production path so population is genuinely reserved.
  for(const unit of g.bbunits.slice(0,5)) {g.bbBuyUnit(unit);unit.bbbusy=1;}
  g.bbGameTick(0);
  for(let type=0;type<5;type++)h.controller.spawnZombie(type);
  const converted=entries(g.bbzombies).filter(body=>[32,35].includes(body.bbunit.bbtype));
  for(const body of converted) {g.bbzombies.bbRemove(body);g.bbpombies.bbAddLast(body);body.bbTurn();}
  g.bbAddPower(g.bbpowers[0]); // Sixteen angry people do not reserve population.
  const former=g.bbAddPerson(g.bbunits[0]);former.bbwaszombie=1;
  g.bbBuyUnit(g.bbunits[0]);g.bbBuyUnit(g.bbunits[1]);
  h.target.ZTPGamePort.bb_ZombieMob.bbSpawn(4,3,2); // Pending reinforcement, not a live enemy.
  g.bbAddBottle(0,300,200,4,-4,0);g.bbAddFling(0,200,200);
  g.bbAddDeath(g.bbshoveldeathsheet,0,250,200);
  return h;
}
function unchangedBattle(h) {
  const g=h.game,mob=h.target.ZTPGamePort.bb_ZombieMob;
  return {state:g.bbmainState,ticks:g.bbgameticks,updates:g.bbupdates,seed:h.target.ZTPGamePort.state.bb_std_random_Seed,
    cash:g.bbztp.bbcash,xp:g.bbztp.bbxp,kills:g.bbzombieskilled,losses:g.bbkinlost,
    bases:[g.bbpeoplebase,g.bbzombiebase].map(body=>({health:body.bbhealth,mode:body.bbmode})),zombieHealth:g.bbzombiehealth,
    units:g.bbunits.map(unit=>({orders:unit.bborders,busy:unit.bbbusy})),
    buildings:g.bbbuildings.map(building=>({orders:building.bborders,busy:building.bbbusy})),
    powers:g.bbpowers.map(power=>({orders:power.bborders,busy:power.bbbusy,cooldown:power.bbcooldown})),
    queue:entries(mob.bbqueue).map(node=>({type:node.bbtype,count:node.bbcount,delay:node.bbdelay,time:node.bbtime})),mobTicks:mob.bbticks,
    // New detached sandbox-death visuals are asserted separately; all existing
    // effects, projectiles and pending powers must remain identical.
    effects:['bbbottles','bbflinglist','bbdeathlist','bbbodyparts','bbexplosions','bbpowerups'].map(key=>entries(g[key]).filter(effect=>!effect.bbSandboxDeath)),
    config:h.controller.getDraft(),storage:[...h.storage]};
}

test('clear buttons require a custom active battle, including when called through the public facade',()=>{
  const h=fixture(),actions=['clearFriendlyTroops','clearEnemyTroops','clearAllTroops'];
  for(const action of actions)assert.throws(()=>h.controller[action](),/先开始/);
  h.game.bbPlayGame(1);const original=unchangedBattle(h),calls=h.runtimeCalls.slice();
  for(const action of actions)assert.throws(()=>h.controller[action](),/先应用/);
  assert.deepEqual(unchangedBattle(h),original);assert.deepEqual(h.runtimeCalls,calls);
  h.controller.applyDraft(h.controller.getDraft());
  for(const state of [1,3,4,5,7]) {
    h.game.bbmainState=state;
    for(const action of actions)assert.throws(()=>Customization[action](),/先开始/);
  }
});

test('friendly clear immediately kills all five troops, angry mobs and converted zombies, but preserves every pending plan',()=>{
  const h=clearFixture(),g=h.game,people=entries(g.bbpeople).filter(body=>body!==g.bbpeoplebase),converted=entries(g.bbpombies),enemies=entries(g.bbzombies);
  const pending=people.find(body=>body.bbisangry===0 && body.bbwaszombie===0);pending.bbhealth=0;pending.bbmode=14;
  const reserved=g.bbunits.reduce((sum,unit)=>sum+unit.bborders*unit.bbpeople,0),before=unchangedBattle(h),token=h.controller.pauseForEditor(),calls=h.runtimeCalls.slice();
  const seen=[];h.controller.subscribe(state=>seen.push(state.battleStatus.entities));
  const result=h.controller.clearFriendlyTroops();
  assert.deepEqual(result,{side:'friendly',count:24,people:22,converted:2,zombies:0});
  for(const body of [...people,...converted]) {assert.equal(body.bbhealth,0);assert.equal(body.bbmode,15);}
  assert.deepEqual(entries(g.bbpeople),[g.bbpeoplebase]);assert.deepEqual(entries(g.bbpombies),[]);assert.deepEqual(entries(g.bbzombies),enemies);
  assert.equal(g.bbztp.bbforce,reserved);assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);
  assert.equal(h.controller.getBattleStatus().editorPaused,true);assert.equal(seen.length,1);assert.equal(seen[0].people,0);assert.equal(seen[0].converted,0);
  assert.deepEqual(h.controller.clearFriendlyTroops(),{side:'friendly',count:0,people:0,converted:0,zombies:0});assert.equal(g.bbztp.bbforce,reserved);
  h.controller.resumeFromEditor(token);
  // A genuine queued recruit is still produced after resuming, not canceled.
  g.bbunits[0].bbbusy=1;g.bbGameTick(0);
  assert.equal(entries(g.bbpeople).filter(body=>body!==g.bbpeoplebase).length,1);assert.equal(g.bbztp.bbforce,reserved);
});

test('enemy clear removes every real type, even a leaping ghoul, with no XP or score farming and no damage to either side base',()=>{
  const h=fixture({custom:true}),g=h.game;
  for(let type=0;type<5;type++)h.controller.spawnZombie(type);
  const enemies=entries(g.bbzombies).filter(body=>body!==g.bbzombiebase),ghoul=enemies.find(body=>body.bbunit.bbtype===33);ghoul.bbmode=7;ghoul.bbypos=-60;
  const person=g.bbAddPerson(g.bbunits[0]);g.bbztp.bbforce=person.bbunit.bbpeople;
  const converted=g.bbAddZombie(g.bbzunits[0]);g.bbzombies.bbRemove(converted);g.bbpombies.bbAddLast(converted);converted.bbTurn();
  const people=entries(g.bbpeople),friends=entries(g.bbpombies),before=unchangedBattle(h),population=g.bbztp.bbforce,calls=h.runtimeCalls.length;
  assert.deepEqual(h.controller.clearEnemyTroops(),{side:'enemy',count:5,people:0,converted:0,zombies:5});
  for(const body of enemies) {assert.equal(body.bbhealth,0);assert.equal(body.bbmode,15);}
  assert.deepEqual(entries(g.bbzombies),[g.bbzombiebase]);assert.deepEqual(entries(g.bbpeople),people);assert.deepEqual(entries(g.bbpombies),friends);
  assert.equal(g.bbztp.bbforce,population);assert.deepEqual(unchangedBattle(h),before);
  assert.deepEqual(h.runtimeCalls.slice(calls),['stop','advance:0','realtime','start']);assert.equal(h.controller.getBattleStatus().battleRunning,true);
  assert.equal(h.controller.clearEnemyTroops().count,0);assert.deepEqual(unchangedBattle(h),before);
  h.controller.spawnZombie(3);assert.equal(h.controller.clearEnemyTroops().count,1);assert.equal(g.bbztp.bbxp,before.xp);assert.equal(g.bbzombieskilled,before.kills);
  // Future scheduled spawns still happen: clear is not automatic-spawn off.
  dispatch(h);assert.equal(entries(g.bbzombies).length,2);assert.equal(h.controller.getState().rules.automaticSpawning,true);
});

test('clearing while the native pause menu is open keeps its pause state and supports empty/repeated actions',()=>{
  const h=clearFixture(),g=h.game;g.bbmainState=6;const before=unchangedBattle(h);
  const result=h.controller.clearEnemyTroops();assert.equal(result.count,3);assert.equal(g.bbmainState,6);
  assert.equal(h.controller.getBattleStatus().gamePaused,true);assert.equal(h.controller.getBattleStatus().battleRunning,false);
  assert.deepEqual(unchangedBattle(h),before);assert.equal(h.controller.clearEnemyTroops().count,0);
  assert.equal(h.controller.clearFriendlyTroops().count,24);assert.equal(g.bbmainState,6);
});

test('clear preflights all selected writable actors before any unit or population changes',()=>{
  const h=fixture({custom:true}),g=h.game;
  h.controller.spawnZombie(0);h.controller.spawnZombie(3);
  const enemies=entries(g.bbzombies).filter(body=>body!==g.bbzombiebase),firstHealth=enemies[0].bbhealth;
  Object.freeze(enemies[1]);const before=unchangedBattle(h),calls=h.runtimeCalls.slice();
  assert.throws(()=>h.controller.clearEnemyTroops(),/不可写/);
  assert.equal(enemies[0].bbhealth,firstHealth);assert.deepEqual(entries(g.bbzombies).slice(1),enemies);
  assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);
});

test('clear rejects a frozen enemy list sentinel before killing or unlinking its first actor',()=>{
  const h=fixture({custom:true}),g=h.game;h.controller.spawnZombie(0);h.controller.spawnZombie(1);
  const actors=entries(g.bbzombies),health=actors.map(body=>body.bbhealth),modes=actors.map(body=>body.bbmode),before=unchangedBattle(h),calls=h.runtimeCalls.slice();
  Object.freeze(g.bbzombies.bb_head);
  assert.throws(()=>h.controller.clearEnemyTroops(),/不可写/);
  assert.deepEqual(entries(g.bbzombies),actors);assert.deepEqual(actors.map(body=>body.bbhealth),health);assert.deepEqual(actors.map(body=>body.bbmode),modes);
  assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);
});

test('both friendly lists are preflighted before population, regular troops or converted zombies can change',()=>{
  for(const freeze of [list=>Object.freeze(list.bb_head),list=>Object.defineProperty(list.bb_head.bb_succ,'bb_pred',{writable:false})]) {
    const h=clearFixture(),g=h.game,people=entries(g.bbpeople),converted=entries(g.bbpombies),population=g.bbztp.bbforce;
    const actors=[...people,...converted],health=actors.map(body=>body.bbhealth),modes=actors.map(body=>body.bbmode),before=unchangedBattle(h),calls=h.runtimeCalls.slice();
    freeze(g.bbpombies);
    assert.throws(()=>h.controller.clearFriendlyTroops(),/不可写/);
    assert.deepEqual(entries(g.bbpeople),people);assert.deepEqual(entries(g.bbpombies),converted);assert.equal(g.bbztp.bbforce,population);
    assert.deepEqual(actors.map(body=>body.bbhealth),health);assert.deepEqual(actors.map(body=>body.bbmode),modes);
    assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);
  }
});

test('a frozen list shell with mutable linked nodes does not prevent a safe clear',()=>{
  const h=fixture({custom:true}),g=h.game;h.controller.spawnZombie(0);Object.freeze(g.bbzombies);
  assert.equal(h.controller.clearEnemyTroops().count,1);assert.deepEqual(entries(g.bbzombies),[g.bbzombiebase]);
});

test('all-camp clear preflights all three armies in one transaction and preserves bases, plans, records, RNG and pause',()=>{
  const h=clearFixture(),g=h.game;
  h.controller.spawnFactionUnit('enemy',{kind:'unit',type:4},2);
  h.controller.enqueueSpawn('enemy',{kind:'zombie',type:3},1000,{rate:0.1});
  h.controller.enqueueSpawn('friendly',{kind:'unit',type:2},1000,{rate:2});
  const token=h.controller.pauseForEditor(),calls=h.runtimeCalls.slice(),queue=h.controller.getState().spawnQueue,before=unchangedBattle(h);
  const actors=[...entries(g.bbpeople),...entries(g.bbpombies),...entries(g.bbzombies)].filter(body=>body!==g.bbpeoplebase && body!==g.bbzombiebase);
  const seen=[];h.controller.subscribe(state=>seen.push(state.troopCounts));
  const result=Customization.clearAllTroops();
  assert.deepEqual(result,{side:'both',count:29,people:24,converted:2,zombies:3});
  for(const body of actors) {assert.equal(body.bbhealth,0);assert.equal(body.bbmode,15);}
  assert.deepEqual(entries(g.bbpeople),[g.bbpeoplebase]);assert.deepEqual(entries(g.bbzombies),[g.bbzombiebase]);assert.deepEqual(entries(g.bbpombies),[]);
  assert.equal(g.bbztp.bbforce,g.bbunits.reduce((sum,unit)=>sum+unit.bborders*unit.bbpeople,0));
  assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.controller.getState().spawnQueue.jobs,queue.jobs);assert.deepEqual(h.runtimeCalls,calls);
  assert.equal(seen.length,1);assert.equal(seen[0].friendly.total,0);assert.equal(seen[0].enemy.total,0);
  assert.equal(h.controller.clearAllTroops().count,0);assert.equal(h.controller.getBattleStatus().editorPaused,true);
  h.controller.resumeFromEditor(token);
});

test('all-camp clear never partially kills the first side when any later-side actor, list or population field is readonly',()=>{
  for(const frozen of ['enemy-actor','enemy-list','converted-actor','converted-list','population']) {
    const h=clearFixture(),g=h.game;
    const people=entries(g.bbpeople),converted=entries(g.bbpombies),enemies=entries(g.bbzombies),actors=[...people,...converted,...enemies];
    if(frozen==='enemy-actor')Object.freeze(enemies.at(-1));
    if(frozen==='enemy-list')Object.freeze(g.bbzombies.bb_head);
    if(frozen==='converted-actor')Object.freeze(converted.at(-1));
    if(frozen==='converted-list')Object.defineProperty(g.bbpombies.bb_head.bb_succ,'bb_pred',{writable:false});
    if(frozen==='population')Object.defineProperty(g.bbztp,'bbforce',{writable:false});
    const health=actors.map(body=>body.bbhealth),modes=actors.map(body=>body.bbmode),before=unchangedBattle(h),calls=h.runtimeCalls.slice(),state=h.controller.getState();
    assert.throws(()=>h.controller.clearAllTroops(),/不可写/);
    assert.deepEqual(entries(g.bbpeople),people);assert.deepEqual(entries(g.bbpombies),converted);assert.deepEqual(entries(g.bbzombies),enemies);
    assert.deepEqual(actors.map(body=>body.bbhealth),health);assert.deepEqual(actors.map(body=>body.bbmode),modes);
    assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);assert.deepEqual(h.controller.getState(),state);
  }
});

test('clear handles duplicate list references once and never turns population negative',()=>{
  const h=fixture({custom:true}),g=h.game,person=g.bbAddPerson(g.bbunits[0]);g.bbpeople.bbAddLast(person);g.bbztp.bbforce=0;
  assert.equal(h.controller.clearFriendlyTroops().count,1);assert.equal(g.bbztp.bbforce,0);assert.deepEqual(entries(g.bbpeople),[g.bbpeoplebase]);
  assert.equal(h.controller.clearFriendlyTroops().count,0);assert.equal(g.bbztp.bbforce,0);
});

test('wave-only compatibility apply synchronizes tracked current progress without leaking unrelated draft values',()=>{
  const h=fixture({custom:true}),mob=h.target.ZTPGamePort.bb_ZombieMob;
  dispatch(h,2);const first=entries(mob.bbqueue)[0];first.bbtime=1.5;mob.bbticks=42;
  h.game.bbzombiehealth=12345;
  const draft=h.controller.getDraft().config;draft.units[0].health=999;
  draft.levels[0].waves=[{...draft.levels[0].waves[0],type:4,count:20,delay:1},{id:'test-new-normal',type:1,count:100,delay:0},{id:'test-disabled',type:5,count:3,delay:3,enabled:false},{id:'test-new-fast',type:3,count:20,delay:2}];
  const result=h.controller.applyUpcomingWaves(draft),queue=entries(mob.bbqueue);
  assert.equal(queue[0],first);assert.equal(first.bbcount,18);assert.equal(first.bbtime,1.5);assert.equal(mob.bbticks,42);
  assert.deepEqual(queue.slice(1).map(x=>[x.bbtype,x.bbcount,x.bbdelay]),[[1,100,0],[3,20,2]]);
  assert.equal(h.game.bbzombiehealth,12345);assert.equal(h.game.bbunits[0].bbhealth,50);
  assert.equal(result.requiresNewBattle,false);assert.equal(result.progress.current.remaining,18);
});

test('empty wave-only synchronization cancels all remaining main waves without deleting live enemies',()=>{
  const h=fixture({custom:true}),mob=h.target.ZTPGamePort.bb_ZombieMob;dispatch(h,2);
  const zombies=entries(h.game.bbzombies);
  const config=h.controller.getDraft().config;config.levels[0].waves=[];
  const result=h.controller.applyUpcomingWaves(config);assert.equal(result.progress.remainingTotal,0);assert.equal(entries(mob.bbqueue).length,0);
  assert.deepEqual(entries(h.game.bbzombies),zombies);
  mob.bbqueue.bbClear();assert.doesNotThrow(()=>h.controller.applyUpcomingWaves(config));assert.equal(entries(mob.bbqueue).length,0);
});

test('ordinary combined apply immediately updates current remaining counts and never replays completed IDs',()=>{
  const h=fixture({custom:true}),mob=h.target.ZTPGamePort.bb_ZombieMob;dispatch(h,2);
  const current=entries(mob.bbqueue)[0];current.bbtime=1.75;mob.bbticks=42;
  let draft=h.controller.getDraft();const id=draft.config.levels[0].waves[0].id;draft.config.levels[0].waves[0].count=8;
  const report=h.controller.applyDraft(draft),status=h.controller.getBattleStatus();
  assert.equal(report.waveReport.requiresNewBattle,false);assert.ok(report.applied.includes('$.levels[0].waves'));
  assert.equal(report.deferred.includes('$.levels[0].waves'),false);assert.equal(entries(mob.bbqueue)[0],current);
  assert.equal(current.bbcount,6);assert.equal(current.bbtime,1.75);assert.equal(mob.bbticks,42);
  assert.equal(status.waveProgress.current.consumed,2);assert.equal(status.waveProgress.current.spawned,2);assert.equal(status.waveProgress.current.total,8);
  dispatch(h,6);assert.ok(h.controller.getBattleStatus().waveProgress.completed.includes(id));
  const before=entries(mob.bbqueue).slice();draft=h.controller.getDraft();draft.config.levels[0].waves[0].count=100;
  const completedReport=h.controller.applyDraft(draft);
  assert.ok(completedReport.waveReport.notes.some(text=>text.includes('不会重播')));assert.ok(completedReport.waveReport.deferred.length);
  assert.deepEqual(entries(mob.bbqueue),before);assert.notEqual(h.controller.getBattleStatus().waveProgress.current?.id,id);
});

test('reducing current total below consumed cancels only undispatched slots, while reinforcements retain their own identity',()=>{
  const h=fixture({custom:true}),mob=h.target.ZTPGamePort.bb_ZombieMob;dispatch(h,2);
  const zombies=entries(h.game.bbzombies).slice(),draft=h.controller.getDraft();draft.config.levels[0].waves[0].count=1;
  h.controller.applyDraft(draft);assert.deepEqual(entries(h.game.bbzombies),zombies);
  assert.notEqual(h.controller.getBattleStatus().waveProgress.current?.id,draft.config.levels[0].waves[0].id);
  mob.bbSpawn(4,2,0);const reinforcement=entries(mob.bbqueue)[0],next=h.controller.getDraft();next.config.levels[0].waves[2].count=77;
  h.controller.applyDraft(next);assert.equal(entries(mob.bbqueue)[0],reinforcement);
  assert.equal(h.controller.getBattleStatus().waveProgress.current.source,'reinforcement');assert.equal(reinforcement.bbcount,2);
});

test('other-stage wave edits explicitly remain pending for that stage rather than claiming current-stage changes',()=>{
  const h=fixture({custom:true}),draft=h.controller.getDraft(),before=entries(h.target.ZTPGamePort.bb_ZombieMob.bbqueue).slice();
  draft.config.levels[1].waves[0].count=123;const report=h.controller.applyDraft(draft);
  assert.equal(report.waveReport.stage,1);assert.deepEqual(report.waveReport.otherStages,[2]);
  assert.ok(report.deferred.includes('$.levels[1].waves'));assert.ok(report.waveReport.notes.some(text=>text.includes('当前战斗为第 1 关')&&text.includes('第 2 关')));
  assert.deepEqual(entries(h.target.ZTPGamePort.bb_ZombieMob.bbqueue),before);
});

test('legacy imports retain unknown identity across two applies and preset round trips, then bind on a new battle',()=>{
  const h=fixture({custom:true}),mob=h.target.ZTPGamePort.bb_ZombieMob;dispatch(h,2);
  const queue=mob.bbqueue,before=entries(queue).map(node=>({node,count:node.bbcount,time:node.bbtime})),ticks=mob.bbticks;
  const legacy={schemaVersion:1,name:'旧版规则',config:noWaveIds(baseline()),rules:CustomRules.defaults()};legacy.config.units[0].cost=88;
  const imported=h.controller.importPreset(JSON.stringify(legacy)),draft={config:imported.config,rules:imported.rules};
  assert.ok(draft.config.levels[0].waves.every(wave=>wave.id.startsWith('legacy-untracked-')));
  for(let attempt=0;attempt<2;attempt++) {
    const report=h.controller.applyDraft(draft);assert.equal(report.waveReport.requiresNewBattle,true);
    assert.equal(mob.bbqueue,queue);assert.equal(mob.bbticks,ticks);assert.equal(h.game.bbunits[0].bbcost,88);
    before.forEach(({node,count,time},i)=>{assert.equal(entries(mob.bbqueue)[i],node);assert.equal(node.bbcount,count);assert.equal(node.bbtime,time);});
    assert.equal(h.controller.getBattleStatus().waveProgress.knownIds.some(id=>id.startsWith('legacy-untracked-')),false);
  }
  const record=h.controller.savePreset('旧版规则',draft),loaded=h.controller.loadPreset(record.id);
  const roundTrip=h.controller.importPreset(h.controller.exportPreset(loaded,'往返规则'));
  assert.equal(h.controller.applyDraft({config:roundTrip.config,rules:roundTrip.rules}).waveReport.requiresNewBattle,true);
  h.controller.startCustomBattle(1,loaded);const next=fixture({storage:h.storage});dispatch(next,2);
  const bound=next.controller.getDraft();bound.config.levels[0].waves[0].count=9;
  const applied=next.controller.applyDraft(bound);assert.equal(applied.waveReport.requiresNewBattle,false);
  assert.equal(next.controller.getBattleStatus().waveProgress.current.remaining,7);
});

test('duplicate wave identities fail complete validation before mode, storage, clocks or templates change',()=>{
  const h=fixture();h.game.bbPlayGame(1);const draft=h.controller.getDraft(),before=h.controller.getState(),storage=[...h.storage],calls=h.runtimeCalls.slice();
  draft.config.units[0].cost=99;draft.config.levels[0].waves[1].id=draft.config.levels[0].waves[0].id;
  assert.throws(()=>h.controller.applyDraft(draft),/duplicate/);
  assert.deepEqual(h.controller.getState(),before);assert.deepEqual([...h.storage],storage);assert.deepEqual(h.runtimeCalls,calls);assert.equal(h.game.bbunits[0].bbcost,50);
});

test('nested pause tokens freeze the manual clock and only the final valid token resumes once',()=>{
  const h=fixture(),a=h.controller.pauseForEditor(),b=h.controller.pauseForEditor();
  assert.deepEqual(h.runtimeCalls,['stop','advance:0']);assert.equal(h.controller.getState().paused,true);
  assert.equal(h.controller.resumeFromEditor({id:a.id}),false);h.controller.resumeFromEditor(a);
  assert.deepEqual(h.runtimeCalls,['stop','advance:0']);h.controller.resumeFromEditor(b);
  assert.deepEqual(h.runtimeCalls,['stop','advance:0','realtime','start']);assert.equal(h.controller.resumeFromEditor(b),false);
});

test('switching modes invalidates stale pause tokens and restoration starts original with no custom state',()=>{
  const h=fixture({custom:true}),token=h.controller.pauseForEditor(),originalKey=h.storage.get(constants.ORIGINAL_STORAGE);
  h.controller.restoreOriginal();assert.equal(h.reloads,1);assert.equal(h.controller.resumeFromEditor(token),false);
  assert.deepEqual(h.runtimeCalls,['stop','advance:0']);
  const next=fixture({storage:h.storage});assert.equal(next.controller.getState().mode,'original');assert.equal(next.namespace,constants.ORIGINAL_STORAGE);
  assert.equal(next.controller.getState().isBattle,false);assert.equal(h.storage.get(constants.ORIGINAL_STORAGE),originalKey);
});

test('state subscriptions unsubscribe cleanly and snapshots do not mutate live configuration',()=>{
  const h=fixture(),seen=[],unsubscribe=h.controller.subscribe(state=>seen.push(state.mode));
  const snapshot=h.controller.getState();snapshot.config.zombies[0].health=123;
  assert.equal(h.controller.getState().config.zombies[0].health,25);
  const record=h.controller.savePreset('one',h.controller.getDraft());assert.deepEqual(seen,['original']);
  unsubscribe();h.controller.deletePreset(record.id);assert.deepEqual(seen,['original']);
});


test('settings commit immediately changes abilities while playing or editor-paused, preserving a single coherent persisted pair',()=>{
  const h=fixture();h.game.bbPlayGame(1);const ticks=h.game.bbgameticks,draft=h.controller.getDraft(),seen=[];
  h.controller.subscribe(state=>seen.push({mode:state.mode,health:state.config.zombies[0].health,impact:state.rules.corpseSpawnOnImpact}));
  draft.config.zombies[0].health=42;draft.rules.corpseSpawnOnImpact=false;
  const report=Customization.commitSettings(draft);
  assert.equal(report.staged,false);assert.equal(report.promoted,true);assert.equal(h.namespace,constants.CUSTOM_STORAGE);
  assert.equal(h.game.bbzunits[0].bbhealth,42);assert.equal(CustomRules.snapshot(h.target).corpseSpawnOnImpact,false);
  assert.deepEqual(seen,[{mode:'custom',health:42,impact:false}]);assert.equal(h.game.bbgameticks,ticks);assert.equal(h.reloads,0);
  const token=h.controller.pauseForEditor(),calls=h.runtimeCalls.slice();draft.rules.corpseSpawnOnImpact=true;
  h.controller.commitSettings(draft);assert.deepEqual(h.runtimeCalls,calls);assert.equal(h.controller.getBattleStatus().editorPaused,true);
  assert.equal(CustomRules.snapshot(h.target).corpseSpawnOnImpact,true);
  const session=JSON.parse(h.storage.get(constants.SESSION_KEY));assert.equal(session.config.zombies[0].health,42);assert.equal(session.rules.corpseSpawnOnImpact,true);
  h.controller.resumeFromEditor(token);
});

test('menu commits stage templates and rules without starting or reloading, then the next genuine battle uses them',()=>{
  const h=fixture(),draft=h.controller.getDraft(),originalState=h.game.bbmainState;
  draft.config.units[0].health=100;draft.config.levels[0].waves[0].count=7;draft.rules.automaticSpawning=false;
  const report=h.controller.commitSettings(draft);
  assert.equal(report.staged,true);assert.equal(report.promoted,true);assert.equal(h.game.bbmainState,originalState);assert.equal(h.controller.getState().isBattle,false);
  assert.equal(h.reloads,0);assert.equal(h.game.bbunits[0].bbhealth,100);assert.equal(h.controller.getState().bases,null);
  assert.equal(JSON.parse(h.storage.get(constants.SESSION_KEY)).stage,null);
  const restarted=fixture({storage:h.storage});assert.equal(restarted.controller.getState().isBattle,false);assert.equal(restarted.game.bbunits[0].bbhealth,100);
  restarted.game.bbPlayGame(1);assert.equal(entries(restarted.target.ZTPGamePort.bb_ZombieMob.bbqueue)[0].bbcount,7);
  assert.equal(restarted.controller.getState().rules.automaticSpawning,false);
});

test('immediate commit rejects either invalid half, bad options, and composed multiplier overflow before any mutation or namespace promotion',()=>{
  for(const invalid of ['config','rules','composition','options']) {
    const h=fixture();h.game.bbPlayGame(1);const draft=h.controller.getDraft(),before=h.controller.getState(),storage=[...h.storage],calls=h.runtimeCalls.slice();
    draft.config.units[0].cost=99;draft.rules.automaticSpawning=false;
    if(invalid==='config')draft.config.zombies[0].health=-1;
    if(invalid==='rules')draft.rules.abilities.harvesterRange=-1;
    if(invalid==='composition'){draft.config.units[0].health=2147483647;draft.rules.multipliers.units.health=2;}
    assert.throws(()=>h.controller.commitSettings(draft,invalid==='options'?{healthPolicy:'replace'}:{}));
    assert.deepEqual(h.controller.getState(),before);assert.deepEqual([...h.storage],storage);assert.deepEqual(h.runtimeCalls,calls);assert.equal(h.namespace,constants.ORIGINAL_STORAGE);
  }
});

test('multipliers apply once across immediate commits, compatibility rule updates, wave edits, session reload and menu staging',()=>{
  const h=fixture({custom:true}),g=h.game,draft=h.controller.getDraft(),person=g.bbAddPerson(g.bbunits[0]);
  draft.rules.multipliers.units={health:1.5,moveSpeed:1.5,damage:1.5};draft.rules.multipliers.zombies={health:2,moveSpeed:1.5,damage:2};
  h.controller.commitSettings(draft);assert.equal(g.bbunits[0].bbhealth,75);assert.equal(person.bbhealth,75);assert.equal(g.bbunits[0].bbdamage,15);
  const originalCurrent=h.controller.getDraft();assert.equal(originalCurrent.config.units[0].health,50);assert.equal(originalCurrent.rules.multipliers.units.health,1.5);
  h.controller.commitSettings(originalCurrent);h.controller.applyRules(originalCurrent.rules);
  assert.equal(person.bbhealth,75);assert.equal(g.bbunits[0].bbhealth,75);assert.equal(g.bbunits[0].bbdamage,15);
  const waves=h.controller.getDraft().config;waves.levels[0].waves[0].count=9;h.controller.applyUpcomingWaves(waves);assert.equal(g.bbunits[0].bbhealth,75);
  const restored=fixture({storage:h.storage});assert.equal(restored.game.bbunits[0].bbhealth,75);assert.equal(restored.controller.getDraft().config.units[0].health,50);
  const m=fixture(),menu=m.controller.getDraft();menu.rules.multipliers.units.health=1.5;m.controller.commitSettings(menu);
  m.game.bbPlayGame(1);assert.equal(m.game.bbAddPerson(m.game.bbunits[0]).bbhealth,75);
});

test('batch manual spawns use the original far-right origin and preflight capacity without consuming RNG or partially spawning',()=>{
  const h=fixture({custom:true}),g=h.game,rules=h.controller.getDraft().rules;rules.automaticSpawning=false;rules.zombieTypesEnabled.fill(false);h.controller.applyRules(rules);
  const result=h.controller.spawnZombie(3,100);
  assert.equal(result.count,100);assert.equal(result.positions.length,100);assert.ok(result.positions.every(p=>p.x===1600 && p.x>g.bbzombiebase.bbxpos));
  assert.equal(entries(g.bbzombies).filter(body=>body.bbunit.bbtype===35).length,100);
  const before=entries(g.bbzombies),seed=h.target.ZTPGamePort.state.bb_std_random_Seed;
  assert.throws(()=>h.controller.spawnZombie(0,899),/1000/);assert.deepEqual(entries(g.bbzombies),before);assert.equal(h.target.ZTPGamePort.state.bb_std_random_Seed,seed);
  h.controller.clearEnemyTroops();assert.equal(h.controller.spawnZombie(0,998).count,998);
  assert.equal(h.controller.getBattleStatus().entities.total,1000);assert.throws(()=>h.controller.spawnZombie(0),/1000/);
});

test('typed friendly clear kills only the selected human type and releases only its actual reserved population',()=>{
  for(let type=0;type<5;type++) {
    const h=clearFixture(),g=h.game,actors=entries(g.bbpeople),selected=actors.filter(body=>body.bbunit.bbtype===type),remaining=actors.filter(body=>body.bbunit.bbtype!==type);
    const converted=entries(g.bbpombies),enemies=entries(g.bbzombies),before=unchangedBattle(h),force=g.bbztp.bbforce;
    const refund=selected.filter(body=>body.bbwaszombie===0 && body.bbisangry===0).reduce((n,body)=>n+body.bbunit.bbpeople,0);
    const result=h.controller.clearFriendlyTroops(type%2?{kind:'unit',type}:type);
    assert.equal(result.people,selected.length);assert.equal(result.converted,0);assert.equal(result.zombies,0);
    assert.deepEqual(entries(g.bbpeople),remaining);assert.deepEqual(entries(g.bbpombies),converted);assert.deepEqual(entries(g.bbzombies),enemies);
    assert.equal(g.bbztp.bbforce,Math.max(0,force-refund));assert.deepEqual(unchangedBattle(h),before);
    assert.equal(h.controller.clearFriendlyTroops(type).count,0);
  }
});

test('typed enemy and converted clears keep opposite-side and other-type actors, both bases and future plans',()=>{
  const h=fixture({custom:true}),g=h.game;for(let type=0;type<5;type++)h.controller.spawnZombie(type,2);
  const converted=[];for(const body of entries(g.bbzombies).filter(body=>body!==g.bbzombiebase).filter((_,i)=>i%2===0)) {
    g.bbzombies.bbRemove(body);g.bbpombies.bbAddLast(body);body.bbTurn();converted.push(body);
  }
  const person=g.bbAddPerson(g.bbunits[0]);g.bbztp.bbforce=person.bbunit.bbpeople;
  const before=unchangedBattle(h),force=g.bbztp.bbforce;
  for(let type=0;type<5;type++) {
    const enemy=entries(g.bbzombies).find(body=>body.bbunit.bbtype===32+type),friend=converted.find(body=>body.bbunit.bbtype===32+type);
    assert.equal(h.controller.clearEnemyTroops({kind:'zombie',type}).zombies,1);assert.equal(enemy.bbhealth,0);assert.equal(friend.bbhealth>0,true);
    assert.equal(h.controller.clearFriendlyTroops(type%2?{kind:'converted',type}:'converted-'+type).converted,1);assert.equal(friend.bbhealth,0);
    assert.deepEqual(entries(g.bbpeople),[g.bbpeoplebase,person]);assert.equal(g.bbztp.bbforce,force);assert.deepEqual(unchangedBattle(h),before);
  }
  assert.deepEqual(entries(g.bbzombies),[g.bbzombiebase]);assert.deepEqual(entries(g.bbpombies),[]);
});

test('invalid typed clears are atomic and a frozen unselected actor does not block a correctly scoped clear',()=>{
  const h=fixture({custom:true}),g=h.game;h.controller.spawnZombie(0);h.controller.spawnZombie(3);const original=entries(g.bbzombies);
  for(const selection of [-1,5,1.5,'normal',{kind:'converted',type:1},{kind:'zombie',type:5},{kind:'zombie',type:0,extra:true}]) {
    const before=h.controller.getState(),calls=h.runtimeCalls.slice();assert.throws(()=>h.controller.clearEnemyTroops(selection));
    assert.deepEqual(entries(g.bbzombies),original);assert.deepEqual(h.controller.getState(),before);assert.deepEqual(h.runtimeCalls,calls);
  }
  Object.freeze(original.find(body=>body.bbunit.bbtype===35));assert.equal(h.controller.clearEnemyTroops(0).count,1);
  assert.deepEqual(entries(g.bbzombies),original.filter(body=>body.bbunit.bbtype!==32));
});

test('current base HP changes immediately without modifying maxima, clocks, RNG, troops, queues, population or editor pause',()=>{
  const h=clearFixture(),g=h.game,before=unchangedBattle(h),people=entries(g.bbpeople),zombies=entries(g.bbzombies),force=g.bbztp.bbforce,token=h.controller.pauseForEditor(),calls=h.runtimeCalls.slice();
  const draft=h.controller.getDraft(),maxima=[draft.config.units[5].health,draft.config.zombies[5].health];
  assert.deepEqual(Customization.setBaseHealth('friendly',1),{side:'friendly',current:1,maximum:maxima[0],ended:false});
  assert.deepEqual(h.controller.setBaseHealth('enemy',123),{side:'enemy',current:123,maximum:maxima[1],ended:false});
  assert.deepEqual(h.controller.getBattleStatus().bases,{friendly:{current:1,maximum:maxima[0]},enemy:{current:123,maximum:maxima[1]}});
  assert.deepEqual(h.controller.getState().bases,h.controller.getBattleStatus().bases);
  assert.deepEqual(h.controller.getDraft(),draft);assert.deepEqual(entries(g.bbpeople),people);assert.deepEqual(entries(g.bbzombies),zombies);assert.equal(g.bbztp.bbforce,force);
  const after=unchangedBattle(h),original={...before};delete after.bases;delete original.bases;
  // The only other tracked enemy value is the previous-tick baseline, which is
  // intentionally retained so real threshold crossings trigger on next tick.
  assert.deepEqual(after,original);assert.deepEqual(h.runtimeCalls,calls);assert.equal(h.controller.getBattleStatus().editorPaused,true);
  h.controller.setBaseHealth('friendly',maxima[0]);h.controller.setBaseHealth('enemy',maxima[1]);h.controller.resumeFromEditor(token);
});

test('base HP bounds and readonly state reject atomically; max changes retain ratio and recorded new-only maximum',()=>{
  const h=fixture({custom:true}),g=h.game;const before=h.controller.getState(),calls=h.runtimeCalls.slice();
  for(const [side,hp] of [['other',2],['friendly',-1],['friendly',1.5],['enemy',16001],['enemy',NaN]])assert.throws(()=>h.controller.setBaseHealth(side,hp));
  assert.deepEqual(h.controller.getState(),before);assert.deepEqual(h.runtimeCalls,calls);
  h.controller.setBaseHealth('friendly',2000);const draft=h.controller.getDraft();draft.config.units[5].health=8000;h.controller.commitSettings(draft);
  assert.deepEqual(h.controller.getBattleStatus().bases.friendly,{current:4000,maximum:8000});
  draft.config.units[5].health=12000;h.controller.commitSettings(draft,{healthPolicy:'new-only'});
  assert.deepEqual(h.controller.getBattleStatus().bases.friendly,{current:4000,maximum:8000});assert.throws(()=>h.controller.setBaseHealth('friendly',10000),/0–8000/);
  Object.freeze(g.bbzombiebase);assert.throws(()=>h.controller.setBaseHealth('enemy',0),/不可写/);assert.equal(g.bbzombiebase.bbhealth,16000);assert.equal(g.bbmainState,2);
});

test('setting a base current HP to zero follows normal win or loss immediately, isolates custom scores and never revives ended games',()=>{
  for(const side of ['friendly','enemy']) {
    const h=fixture({custom:true}),g=h.game,token=h.controller.pauseForEditor(),original=[...h.storage].filter(([k])=>k.startsWith(constants.ORIGINAL_STORAGE+'/'));
    g.bbgameticks=123;const selected=side==='friendly'?g.bbpeoplebase:g.bbzombiebase,other=side==='friendly'?g.bbzombiebase:g.bbpeoplebase,otherHP=other.bbhealth;
    const result=h.controller.setBaseHealth(side,0);assert.equal(result.ended,true);assert.equal(selected.bbhealth,0);assert.equal(selected.bbmode,14);
    assert.equal(g.bbmainState,side==='friendly'?4:3);assert.equal(other.bbhealth,otherHP);assert.equal(g.bbgameticks,123);
    assert.equal(entries(g.bbpeople).includes(g.bbpeoplebase),false);assert.equal(entries(g.bbzombies).includes(g.bbzombiebase),false);
    assert.equal(h.controller.getState().bases,null);assert.throws(()=>h.controller.setBaseHealth(side,10),/先开始/);
    assert.deepEqual([...h.storage].filter(([k])=>k.startsWith(constants.ORIGINAL_STORAGE+'/')),original);
    assert.equal(h.storage.get(constants.CUSTOM_STORAGE+'/shared/ZTPBestScores/0'),side==='enemy'?'123':undefined);
    assert.equal(h.controller.getBattleStatus().editorPaused,true);h.controller.resumeFromEditor(token);assert.equal(g.bbmainState,side==='friendly'?4:3);
  }
});


test('a v0.3.2 session and preset without faction multipliers upgrade with identity factors and preserve edits and source fingerprint',()=>{
  const original=baseline(),selected=plain(original),oldRules=plain(CustomRules.defaults());delete oldRules.multipliers;
  selected.units[0].health=77;oldRules.corpseSpawnOnImpact=false;
  const timestamp='2026-10-23T00:00:00.000Z',id='preset-legacy-032';
  const storage=new Map([
    [constants.SESSION_KEY,JSON.stringify({schemaVersion:1,mode:'custom',config:selected,rules:oldRules,stage:null,selectedPresetId:id,sourceFingerprint:oldSourceFingerprint(original)})],
    [constants.PRESETS_KEY,JSON.stringify({schemaVersion:1,presets:[{id,name:'旧版规则',updatedAt:timestamp,config:selected,rules:oldRules}]})]
  ]);
  const h=fixture({storage,external:original}),state=h.controller.getState();
  assert.equal(state.mode,'custom');assert.equal(state.config.units[0].health,77);assert.equal(state.rules.corpseSpawnOnImpact,false);
  assert.deepEqual(state.rules.multipliers,{units:{health:1,moveSpeed:1,damage:1},zombies:{health:1,moveSpeed:1,damage:1}});
  assert.equal(state.warnings.some(message=>message.includes('外置 JSON')),false);assert.equal(state.selectedPresetId,id);
  const loaded=h.controller.loadPreset(id);assert.equal(loaded.config.units[0].health,77);assert.equal(loaded.rules.multipliers.units.health,1);
  h.controller.commitSettings(loaded);assert.equal(h.game.bbunits[0].bbhealth,77);assert.equal(h.controller.getState().isBattle,false);
  const next=fixture({storage,external:original});assert.equal(next.controller.getState().config.units[0].health,77);assert.equal(next.controller.getState().rules.corpseSpawnOnImpact,false);
});


test('a manually added fat zombie approaches and attacks soldiers fighting the enemy base instead of materializing behind them',()=>{
  const h=fixture({custom:true}),g=h.game,draft=h.controller.getDraft();draft.rules.automaticSpawning=false;
  draft.config.units[0].health=1000;h.controller.commitSettings(draft);
  const person=g.bbAddPerson(g.bbunits[0]);person.bbxpos=1420;g.bbztp.bbforce=1;
  // Let the actual attack state machine lock onto the enemy base first.
  for(let tick=0;tick<30;tick++)g.bbGameTick(0);
  assert.equal(person.bbmode,1);const initialHealth=person.bbhealth,baseHealth=g.bbzombiebase.bbhealth;
  h.controller.spawnZombie(3);const fat=entries(g.bbzombies).at(-1);assert.equal(fat.bbxpos,1600);assert.ok(fat.bbxpos>person.bbxpos);
  let attacked=false;
  for(let tick=0;tick<500;tick++) {g.bbGameTick(0);if(person.bbhealth<initialHealth){attacked=true;break;}}
  assert.equal(attacked,true,'the fat zombie must hit the currently engaged soldier');
  assert.ok(fat.bbxpos>person.bbxpos,'the fat zombie stays in front, not behind the friendly line');
  assert.ok(g.bbzombiebase.bbhealth<baseHealth,'the soldier continues to attack the base while the new enemy approaches');
});


test('readonly config, wave, rule-sync and promotion targets reject immediate commits before mode, namespace, raw data, actors or settings mutate',()=>{
  for(const custom of [false,true])for(const frozen of ['unit','wave','population','coins','records','power']) {
    const h=fixture({custom});if(!custom)h.game.bbPlayGame(1);
    const g=h.game,mob=h.target.ZTPGamePort.bb_ZombieMob,draft=h.controller.getDraft();
    draft.config.units[0].cost=99;draft.config.levels[0].waves[0].count=9;draft.rules.corpseSpawnOnImpact=false;draft.rules.economy.salvageIntervalTicks=500;
    if(frozen==='unit')Object.freeze(g.bbunits[0]);
    if(frozen==='wave')Object.freeze(entries(mob.bbqueue)[0]);
    if(frozen==='population')Object.defineProperty(g.bbztp,'bbmaxforce',{writable:false});
    if(frozen==='coins')Object.defineProperty(g,'bbcoins',{writable:false});
    if(frozen==='records')Object.freeze(g.bbrecords);
    if(frozen==='power')Object.defineProperty(g.bbpowers[0],'bblocked',{writable:false});
    const before=unchangedBattle(h),namespace=h.namespace,calls=h.runtimeCalls.slice(),state=h.controller.getState();
    // Frozen records and unlock flags are only touched when promoting an
    // original battle; an already custom battle need not rewrite them.
    if(custom && ['records','power'].includes(frozen))continue;
    assert.throws(()=>h.controller.commitSettings(draft),/writable|不可写/);
    assert.deepEqual(unchangedBattle(h),before);assert.equal(h.namespace,namespace);assert.deepEqual(h.controller.getState(),state);assert.deepEqual(h.runtimeCalls,calls);
  }
});

test('preflight uses the proposed multiplier pair, allowing valid coordinated raw-health and factor changes without false rejection',()=>{
  const h=fixture({custom:true}),first=h.controller.getDraft();first.rules.multipliers.units.health=2;h.controller.commitSettings(first);
  const next=h.controller.getDraft();next.config.units[0].health=2147483647;next.rules.multipliers.units.health=1;
  assert.doesNotThrow(()=>h.controller.commitSettings(next));assert.equal(h.game.bbunits[0].bbhealth,2147483647);
  assert.equal(h.controller.getDraft().config.units[0].health,2147483647);assert.equal(h.controller.getDraft().rules.multipliers.units.health,1);
});


test('fractional global zombie health factors can safely offset large raw HP and all preset and compatibility paths validate the complete composition',()=>{
  const h=fixture({custom:true}),draft=h.controller.getDraft();draft.config.zombies[0].health=1000000000;draft.rules.multipliers.zombies.health=0.5;
  assert.doesNotThrow(()=>h.controller.commitSettings(draft));assert.equal(h.game.bbzunits[0].bbhealth,500000000);
  assert.doesNotThrow(()=>h.controller.applyLive(draft.config));assert.doesNotThrow(()=>h.controller.applyUpcomingWaves(draft.config));
  const saved=h.controller.savePreset('大血量低倍率',draft),loaded=h.controller.loadPreset(saved.id);
  const imported=h.controller.importPreset(h.controller.exportPreset(loaded));assert.equal(imported.config.zombies[0].health,1000000000);
  const next=fixture({storage:h.storage});assert.equal(next.controller.getState().rules.multipliers.zombies.health,0.5);assert.equal(next.game.bbzunits[0].bbhealth,500000000);
});


test('friendly batch sandbox creates all five real troop types with current normal stats at the original left origin, without costs, population, anger or queues',()=>{
  const h=fixture({custom:true}),g=h.game,draft=h.controller.getDraft();draft.rules.multipliers.units={health:1.5,moveSpeed:1.5,damage:1.5};
  h.controller.commitSettings(draft);const before=unchangedBattle(h),force=g.bbztp.bbforce;
  for(let type=0;type<5;type++) {
    const old=entries(g.bbpeople).length,result=Customization.spawnFriendlyUnit(type,3),created=entries(g.bbpeople).slice(old);
    assert.equal(result.type,type);assert.equal(result.count,3);assert.equal(created.length,3);assert.ok(result.positions.every(position=>position.x===0));
    for(const person of created) {
      assert.equal(person.bbunit,g.bbunits[type]);assert.equal(person.bbhealth,g.bbunits[type].bbhealth);
      assert.equal(person.bbwalkspeed,draft.config.units[type].moveSpeed*1.5);assert.equal(person.bbisangry,0);assert.equal(person.bbwaszombie,1);
      assert.ok(person.bbskin);assert.equal(person.bbxpos,0);
    }
    assert.equal(g.bbztp.bbforce,force);const after=unchangedBattle(h),expected={...before};delete after.seed;delete expected.seed;assert.deepEqual(after,expected);
  }
});

test('free friendly actors never refund paid reserved population on typed clear or original natural death',()=>{
  const h=fixture({custom:true}),g=h.game;g.bbztp.bbcash=100000;g.bbztp.bbbuildingcount[0]=100;
  g.bbBuyUnit(g.bbunits[0]);g.bbBuyUnit(g.bbunits[1]);const force=g.bbztp.bbforce,orders=g.bbunits.map(unit=>unit.bborders),cash=g.bbztp.bbcash;
  h.controller.spawnFriendlyUnit(0,5);h.controller.spawnFriendlyUnit(1,5);
  assert.equal(h.controller.clearFriendlyTroops(0).people,5);assert.equal(g.bbztp.bbforce,force);
  const free=entries(g.bbpeople).filter(person=>person!==g.bbpeoplebase);assert.equal(free.length,5);
  for(const person of free) {person.bbhealth=0;person.bbmode=15;}
  g.bbGameTick(0);assert.equal(entries(g.bbpeople).length,1);assert.equal(g.bbztp.bbforce,force);
  assert.deepEqual(g.bbunits.map(unit=>unit.bborders),orders);assert.equal(g.bbztp.bbcash,cash);
  h.controller.spawnFriendlyUnit(2,1);assert.equal(h.controller.clearFriendlyTroops().people,1);assert.equal(g.bbztp.bbforce,force);
});

test('friendly batch guards original mode, invalid types/counts and total capacity before creating actors or consuming RNG, and preserves pause',()=>{
  const original=fixture();original.game.bbPlayGame(1);assert.throws(()=>original.controller.spawnFriendlyUnit(0),/先应用/);
  const h=fixture({custom:true}),g=h.game,before=h.controller.getState(),seed=h.target.ZTPGamePort.state.bb_std_random_Seed;
  for(const args of [[-1,1],[5,1],[0,0],[0,999],[0,1.5]])assert.throws(()=>h.controller.spawnFriendlyUnit(...args),/0–4/);
  assert.deepEqual(h.controller.getState(),before);assert.equal(h.target.ZTPGamePort.state.bb_std_random_Seed,seed);
  const token=h.controller.pauseForEditor(),calls=h.runtimeCalls.slice();assert.equal(h.controller.spawnFriendlyUnit(4,998).count,998);
  assert.equal(h.controller.getBattleStatus().entities.total,1000);const fullSeed=h.target.ZTPGamePort.state.bb_std_random_Seed;
  assert.throws(()=>h.controller.spawnFriendlyUnit(2),/1000/);assert.equal(h.target.ZTPGamePort.state.bb_std_random_Seed,fullSeed);
  assert.deepEqual(h.runtimeCalls,calls);assert.equal(h.controller.getBattleStatus().editorPaused,true);
  assert.equal(h.controller.clearFriendlyTroops(4).count,998);assert.equal(g.bbztp.bbforce,0);h.controller.resumeFromEditor(token);
});

test('free friendly troop speed stays non-angry through subsequent global multiplier hot edits',()=>{
  const h=fixture({custom:true}),g=h.game;h.controller.spawnFriendlyUnit(0);const person=entries(g.bbpeople).at(-1),draft=h.controller.getDraft();
  draft.rules.multipliers.units.moveSpeed=2;draft.config.powers[0].effect.angerSpeedMultiplier=4;h.controller.commitSettings(draft);
  assert.equal(person.bbisangry,0);assert.equal(person.bbwalkspeed,draft.config.units[0].moveSpeed*2);
  assert.equal(h.controller.clearFriendlyTroops(0).count,1);assert.equal(g.bbztp.bbforce,0);
});


test('generic sandbox creates every human and zombie species on both true factions and typed-clears each without touching other actors or paid plans',()=>{
  const h=fixture({custom:true}),g=h.game,draft=h.controller.getDraft();draft.rules.multipliers.units={health:1.5,moveSpeed:1.5,damage:1.5};
  draft.rules.multipliers.zombies={health:2,moveSpeed:2,damage:2};h.controller.commitSettings(draft);
  g.bbztp.bbcash=100000;g.bbBuyUnit(g.bbunits[0]);const before=unchangedBattle(h),force=g.bbztp.bbforce,created=[];
  for(const side of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++) {
    const old=new Set(Factions.list(h.target,{includeBases:true})),result=Customization.spawnFactionUnit(side,{kind,type},2);
    const actors=Factions.list(h.target,{side,kind,type}).filter(body=>!old.has(body));assert.equal(actors.length,2);
    assert.deepEqual(Object.keys(result).sort(),['count','kind','positions','side','type']);assert.equal(result.count,2);assert.equal(result.side,side);assert.equal(result.kind,kind);assert.equal(result.type,type);
    for(const body of actors) {
      assert.equal(Factions.getSide(h.target,body),side);assert.equal(body.bbunit.bbtype,type+(kind==='zombie'?32:0));
      assert.equal(body.bbxpos,side==='friendly'?0:1600);assert.equal(body.bbhealth,g[kind==='unit'?'bbunits':'bbzunits'][type].bbhealth);
      assert.equal(body.bbwalkspeed,draft.config[kind==='unit'?'units':'zombies'][type].moveSpeed*(kind==='unit'?1.5:2));
      if(kind==='unit')assert.equal(body.bbisangry||0,0);
    }
    created.push({side,kind,type,actors});const after=unchangedBattle(h),expected={...before};delete after.seed;delete expected.seed;
    assert.deepEqual(after,expected);assert.equal(g.bbztp.bbforce,force);
  }
  assert.deepEqual(h.controller.getBattleStatus().factions,{friendly:{units:10,zombies:10},enemy:{units:10,zombies:10}});
  assert.equal(h.controller.getBattleStatus().entities.total,42);
  for(const fixture of created) {
    const remaining=Factions.list(h.target,{includeBases:true}).filter(body=>!fixture.actors.includes(body));
    const result=h.controller[fixture.side==='friendly'?'clearFriendlyTroops':'clearEnemyTroops']({kind:fixture.kind,type:fixture.type});
    assert.equal(result.count,2);assert.equal(result[fixture.kind==='unit'?'people':fixture.side==='friendly'?'converted':'zombies'],2);
    for(const body of fixture.actors){assert.equal(body.bbhealth,0);assert.equal(body.bbmode,15);}
    assert.deepEqual(new Set(Factions.list(h.target,{includeBases:true})),new Set(remaining));assert.equal(g.bbztp.bbforce,force);
  }
  assert.deepEqual(h.controller.getBattleStatus().factions,{friendly:{units:0,zombies:0},enemy:{units:0,zombies:0}});
  const after=unchangedBattle(h),expected={...before};delete after.seed;delete expected.seed;assert.deepEqual(after,expected);
});

test('generic faction spawn guards all inputs and live capacity before any list, namespace, clock, record or RNG changes',()=>{
  const h=fixture({custom:true}),before=unchangedBattle(h),calls=h.runtimeCalls.slice();
  for(const [side,selection,count] of [
    ['invalid',{kind:'unit',type:0},1],['friendly',{kind:'base',type:0},1],['enemy',{kind:'unit',type:5},1],
    ['enemy',{kind:'zombie',type:0,unknown:1},1],['friendly',{kind:'unit',type:1},0],['enemy',{kind:'unit',type:1},999],
    ['friendly',{kind:'zombie',type:1},1.5]
  ])assert.throws(()=>h.controller.spawnFactionUnit(side,selection,count));
  assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);
  h.controller.spawnFactionUnit('enemy',{kind:'unit',type:2},998);assert.equal(h.controller.getBattleStatus().entities.total,1000);
  const full=unchangedBattle(h);assert.throws(()=>h.controller.spawnFactionUnit('friendly',{kind:'zombie',type:4},1),/1000/);assert.deepEqual(unchangedBattle(h),full);
  assert.equal(h.controller.clearEnemyTroops({kind:'unit',type:2}).count,998);assert.equal(h.controller.getBattleStatus().entities.total,2);
});


test('cancel selected or all skill effects immediately clears only skill provenance and pending dispatch, never ordinary armies, orders, waves, refunds or clocks',()=>{
  const h=fixture({custom:true}),g=h.game,draft=h.controller.getDraft();draft.config.powers[0].effect.shovelCount=2000;h.controller.commitSettings(draft);
  h.controller.spawnFriendlyUnit(0,2);h.controller.spawnZombie(3);g.bbztp.bbcash=100000;g.bbBuyUnit(g.bbunits[0]);
  const regular=entries(g.bbpeople),enemies=entries(g.bbzombies),force=g.bbztp.bbforce;
  for(const power of [g.bbpowers[2],g.bbpowers[1],g.bbpowers[0]])g.bbAddPower(power);
  g.bbAddBottle(0,500,-100,0,0,0);const ordinaryBottle=entries(g.bbbottles).at(-1);
  g.bbAddBottle(0,600,-100,0,0,1);const airBottle=entries(g.bbbottles).at(-1);
  for(const power of g.bbpowers)power.bbbusy=7;
  const token=h.controller.pauseForEditor(),calls=h.runtimeCalls.slice(),before=unchangedBattle(h),cooldowns=g.bbpowers.map(power=>power.bbcooldown);
  const progress=h.controller.getBattleStatus().powerProgress;assert.ok(progress.pendingTotal>0);assert.ok(progress.activeTotal>0);assert.equal(progress.byPower.length,3);
  assert.deepEqual(h.controller.getState().powerProgress,progress);
  const mob=Customization.cancelPowerEffects(0);assert.ok(mob.pending>0);assert.ok(mob.actors>0);assert.equal(mob.charging,1);
  assert.deepEqual(entries(g.bbpeople),regular);assert.deepEqual(entries(g.bbzombies),enemies);assert.equal(g.bbztp.bbforce,force);
  assert.equal(entries(g.bbpowerups).length,4);assert.ok(entries(g.bbbottles).includes(airBottle));assert.ok(entries(g.bbbottles).includes(ordinaryBottle));
  const harvest=h.controller.cancelPowerEffects(1);assert.equal(harvest.powerups,1);assert.equal(harvest.charging,1);assert.equal(entries(g.bbpowerups).length,3);
  const air=h.controller.cancelPowerEffects(2);assert.equal(air.powerups,3);assert.equal(air.projectiles,1);assert.equal(air.charging,1);
  assert.deepEqual(entries(g.bbpowerups),[]);assert.deepEqual(entries(g.bbbottles),[ordinaryBottle]);assert.equal(h.controller.getBattleStatus().powerProgress.pendingTotal,0);
  assert.deepEqual(h.controller.cancelPowerEffects(),{pending:0,actors:0,powerups:0,projectiles:0,explosions:0,charging:0});
  assert.deepEqual(g.bbpowers.map(power=>power.bbcooldown),cooldowns);assert.equal(h.controller.getBattleStatus().editorPaused,true);assert.deepEqual(h.runtimeCalls,calls);
  const after=unchangedBattle(h),expected={...before};delete after.effects;delete expected.effects;delete after.powers;delete expected.powers;
  assert.deepEqual(after,expected);h.controller.resumeFromEditor(token);
});

test('skill cancellation invalid selection and readonly host reject before any partial effect removal, runtime pause, persistence or score namespace change',()=>{
  const original=fixture();original.game.bbPlayGame(1);assert.throws(()=>original.controller.cancelPowerEffects(),/先应用/);
  const h=fixture({custom:true}),g=h.game;g.bbAddPower(g.bbpowers[0]);g.bbAddPower(g.bbpowers[1]);
  for(const bad of [-1,3,0.5,null,'0','bad']) {
    const before=unchangedBattle(h),calls=h.runtimeCalls.slice();assert.throws(()=>h.controller.cancelPowerEffects(bad));
    assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);
  }
  const people=entries(g.bbpeople),actor=people.find(body=>body!==g.bbpeoplebase);Object.freeze(actor);
  const before=unchangedBattle(h),status=h.controller.getState(),calls=h.runtimeCalls.slice();
  assert.throws(()=>h.controller.cancelPowerEffects('all'),/writable|不可写/);
  assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(entries(g.bbpeople),people);assert.deepEqual(h.controller.getState(),status);assert.deepEqual(h.runtimeCalls,calls);
});


test('queued batches accept 1000 then another request immediately, materialize independently at per-job game-second rates, and preserve all ordinary plans on submission',()=>{
  const h=fixture({custom:true}),g=h.game,before=unchangedBattle(h),token=h.controller.pauseForEditor(),calls=h.runtimeCalls.slice();
  const slow=Customization.enqueueSpawn('enemy',{kind:'zombie',type:3},1000,{rate:0.1});
  const fast=h.controller.enqueueSpawn('friendly',{kind:'unit',type:0},1000,{rate:2});
  assert.notEqual(slow.id,fast.id);assert.equal(slow.rate,0.1);assert.equal(fast.rate,2);
  assert.equal(h.controller.getState().spawnQueue.totalPending,2000);assert.equal(h.controller.getBattleStatus().spawnQueue.pendingJobs,2);
  assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);assert.equal(h.controller.getState().spawnQueue.paused,true);
  h.controller.resumeFromEditor(token);for(let tick=0;tick<120;tick++)g.bbGameTick(0);
  let progress=h.controller.getState().spawnQueue;assert.equal(progress.jobs.find(job=>job.id===slow.id).spawned,0);assert.equal(progress.jobs.find(job=>job.id===fast.id).spawned,2);
  assert.equal(h.controller.getBattleStatus().factions.friendly.units,2);assert.equal(h.controller.getBattleStatus().factions.enemy.zombies,0);
  h.controller.setSpawnJobRate(slow.id,1);for(let tick=0;tick<120;tick++)g.bbGameTick(0);
  progress=h.controller.getState().spawnQueue;assert.equal(progress.jobs.find(job=>job.id===slow.id).spawned,1);assert.equal(progress.jobs.find(job=>job.id===fast.id).spawned,4);
  assert.equal(progress.jobs.find(job=>job.id===fast.id).rate,2);assert.equal(progress.jobs.find(job=>job.id===slow.id).firstSpawn.x,1600);
  const beforeRate=progress.jobs.map(job=>[job.id,job.rate]);SpawnQueue.setDefaultRate(h.target,50);
  const later=h.controller.enqueueSpawn('enemy',{kind:'unit',type:2},1000);assert.equal(later.rate,50);
  assert.deepEqual(h.controller.getState().spawnQueue.jobs.slice(0,2).map(job=>[job.id,job.rate]),beforeRate);
  h.controller.setSpawnJobRate(fast.id,0);const savedFast=h.controller.getState().spawnQueue.jobs.find(job=>job.id===fast.id).spawned;
  for(let tick=0;tick<120;tick++)g.bbGameTick(0);assert.equal(h.controller.getState().spawnQueue.jobs.find(job=>job.id===fast.id).spawned,savedFast);
});

test('queue cancellation removes only selected pending work, leaves materialized actors and skill/wave/recruit plans, and resets on a new battle',()=>{
  const h=fixture({custom:true}),g=h.game;
  const first=h.controller.enqueueSpawn('friendly',{kind:'unit',type:0},1000,{rate:120}),second=h.controller.enqueueSpawn('enemy',{kind:'unit',type:1},2000,{rate:0});
  g.bbGameTick(0);const actors=Factions.list(h.target),before=unchangedBattle(h),calls=h.runtimeCalls.slice();
  const result=h.controller.cancelSpawnJob(first.id);assert.equal(result.length,1);assert.equal(result[0].cancelledCount,999);
  assert.equal(h.controller.getState().spawnQueue.jobs.length,1);assert.equal(h.controller.getState().spawnQueue.jobs[0].id,second.id);
  assert.deepEqual(Factions.list(h.target),actors);assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);
  const all=h.controller.cancelAllSpawnJobs();assert.equal(all.length,1);assert.equal(all[0].cancelledCount,2000);assert.equal(h.controller.getState().spawnQueue.totalPending,0);
  h.controller.enqueueSpawn('enemy',{kind:'zombie',type:4},2147483647,{rate:0});assert.equal(h.controller.getState().spawnQueue.totalPending,2147483647);
  g.bbPlayGame(2);assert.equal(h.controller.getState().spawnQueue.jobs.length,0);assert.equal(h.controller.getState().spawnQueue.totalPending,0);assert.deepEqual(Factions.list(h.target),[]);
});

test('queued spawning covers all twenty faction/species combinations and invalid operations are atomic before RNG or clocks change',()=>{
  const h=fixture({custom:true}),g=h.game;
  for(const side of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++)h.controller.enqueueSpawn(side,{kind,type},1,{rate:120});
  assert.equal(h.controller.getState().spawnQueue.pendingJobs,20);g.bbGameTick(0);assert.equal(h.controller.getState().spawnQueue.pendingJobs,0);
  for(const side of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++)assert.equal(Factions.list(h.target,{side,kind,type}).length,1);
  const before=unchangedBattle(h),status=h.controller.getState().spawnQueue,calls=h.runtimeCalls.slice();
  for(const bad of [
    ()=>h.controller.enqueueSpawn('bad',{kind:'unit',type:0},1,{rate:1}),
    ()=>h.controller.enqueueSpawn('friendly',{kind:'unit',type:5},1,{rate:1}),
    ()=>h.controller.enqueueSpawn('friendly',{kind:'unit',type:0},0,{rate:1}),
    ()=>h.controller.enqueueSpawn('enemy',{kind:'zombie',type:0},2147483648,{rate:1}),
    ()=>h.controller.enqueueSpawn('enemy',{kind:'zombie',type:0},1000,{rate:-1}),
    ()=>h.controller.setSpawnJobRate('bad',1),()=>h.controller.cancelSpawnJob('bad')
  ])assert.throws(bad);
  assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.controller.getState().spawnQueue,status);assert.deepEqual(h.runtimeCalls,calls);
});


test('real-time troop counts report all twenty live camp/species combinations and follow actual conversions while deduplicating list entries',()=>{
  const h=fixture({custom:true}),g=h.game;
  for(const camp of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++)h.controller.spawnFactionUnit(camp,{kind,type},2);
  const initial={friendly:{units:[2,2,2,2,2],zombies:[2,2,2,2,2],total:20},enemy:{units:[2,2,2,2,2],zombies:[2,2,2,2,2],total:20}};
  assert.deepEqual(h.controller.getBattleStatus().troopCounts,initial);assert.deepEqual(h.controller.getState().troopCounts,initial);
  const human=Factions.list(h.target,{side:'enemy',kind:'unit',type:2})[0];assert.equal(Factions.convert(h.target,human,'friendly'),true);
  let counts=h.controller.getBattleStatus().troopCounts;assert.equal(counts.friendly.units[2],3);assert.equal(counts.enemy.units[2],1);assert.equal(counts.friendly.total,21);assert.equal(counts.enemy.total,19);
  const zombie=Factions.list(h.target,{side:'enemy',kind:'zombie',type:3})[0];assert.equal(Factions.convert(h.target,zombie,'friendly'),true);
  counts=h.controller.getBattleStatus().troopCounts;assert.equal(counts.friendly.zombies[3],3);assert.equal(counts.enemy.zombies[3],1);assert.equal(counts.friendly.total,22);assert.equal(counts.enemy.total,18);
  // Same reference may occur twice in a malformed list or both friendly lists;
  // counts remain per real actor rather than per linked node.
  const actor=Factions.list(h.target,{side:'friendly',kind:'unit',type:0})[0];g.bbpeople.bbAddLast(actor);g.bbpombies.bbAddLast(actor);
  assert.deepEqual(h.controller.getBattleStatus().troopCounts,counts);
  const before=unchangedBattle(h),calls=h.runtimeCalls.slice();const copy=h.controller.getState().troopCounts;copy.friendly.units[0]=999;
  assert.deepEqual(h.controller.getBattleStatus().troopCounts,counts);assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);
});

test('troop counts exclude dead-but-not-unlinked actors immediately and ignore bases, recruitment, queued sandbox batches and pending or vehicle skills',()=>{
  const h=fixture({custom:true}),g=h.game,draft=h.controller.getDraft();draft.config.powers[0].effect.shovelCount=2000;h.controller.commitSettings(draft);
  h.controller.spawnFriendlyUnit(0,998);g.bbztp.bbcash=100000;g.bbBuyUnit(g.bbunits[0]);
  h.controller.enqueueSpawn('enemy',{kind:'zombie',type:3},1000,{rate:0});for(const power of g.bbpowers)g.bbAddPower(power);
  assert.ok(h.controller.getState().powerProgress.pendingTotal>=2000);assert.equal(h.controller.getState().spawnQueue.totalPending,1000);
  let counts=h.controller.getBattleStatus().troopCounts;assert.deepEqual(counts,{friendly:{units:[998,0,0,0,0],zombies:[0,0,0,0,0],total:998},enemy:{units:[0,0,0,0,0],zombies:[0,0,0,0,0],total:0}});
  const bodies=entries(g.bbpeople).filter(body=>body!==g.bbpeoplebase);bodies[0].bbhealth=0;bodies[1].bbmode=14;bodies[2].bbmode=15;
  counts=h.controller.getState().troopCounts;assert.equal(counts.friendly.units[0],995);assert.equal(counts.friendly.total,995);assert.equal(entries(g.bbpeople).length,999);
  g.bbmainState=6;assert.deepEqual(h.controller.getBattleStatus().troopCounts,counts);
  g.bbPlayGame(1);assert.deepEqual(h.controller.getBattleStatus().troopCounts,{friendly:{units:[0,0,0,0,0],zombies:[0,0,0,0,0],total:0},enemy:{units:[0,0,0,0,0],zombies:[0,0,0,0,0],total:0}});
});

test('troop counts are zero in menus but retain real surviving armies on ended-match screens until reset',()=>{
  const menu=fixture(),zero={friendly:{units:[0,0,0,0,0],zombies:[0,0,0,0,0],total:0},enemy:{units:[0,0,0,0,0],zombies:[0,0,0,0,0],total:0}};
  assert.deepEqual(menu.controller.getState().troopCounts,zero);
  const h=fixture({custom:true}),g=h.game;h.controller.spawnFactionUnit('friendly',{kind:'zombie',type:4},2);h.controller.spawnFactionUnit('enemy',{kind:'unit',type:3},1);
  const counts=h.controller.getState().troopCounts;h.controller.setBaseHealth('enemy',0);assert.equal(g.bbmainState,3);assert.deepEqual(h.controller.getState().troopCounts,counts);
  g.bbmainState=1;assert.deepEqual(h.controller.getState().troopCounts,zero);
});

test('every camp and species receives its original detached death visuals without battle rewards, damage, RNG use or repeated population refunds',()=>{
  const h=fixture({custom:true}),g=h.game,draft=h.controller.getDraft();draft.rules.automaticSpawning=false;draft.rules.baseReinforcements=false;h.controller.commitSettings(draft);
  for(const side of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++)h.controller.spawnFactionUnit(side,{kind,type});
  const token=h.controller.pauseForEditor(),before=unchangedBattle(h),calls=h.runtimeCalls.slice(),force=g.bbztp.bbforce;
  assert.equal(h.controller.clearAllTroops().count,20);
  const visuals=['bbdeathlist','bbexplosions','bbbodyparts'].map(key=>entries(g[key]).filter(effect=>effect.bbSandboxDeath));
  assert.deepEqual(visuals.map(list=>list.length),[6,8,62]);
  assert.ok(visuals[0].every(effect=>effect instanceof h.target.ZTPGamePort.bb_Death && effect.bbthrow===0 && effect.bbframe===1));
  assert.ok(visuals[1].every(effect=>effect instanceof h.target.ZTPGamePort.bb_Explosion && effect.bbcloud===0));
  assert.ok(visuals[2].every(effect=>effect instanceof h.target.ZTPGamePort.bb_BodyPart && effect.bbbounce===0));
  assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);assert.equal(g.bbztp.bbforce,force);
  assert.equal(h.controller.clearAllTroops().count,0);assert.deepEqual(['bbdeathlist','bbexplosions','bbbodyparts'].map(key=>entries(g[key]).length),[6,8,62]);
  h.controller.resumeFromEditor(token);
  for(let tick=0;tick<2020;tick++)g.bbGameTick(0);
  assert.deepEqual(['bbdeathlist','bbexplosions','bbbodyparts'].map(key=>entries(g[key]).length),[0,0,0]);
  assert.equal(g.bbztp.bbforce,force);assert.equal(g.bbztp.bbxp,before.xp);assert.equal(g.bbzombieskilled,before.kills);assert.equal(g.bbkinlost,before.losses);
  assert.deepEqual([g.bbpeoplebase,g.bbzombiebase].map(body=>({health:body.bbhealth,mode:body.bbmode})),before.bases);
  assert.equal(h.controller.getState().troopCounts.friendly.total,0);assert.equal(h.controller.getState().troopCounts.enemy.total,0);
});

test('all clear scopes create native death visuals and preflight readonly effect targets before killing, unlinking, consuming RNG or releasing population',()=>{
  for(const action of ['clearFriendlyTroops','clearEnemyTroops','clearAllTroops'])for(const key of ['bbdeathlist','bbexplosions','bbbodyparts']) {
    const h=fixture({custom:true}),g=h.game;
    for(const side of ['friendly','enemy'])for(const [kind,type] of [['unit',0],['unit',3],['zombie',3]])h.controller.spawnFactionUnit(side,{kind,type});
    const actors=Factions.list(h.target),health=actors.map(body=>body.bbhealth),mode=actors.map(body=>body.bbmode),before=unchangedBattle(h),calls=h.runtimeCalls.slice();
    Object.freeze(g[key].bb_head);
    assert.throws(()=>h.controller[action](),/不可写/);
    assert.deepEqual(Factions.list(h.target),actors);assert.deepEqual(actors.map(body=>body.bbhealth),health);assert.deepEqual(actors.map(body=>body.bbmode),mode);
    assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);
  }
  const h=fixture({custom:true}),g=h.game;h.controller.spawnFriendlyUnit(0);h.controller.spawnFriendlyUnit(1);h.controller.spawnZombie(0);h.controller.spawnZombie(1);
  assert.equal(h.controller.clearFriendlyTroops({kind:'unit',type:1}).count,1);assert.equal(entries(g.bbdeathlist).length,1);
  assert.equal(h.controller.clearEnemyTroops({kind:'zombie',type:1}).count,1);assert.equal(entries(g.bbbodyparts).length,g.bbghoulpartsheet.bblastframe);
  assert.equal(h.controller.getState().troopCounts.friendly.units[0],1);assert.equal(h.controller.getState().troopCounts.enemy.zombies[0],1);
});

test('sandbox skills guard original mode and invalid selections before engine mutation or runtime transactions',()=>{
  const original=fixture();assert.throws(()=>original.controller.releaseSandboxPower(0),/先开始/);
  original.game.bbPlayGame(1);assert.throws(()=>Customization.releaseSandboxPower(0,'enemy'),/先应用/);
  const h=fixture({custom:true}),before=unchangedBattle(h),calls=h.runtimeCalls.slice();
  for(const args of [[-1,'friendly'],[3,'enemy'],[0.5,'friendly'],['0','friendly'],[0,'bad'],[0,null]])assert.throws(()=>h.controller.releaseSandboxPower(...args));
  assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.runtimeCalls,calls);
});

test('both factions can release all three configured sandbox skills while paused without XP payment, lock, charge, cooldown or score changes',()=>{
  for(const side of ['friendly','enemy'])for(const powerId of [0,1,2]) {
    const h=fixture({custom:true}),g=h.game;g.bbztp.bbxp=0;
    for(const power of g.bbpowers) {power.bblocked=1;power.bbbusy=7;power.bborders=2;power.bbcooldown=123;}
    const token=h.controller.pauseForEditor(),before=unchangedBattle(h),calls=h.runtimeCalls.slice(),seen=[];h.controller.subscribe(state=>seen.push(state));
    const report=Customization.releaseSandboxPower(powerId,side);
    assert.equal(report.powerId,powerId);assert.equal(report.side,side);assert.equal(report.requested,[16,1,3][powerId]);assert.equal(report.spawned+report.pending,report.requested);
    assert.equal(g.bbztp.bbxp,0);assert.equal(g.bbztp.bbforce,0);assert.deepEqual(plain(g.bbpowers.map(power=>[power.bblocked,power.bbbusy,power.bborders,power.bbcooldown])),[[1,7,2,123],[1,7,2,123],[1,7,2,123]]);
    assert.deepEqual(h.runtimeCalls,calls);assert.equal(h.controller.getState().editorPaused,true);assert.equal(seen.length,1);
    const after=unchangedBattle(h),expected={...before};delete after.seed;delete expected.seed;delete after.effects;delete expected.effects;
    assert.deepEqual(after,expected);
    if(powerId===0) {assert.equal(h.controller.getState().troopCounts[side].total,report.spawned);assert.equal(h.controller.getState().troopCounts[side==='friendly'?'enemy':'friendly'].total,0);}
    else assert.equal(entries(g.bbpowerups).length,[0,1,3][powerId]);
    h.controller.resumeFromEditor(token);
  }
});

test('sandbox skill engine preflight failures are atomic before controller clock ownership, and native pause remains paused after release',()=>{
  for(const key of ['bbpeople','bbpombies','bbzombies','bbpowerups']) {
    const h=fixture({custom:true}),g=h.game;Object.freeze(g[key].bb_head);
    const before=unchangedBattle(h),state=h.controller.getState(),calls=h.runtimeCalls.slice();
    assert.throws(()=>h.controller.releaseSandboxPower(2,'enemy'),/writable|不可写/);
    assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.controller.getState(),state);assert.deepEqual(h.runtimeCalls,calls);
  }
  const h=fixture({custom:true}),g=h.game;g.bbmainState=6;const ticks=g.bbgameticks;
  const result=h.controller.releaseSandboxPower(2,'enemy');assert.equal(result.requested,3);assert.equal(entries(g.bbpowerups).length,3);
  assert.equal(g.bbmainState,6);assert.equal(g.bbgameticks,ticks);assert.equal(h.controller.getBattleStatus().gamePaused,true);
});

test('unlock all immediately enables every building, troop and skill in custom rules without fabricated wins or original-score writes, and persists across edits and reloads',()=>{
  const storage=new Map([[constants.ORIGINAL_STORAGE+'/shared/ZTPBestScores/0','54321'],[constants.CUSTOM_STORAGE+'/shared/ZTPBestScores/2','98765']]);
  const h=fixture({storage}),g=h.game;g.bbPlayGame(1);g.bbztp.bbcash=700;g.bbztp.bbxp=0;g.bbpowers[2].bbcooldown=123;
  const original=[...storage].filter(([key])=>key.startsWith(constants.ORIGINAL_STORAGE+'/')),customRecords=[...storage].filter(([key])=>key.startsWith(constants.CUSTOM_STORAGE+'/'));
  const token=h.controller.pauseForEditor(),calls=h.runtimeCalls.slice(),seed=h.target.ZTPGamePort.state.bb_std_random_Seed,ticks=g.bbgameticks,counts=Array.from(g.bbztp.bbbuildingcount),seen=[];
  h.controller.subscribe(state=>seen.push(state));const report=Customization.unlockAll();
  assert.equal(report.promoted,true);assert.equal(report.staged,false);assert.deepEqual(report.unlocked,{units:5,buildings:6,powers:3,stages:[1,2,3,4]});
  assert.equal(h.namespace,constants.CUSTOM_STORAGE);assert.equal(h.controller.getState().mode,'custom');assert.equal(h.controller.getState().rules.unlockAllStages,true);
  assert.ok(g.bbunits.slice(0,5).every(unit=>unit.bbdependency===0));assert.ok(g.bbbuildings.every(building=>building.bbdependency===0));assert.ok(g.bbpowers.every(power=>power.bblocked===0));
  assert.deepEqual(Array.from(g.bbrecords),[0,0,98765,0]);assert.equal(g.bbztp.bbcash,700);assert.equal(g.bbztp.bbxp,0);assert.equal(g.bbpowers[2].bbcooldown,123);
  assert.deepEqual(Array.from(g.bbztp.bbbuildingcount),counts);assert.deepEqual([...storage].filter(([key])=>key.startsWith(constants.ORIGINAL_STORAGE+'/')),original);
  assert.deepEqual([...storage].filter(([key])=>key.startsWith(constants.CUSTOM_STORAGE+'/')),customRecords);assert.equal(g.bbgameticks,ticks);assert.equal(h.target.ZTPGamePort.state.bb_std_random_Seed,seed);
  assert.deepEqual(h.runtimeCalls,calls);assert.equal(seen.length,1);assert.equal(h.controller.getState().editorPaused,true);assert.equal(h.reloads,0);
  const draft=h.controller.getDraft();draft.config.units[0].cost=51;h.controller.commitSettings(draft);
  assert.ok(g.bbunits.slice(0,5).every(unit=>unit.bbdependency===0));assert.ok(g.bbbuildings.every(building=>building.bbdependency===0));assert.ok(g.bbpowers.every(power=>power.bblocked===0));
  const preset=h.controller.savePreset('全部开启',h.controller.getDraft()),loaded=h.controller.loadPreset(preset.id);assert.equal(loaded.rules.unlockAllStages,true);
  const restored=fixture({storage});assert.equal(restored.controller.getState().rules.unlockAllStages,true);assert.ok(restored.game.bbunits.slice(0,5).every(unit=>unit.bbdependency===0));
  restored.controller.startCustomBattle(4,restored.controller.getDraft());const stage4=fixture({storage});assert.equal(stage4.game.bbdifficulty,3);assert.ok(stage4.game.bbpowers.every(power=>power.bblocked===0));
  h.controller.resumeFromEditor(token);
});

test('unlock all works from the menu without starting a battle and readonly promotion or unlock targets reject before all mode, data, record and storage changes',()=>{
  const menu=fixture(),menuState=menu.game.bbmainState;const result=menu.controller.unlockAll();assert.equal(result.staged,true);assert.equal(result.promoted,true);
  assert.equal(menu.game.bbmainState,menuState);assert.equal(menu.controller.getState().isBattle,false);assert.equal(menu.reloads,0);assert.equal(menu.controller.getState().rules.unlockAllStages,true);
  menu.game.bbPlayGame(4);assert.equal(menu.game.bbdifficulty,3);assert.ok(menu.game.bbpowers.every(power=>power.bblocked===0));
  for(const custom of [false,true])for(const frozen of ['unit','building','power','records']) {
    const h=fixture({custom});if(!custom)h.game.bbPlayGame(1);const g=h.game;
    if(frozen==='unit')Object.defineProperty(g.bbunits[4],'bbdependency',{writable:false});
    if(frozen==='building')Object.defineProperty(g.bbbuildings[5],'bbdependency',{writable:false});
    if(frozen==='power')Object.defineProperty(g.bbpowers[2],'bblocked',{writable:false});
    if(frozen==='records')Object.freeze(g.bbrecords);
    if(custom && frozen==='records')continue; // An already-custom match never writes scores to unlock content.
    const before=unchangedBattle(h),state=h.controller.getState(),namespace=h.namespace,calls=h.runtimeCalls.slice();
    assert.throws(()=>h.controller.unlockAll(),/writable|不可写/);
    assert.deepEqual(unchangedBattle(h),before);assert.deepEqual(h.controller.getState(),state);assert.equal(h.namespace,namespace);assert.deepEqual(h.runtimeCalls,calls);
  }
});
