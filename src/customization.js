/* Persistent custom rules, isolated scores, and explicit live editing. */
(function (root, factory) {
  'use strict';
  const api = factory(root, typeof module === 'object' && module.exports ? require('./game-config.js') : null,
    typeof module === 'object' && module.exports ? require('./custom-rules.js') : null);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Customization = api;
})(typeof globalThis === 'object' ? globalThis : this, function (root, importedConfig, importedRules) {
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
    return {config,rules};
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
    return {config:state.api.config.validate(checked.config),rules:state.api.rules.validate(checked.rules)};
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
    function customBattle() { if (!battle()) fail('请先开始一局游戏'); if (state.mode!=='custom') fail('请先应用到本局，将本局切换为自定义模式'); return game(); }
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
    function battleStatus() {
      const value=game(),runtimeRunning=!!target.ZTPRuntime?.getStatus().running;
      const people=entries(value.bbpeople),zombies=entries(value.bbzombies),converted=entries(value.bbpombies);
      const editorPauseCount=state.pauseTokens.size,editorPaused=editorPauseCount>0,gamePaused=value.bbmainState===6;
      const lastReport=state.lastWaveBattleToken===value.bbztp?state.lastWaveReport:null;
      return {isBattle:battle(),stage:battle()?value.bbdifficulty+1:state.stage||1,
        mainState:value.bbmainState,runtimeRunning,editorPaused,editorPauseCount,gamePaused,
        battleRunning:runtimeRunning && value.bbmainState===2 && !editorPaused,
        automaticSpawning:state.rules.automaticSpawning,
        buildings:(value.bbbuildings||[]).map(building=>({id:building.bbtype,built:value.bbztp?.bbbuildingcount[building.bbtype]||0,
          queued:building.bborders,maximum:building.bbmaximum})),
        waveProgress:state.api.config.getWaveProgress?state.api.config.getWaveProgress(target):null,
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
        battleStatus:status,waveProgress:status.waveProgress,runtimeRunning:status.runtimeRunning,editorPaused:status.editorPaused,
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
    function applyValidatedConfiguration(validated,options) {
      if (!battle()) fail('请先开始一局游戏');
      const promoted=promote();
      const result=state.api.config.updateLive(target,validated,{healthPolicy:options.healthPolicy||'ratio',preserveTimerProgress:true});
      state.config=validated;state.stage=game().bbdifficulty+1;
      return {...synchronizeWaves(validated,result),promoted};
    }
    function synchronizeWaves(configuration,report) {
      const stage=game().bbdifficulty+1,path='$.levels['+(stage-1)+'].waves';
      const progress=state.api.config.getWaveProgress?.(target)||null;
      const known=new Set(progress?.knownIds||[]),waves=configuration.levels.find(level=>level.id===stage).waves;
      const missingIdentity=waves.some(wave=>wave.id?.startsWith('legacy-untracked-') && !known.has(wave.id));
      let waveReport;
      if (missingIdentity || !state.api.config.applyLiveWaves) {
        const reason=missingIdentity?'这套旧规则没有本局可核对的波次身份，出怪计划需新开一局。':'本局波次进度不可用，出怪计划需新开一局。';
        waveReport={applied:[],deferred:[path],notes:[reason],requiresNewBattle:true,reason,progress};
      } else waveReport=state.api.config.applyLiveWaves(target,configuration);
      const otherStages=[...new Set((report.deferred||[]).flatMap(field=>{
        const match=field.match(/^\$\.levels\[(\d+)\]\.waves(?:$|\.)/);return match && Number(match[1])!==stage-1?[Number(match[1])+1]:[];
      }))];
      waveReport={...waveReport,stage,otherStages,notes:[...(waveReport.notes||[])]};
      if (otherStages.length) waveReport.notes.push('当前战斗为第 '+stage+' 关；第 '+otherStages.join('、')+' 关的波次修改将在下次开始对应关卡时生效。');
      state.lastWaveReport=waveReport;state.lastWaveBattleToken=game().bbztp;
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
    function clearTroops(side) {
      const value=customBattle(),isBase=body=>body===value.bbpeoplebase || body===value.bbzombiebase || [5,37].includes(body?.bbunit?.bbtype);
      const groups=(side==='friendly'?[['people',value.bbpeople],['converted',value.bbpombies]]:[['zombies',value.bbzombies]])
        .map(([kind,list])=>({kind,list,bodies:[...new Set(entries(list))].filter(body=>!isBase(body))}));
      const result={side,count:0,people:0,converted:0,zombies:0},bodies=new Set();
      let releasedPopulation=0;
      const writable=(owner,key)=>{
        const property=Object.getOwnPropertyDescriptor(owner,key);
        if (property ? !Object.prototype.hasOwnProperty.call(property,'value') || !property.writable : !Object.isExtensible(owner))
          fail('无法清场：运行时状态不可写，未修改本局');
      };
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
          bodies.add(body);result[group.kind]++;result.count++;
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
      runtimeTransaction(()=>{
        // Sandbox execution is deliberately not a damage hit or a GameTick:
        // jumping / immune actors still die immediately, even while paused,
        // without XP, kill/loss statistics, explosions, RNG or a timer advance.
        // Existing projectiles/corpses and future production/spawn plans stay.
        for (const body of bodies) { body.bbhealth=0;body.bbmode=15; }
        for (const group of groups) for (const body of group.bodies) group.list.bbRemove(body);
        if (releasedPopulation) value.bbztp.bbforce=Math.max(0,value.bbztp.bbforce-releasedPopulation);
      });
      notify();return result;
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
        const validated=state.api.config.validate(identifyLegacyWaves(plain(configuration)));
        if (!['ratio','new-only',undefined].includes(options.healthPolicy)) fail('unsupported health policy');
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
        const result=runtimeTransaction(()=>{
          const report=applyValidatedConfiguration(checked.config,options);
          state.api.rules.update(target,checked.rules);state.rules=checked.rules;
          return report;
        });
        // Publish and persist only the complete pair, never an intermediate
        // new-config/old-rules state to UI subscribers or the next startup.
        persist();notify();return {...result,rules:plain(checked.rules)};
      },
      applyRules(rules) {
        customBattle(); const checked=state.api.rules.validate(plain(rules)); state.api.rules.update(target,checked);
        state.rules=checked; persist(); notify(); return plain(checked);
      },
      spawnZombie(type,count=1) {
        const value=customBattle();
        if (!Number.isInteger(type) || type<0 || type>4 || !Number.isInteger(count) || count<1 || count>20) fail('僵尸类型为 0–4，单次数量为 1–20');
        const total=entries(value.bbzombies).length+entries(value.bbpeople).length+entries(value.bbpombies).length;
        if (total+count>1000) fail('场上实体达到安全上限 1000，请先减少单位');
        const positions=[];
        const spawn=()=>{
          for (let i=0;i<count;i++) {
            const zombie=value.bbAddZombie(value.bbzunits[type]); if (!zombie) fail('无法生成僵尸');
            zombie.bbxpos=1440+(i%6)*20;
            positions.push({x:zombie.bbxpos,y:zombie.bbypos,layer:zombie.bblayer});
          }
        };
        state.api.rules.withManualSpawn(target,spawn);
        // Generated rendering also advances production timers. Do not render
        // manually here: the next normal frame displays new entities after the
        // editor releases its frozen clock.
        notify(); return {type,count,positions};
      },
      clearFriendlyTroops:()=>clearTroops('friendly'),
      clearEnemyTroops:()=>clearTroops('enemy'),
      applyUpcomingWaves(configuration) {
        const value=customBattle(),checked=state.api.config.validate(identifyLegacyWaves(plain(configuration)));
        // Compatibility alias: use the same tracked-progress synchronization
        // as ordinary Apply, never prepend the active group and replay row 1.
        // Unrelated draft health/economy/ability fields remain untouched.
        const schedule=current();
        schedule.levels.find(level=>level.id===value.bbdifficulty+1).waves=plain(checked.levels.find(level=>level.id===value.bbdifficulty+1).waves);
        const result=runtimeTransaction(()=>{
          const report=state.api.config.updateLive(target,schedule,{healthPolicy:'new-only',preserveTimerProgress:true});
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
      target.EndMovie?.(); game().bbPlayGame(state.stage);
    }
    resolveReady(active);
    if (typeof target.dispatchEvent==='function' && typeof target.CustomEvent==='function') target.dispatchEvent(new target.CustomEvent('customization-ready',{detail:active}));
    return active;
  }
  const api={prepare,attach,ready,constants:Object.freeze({ORIGINAL_STORAGE,CUSTOM_STORAGE,PRESETS_KEY,SESSION_KEY,MAX_PRESETS,MAX_IMPORT_BYTES:LIMIT})};
  for (const name of ['getState','getBattleStatus','getDraft','validateDraft','listPresets','loadPreset','savePreset','deletePreset','exportPreset','importPreset','startCustomBattle','restoreOriginal','applyLive','applyDraft','applyRules','spawnZombie','clearFriendlyTroops','clearEnemyTroops','applyUpcomingWaves','pauseForEditor','resumeFromEditor','subscribe'])
    api[name]=function () { if (!active) fail('game is not ready'); return active[name].apply(active,arguments); };
  return Object.freeze(api);
});
