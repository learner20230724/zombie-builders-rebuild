/* Persistent custom rules, isolated scores, and immediate live editing. */
(function (root, factory) {
  'use strict';
  const api = factory(root, typeof module === 'object' && module.exports ? require('./game-config.js') : null,
    typeof module === 'object' && module.exports ? require('./custom-rules.js') : null,
    typeof module === 'object' && module.exports ? require('./factions.js') : null,
    typeof module === 'object' && module.exports ? require('./spawn-queue.js') : null,
    typeof module === 'object' && module.exports ? require('./death-effects.js') : null);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Customization = api;
})(typeof globalThis === 'object' ? globalThis : this, function (root, importedConfig, importedRules, importedFactions, importedQueue, importedDeathEffects) {
  'use strict';
  const ORIGINAL_STORAGE = 'zombie-trailer-park-0.33', CUSTOM_STORAGE = 'zombie-builders-custom-v1';
  const PRESETS_KEY = 'zombie-builders-presets-v1', SESSION_KEY = 'zombie-builders-session-v1';
  const LIMIT = 2 * 1024 * 1024, MAX_PRESETS = 25, states = new WeakMap();
  let active = null, resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  function fail(message) { throw new Error('Customization: ' + message); }
  function object(value, allowed, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(label + ' must be an object');
    for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(label + '.' + key + ' is not supported');
  }
  function plain(value,maxBytes=LIMIT) {
    let nodes = 0;
    function inspect(item, depth) {
      if (depth > 40 || ++nodes > 250000) fail('document is too complex');
      if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
      if (typeof item === 'number') { if (!Number.isFinite(item)) fail('non-finite number'); return; }
      if (typeof item !== 'object') fail('only JSON values are supported');
      if (!Array.isArray(item) && Object.prototype.toString.call(item) !== '[object Object]') fail('only plain JSON objects are supported');
      const prototype=Object.getPrototypeOf(item);
      if (!Array.isArray(item) && prototype!==null && Object.getPrototypeOf(prototype)!==null) fail('only plain JSON objects are supported');
      for (const key of Reflect.ownKeys(item)) {
        if (Array.isArray(item) && key==='length') continue;
        if (typeof key!=='string') fail('only JSON string keys are supported');
        if (['__proto__', 'prototype', 'constructor'].includes(key)) fail('unsafe object key: ' + key);
        const descriptor=Object.getOwnPropertyDescriptor(item,key);
        if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor,'value')) fail('only JSON data properties are supported');
        inspect(descriptor.value, depth + 1);
      }
    }
    inspect(value, 0);
    const text = JSON.stringify(value);
    if (new TextEncoder().encode(text).length > maxBytes) fail('document exceeds size limit');
    return JSON.parse(text);
  }
  function parse(text,maxBytes=LIMIT) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > maxBytes) fail('JSON must be at most 2 MiB');
    try { return plain(JSON.parse(text),maxBytes); } catch (error) { fail('invalid JSON: ' + error.message); }
  }
  function nameOf(value) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(value)) fail('name must contain 1–80 printable characters');
    return value.trim();
  }
  function stageOf(stage) { if (!Number.isInteger(stage) || stage < 1 || stage > 4) fail('stage must be 1–4'); return stage; }
  function canonical(value) { return Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])])) : value; }
  function same(a,b) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }
  // Content-change detection only, not a trust/signature/security boundary.
  function fingerprint(value) {
    const text=JSON.stringify(canonical(value)),lanes=[0x811c9dc5,0x9e3779b9,0x85ebca6b,0xc2b2ae35];
    for (let n=0;n<text.length;n++) for (let lane=0;lane<lanes.length;lane++) lanes[lane]=Math.imul(lanes[lane]^text.charCodeAt(n),0x01000193+lane*2);
    return text.length+':'+lanes.map(lane=>(lane>>>0).toString(16).padStart(8,'0')).join('');
  }
  function withoutWaveIds(configuration) {
    const copy=plain(configuration);
    for (const level of copy.levels||[]) for (const wave of level.waves||[]) delete wave.id;
    return copy;
  }
  function identifyLegacyWaves(configuration) {
    if (!Array.isArray(configuration?.levels)) return configuration;
    if (!configuration.levels.some(level=>Array.isArray(level?.waves) && level.waves.some(wave=>wave && typeof wave==='object' && !Object.prototype.hasOwnProperty.call(wave,'id')))) return configuration;
    const stamp=fingerprint(configuration).replace(':','-');
    for (const level of configuration.levels) if (Array.isArray(level?.waves)) level.waves.forEach((wave,index)=>{
      if (wave && typeof wave==='object' && !Object.prototype.hasOwnProperty.call(wave,'id')) wave.id='legacy-untracked-'+stamp+'-s'+level.id+'-w'+(index+1);
    });
    return configuration;
  }
  function dependencies(target) {
    const config = target.GameConfig || importedConfig || root.GameConfig;
    const rules = target.CustomRules || importedRules || root.CustomRules;
    if (!config || !rules) fail('GameConfig and CustomRules must be loaded first');
    return {config,rules,factions:target.Factions||importedFactions||root.Factions,spawnQueue:target.SpawnQueue||importedQueue||root.SpawnQueue};
  }
  function warn(state, message) { if (!state.warnings.includes(message)) state.warnings.push(message); }
  function read(state,key) {
    if (state.unpersisted.has(key)) return state.memory.get(key) || null;
    try {
      if (!state.target.localStorage) throw new Error('not available');
      const value=state.target.localStorage.getItem(key);
      if (value !== null) { state.memory.set(key,value); return value; }
      return state.memory.get(key) || null;
    } catch (_) { state.storageAvailable=false; warn(state,'本机存储不可用，规则仅在本次窗口中保留。'); return state.memory.get(key) || null; }
  }
  function write(state,key,value) {
    const text=JSON.stringify(value); state.memory.set(key,text);
    try { if (!state.target.localStorage) throw new Error('not available'); state.target.localStorage.setItem(key,text); state.unpersisted.delete(key); }
    catch (_) { state.unpersisted.add(key); state.storageAvailable=false; warn(state,'本机存储不可用，规则仅在本次窗口中保留。'); }
  }
  function writeRequired(state,key,value) {
    const text=JSON.stringify(value);
    try {
      if (!state.target.localStorage) throw new Error('not available');
      state.target.localStorage.setItem(key,text);
    } catch (_) {
      // A reload destroys the in-memory fallback. Do not cache a proposed mode
      // or mark the window as leaving until durable storage actually succeeds.
      fail('无法保存启动规则，未切换模式或重新载入。请先导出规则，并清理本机存储容量或恢复存储权限后重试；仍可应用到当前这局。');
    }
    state.memory.set(key,text);state.unpersisted.delete(key);
  }
  function spec(state, input) {
    object(input,['config','rules'],'preset');
    if (!input.config || !input.rules) fail('preset requires config and rules');
    const checked=plain(input);identifyLegacyWaves(checked.config);
    const rules=state.api.rules.validate(checked.rules),configuration=state.api.config.validate(checked.config,{multipliers:rules.multipliers});
    // Validate the composed values as one transaction (a valid raw HP and a
    // valid faction multiplier can still overflow when multiplied together).
    state.api.config.compile(configuration,{multipliers:rules.multipliers});
    return {config:configuration,rules};
  }
  function prepare(defaults,externalConfig,target=root) {
    if (states.has(target)) fail('prepare may only be called once per window');
    const api=dependencies(target), baseline=api.config.validate(plain(defaults)), external=api.config.validate(plain(externalConfig));
    const state={target,api,defaults:baseline,defaultRules:api.rules.defaults(),memory:new Map(),unpersisted:new Set(),warnings:[],storageAvailable:true,
      mode:same(withoutWaveIds(baseline),withoutWaveIds(external))?'original':'custom',config:external,rules:api.rules.defaults(),stage:null,
      sourceFingerprint:fingerprint(withoutWaveIds(external)),selectedPresetId:null,listeners:new Set(),pauseTokens:new Set(),pauseSequence:0,leaving:false};
    const saved=read(state,SESSION_KEY);
    if (saved) try {
      const session=parse(saved,LIMIT+8192); object(session,['schemaVersion','mode','config','rules','stage','selectedPresetId','sourceFingerprint'],'session');
      if (session.schemaVersion!==1 || !['original','custom'].includes(session.mode)) fail('invalid session version or mode');
      const selected=session.mode==='original'?{config:baseline,rules:api.rules.defaults()}:spec(state,{config:session.config,rules:session.rules});
      const selectedStage=session.stage !== null && session.stage !== undefined?stageOf(session.stage):null;
      if (session.selectedPresetId !== null && session.selectedPresetId !== undefined) {
        if (typeof session.selectedPresetId!=='string' || !/^preset-[a-z0-9-]+$/.test(session.selectedPresetId)) fail('invalid selected preset id');
      }
      // v0.3.0 source fingerprints predate internal wave IDs. Do not mistake
      // deterministic ID normalization for a user's external JSON edit.
      const matchesSource=session.sourceFingerprint===state.sourceFingerprint || session.sourceFingerprint===fingerprint(external);
      if (session.sourceFingerprint!==undefined && !matchesSource)
        warn(state,'外置 JSON 配置已变更，已使用新配置；已保存预设仍然保留。');
      else Object.assign(state,{mode:session.mode,config:selected.config,rules:selected.rules,stage:selectedStage,selectedPresetId:session.selectedPresetId||null});
    } catch (error) { warn(state,'已忽略损坏的本机规则会话：'+error.message); }
    const prepared={configuration:plain(state.config),rules:plain(state.rules),mode:state.mode,
      storageKey:state.mode==='original'?ORIGINAL_STORAGE:CUSTOM_STORAGE};
    state.prepared=prepared; states.set(target,state); return prepared;
  }
  function entries(list) {
    if (!list || typeof list.bbObjectEnumerator!=='function') return [];
    const result=[],iterator=list.bbObjectEnumerator();
    while (iterator.bbHasNext()) { if (result.length>100000) fail('entity list is too large'); result.push(iterator.bbNextObject()); }
    return result;
  }
  function attach(target=root,options={}) {
    const state=states.get(target); if (!state) fail('prepare must precede attach');
    if (state.controller) return state.controller;
    if (options.prepared && options.prepared!==state.prepared) fail('wrong prepared session');
    const port=target.ZTPGamePort; if (!port || !port.state.bb_Game) fail('game must be initialized before attach');
    const game=()=>port.state.bb_Game;
    function battle() { const value=game(); return !!value && (value.bbmainState===2 || value.bbmainState===6); }
    function customBattle() { if (!battle()) fail('请先开始一局游戏'); if (state.mode!=='custom') fail('请先应用设置，将本局切换为自定义模式；修改设置后自动应用'); return game(); }
    function writable(owner,key,message='运行时状态不可写，未修改本局') {
      const property=Object.getOwnPropertyDescriptor(owner,key);
      if (property ? !Object.prototype.hasOwnProperty.call(property,'value') || !property.writable : !Object.isExtensible(owner)) fail(message);
    }
    function baseHealth() {
      if (!battle()) return null;
      const value=game(),configuration=current();
      return Object.fromEntries([['friendly',value.bbpeoplebase,configuration.units[5]],['enemy',value.bbzombiebase,configuration.zombies[5]]]
        .map(([side,body,item])=>[side,{current:body.bbhealth,maximum:state.api.config.getMaximumHealth ? state.api.config.getMaximumHealth(target,body) : item.health}]));
    }
    function current() { return state.api.config.getCurrent ? state.api.config.getCurrent(target) : plain(state.config); }
    function sessionValue(overrides={}) { return {schemaVersion:1,mode:state.mode,config:state.config,rules:state.rules,
      stage:state.stage,selectedPresetId:state.selectedPresetId,sourceFingerprint:state.sourceFingerprint,...overrides}; }
    function persist() { write(state,SESSION_KEY,sessionValue()); }
    function presetRecords() {
      const text=read(state,PRESETS_KEY); if (!text) return [];
      try {
        const data=parse(text); object(data,['schemaVersion','presets'],'preset library');
        if (data.schemaVersion!==1 || !Array.isArray(data.presets) || data.presets.length>MAX_PRESETS) fail('invalid preset library');
        const ids=new Set();
        return data.presets.map(record=>{
          object(record,['id','name','updatedAt','config','rules'],'saved preset');
          if (typeof record.id!=='string' || !/^preset-[a-z0-9-]+$/.test(record.id) || ids.has(record.id)) fail('invalid preset id');
          ids.add(record.id);
          if (typeof record.updatedAt!=='string' || !Number.isFinite(Date.parse(record.updatedAt))) fail('invalid preset date');
          return {id:record.id,name:nameOf(record.name),updatedAt:record.updatedAt,...spec(state,{config:record.config,rules:record.rules})};
        });
      } catch (error) { warn(state,'预设库无法读取，原始数据未删除：'+error.message); throw error; }
    }
    const metadata=record=>({id:record.id,name:record.name,updatedAt:record.updatedAt});
    function spawnQueueStatus() {
      if (typeof state.api.spawnQueue?.snapshot!=='function') return null;
      try {return state.api.spawnQueue.snapshot(target);}
      catch(error) {if (/SpawnQueue: install must run first/.test(error.message)) return null;throw error;}
    }
    function spawnQueueApi() {
      const queue=state.api.spawnQueue;
      if (!queue || !spawnQueueStatus()) fail('批量生成队列不可用，请更新游戏后重试');
      return queue;
    }
    function troopCounts(value,people,zombies,converted) {
      const side=()=>({units:[0,0,0,0,0],zombies:[0,0,0,0,0],total:0});
      const result={friendly:side(),enemy:side()};
      // Attract/menu actors are not an ongoing army. Score screens, however,
      // still contain the real match's survivors until the next reset.
      if (![2,3,4,6].includes(value.bbmainState)) return result;
      for (const [camp,bodies] of [['friendly',[...people,...converted]],['enemy',zombies]]) {
        const seen=new Set(),counts=result[camp];
        for (const body of bodies) {
          if (!body || seen.has(body)) continue;seen.add(body);
          if (body===value.bbpeoplebase || body===value.bbzombiebase || !(body.bbhealth>0) || body.bbmode===14 || body.bbmode===15) continue;
          const type=body.bbunit?.bbtype;
          if (Number.isInteger(type) && type>=0 && type<5) counts.units[type]++;
          else if (Number.isInteger(type) && type>=32 && type<37) counts.zombies[type-32]++;
          else continue;
          counts.total++;
        }
      }
      return result;
    }
    function battleStatus() {
      const value=game(),runtimeRunning=!!target.ZTPRuntime?.getStatus().running;
      const people=entries(value.bbpeople),zombies=entries(value.bbzombies),converted=entries(value.bbpombies);
      const counts=troopCounts(value,people,zombies,converted);
      const editorPauseCount=state.pauseTokens.size,editorPaused=editorPauseCount>0,gamePaused=value.bbmainState===6;
      const lastReport=state.lastWaveBattleToken===value.bbztp?state.lastWaveReport:null;
      return {isBattle:battle(),stage:battle()?value.bbdifficulty+1:state.stage||1,
        mainState:value.bbmainState,runtimeRunning,editorPaused,editorPauseCount,gamePaused,
        battleRunning:runtimeRunning && value.bbmainState===2 && !editorPaused,
        automaticSpawning:state.rules.automaticSpawning,bases:baseHealth(),spawnQueue:spawnQueueStatus(),troopCounts:counts,
        factions:{friendly:{units:[...people,...converted].filter(body=>body.bbunit?.bbtype>=0 && body.bbunit.bbtype<5).length,
          zombies:[...people,...converted].filter(body=>body.bbunit?.bbtype>=32 && body.bbunit.bbtype<37).length},
          enemy:{units:zombies.filter(body=>body.bbunit?.bbtype>=0 && body.bbunit.bbtype<5).length,
            zombies:zombies.filter(body=>body.bbunit?.bbtype>=32 && body.bbunit.bbtype<37).length}},
        buildings:(value.bbbuildings||[]).map(building=>({id:building.bbtype,built:value.bbztp?.bbbuildingcount[building.bbtype]||0,
          queued:building.bborders,maximum:building.bbmaximum})),
        waveProgress:state.api.config.getWaveProgress?state.api.config.getWaveProgress(target):null,
        powerProgress:state.api.config.getPowerProgress?state.api.config.getPowerProgress(target,{includeActive:true}):null,
        wavePending:lastReport?.deferred?.slice()||[],waveNotes:lastReport?.notes?.slice()||[],
        entities:{people:people.filter(body=>body.bbunit?.bbtype!==5).length,zombies:zombies.filter(body=>body.bbunit?.bbtype!==37).length,
          converted:converted.length,total:people.length+zombies.length+converted.length}};
    }
    function snapshot() {
      let presets=[]; try { presets=presetRecords().map(metadata); } catch (_) {}
      const status=battleStatus();
      return {mode:state.mode,isCustom:state.mode==='custom',isBattle:battle(),stage:battle()?game().bbdifficulty+1:state.stage||1,
        config:current(),rules:plain(state.rules),defaults:plain(state.defaults),defaultRules:plain(state.defaultRules),
        presets,selectedPresetId:state.selectedPresetId,storageAvailable:state.storageAvailable,warnings:state.warnings.slice(),paused:state.pauseTokens.size>0,
        battleStatus:status,bases:status.bases,troopCounts:status.troopCounts,spawnQueue:status.spawnQueue,waveProgress:status.waveProgress,powerProgress:status.powerProgress,runtimeRunning:status.runtimeRunning,editorPaused:status.editorPaused,
        gamePaused:status.gamePaused,battleRunning:status.battleRunning};
    }
    function notify() { for (const listener of state.listeners) try { listener(snapshot()); } catch (error) { target.console?.error(error); } }
    function reload() {
      if (!target.location || typeof target.location.reload!=='function') fail('this environment cannot reload the game');
      state.leaving=true; state.pauseTokens.clear();
      target.location.reload();
    }
    function switchForReload(next) {
      if (!target.location || typeof target.location.reload!=='function') fail('this environment cannot reload the game');
      writeRequired(state,SESSION_KEY,sessionValue(next));
      Object.assign(state,next);reload();
    }
    function promote() {
      if (state.mode==='custom') return false;
      if (typeof target.configureRuntime!=='function') fail('runtime storage switching is unavailable');
      target.configureRuntime({storageKey:CUSTOM_STORAGE});
      // Reload custom records under the new namespace; never copy original wins.
      if (typeof game().bbReadScores==='function') game().bbReadScores();
      const configuration=current();
      for (const power of game().bbpowers || []) {
        const stage=configuration.powers[power.bbtype].unlockAfterStage;
        power.bblocked=stage===0 || game().bbrecords[stage-1]!==0 ? 0 : 1;
      }
      state.mode='custom'; state.stage=battle()?game().bbdifficulty+1:null;
      return true;
    }
    function preflightPromotion() {
      if (state.mode==='custom') return;
      if (typeof target.configureRuntime!=='function') fail('runtime storage switching is unavailable');
      for (let index=0;index<4;index++) writable(game().bbrecords,String(index));
      for (const power of game().bbpowers||[]) writable(power,'bblocked');
    }
    function preflightRules(rules) {
      const value=game();
      if (value.bbztp) writable(value.bbztp,'bbmaxforce');
      if (rules.economy.salvageIntervalTicks!==state.rules.economy.salvageIntervalTicks) writable(value,'bbcoins');
    }
    function preflightConfiguration(configuration,options,includeWaves=true) {
      preflightPromotion();
      const report=state.api.config.updateLive(target,configuration,{healthPolicy:options.healthPolicy||'ratio',preserveTimerProgress:true,
        multipliers:options.multipliers||state.rules.multipliers,validateOnly:true,...(options.sandboxUnlocks?{sandboxUnlocks:true}:{})});
      if (battle() && includeWaves) synchronizeWaves(configuration,report,{validateOnly:true,multipliers:options.multipliers||state.rules.multipliers});
      return report;
    }
    function applyValidatedConfiguration(validated,options) {
      if (!battle()) fail('请先开始一局游戏');
      const promoted=promote();
      const result=state.api.config.updateLive(target,validated,{healthPolicy:options.healthPolicy||'ratio',preserveTimerProgress:true,
        multipliers:options.multipliers||state.rules.multipliers,...(options.sandboxUnlocks?{sandboxUnlocks:true}:{})});
      state.config=validated;state.stage=game().bbdifficulty+1;
      return {...synchronizeWaves(validated,result),promoted};
    }
    function synchronizeWaves(configuration,report,options={}) {
      const stage=game().bbdifficulty+1,path='$.levels['+(stage-1)+'].waves';
      const progress=state.api.config.getWaveProgress?.(target)||null;
      const known=new Set(progress?.knownIds||[]),waves=configuration.levels.find(level=>level.id===stage).waves;
      const missingIdentity=waves.some(wave=>wave.id?.startsWith('legacy-untracked-') && !known.has(wave.id));
      let waveReport;
      if (missingIdentity || !state.api.config.applyLiveWaves) {
        const reason=missingIdentity?'这套旧规则没有本局可核对的波次身份，出怪计划需新开一局。':'本局波次进度不可用，出怪计划需新开一局。';
        waveReport={applied:[],deferred:[path],notes:[reason],requiresNewBattle:true,reason,progress};
      } else waveReport=state.api.config.applyLiveWaves(target,configuration,options);
      const otherStages=[...new Set((report.deferred||[]).flatMap(field=>{
        const match=field.match(/^\$\.levels\[(\d+)\]\.waves(?:$|\.)/);return match && Number(match[1])!==stage-1?[Number(match[1])+1]:[];
      }))];
      waveReport={...waveReport,stage,otherStages,notes:[...(waveReport.notes||[])]};
      if (otherStages.length) waveReport.notes.push('当前战斗为第 '+stage+' 关；第 '+otherStages.join('、')+' 关的波次修改将在下次开始对应关卡时生效。');
      if (!options.validateOnly) {state.lastWaveReport=waveReport;state.lastWaveBattleToken=game().bbztp;}
      const deferred=(report.deferred||[]).filter(field=>field!==path && !field.startsWith(path+'.'));
      return {...report,applied:[...new Set([...(report.applied||[]),...(waveReport.applied||[])])],
        deferred:[...new Set([...deferred,...(waveReport.deferred||[])])],waveReport};
    }
    function runtimeTransaction(action) {
      const runtime=target.ZTPRuntime,wasRunning=!!runtime?.getStatus().running;
      if (wasRunning) { runtime.stop();runtime.advance(0); }
      try { return action(); }
      finally { if (wasRunning && !state.leaving) { runtime.useRealtime();runtime.start(); } }
    }
    function troopFilter(side,selection) {
      if (selection===undefined || selection===null || selection==='all') return ()=>true;
      let kind=side==='friendly'?'unit':'zombie',type=selection;
      if (typeof selection==='string' && /^converted-[0-4]$/.test(selection)) {kind='converted';type=Number(selection.at(-1));}
      else if (selection && typeof selection==='object') {
        object(selection,['kind','type'],'troop selection');kind=selection.kind;type=selection.type;
      }
      if (kind==='converted' && side==='friendly') kind='zombie';
      if (!Number.isInteger(type) || type<0 || type>4 || !['unit','zombie'].includes(kind))
        fail('清理类型无效：请选择 0–4 的己方兵种、转化僵尸或敌方僵尸');
      return body=>body.bbunit?.bbtype===(kind==='unit'?type:type+32);
    }
    function deathEffectPlan(value,bodies) {
      const plan=[],partSheets=[value.bbzombiepartsheet,value.bbghoulpartsheet,value.bbfastzombiepartsheet,value.bbfatzombiepartsheet];
      const deathEffects=target.DeathEffects||importedDeathEffects||root.DeathEffects;
      const add=(list,effect,body)=>{if(deathEffects)deathEffects.tag(target,effect,body);effect.bbSandboxDeath=1;plan.push([list,effect]);};
      const explosion=(body,x,scale)=>add(value.bbexplosions,new port.bb_Explosion().bbExplosion_new(body.bblayer,
        port.bb_Cell.bbcells(value.bbexplosionsheet),x,body.bbypos,scale),body);
      const seed=port.state.bb_std_random_Seed;
      try {
        for (const body of bodies) {
          const type=body.bbunit.bbtype;
          if (![body.bbxpos,body.bbypos,body.bblayer].every(Number.isFinite)) fail('无法清场：死亡动画位置无效');
          if (type>=0 && type<5) {
            const sheet=[value.bbshoveldeathsheet,value.bbshotgundeathsheet,null,null,value.bbpreacherdeathsheet][type];
            if ([0,1,4].includes(type) && (!sheet || !Number.isInteger(sheet.bblastframe) || sheet.bblastframe<1)) fail('无法清场：死亡动画素材无效');
            if (sheet) add(value.bbdeathlist,new port.bb_Death().bbDeath_new(sheet,body.bblayer,body.bbxpos,body.bbypos),body);
            else if (type===2) explosion(body,body.bbxpos,3);
            else {explosion(body,body.bbxpos-10,2);explosion(body,body.bbxpos-5,1.5);}
          } else if (type===36) explosion(body,body.bbxpos,4);
          else if (type>=32 && type<36) {
            const sheet=partSheets[type-32];
            if (!sheet || !Number.isInteger(sheet.bblastframe) || sheet.bblastframe<1 || sheet.bblastframe>128) fail('无法清场：死亡动画素材无效');
            for (let frame=1;frame<=sheet.bblastframe;frame++) {
              let vx=port.bb_std_random_Rnd2(4)-2,vy=-2-port.bb_std_random_Rnd2(4);
              if (body.bbsmackstyle===1) {vx=port.bb_std_random_Rnd2(4);vy=-2-port.bb_std_random_Rnd2(2);}
              if (body.bbsmackstyle===2) {vx=port.bb_std_random_Rnd2(5);vy=-2-port.bb_std_random_Rnd2(3);}
              add(value.bbbodyparts,new port.bb_BodyPart().bbBodyPart_new(body.bblayer,sheet,frame,body.bbxpos,body.bbypos,vx,vy),body);
            }
          } else fail('无法清场：死亡动画类型无效');
        }
      } finally {port.setRandomSeed(seed);}
      // Effects use their original detached animation/physics and recycle in
      // the ordinary update. Validate all append targets before any actor dies.
      for (const list of new Set(plan.map(([list])=>list))) {
        if (typeof list?.bbAddLast!=='function') fail('无法清场：死亡动画列表不可用');
        const head=list.bb_head,tail=head?.bb_pred;
        if (!head || !tail || tail.bb_succ!==head || head.bb_succ?.bb_pred!==head) fail('无法清场：死亡动画列表损坏');
        writable(head,'bb_pred');writable(tail,'bb_succ');
      }
      return plan;
    }
    function clearTroops(side,selection) {
      const value=customBattle(),matches=troopFilter(side,selection),isBase=body=>body===value.bbpeoplebase || body===value.bbzombiebase || [5,37].includes(body?.bbunit?.bbtype);
      const groups=(side==='both'?[['people',value.bbpeople],['converted',value.bbpombies],['zombies',value.bbzombies]]:
        side==='friendly'?[['people',value.bbpeople],['converted',value.bbpombies]]:[['zombies',value.bbzombies]])
        .map(([kind,list])=>({kind,list,bodies:[...new Set(entries(list))].filter(body=>!isBase(body) && matches(body,kind))}));
      const result={side,count:0,people:0,converted:0,zombies:0},bodies=new Set();
      let releasedPopulation=0;
      // Snapshot first: list removal mutates the enumerator's linked nodes.
      // Preflight all ordinary data writes before touching even the first unit.
      for (const group of groups) {
        if (typeof group.list?.bbRemove!=='function') fail('无法清场：单位列表不可用');
        if (group.bodies.length) {
          // bbRemove rewires each removed node's predecessor and successor;
          // the last removal also writes the sentinel. Check every node in
          // both friendly lists before killing anyone, not only actor fields.
          const head=group.list.bb_head,seen=new Set();let node=head;
          do {
            if (!node || seen.has(node) || seen.size>100000) fail('无法清场：单位列表损坏');
            seen.add(node);writable(node,'bb_succ');writable(node,'bb_pred');
            if (!node.bb_succ || !node.bb_pred || node.bb_succ.bb_pred!==node || node.bb_pred.bb_succ!==node)
              fail('无法清场：单位列表损坏');
            node=node.bb_succ;
          } while (node!==head);
        }
        for (const body of group.bodies) {
          if (!body || !body.bbunit || !Number.isFinite(body.bbhealth)) fail('无法清场：单位状态无效');
          writable(body,'bbhealth');writable(body,'bbmode');
          if (bodies.has(body)) continue;
          bodies.add(body);
          const category=body.bbunit.bbtype>=0 && body.bbunit.bbtype<5 ? 'people' : group.kind==='zombies' ? 'zombies' : 'converted';
          result[category]++;result.count++;
          // This is the original Person removal refund, not a recalculation of
          // the whole army: paid production still reserves its population, and
          // angry mobs / converted zombies never reserved those slots.
          if (group.kind==='people' && body.bbwaszombie===0 && body.bbisangry===0) {
            if (!Number.isInteger(body.bbunit.bbpeople) || body.bbunit.bbpeople<0) fail('无法清场：单位人口无效');
            releasedPopulation+=body.bbunit.bbpeople;
          }
        }
      }
      if (releasedPopulation) {
        if (!Number.isFinite(value.bbztp?.bbforce)) fail('无法清场：人口状态无效');
        writable(value.bbztp,'bbforce');
      }
      const effects=deathEffectPlan(value,bodies);
      runtimeTransaction(()=>{
        // Sandbox execution is deliberately not a damage hit or a GameTick:
        // jumping / immune actors still die immediately, even while paused,
        // without XP, kill/loss statistics, damage, RNG or a timer advance.
        // Original detached death visuals keep playing after the actor leaves
        // battle; visual explosions never call the damaging bottle/blast APIs.
        for (const body of bodies) { body.bbhealth=0;body.bbmode=15; }
        for (const group of groups) for (const body of group.bodies) group.list.bbRemove(body);
        if (releasedPopulation) value.bbztp.bbforce=Math.max(0,value.bbztp.bbforce-releasedPopulation);
        for (const [list,effect] of effects) list.bbAddLast(effect);
      });
      notify();return result;
    }
    function commitCheckedSettings(checked,options={},sandboxUnlocks=false) {
      const staged=!battle(),liveOptions={...options,multipliers:checked.rules.multipliers,...(sandboxUnlocks?{sandboxUnlocks:true}:{})};
      preflightRules(checked.rules);preflightConfiguration(checked.config,liveOptions);
      const result=runtimeTransaction(()=>{
        let report;
        if (!staged) report=applyValidatedConfiguration(checked.config,liveOptions);
        else {
          // Menu edits stage the next-reset templates without starting a match.
          report=state.api.config.updateLive(target,checked.config,{healthPolicy:options.healthPolicy||'ratio',preserveTimerProgress:true,
            multipliers:checked.rules.multipliers,...(sandboxUnlocks?{sandboxUnlocks:true}:{})});
          const promoted=promote();state.config=checked.config;state.stage=null;
          state.lastWaveReport=null;state.lastWaveBattleToken=null;
          report={...report,promoted};
        }
        state.api.rules.update(target,checked.rules);state.rules=checked.rules;
        return report;
      });
      persist();notify();return {...result,staged,rules:plain(checked.rules),normalized:plain(checked)};
    }
    const controller={
      getState:snapshot,
      getBattleStatus:battleStatus,
      getDraft:()=>({config:current(),rules:plain(state.rules)}),
      validateDraft:input=>spec(state,input),
      listPresets:()=>{ try { return presetRecords().map(metadata); } catch (_) { return []; } },
      loadPreset(id) {
        const record=presetRecords().find(record=>record.id===id); if (!record) fail('preset not found');
        state.selectedPresetId=id; notify(); return {config:plain(record.config),rules:plain(record.rules)};
      },
      savePreset(name,input,id) {
        const checked=spec(state,input), title=nameOf(name), records=presetRecords();
        let record=id?records.find(record=>record.id===id):null;
        if (id && !record) fail('preset not found');
        if (!record) {
          if (records.length>=MAX_PRESETS) fail('最多可保存 25 套预设，请先删除不需要的预设');
          let attempt=0,key; do { key='preset-'+Date.now().toString(36)+'-'+(++state.pauseSequence).toString(36)+'-'+attempt++; } while (records.some(record=>record.id===key));
          record={id:key}; records.push(record);
        }
        Object.assign(record,{name:title,updatedAt:new Date().toISOString(),...checked});
        const library={schemaVersion:1,presets:records};
        // Libraries may exceed one import's limit; cap total to a reproducible budget.
        if (new TextEncoder().encode(JSON.stringify(library)).length>LIMIT) fail('预设库总大小超过 2 MiB，请删除部分预设');
        write(state,PRESETS_KEY,library); state.selectedPresetId=record.id; notify(); return metadata(record);
      },
      deletePreset(id) {
        const records=presetRecords(), filtered=records.filter(record=>record.id!==id);
        if (filtered.length===records.length) fail('preset not found');
        write(state,PRESETS_KEY,{schemaVersion:1,presets:filtered}); if (state.selectedPresetId===id) state.selectedPresetId=null;
        notify(); return true;
      },
      exportPreset(input,name='Custom rules') {
        const document={schemaVersion:1,name:nameOf(name),...spec(state,input)};
        let text=JSON.stringify(document,null,2);
        if (new TextEncoder().encode(text).length>LIMIT) text=JSON.stringify(document);
        if (new TextEncoder().encode(text).length>LIMIT) fail('export exceeds 2 MiB');
        return text;
      },
      importPreset(text) {
        const document=parse(text); object(document,['schemaVersion','name','config','rules'],'imported preset');
        if (document.schemaVersion!==1) fail('supported preset version is 1');
        return {name:nameOf(document.name),...spec(state,{config:document.config,rules:document.rules})};
      },
      startCustomBattle(stage,input) {
        const selectedStage=stageOf(stage), checked=spec(state,input);
        switchForReload({mode:'custom',config:checked.config,rules:checked.rules,stage:selectedStage});
      },
      restoreOriginal() {
        switchForReload({mode:'original',config:plain(state.defaults),rules:state.api.rules.defaults(),stage:null});
      },
      applyLive(configuration,options={}) {
        if (!battle()) fail('请先开始一局游戏');
        const validated=state.api.config.validate(identifyLegacyWaves(plain(configuration)),{multipliers:state.rules.multipliers});
        state.api.config.compile(validated,{multipliers:state.rules.multipliers});
        if (!['ratio','new-only',undefined].includes(options.healthPolicy)) fail('unsupported health policy');
        preflightConfiguration(validated,options);
        const result=runtimeTransaction(()=>applyValidatedConfiguration(validated,options));
        persist(); notify(); return result;
      },
      applyDraft(input,options={}) {
        // Both halves must pass before a score namespace, live template, health
        // value or saved session can change. UI number inputs only reject NaN;
        // the authoritative config/rule integer and range checks belong here.
        const checked=spec(state,input);
        if (!['ratio','new-only',undefined].includes(options.healthPolicy)) fail('unsupported health policy');
        if (!battle()) fail('请先开始一局游戏');
        preflightRules(checked.rules);preflightConfiguration(checked.config,{...options,multipliers:checked.rules.multipliers});
        const result=runtimeTransaction(()=>{
          const report=applyValidatedConfiguration(checked.config,{...options,multipliers:checked.rules.multipliers});
          state.api.rules.update(target,checked.rules);state.rules=checked.rules;
          return report;
        });
        // Publish and persist only the complete pair, never an intermediate
        // new-config/old-rules state to UI subscribers or the next startup.
        persist();notify();return {...result,rules:plain(checked.rules)};
      },
      commitSettings(input,options={}) {
        const checked=spec(state,input);
        object(options,['healthPolicy'],'commit options');
        if (!['ratio','new-only',undefined].includes(options.healthPolicy)) fail('unsupported health policy');
        return commitCheckedSettings(checked,options);
      },
      unlockAll() {
        const configuration=current();
        for (const unit of configuration.units) if (unit.id!==5) unit.dependency=0;
        for (const building of configuration.buildings) building.dependency=0;
        for (const power of configuration.powers) power.unlockAfterStage=0;
        const checked=spec(state,{config:configuration,rules:{...state.rules,unlockAllStages:true}});
        const report=commitCheckedSettings(checked,{},true);
        // Explicit sandbox menu access never fabricates wins in either score
        // namespace; the custom launcher can select all four stages as well.
        return {...report,unlocked:{units:5,buildings:6,powers:3,stages:[1,2,3,4]}};
      },
      applyRules(rules) {
        customBattle(); const checked=spec(state,{config:current(),rules});
        preflightRules(checked.rules);preflightConfiguration(checked.config,{healthPolicy:'ratio',multipliers:checked.rules.multipliers},false);
        runtimeTransaction(()=>{
          state.api.config.updateLive(target,checked.config,{healthPolicy:'ratio',preserveTimerProgress:true,multipliers:checked.rules.multipliers});
          state.api.rules.update(target,checked.rules);state.rules=checked.rules;
        });
        persist(); notify(); return plain(checked.rules);
      },
      enqueueSpawn(side,selection,count,options) {
        customBattle();
        const job=spawnQueueApi().enqueue(target,side,selection,count,options);
        notify();return job;
      },
      setSpawnJobRate(id,rate) {
        customBattle();const job=spawnQueueApi().updateRate(target,id,rate);notify();return job;
      },
      cancelSpawnJob(id='all') {
        customBattle();const result=spawnQueueApi().cancel(target,id==='all'?undefined:id);notify();return result;
      },
      cancelAllSpawnJobs() {return controller.cancelSpawnJob();},
      cancelPowerEffects(powerId='all') {
        customBattle();
        if (powerId!=='all' && (!Number.isInteger(powerId) || powerId<0 || powerId>2)) fail('技能编号必须为 0–2 或 all');
        if (typeof state.api.config.cancelPowerEffects!=='function') fail('技能取消功能不可用，请更新游戏后重试');
        state.api.config.cancelPowerEffects(target,powerId,{validateOnly:true});
        const report=runtimeTransaction(()=>state.api.config.cancelPowerEffects(target,powerId));
        notify();return report;
      },
      releaseSandboxPower(powerId,side='friendly') {
        customBattle();
        if (!Number.isInteger(powerId) || powerId<0 || powerId>2) fail('技能编号必须为 0–2');
        if (!['friendly','enemy'].includes(side)) fail('技能阵营必须为 friendly 或 enemy');
        if (typeof state.api.config.releaseSandboxPower!=='function') fail('沙盒技能功能不可用，请更新游戏后重试');
        state.api.config.releaseSandboxPower(target,powerId,{side,validateOnly:true});
        const report=runtimeTransaction(()=>state.api.config.releaseSandboxPower(target,powerId,{side}));
        notify();return report;
      },
      spawnFactionUnit(side,selection,count=1) {
        const value=customBattle();
        if (!['friendly','enemy'].includes(side)) fail('单位阵营必须为 friendly 或 enemy');
        object(selection,['kind','type'],'spawn selection');
        if (!['unit','zombie'].includes(selection.kind) || !Number.isInteger(selection.type) || selection.type<0 || selection.type>4)
          fail('生成类型必须为 unit 或 zombie，类型编号为 0–4');
        if (!Number.isInteger(count) || count<1 || count>998) fail('单次数量为 1–998（并受场上安全容量约束）');
        const total=entries(value.bbzombies).length+entries(value.bbpeople).length+entries(value.bbpombies).length;
        if (total+count>1000) fail('场上实体达到安全上限 1000，请先减少单位');
        if (typeof state.api.factions?.spawn!=='function') fail('阵营战斗适配器不可用，请更新游戏后重试');
        const actors=state.api.rules.withManualSpawn(target,()=>state.api.factions.spawn(target,side,selection,count));
        if (!Array.isArray(actors) || actors.length!==count) fail('未能生成全部单位');
        const positions=actors.map(body=>({x:body.bbxpos,y:body.bbypos,layer:body.bblayer}));
        notify();return {side,kind:selection.kind,type:selection.type,count,positions};
      },
      spawnFriendlyUnit(type,count=1) {
        const value=customBattle();
        if (!Number.isInteger(type) || type<0 || type>4 || !Number.isInteger(count) || count<1 || count>998) fail('己方兵种为 0–4，单次数量为 1–998（并受场上安全容量约束）');
        const total=entries(value.bbzombies).length+entries(value.bbpeople).length+entries(value.bbpombies).length;
        if (total+count>1000) fail('场上实体达到安全上限 1000，请先减少单位');
        const positions=[];
        state.api.rules.withManualSpawn(target,()=>{
          for (let index=0;index<count;index++) {
            const person=value.bbAddPerson(value.bbunits[type]);if (!person) fail('无法生成己方兵种');
            // This original flag is read ONLY by population-refund bookkeeping.
            // Free sandbox actors reserved no population, so their normal death
            // or typed clear must not refund paid soldiers' reserved slots. Do
            // not mark them angry: that would change live speed-multiplier math.
            person.bbwaszombie=1;
            positions.push({x:person.bbxpos,y:person.bbypos,layer:person.bblayer});
          }
        });
        notify();return {type,count,positions};
      },
      spawnZombie(type,count=1) {
        const value=customBattle();
        if (!Number.isInteger(type) || type<0 || type>4 || !Number.isInteger(count) || count<1 || count>998) fail('僵尸类型为 0–4，单次数量为 1–998（并受场上安全容量约束）');
        const total=entries(value.bbzombies).length+entries(value.bbpeople).length+entries(value.bbpombies).length;
        if (total+count>1000) fail('场上实体达到安全上限 1000，请先减少单位');
        const positions=[];
        const spawn=()=>{
          for (let i=0;i<count;i++) {
            const zombie=value.bbAddZombie(value.bbzunits[type]); if (!zombie) fail('无法生成僵尸');
            // Keep the original constructor's rightmost x=1600 origin.
            // Placing at 1440 teleports behind attackers at the enemy base.
            positions.push({x:zombie.bbxpos,y:zombie.bbypos,layer:zombie.bblayer});
          }
        };
        state.api.rules.withManualSpawn(target,spawn);
        // Generated rendering also advances production timers. Do not render
        // manually here: the next normal frame displays new entities after the
        // editor releases its frozen clock.
        notify(); return {type,count,positions};
      },
      clearFriendlyTroops:selection=>clearTroops('friendly',selection),
      clearEnemyTroops:selection=>clearTroops('enemy',selection),
      clearAllTroops:()=>clearTroops('both'),
      setBaseHealth(side,health) {
        const value=customBattle();
        if (!['friendly','enemy'].includes(side)) fail('基地阵营必须为 friendly 或 enemy');
        const body=side==='friendly'?value.bbpeoplebase:value.bbzombiebase,maximum=baseHealth()[side].maximum;
        if (!Number.isInteger(health) || health<0 || health>maximum) fail('基地当前生命必须为 0–'+maximum+' 的整数');
        if (!body || body.bbhealth<=0 || body.bbmode===14 || body.bbmode===15) fail('基地已被摧毁，不能恢复已结束的战斗');
        writable(body,'bbhealth');
        if (health===0) {
          writable(body,'bbmode');writable(value,'bbmainState');writable(value,'bbcreditmillis');
          if (typeof value.bbGameOver!=='function') fail('基地结算方法不可用');
          for (const list of [value.bbpeople,value.bbzombies]) {
            if (typeof list?.bbRemove!=='function') fail('基地列表不可用');
            const head=list.bb_head,seen=new Set();let node=head;
            do {
              if (!node || seen.has(node) || seen.size>100000 || !node.bb_succ || !node.bb_pred || node.bb_succ.bb_pred!==node || node.bb_pred.bb_succ!==node) fail('基地列表损坏');
              seen.add(node);writable(node,'bb_succ');writable(node,'bb_pred');node=node.bb_succ;
            } while(node!==head);
          }
          if (side==='enemy') writable(value.bbrecords,String(value.bbdifficulty));
        }
        runtimeTransaction(()=>{
          // Direct editing is not a damage hit: bbSmack/bbInfect create one
          // debris loop per damage chunk, which freezes on huge custom HP.
          body.bbhealth=health;
          if (health===0) {body.bbmode=14;value.bbGameOver(side==='enemy'?1:0);}
        });
        notify();return {side,current:health,maximum,ended:health===0};
      },
      applyUpcomingWaves(configuration) {
        const value=customBattle(),checked=state.api.config.validate(identifyLegacyWaves(plain(configuration)),{multipliers:state.rules.multipliers});
        // Compatibility alias: use the same tracked-progress synchronization
        // as ordinary Apply, never prepend the active group and replay row 1.
        // Unrelated draft health/economy/ability fields remain untouched.
        const schedule=current();
        schedule.levels.find(level=>level.id===value.bbdifficulty+1).waves=plain(checked.levels.find(level=>level.id===value.bbdifficulty+1).waves);
        preflightConfiguration(schedule,{healthPolicy:'new-only',multipliers:state.rules.multipliers});
        const result=runtimeTransaction(()=>{
          const report=state.api.config.updateLive(target,schedule,{healthPolicy:'new-only',preserveTimerProgress:true,multipliers:state.rules.multipliers});
          state.config=schedule;return synchronizeWaves(schedule,report).waveReport;
        });
        persist();notify();return result;
      },
      pauseForEditor() {
        if (state.leaving) fail('game is changing mode');
        const runtime=target.ZTPRuntime;
        if (!state.pauseTokens.size) {
          state.resumeRunning=!!runtime?.getStatus().running;
          if (state.resumeRunning) { runtime.stop(); runtime.advance(0); }
        }
        const token=Object.freeze({id:++state.pauseSequence}); state.pauseTokens.add(token); notify(); return token;
      },
      resumeFromEditor(token) {
        if (!state.pauseTokens.delete(token)) return false;
        if (!state.pauseTokens.size && state.resumeRunning && !state.leaving) {
          const runtime=target.ZTPRuntime; runtime.useRealtime(); runtime.start(); state.resumeRunning=false;
        }
        notify(); return true;
      },
      subscribe(listener) { if (typeof listener!=='function') fail('listener must be a function'); state.listeners.add(listener); return ()=>state.listeners.delete(listener); }
    };
    state.controller=Object.freeze(controller); active=state.controller;
    if (state.mode==='custom' && state.stage!==null) {
      target.EndMovie?.();
      // The normal intro→menu transition switches its 30 Hz animation clock
      // to 60 Hz gameplay. Auto-start bypasses that transition on every custom
      // reload, so finish the movie first and restore the same original rate.
      target.bb_mojo_app_SetUpdateRate(60);
      game().bbPlayGame(state.stage);
    }
    resolveReady(active);
    if (typeof target.dispatchEvent==='function' && typeof target.CustomEvent==='function') target.dispatchEvent(new target.CustomEvent('customization-ready',{detail:active}));
    return active;
  }
  const api={prepare,attach,ready,constants:Object.freeze({ORIGINAL_STORAGE,CUSTOM_STORAGE,PRESETS_KEY,SESSION_KEY,MAX_PRESETS,MAX_IMPORT_BYTES:LIMIT})};
  for (const name of ['getState','getBattleStatus','getDraft','validateDraft','listPresets','loadPreset','savePreset','deletePreset','exportPreset','importPreset','startCustomBattle','restoreOriginal','applyLive','applyDraft','commitSettings','unlockAll','applyRules','enqueueSpawn','setSpawnJobRate','cancelSpawnJob','cancelAllSpawnJobs','cancelPowerEffects','releaseSandboxPower','spawnFactionUnit','spawnFriendlyUnit','spawnZombie','clearFriendlyTroops','clearEnemyTroops','clearAllTroops','setBaseHealth','applyUpcomingWaves','pauseForEditor','resumeFromEditor','subscribe'])
    api[name]=function () { if (!active) fail('game is not ready'); return active[name].apply(active,arguments); };
  return Object.freeze(api);
});
