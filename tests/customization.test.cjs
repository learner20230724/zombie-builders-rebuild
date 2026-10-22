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
function entries(list) {const values=[],it=list.bbObjectEnumerator();while(it.bbHasNext())values.push(it.bbNextObject());return values;}
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
    configureRuntime:options=>{namespace=options.storageKey;},location:{reload:()=>{reloads++;}},
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

test('replacing upcoming waves retains current group identity/time/count and does not apply unrelated draft changes',()=>{
  const h=fixture({custom:true}),mob=h.target.ZTPGamePort.bb_ZombieMob;
  const first=entries(mob.bbqueue)[0];first.bbcount=3;first.bbtime=1.5;mob.bbticks=42;
  h.game.bbzombiehealth=12345;
  const draft=h.controller.getDraft().config;draft.units[0].health=999;
  draft.levels[0].waves=[{type:4,count:20,delay:1},{type:1,count:100,delay:0},{type:5,count:3,delay:3,enabled:false},{type:3,count:20,delay:2}];
  const result=h.controller.applyUpcomingWaves(draft),queue=entries(mob.bbqueue);
  assert.equal(queue[0],first);assert.equal(first.bbcount,3);assert.equal(first.bbtime,1.5);assert.equal(mob.bbticks,42);
  assert.deepEqual(queue.slice(1).map(x=>[x.bbtype,x.bbcount,x.bbdelay]),[[4,20,1],[1,100,0],[3,20,2]]);
  assert.equal(h.game.bbzombiehealth,12345);assert.equal(h.game.bbunits[0].bbhealth,50);
  assert.deepEqual(result,{retainedCurrent:true,upcomingGroups:3,totalUpcoming:140});
});

test('empty future wave replacement safely keeps only the active group',()=>{
  const h=fixture({custom:true}),mob=h.target.ZTPGamePort.bb_ZombieMob,first=entries(mob.bbqueue)[0];
  const config=h.controller.getDraft().config;config.levels[0].waves=[];
  const result=h.controller.applyUpcomingWaves(config);assert.equal(result.upcomingGroups,0);assert.equal(entries(mob.bbqueue)[0],first);
  mob.bbqueue.bbClear();assert.doesNotThrow(()=>h.controller.applyUpcomingWaves(config));assert.equal(entries(mob.bbqueue).length,0);
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
