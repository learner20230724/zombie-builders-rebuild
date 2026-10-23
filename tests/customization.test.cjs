'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const GameConfig=require('../src/game-config.js');
const CustomRules=require('../src/custom-rules.js');
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
function fixture({storage=new Map(),external=baseline(),custom=false,throwStorage=false,throwWrites=false}={}) {
  if(custom) storage.set(constants.SESSION_KEY,JSON.stringify({schemaVersion:1,mode:'custom',config:external,rules:CustomRules.defaults(),stage:1,selectedPresetId:null}));
  const manifest=JSON.parse(read('public/assets/manifest.json'));
  const drawing=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){const image=manifest.images[name];assert.ok(image,name);return {Width:()=>image.width,Height:()=>image.height};}},{get:(target,key)=>target[key]||(()=>0)});
  const input=new Proxy({},{get:()=>()=>0}), audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
  class App {GraphicsDevice(){return drawing;}InputDevice(){return input;}AudioDevice(){return audio;}SetUpdateRate(){return 0;}MilliSecs(){return 0;}}
  let namespace=constants.ORIGINAL_STORAGE, reloads=0, ended=0;
  const runtimeCalls=[],runtimeState={running:true},events=[];
  const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class {},
    localStorage:{getItem:key=>{if(throwStorage)throw Error('storage off');return storage.get(key)||null;},setItem:(key,value)=>{if(throwStorage||throwWrites)throw Error('storage full');storage.set(key,value);}},
    ReadInt:(group,key)=>Number(storage.get(namespace+'/shared/'+group+'/'+key)||0)|0,
    WriteInt:(group,key,value)=>storage.set(namespace+'/shared/'+group+'/'+key,String(value|0)),FlushInts:()=>0,
    PlayMovie:()=>0,MovieFinished:()=>1,EndMovie:()=>{ended++;},ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0,
    configureRuntime:options=>{if(runtimeState.running)throw Error('Stop the runtime before reconfiguring it');namespace=options.storageKey;},location:{reload:()=>{reloads++;}},
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},dispatchEvent:event=>events.push(event),
    ZTPRuntime:{getStatus:()=>({...runtimeState}),stop:()=>{runtimeCalls.push('stop');runtimeState.running=false;},advance:n=>runtimeCalls.push('advance:'+n),
      useRealtime:()=>runtimeCalls.push('realtime'),start:()=>{runtimeCalls.push('start');runtimeState.running=true;}}
  });
  vm.runInContext(read('src/generated-game.js'),target);
  const prepared=Customization.prepare(baseline(),external,target);
  namespace=prepared.storageKey;
  GameConfig.install(target,prepared.configuration);CustomRules.install(target,prepared.rules);
  target.bb_Init();target.bb_Main();
  const device=target.ZTPGamePort.state.bb_mojo_app_device;device.OnCreate();device.OnUpdate();
  const controller=Customization.attach(target,{prepared}),game=target.ZTPGamePort.state.bb_Game;
  return {target,controller,game,storage,events,runtimeCalls,prepared,get namespace(){return namespace;},get reloads(){return reloads;},get ended(){return ended;}};
}

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
    assert.equal(zombie.bbhealth,h.game.bbzunits[type].bbhealth);assert.equal(result.count,1);assert.ok(zombie.bbxpos>=1440&&zombie.bbxpos<1600);
  }
  const fat=entries(h.game.bbzombies).find(z=>z.bbunit.bbtype===35);assert.ok(fat.bbskin);assert.equal(fat.bbhealth,1000);
  const x=fat.bbxpos;h.game.bbGameTick(0);assert.ok(fat.bbxpos<x);
});

test('manual spawning cannot alter original mode or exceed batch/entity safety limits',()=>{
  const h=fixture();h.game.bbPlayGame(1);assert.throws(()=>h.controller.spawnZombie(3),/先应用/);
  h.controller.applyLive(h.controller.getDraft().config);
  for(const args of [[-1,1],[5,1],[3,0],[3,21],[3,1.5]])assert.throws(()=>h.controller.spawnZombie(...args),/0–4/);
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
    effects:['bbbottles','bbflinglist','bbdeathlist','bbbodyparts','bbexplosions','bbpowerups'].map(key=>entries(g[key])),
    config:h.controller.getDraft(),storage:[...h.storage]};
}

test('clear buttons require a custom active battle, including when called through the public facade',()=>{
  const h=fixture(),actions=['clearFriendlyTroops','clearEnemyTroops'];
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
