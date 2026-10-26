'use strict';
// Dependency-free DOM fixture: no renderer, game tick, browser, or network.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const UI = require('../src/settings-ui.js');
const GameConfig = require('../src/game-config.js');
const CustomRules = require('../src/custom-rules.js');
const clone = value => JSON.parse(JSON.stringify(value));
function defaults() {
  return GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map(kind => [kind, JSON.parse(fs.readFileSync(path.join(__dirname,'../config',kind+'.json'),'utf8'))])));
}
class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, fn, options) { const entries = this.listeners.get(type) || []; entries.push({fn,options}); this.listeners.set(type,entries); }
  removeEventListener(type, fn) { this.listeners.set(type,(this.listeners.get(type)||[]).filter(entry=>entry.fn!==fn)); }
  async emit(type, init = {}) {
    const event = {type,target:this,prevented:false,stopped:false,immediate:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.immediate=true;this.stopped=true;},...init};
    for (const {fn} of this.listeners.get(type) || []) { await fn(event); if(event.immediate) break; }
    return event;
  }
}
function matches(el, selector) {
  if (selector.startsWith('.')) return el.className.split(/\s+/).includes(selector.slice(1));
  if (selector.startsWith('#')) return el.id === selector.slice(1);
  const attr = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
  if (attr) {
    const key = attr[1], val = key.startsWith('data-') ? el.dataset[key.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())] : el.getAttribute(key);
    return val !== undefined && val !== null && (attr[2] === undefined || String(val) === attr[2]);
  }
  if (selector === 'a[href]') return el.tagName === 'A' && !!el.href;
  return el.tagName === selector.toUpperCase();
}
class Element extends Target {
  constructor(tag, owner) {
    super(); this.tagName=tag.toUpperCase();this.ownerDocument=owner;this.children=[];this.parentNode=null;this.attributes=new Map();this.dataset={};this.style={};this.className='';this._text='';this.value='';this.hidden=false;this.disabled=false;this.checked=false;this.tabIndex=['BUTTON','INPUT','SELECT','TEXTAREA','A'].includes(this.tagName)?0:-1;
    this.classList={add:(...names)=>{this.className=Array.from(new Set(this.className.split(/\s+/).concat(names))).filter(Boolean).join(' ');},remove:(...names)=>{this.className=this.className.split(/\s+/).filter(x=>!names.includes(x)).join(' ');},toggle:(name,force)=>{const has=this.className.split(/\s+/).includes(name),next=force===undefined?!has:force;this.classList[next?'add':'remove'](name);return next;},contains:name=>this.className.split(/\s+/).includes(name)};
  }
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  set textContent(text){this._text=String(text);this.children=[];}
  get firstChild(){return this.children[0]||null;}
  get isConnected(){let p=this;while(p){if(p===this.ownerDocument.body)return true;p=p.parentNode;}return false;}
  appendChild(child){this.children.push(child);child.parentNode=this;if(this.tagName==='SELECT'&&child.tagName==='OPTION'&&this.children.length===1)this.value=child.value;return child;}
  removeChild(child){this.children.splice(this.children.indexOf(child),1);child.parentNode=null;return child;}
  remove(){if(this.parentNode)this.parentNode.removeChild(this);}
  setAttribute(name,value){this.attributes.set(name,String(value));if(name==='tabindex')this.tabIndex=Number(value);}
  getAttribute(name){return this.attributes.has(name)?this.attributes.get(name):null;}
  removeAttribute(name){this.attributes.delete(name);}
  focus(){this.ownerDocument.activeElement=this;}
  contains(el){return this===el||this.children.some(child=>child.contains(el));}
  querySelectorAll(selector){const selectors=selector.split(',').map(x=>x.trim()),result=[];const scan=el=>{for(const child of el.children){if(selectors.some(s=>matches(child,s)))result.push(child);scan(child);}};scan(this);return result;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  click(){if(!this.disabled)return this.emit('click');return Promise.resolve();}
  getBoundingClientRect(){return {left:100,top:30,right:900,bottom:630,width:800,height:600};}
}

function fixture({custom=false,battle=false}={}) {
  const doc={createElement(tag){return new Element(tag,this);},getElementById(id){return this.body.querySelector('#'+id);},activeElement:null};doc.body=new Element('body',doc);
  const canvas=doc.createElement('canvas');canvas.id='game';doc.body.appendChild(canvas);canvas.focus();
  const win=new Target();win.innerWidth=1000;win.confirm=()=>true;win.Blob=Blob;win.setTimeout=fn=>fn();
  let resizeObservers=0;win.ResizeObserver=class {constructor(){resizeObservers++;}observe(){}disconnect(){}};
  const intervals=new Map();let timerSequence=0;win.setInterval=fn=>{const id=++timerSequence;intervals.set(id,fn);return id;};win.clearInterval=id=>intervals.delete(id);
  const urls=[],revoked=[];win.URL={createObjectURL(blob){urls.push(blob);return 'blob:test';},revokeObjectURL(url){revoked.push(url);}};
  const baseline=defaults(),rules=CustomRules.defaults(),calls=[],presets=[],listeners=new Set();let nextId=0,nextJobId=0;
  const current={mode:custom?'custom':'original',isCustom:custom,isBattle:battle,stage:1,config:clone(baseline),rules:clone(rules),defaults:clone(baseline),defaultRules:clone(rules),presets,selectedPresetId:'',storageAvailable:true,warnings:[],paused:false,gamePaused:false,
    bases:{friendly:{current:1000,maximum:baseline.units[5].health},enemy:{current:2000,maximum:baseline.zombies[5].health}},
    powerProgress:{pendingTotal:0},
    troopCounts:{friendly:{units:[0,0,0,0,0],zombies:[0,0,0,0,0],total:0},enemy:{units:[0,0,0,0,0],zombies:[0,0,0,0,0],total:0}},
    spawnQueue:{rate:120,defaultRate:120,jobs:[],pending:0,totalPending:0},
    waveProgress:{stage:1,current:{id:baseline.levels[0].waves[0].id,index:0,type:1,total:5,consumed:2,spawned:2,remaining:3,delay:3,enabled:true,source:'wave'},upcomingGroups:[],remainingTotal:3,completedGroups:0,completed:[],pending:[]}};
  const notify=()=>{for(const fn of listeners)fn();};
  const controller={
    getState(){return clone(current);},getDraft(){return {config:clone(current.config),rules:clone(current.rules)};},listPresets(){return presets.map(({id,name,updatedAt})=>({id,name,updatedAt}));},
    getBattleStatus(){return {isBattle:current.isBattle,stage:current.stage,runtimeRunning:!current.paused,editorPaused:current.paused,gamePaused:current.gamePaused,battleRunning:current.isBattle&&!current.paused&&!current.gamePaused,waveProgress:clone(current.waveProgress),powerProgress:clone(current.powerProgress),spawnQueue:clone(current.spawnQueue),troopCounts:clone(current.troopCounts),bases:clone(current.bases),buildings:current.config.buildings.map(b=>({id:b.id,built:b.id<2?1:0,queued:0,maximum:b.maximum}))};},
    pauseForEditor(){calls.push(['pause']);current.paused=true;return 'pause-token';},resumeFromEditor(token){calls.push(['resume',token]);current.paused=false;},
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    savePreset(name,spec,id){GameConfig.validate(spec.config);CustomRules.validate(spec.rules);calls.push(['save',name]);let p=presets.find(p=>p.id===id);if(!p){p={id:'p'+(++nextId)};presets.push(p);}Object.assign(p,{name,spec:clone(spec),updatedAt:'2026-10-25'});notify();return {id:p.id,name};},
    loadPreset(id){return clone(presets.find(p=>p.id===id).spec);},deletePreset(id){presets.splice(presets.findIndex(p=>p.id===id),1);calls.push(['delete',id]);notify();},
    exportPreset(spec,name){GameConfig.validate(spec.config);CustomRules.validate(spec.rules);calls.push(['export',name]);return JSON.stringify({schemaVersion:1,name,...spec});},
    importPreset(text){calls.push(['import']);const parsed=JSON.parse(text);GameConfig.validate(parsed.config);CustomRules.validate(parsed.rules);return parsed;},
    startCustomBattle(stage,spec){GameConfig.validate(spec.config);CustomRules.validate(spec.rules);calls.push(['start',stage,clone(spec)]);current.isBattle=current.isCustom=true;current.mode='custom';current.stage=stage;current.config=clone(spec.config);current.rules=clone(spec.rules);notify();},
    restoreOriginal(){calls.push(['original']);current.isCustom=current.isBattle=false;current.mode='original';notify();},
    commitSettings(spec,options){GameConfig.validate(spec.config);CustomRules.validate(spec.rules);calls.push(['commit',clone(spec),clone(options)]);current.config=clone(spec.config);current.rules=clone(spec.rules);if(current.isBattle){current.isCustom=true;current.mode='custom';}current.bases.friendly.maximum=current.config.units[5].health;current.bases.enemy.maximum=current.config.zombies[5].health;notify();return {applied:['$.zombies[3].health'],deferred:[],staged:!current.isBattle,...(current.applyReport||{})};},
    setBaseHealth(side,value){if(!current.isBattle)throw new Error('当前没有战局');if(!Number.isInteger(value)||value<0||value>current.bases[side].maximum)throw new Error('当前生命超过最大生命');calls.push(['base',side,value]);current.bases[side].current=value;notify();return clone(current.bases[side]);},
    spawnZombie(type,count){calls.push(['spawn',type,count]);return {count,type,positions:[1790]};},
    spawnFriendlyUnit(type,count){calls.push(['spawnFriendly',type,count]);return {count,type,positions:[0]};},
    spawnFactionUnit(side,descriptor,count){calls.push(['spawnFaction',side,clone(descriptor),count]);return {side,...descriptor,count,positions:[side==='friendly'?0:1790]};},
    enqueueSpawn(side,descriptor,count,options){const rate=options.rate;calls.push(['enqueueSpawn',side,clone(descriptor),count,clone(options)]);const job={id:'spawn-'+(++nextJobId),side,...descriptor,descriptor:clone(descriptor),count,rate,spawned:0,remaining:count,status:'queued'};current.spawnQueue.jobs.push(job);current.spawnQueue.pending=current.spawnQueue.totalPending=current.spawnQueue.jobs.reduce((sum,j)=>sum+j.remaining,0);notify();return clone(job);},
    setSpawnJobRate(id,rate){const job=current.spawnQueue.jobs.find(j=>j.id===id);if(!job)throw new Error('待出兵批次不存在');calls.push(['spawnJobRate',id,rate]);job.rate=rate;notify();return clone(job);},
    cancelSpawnJob(id){calls.push(id===undefined?['cancelSpawnJob']:['cancelSpawnJob',id]);const all=id===undefined||id==='all',jobs=current.spawnQueue.jobs.filter(j=>all||j.id===id);current.spawnQueue.jobs=current.spawnQueue.jobs.filter(j=>!all&&j.id!==id);current.spawnQueue.pending=current.spawnQueue.totalPending=current.spawnQueue.jobs.reduce((sum,j)=>sum+j.remaining,0);notify();return clone(jobs.map(j=>({...j,cancelledCount:j.remaining,remaining:0,status:'cancelled'})));},
    cancelAllSpawnJobs(){return controller.cancelSpawnJob();},
    cancelPowerEffects(id){calls.push(id===undefined?['cancelPower']:['cancelPower',id]);return {pending:23,actors:2,powerups:3,projectiles:4,explosions:5,charging:1};},
    clearFriendlyTroops(type){calls.push(type===undefined?['clearFriendly']:['clearFriendly',clone(type)]);return {side:'friendly',count:3,people:2,converted:1,zombies:0};},
    clearEnemyTroops(type){calls.push(type===undefined?['clearEnemy']:['clearEnemy',type]);return {side:'enemy',count:5,people:0,converted:0,zombies:5};},
    clearAllTroops(){calls.push(['clearAll']);return {count:8,friendly:{count:3},enemy:{count:5}};},
    releaseSandboxPower(powerId,side){calls.push(['releasePower',powerId,side]);return {powerId,side};},
    unlockAll(){calls.push(['unlockAll']);for(const kind of ['units','buildings'])for(const value of current.config[kind])if(Object.hasOwn(value,'dependency'))value.dependency=0;for(const power of current.config.powers)power.unlockAfterStage=0;current.rules.unlockAllStages=true;current.isCustom=true;current.mode='custom';notify();return {unlocked:{units:5,buildings:6,powers:3,stages:[1,2,3,4]}};}
  };
  const handle=UI.mount(controller,{document:doc,window:win,canvas});
  const findText=text=>doc.body.querySelectorAll('button').find(b=>b.textContent===text);
  const byPath=p=>doc.body.querySelectorAll('[data-path]').find(e=>e.dataset.path===p);
  const byLabel=label=>doc.body.querySelectorAll('input,select,button').find(e=>e.getAttribute('aria-label')===label);
  const commits=()=>calls.filter(c=>c[0]==='commit');
  return {doc,win,canvas,controller,current,calls,presets,handle,findText,byPath,byLabel,urls,revoked,notify,intervals,commits,resizeObserverCount:()=>resizeObservers,tick(){for(const fn of intervals.values())fn();}};
}
async function tab(f,key){await f.doc.getElementById('ztps-tab-'+key).click();}
async function edit(f,path,value,event='change') {const input=f.byPath(path);assert.ok(input,'missing '+path);if(input.type==='checkbox')input.checked=value;else input.value=String(value);await input.emit(event,event==='keydown'?{key:'Enter'}:{});return input;}
async function lastWavePage(f){let next;while((next=f.doc.body.querySelectorAll('button').find(b=>b.textContent==='下一页'&&!b.disabled)))await next.click();}
const message=f=>f.doc.body.querySelector('.ztps-message');
const queueCalls=f=>f.calls.filter(c=>c[0]==='enqueueSpawn').map(c=>c.slice(0,4));
const spawnInput=(f,key,side='enemy')=>f.doc.body.querySelectorAll('[data-spawn-'+key+']').find(el=>el.dataset.side===side);

test('both skill camps show three original icons and release every power immediately without changing draft or cancelling effects',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'powers');const before=f.handle.getDraft(),buttons=f.doc.body.querySelectorAll('[data-release-power]');assert.equal(buttons.length,6);for(const side of ['friendly','enemy']){const group=f.doc.body.querySelector('[data-power-side="'+side+'"]');assert.ok(group);assert.match(group.querySelector('h3').textContent,side==='friendly'?/己方阵营/:/敌方阵营/);for(let id=0;id<3;id++){const b=buttons.find(el=>el.dataset.side===side&&el.dataset.releasePower===String(id));assert.ok(b.querySelector('.ztps-power-'+id));assert.equal(b.disabled,false);await b.click();}}assert.deepEqual(f.calls.filter(c=>c[0]==='releasePower'),[['releasePower',0,'friendly'],['releasePower',1,'friendly'],['releasePower',2,'friendly'],['releasePower',0,'enemy'],['releasePower',1,'enemy'],['releasePower',2,'enemy']]);assert.deepEqual(f.handle.getDraft(),before);assert.equal(f.commits().length,0);assert.equal(f.calls.some(c=>c[0]==='cancelPower'),false);assert.equal(f.doc.body.querySelectorAll('[data-cancel-power-effects]').length,2);assert.equal(f.current.paused,true);f.handle.destroy();
});

test('skill buttons require custom battle and their API while retaining unrelated parameter and cancellation controls',async()=>{
  for(const flags of [{},{battle:true},{custom:true}]){const f=fixture(flags);f.handle.open();await tab(f,'powers');for(const b of f.doc.body.querySelectorAll('[data-release-power]')){assert.equal(b.disabled,true);await b.click();}assert.equal(f.calls.some(c=>c[0]==='releasePower'),false);f.handle.destroy();}
  const f=fixture({custom:true,battle:true});delete f.controller.releaseSandboxPower;f.handle.open();await tab(f,'powers');assert.ok(f.doc.body.querySelectorAll('[data-release-power]').every(b=>b.disabled));assert.equal(f.doc.body.querySelector('[data-cancel-power-effects]').disabled,false);assert.ok(f.byPath('config.powers.0.xp'));f.handle.destroy();
});

test('skill releases capture camp and power, prevent only matching duplicate clicks and recover errors',async()=>{
  const f=fixture({custom:true,battle:true}),original=f.controller.releaseSandboxPower;let reject;f.controller.releaseSandboxPower=(id,side)=>{if(id===1&&side==='enemy'){f.calls.push(['releasePower',id,side]);return new Promise((yes,no)=>{reject=no;});}return original(id,side);};f.handle.open();await tab(f,'powers');const buttons=f.doc.body.querySelectorAll('[data-release-power]'),enemy=buttons.find(b=>b.dataset.side==='enemy'&&b.dataset.releasePower==='1'),friendly=buttons.find(b=>b.dataset.side==='friendly'&&b.dataset.releasePower==='1'),pending=enemy.click();assert.equal(enemy.disabled,true);assert.equal(friendly.disabled,false);await enemy.click();await friendly.click();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(f.calls.filter(c=>c[0]==='releasePower'),[['releasePower',1,'enemy'],['releasePower',1,'friendly']]);reject(new Error('本次技能释放失败'));await pending;assert.equal(enemy.disabled,false);assert.match(message(f).textContent,/本次技能释放失败/);assert.equal(f.current.paused,true);f.handle.destroy();
});

test('unlock button is beside the stage picker and synchronizes editable draft without free purchases or restarting a battle',async()=>{
  const f=fixture({battle:true});f.handle.open();await tab(f,'levels');const button=f.doc.body.querySelector('[data-unlock-all]'),picker=f.byLabel('选择关卡 / 出怪');assert.ok(button);assert.equal(button.textContent,'一键解锁建筑、技能和关卡');assert.equal(button.parentNode,picker.parentNode.parentNode);const before=f.handle.getDraft();await button.click();const after=f.handle.getDraft();for(const kind of ['units','buildings'])for(const item of after.config[kind])if(Object.hasOwn(item,'dependency'))assert.equal(item.dependency,0);for(const power of after.config.powers)assert.equal(power.unlockAfterStage,0);assert.deepEqual(after.rules,{...before.rules,unlockAllStages:true});assert.deepEqual(after.config.levels,before.config.levels);for(let i=0;i<after.config.buildings.length;i++)assert.equal(after.config.buildings[i].cost,before.config.buildings[i].cost);assert.equal(f.current.isCustom,true);assert.equal(f.current.isBattle,true);assert.deepEqual(f.calls.filter(c=>c[0]==='unlockAll'),[['unlockAll']]);assert.equal(f.calls.some(c=>['start','spawn','releasePower'].includes(c[0])),false);assert.match(message(f).textContent,/全部 4 关已解锁/);await tab(f,'units');await edit(f,'config.units.0.health',333);assert.ok(f.current.config.units.slice(0,5).every(unit=>unit.dependency===0));assert.ok(f.current.config.powers.every(power=>power.unlockAfterStage===0));assert.equal(f.current.config.units[0].health,333);f.handle.destroy();
});

test('unlock serializes after pending edits and merges its fields into an older queued commit without losing unrelated changes',async()=>{
  const f=fixture({custom:true,battle:true}),original=f.controller.unlockAll;let release;const gate=new Promise(resolve=>{release=resolve;});f.controller.unlockAll=async()=>{await gate;return original();};f.handle.open();await tab(f,'levels');const button=f.doc.body.querySelector('[data-unlock-all]'),pending=button.click();assert.equal(button.disabled,true);await tab(f,'units');const hp=f.byPath('config.units.0.health');hp.value='777';const editing=hp.emit('change');await new Promise(resolve=>setImmediate(resolve));assert.equal(f.current.config.units[0].health,50);release();await Promise.all([pending,editing]);await f.handle.whenSettled();assert.equal(f.current.config.units[0].health,777);assert.equal(f.current.rules.unlockAllStages,true);assert.equal(f.handle.getDraft().rules.unlockAllStages,true);assert.ok(f.current.config.units.slice(0,5).every(unit=>unit.dependency===0));assert.ok(f.current.config.buildings.every(building=>building.dependency===0));assert.ok(f.current.config.powers.every(power=>power.unlockAfterStage===0));assert.equal(f.handle.getDraft().config.units[0].health,777);assert.equal(f.commits().length,1);f.handle.destroy();
});

test('unlock is available from menu, blocks duplicate requests and recovers a controller error without changing the draft',async()=>{
  const f=fixture(),before=f.controller.getDraft();let reject;f.controller.unlockAll=()=>new Promise((yes,no)=>{reject=no;});f.handle.open();await tab(f,'levels');const button=f.doc.body.querySelector('[data-unlock-all]'),pending=button.click();assert.equal(button.disabled,true);await button.click();await new Promise(resolve=>setImmediate(resolve));reject(new Error('不能解锁'));await pending;assert.equal(button.disabled,false);assert.equal(f.current.isBattle,false);assert.deepEqual(f.handle.getDraft(),before);assert.match(message(f).textContent,/不能解锁/);delete f.controller.unlockAll;f.notify();assert.equal(button.disabled,true);f.handle.destroy();
});

test('unlock does not replace or clear unfinished focused wave inputs or discard their validation state',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'levels');const field=f.doc.body.querySelector('[data-path="config.levels.0.waves.12.count"]')||f.doc.body.querySelectorAll('[data-path]').find(el=>/\.waves\.\d+\.count$/.test(el.dataset.path));assert.ok(field);field.focus();field.value='';await field.emit('change');assert.equal(field.getAttribute('aria-invalid'),'true');const draftBefore=f.handle.getDraft();await f.doc.body.querySelector('[data-unlock-all]').click();assert.equal(f.doc.body.querySelectorAll('[data-path]').find(el=>el.dataset.path===field.dataset.path),field);assert.equal(f.doc.activeElement,field);assert.equal(field.value,'');assert.equal(field.getAttribute('aria-invalid'),'true');assert.deepEqual(f.handle.getDraft().config.levels,draftBefore.config.levels);assert.equal(f.commits().length,0);f.handle.destroy();
});

test('field flattening exposes only mutable scalars with readable field labels',()=>{
  assert.deepEqual(UI.flattenFields({id:0,key:'a',type:1,name:'A',effect:{moveSpeed:2},waves:[{}],reinforcements:[]}).map(f=>f.path),['name','effect.moveSpeed']);
  const config=defaults();for(const kind of ['units','zombies','buildings','powers','levels'])for(const item of config[kind])for(const f of UI.flattenFields(item))assert.notEqual(UI.fieldInfo(f.key)[0],f.key,'missing readable label: '+f.key);
  for(const f of UI.flattenFields(CustomRules.defaults()))assert.notEqual(UI.fieldInfo(f.key)[0],f.key,'missing rule label: '+f.key);
});

test('safe configuration paths cannot mutate prototypes or create arbitrary keys',()=>{
  const data={units:[{health:50}]};UI.setAt(data,'units.0.health',80);assert.equal(UI.getAt(data,'$.units[0].health'),80);
  assert.throws(()=>UI.setAt(data,'__proto__.polluted',true),/不允许/);assert.throws(()=>UI.setAt(data,'units.0.extra',1),/不存在/);assert.equal({}.polluted,undefined);
});

test('export filenames stay within dedicated JSON download namespace',()=>{
  for(const input of ['胖僵尸挑战','../../evil.exe','CON:<>|\\file','', 'x'.repeat(200)]){const filename=UI.presetFilename(input);assert.match(filename,/^zombie-builders-preset-[a-zA-Z0-9\u3400-\u9fff_-]+\.json$/);assert.ok(filename.length<90);}
});

test('numeric parsing rejects blanks and nonfinite values rather than silently storing zero',()=>{
  assert.equal(UI.numericValue('0'),0);assert.equal(UI.numericValue('1.25'),1.25);assert.throws(()=>UI.numericValue('  '),/留空/);assert.throws(()=>UI.numericValue('Infinity'),/有限/);assert.throws(()=>UI.numericValue('hello'),/有限/);
});

test('nonmodal dock reserves layout, pauses once, and restores only its token, timer and focus',()=>{
  const f=fixture();f.handle.open();f.handle.open();assert.deepEqual(f.calls,[['pause']]);assert.equal(f.doc.body.querySelector('.ztps-modal').getAttribute('aria-modal'),null);assert.equal(f.doc.body.querySelector('.ztps-modal').getAttribute('role'),'complementary');assert.equal(f.doc.body.classList.contains('ztps-docked'),true);assert.equal(f.intervals.size,1);
  assert.equal(f.doc.body.querySelector('.ztps-entry'),null);assert.equal(f.byLabel('打开自定义设置，快捷键 F2'),undefined);
  f.handle.close();assert.deepEqual(f.calls.at(-1),['resume','pause-token']);assert.equal(f.doc.activeElement,f.canvas);assert.equal(f.intervals.size,0);assert.equal(f.doc.body.classList.contains('ztps-docked'),false);f.handle.destroy();assert.equal(f.doc.body.querySelector('.ztps-overlay'),null);
});

test('F2 and owned Escape never reach game; unhandled Escape keyup remains available',async()=>{
  const f=fixture();let gameKeys=0;await f.win.emit('keydown',{key:'F2'});assert.equal(f.handle.isOpen(),true);f.win.addEventListener('keydown',()=>gameKeys++);await f.win.emit('keydown',{key:'Escape'});assert.equal(f.handle.isOpen(),false);assert.equal(gameKeys,0);
  assert.equal((await f.win.emit('keyup',{key:'Escape'})).immediate,true);assert.equal((await f.win.emit('keyup',{key:'Escape'})).immediate,false);f.handle.destroy();
});

test('closed settings leave no floating game button and F2 opens and closes without entry alignment machinery',async()=>{
  const f=fixture(),overlay=f.doc.body.querySelector('.ztps-overlay');assert.equal(f.handle.isOpen(),false);assert.equal(overlay.hidden,true);assert.equal(f.doc.body.querySelector('.ztps-entry'),null);assert.equal(f.doc.body.children.some(child=>child.tagName==='BUTTON'),false);assert.ok(f.doc.body.querySelectorAll('button').every(button=>overlay.contains(button)));assert.equal(f.doc.activeElement,f.canvas);assert.deepEqual(f.calls,[]);assert.equal((f.win.listeners.get('resize')||[]).length,0);assert.equal(f.resizeObserverCount(),0);await f.win.emit('keydown',{key:'F2'});assert.equal(f.handle.isOpen(),true);assert.equal(overlay.hidden,false);await f.win.emit('keydown',{key:'F2'});assert.equal(f.handle.isOpen(),false);assert.equal(overlay.hidden,true);assert.equal(f.doc.activeElement,f.canvas);assert.equal(f.doc.body.querySelector('.ztps-entry'),null);assert.equal((f.win.listeners.get('resize')||[]).length,0);assert.equal(f.resizeObserverCount(),0);f.handle.destroy();
});

test('time-control host exists inside the settings panel after its header and before preset controls even while closed',()=>{
  const f=fixture(),panel=f.doc.body.querySelector('.ztps-modal'),host=f.doc.getElementById('ztps-time-host'),header=panel.querySelector('header'),presets=panel.querySelector('.ztps-preset-bar');assert.ok(host);assert.equal(host.parentNode,panel);assert.equal(panel.children[panel.children.indexOf(header)+1],host);assert.ok(panel.children.indexOf(host)<panel.children.indexOf(presets));assert.equal(f.handle.isOpen(),false);assert.equal(f.doc.body.querySelector('.ztps-overlay').hidden,true);f.handle.open();assert.equal(f.doc.getElementById('ztps-time-host'),host);f.handle.close();assert.equal(f.doc.getElementById('ztps-time-host'),host);assert.equal(f.doc.activeElement,f.canvas);f.handle.destroy();
});

test('checkbox changes apply atomically immediately without apply button or promotion confirmation',async()=>{
  const f=fixture({battle:true});f.handle.open();f.win.confirm=()=>{throw new Error('unexpected confirmation');};const input=f.byPath('rules.corpseSpawnOnImpact');input.checked=false;await input.emit('change');
  assert.equal(f.current.rules.corpseSpawnOnImpact,false);assert.equal(f.current.isCustom,true);assert.equal(f.commits().length,1);assert.equal(f.handle.getDraft().rules.corpseSpawnOnImpact,false);assert.equal(f.findText('应用本局'),undefined);assert.match(message(f).textContent,/已生效/);f.handle.destroy();
});

test('numeric change, Enter and blur commit once per actual changed value without rerendering focused field',async()=>{
  const f=fixture({battle:true});f.handle.open();await tab(f,'zombies');const hp=f.byPath('config.zombies.0.health');hp.focus();hp.value='123';await hp.emit('change');await hp.emit('blur');await hp.emit('keydown',{key:'Enter'});
  assert.equal(f.commits().length,1);assert.equal(f.current.config.zombies[0].health,123);assert.equal(f.byPath('config.zombies.0.health'),hp);assert.equal(f.doc.activeElement,hp);
  hp.value='124';const enter=await hp.emit('keydown',{key:'Enter'});assert.equal(enter.prevented,true);assert.equal(f.current.config.zombies[0].health,124);hp.value='125';await hp.emit('blur');assert.equal(f.current.config.zombies[0].health,125);assert.equal(f.commits().length,3);f.handle.destroy();
});

test('IME composing Enter does not commit a partial numeric edit',async()=>{
  const f=fixture({battle:true});f.handle.open();await tab(f,'zombies');const hp=f.byPath('config.zombies.0.health');hp.value='123';await hp.emit('keydown',{key:'Enter',isComposing:true});assert.equal(f.commits().length,0);assert.equal(f.current.config.zombies[0].health,25);await hp.emit('blur');assert.equal(f.current.config.zombies[0].health,123);f.handle.destroy();
});

test('main-menu edits stage next-battle settings immediately without creating a battle',async()=>{
  const f=fixture();f.handle.open();await edit(f,'rules.automaticSpawning',false);assert.equal(f.current.rules.automaticSpawning,false);assert.equal(f.current.isBattle,false);assert.equal(f.current.isCustom,false);assert.equal(f.commits().length,1);assert.match(message(f).textContent,/下一局/);f.handle.destroy();
});

test('valid independent config and rules edits use a single full-spec transaction each with health policy',async()=>{
  const f=fixture({battle:true});f.handle.open();f.byLabel('已有单位生命值应用策略').value='new-only';await tab(f,'zombies');await edit(f,'config.zombies.0.health',123);await tab(f,'sandbox');await edit(f,'rules.economy.salvagePayout',70);
  assert.equal(f.commits().length,2);for(const call of f.commits()){assert.ok(call[1].config);assert.ok(call[1].rules);assert.deepEqual(call[2],{healthPolicy:'new-only'});}assert.equal(f.current.config.zombies[0].health,123);assert.equal(f.current.rules.economy.salvagePayout,70);f.handle.destroy();
});

test('invalid values never enter draft, commit or promote an original battle; correction applies immediately',async()=>{
  const f=fixture({battle:true});f.handle.open();await tab(f,'zombies');const hp=f.byPath('config.zombies.0.health');hp.value='-1';await hp.emit('change');assert.equal(f.commits().length,0);assert.equal(f.current.isCustom,false);assert.equal(f.handle.getDraft().config.zombies[0].health,25);assert.equal(hp.getAttribute('aria-invalid'),'true');assert.equal(message(f).getAttribute('role'),'alert');
  hp.value='';await hp.emit('blur');assert.equal(f.commits().length,0);assert.equal(f.handle.getDraft().config.zombies[0].health,25);hp.value='55';await hp.emit('keydown',{key:'Enter'});assert.equal(f.current.config.zombies[0].health,55);assert.equal(hp.getAttribute('aria-invalid'),null);assert.equal(f.commits().length,1);f.handle.destroy();
});

test('invalid rule numbers are rejected locally without contaminating a later valid config snapshot',async()=>{
  const f=fixture({battle:true});f.handle.open();const range=f.byPath('rules.abilities.harvesterRange');range.value='0.5';await range.emit('change');assert.equal(f.commits().length,0);assert.equal(f.handle.getDraft().rules.abilities.harvesterRange,220);assert.equal(range.getAttribute('aria-invalid'),'true');
  await tab(f,'zombies');await edit(f,'config.zombies.0.health',123);assert.equal(f.commits().length,1);assert.equal(f.current.rules.abilities.harvesterRange,220);assert.equal(f.current.config.zombies[0].health,123);f.handle.destroy();
});

test('queued edits snapshot serially; stale completion does not rerender or overwrite latest focused value',async()=>{
  const f=fixture({battle:true});const original=f.controller.commitSettings;let release;const gate=new Promise(resolve=>{release=resolve;});let entered=0;const snapshots=[],policies=[];
  f.controller.commitSettings=async(spec,options)=>{snapshots.push(clone(spec));policies.push(options.healthPolicy);if(++entered===1)await gate;return original(spec,options);};f.handle.open();await tab(f,'zombies');const hp=f.byPath('config.zombies.0.health');hp.focus();hp.value='101';const first=hp.emit('change');await Promise.resolve();assert.equal(entered,1);f.byLabel('已有单位生命值应用策略').value='new-only';hp.value='202';const second=hp.emit('change');f.byLabel('已有单位生命值应用策略').value='ratio';await Promise.resolve();assert.equal(entered,1);assert.equal(f.handle.getDraft().config.zombies[0].health,202);release();await Promise.all([first,second]);await f.handle.whenSettled();
  assert.deepEqual(snapshots.map(s=>s.config.zombies[0].health),[101,202]);assert.deepEqual(policies,['ratio','new-only']);assert.equal(f.current.config.zombies[0].health,202);assert.equal(f.byPath('config.zombies.0.health'),hp);assert.equal(f.doc.activeElement,hp);assert.equal(hp.value,'202');assert.doesNotMatch(f.doc.body.querySelector('.ztps-dirty').textContent,/正在生效/);f.handle.destroy();
});

test('a rejected transaction reports failure and later edits commit without resurrecting a failed spawning flag',async()=>{
  const f=fixture({battle:true});const original=f.controller.commitSettings;let fail=true;f.controller.commitSettings=(spec,options)=>{if(fail){fail=false;throw new Error('测试事务失败');}return original(spec,options);};f.handle.open();await edit(f,'rules.automaticSpawning',false);assert.match(message(f).textContent,/测试事务失败/);assert.equal(message(f).getAttribute('role'),'alert');assert.equal(f.current.rules.automaticSpawning,true);
  await edit(f,'rules.corpseSpawnOnImpact',false);assert.equal(f.current.rules.automaticSpawning,true);assert.equal(f.handle.getDraft().rules.automaticSpawning,true);assert.equal(f.current.rules.corpseSpawnOnImpact,false);assert.equal(f.commits().length,1);f.handle.destroy();
});

test('all actual boolean/economy/ability controls apply immediately',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await edit(f,'rules.automaticSpawning',false);await edit(f,'rules.zombieTypesEnabled.3',false);await edit(f,'rules.economy.salvagePayout',70);await edit(f,'rules.abilities.harvesterDamagePerTick',80);
  assert.equal(f.current.rules.automaticSpawning,false);assert.equal(f.current.rules.zombieTypesEnabled[3],false);assert.equal(f.current.rules.economy.salvagePayout,70);assert.equal(f.current.rules.abilities.harvesterDamagePerTick,80);assert.equal(f.commits().length,4);f.handle.destroy();
});

test('undo and restore defaults are themselves immediately committed',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await edit(f,'rules.economy.salvagePayout',70);await f.findText('撤销修改').click();assert.equal(f.current.rules.economy.salvagePayout,50);await edit(f,'rules.economy.salvagePayout',90);await f.findText('恢复原版默认').click();assert.equal(f.current.rules.economy.salvagePayout,50);assert.equal(f.commits().length,4);f.handle.destroy();
});

test('saving persists separately from already-applied edits without another transaction',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await edit(f,'rules.economy.salvagePayout',70);assert.match(f.doc.body.querySelector('.ztps-dirty').textContent,/即时生效.*未另存规则/);f.byLabel('规则名称').value='即时规则';await f.findText('保存规则').click();assert.equal(f.presets.length,1);assert.equal(f.commits().length,1);assert.match(f.doc.body.querySelector('.ztps-dirty').textContent,/即时生效.*已保存规则/);f.handle.destroy();
});

test('oversize import is rejected before reading; valid import commits but is not automatically saved',async()=>{
  const f=fixture();f.handle.open();const input=f.doc.body.querySelectorAll('input').find(e=>e.type==='file');let read=false;input.files=[{size:2*1024*1024+1,async text(){read=true;return '{}';}}];await input.emit('change');assert.equal(read,false);assert.equal(f.calls.some(c=>c[0]==='import'),false);assert.match(message(f).textContent,/2 MB/);
  const spec={name:'导入规则',config:defaults(),rules:CustomRules.defaults()};spec.config.zombies[3].health=1777;input.files=[{size:100,async text(){return JSON.stringify(spec);}}];await input.emit('change');assert.equal(f.handle.getDraft().config.zombies[3].health,1777);assert.equal(f.current.config.zombies[3].health,1777);assert.equal(f.presets.length,0);assert.equal(f.commits().length,1);f.handle.destroy();
});

test('loading a saved rule immediately commits the selected complete specification',async()=>{
  const f=fixture({battle:true});const spec=f.controller.getDraft();spec.rules.corpseSpawnOnImpact=false;f.controller.savePreset('加载测试',spec);f.handle.open();const select=f.byLabel('选择已保存的规则');select.value=f.presets[0].id;await select.emit('change');assert.equal(f.current.rules.corpseSpawnOnImpact,false);assert.equal(f.commits().length,1);f.handle.destroy();
});

test('export requires validation and revokes its Blob URL without saving or applying',async()=>{
  const f=fixture();f.handle.open();await f.findText('导出 JSON').click();assert.equal(f.urls.length,1);assert.deepEqual(f.revoked,['blob:test']);assert.equal(f.calls.some(c=>c[0]==='save'),false);assert.equal(f.commits().length,0);f.handle.destroy();
});

test('untrusted preset and entity labels remain literal text, never executable HTML',async()=>{
  const f=fixture();const malicious='<img src=x onerror=alert(1)>';f.current.config.zombies[0].name=malicious;f.controller.savePreset(malicious,f.controller.getDraft());f.handle.open();await tab(f,'zombies');assert.equal(f.doc.body.querySelectorAll('img').length,0);assert.ok(f.doc.body.textContent.includes(malicious));f.handle.destroy();assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../src/settings-ui.js'),'utf8'),/innerHTML|outerHTML|insertAdjacentHTML|\beval\s*\(|new Function/);
});

test('original one-click spawn cards remain and custom-battle availability is refreshed',async()=>{
  const f=fixture();f.handle.open();assert.equal(f.doc.body.querySelectorAll('[data-spawn]').length,5);let fat=f.doc.body.querySelector('[data-spawn="3"]');assert.equal(fat.disabled,true);await fat.click();assert.equal(f.calls.some(c=>c[0]==='spawn'),false);await f.findText('开始自定义战局').click();fat=f.doc.body.querySelector('[data-spawn="3"]');assert.equal(fat.disabled,false);await fat.click();await fat.click();assert.deepEqual(f.calls.filter(c=>c[0]==='spawn'),[['spawn',3,1],['spawn',3,1]]);f.handle.destroy();
});

test('friendly one-click cards use all five human portraits and leave both persistent camp forms intact',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const friendly=f.doc.body.querySelector('[data-spawn-form="friendly"]'),enemy=f.doc.body.querySelector('[data-spawn-form="enemy"]');assert.ok(friendly);assert.ok(enemy);assert.match(friendly.querySelector('h3').textContent,/己方阵营/);assert.match(enemy.querySelector('h3').textContent,/敌方阵营/);const cards=friendly.querySelectorAll('[data-spawn-friendly]');assert.equal(cards.length,5);for(let i=0;i<5;i++){assert.ok(cards[i].querySelector('.ztps-unit-'+i));assert.match(cards[i].getAttribute('aria-label'),/己方/);await cards[i].click();}assert.deepEqual(f.calls.filter(c=>c[0]==='spawnFriendly'),Array.from({length:5},(_,i)=>['spawnFriendly',i,1]));assert.equal(f.doc.body.querySelectorAll('[data-spawn]').length,5);assert.equal(f.doc.body.querySelectorAll('[data-spawn-batch]').length,2);f.current.isBattle=false;f.notify();assert.ok(cards.every(b=>b.disabled));f.current.isBattle=true;delete f.controller.spawnFriendlyUnit;f.notify();assert.ok(cards.every(b=>b.disabled));assert.equal(enemy.querySelector('[data-spawn]').disabled,false);f.handle.destroy();
});

test('troop-count table follows battle controls before quick spawning and displays all ten species and both camp totals',()=>{
  const f=fixture({custom:true,battle:true});f.current.troopCounts={friendly:{units:[1,2,3,4,5],zombies:[6,7,8,9,10],total:55},enemy:{units:[11,12,13,14,15],zombies:[16,17,18,19,20],total:155}};f.handle.open();const table=f.doc.body.querySelector('[data-troop-counts]'),content=f.doc.getElementById('ztps-content'),start=content.querySelector('.ztps-start'),section=table.parentNode;assert.equal(table.tagName,'TABLE');assert.equal(content.children[content.children.indexOf(start)+1],section);assert.ok(content.children[content.children.indexOf(section)+1].querySelector('[data-spawn]'));assert.equal(table.querySelector('tbody').children.length,10);assert.match(table.querySelector('thead').textContent,/单位.*己方.*敌方/);assert.doesNotMatch(table.querySelector('tbody').textContent,/基地/);const cells=table.querySelectorAll('[data-troop-count]');assert.equal(cells.length,20);for(const side of ['friendly','enemy']){for(const kind of ['units','zombies'])for(let type=0;type<5;type++){const cell=cells.find(e=>e.dataset.troopSide===side&&e.dataset.troopKind===kind&&e.dataset.troopType===String(type));assert.ok(cell);assert.equal(cell.textContent,String(f.current.troopCounts[side][kind][type]));}assert.equal(table.querySelector('[data-troop-total="'+side+'"]').textContent,String(f.current.troopCounts[side].total));}assert.equal(table.querySelectorAll('input,select,button').length,0);assert.equal(f.commits().length,0);f.handle.destroy();
});

test('troop-count table remains readonly in original battles and shows menu zeros without promoting the mode',()=>{
  for(const flags of [{},{battle:true}]){const f=fixture(flags);if(flags.battle){f.current.troopCounts.friendly.units[2]=2;f.current.troopCounts.friendly.total=2;f.current.troopCounts.enemy.zombies[4]=3;f.current.troopCounts.enemy.total=3;}f.handle.open();const table=f.doc.body.querySelector('[data-troop-counts]');assert.equal(table.querySelector('tbody').children.length,10);assert.equal(table.querySelectorAll('[data-troop-count]').length,20);assert.equal(table.querySelectorAll('input,select,button').length,0);if(flags.battle){assert.equal(table.querySelector('[data-troop-total="friendly"]').textContent,'2');assert.equal(table.querySelector('[data-troop-total="enemy"]').textContent,'3');}else{assert.ok(table.querySelectorAll('[data-troop-count],[data-troop-total]').every(cell=>cell.textContent==='0'));}f.tick();assert.equal(f.current.isCustom,false);assert.equal(f.current.isBattle,!!flags.battle);assert.equal(f.commits().length,0);assert.equal(f.calls.some(c=>['spawn','enqueueSpawn'].includes(c[0])||c[0].startsWith('clear')),false);f.handle.destroy();}
});

test('polling and subscription update converted troop counts by current camp without replacing inputs, draft or table nodes',async()=>{
  const f=fixture({custom:true,battle:true});f.current.troopCounts.friendly.zombies[3]=1;f.current.troopCounts.friendly.total=1;f.current.troopCounts.enemy.zombies[3]=2;f.current.troopCounts.enemy.total=2;f.handle.open();const table=f.doc.body.querySelector('[data-troop-counts]'),cells=table.querySelectorAll('[data-troop-count]'),friendly=cells.find(e=>e.dataset.troopSide==='friendly'&&e.dataset.troopKind==='zombies'&&e.dataset.troopType==='3'),enemy=cells.find(e=>e.dataset.troopSide==='enemy'&&e.dataset.troopKind==='zombies'&&e.dataset.troopType==='3'),field=f.byPath('rules.abilities.harvesterDamagePerTick');field.focus();field.value='';await field.emit('change');const draft=f.handle.getDraft();f.current.troopCounts.friendly.zombies[3]=2;f.current.troopCounts.friendly.total=2;f.current.troopCounts.enemy.zombies[3]=1;f.current.troopCounts.enemy.total=1;f.tick();assert.equal(friendly.textContent,'2');assert.equal(enemy.textContent,'1');f.current.troopCounts.friendly.units[2]=4;f.current.troopCounts.friendly.total=6;f.notify();assert.equal(table.querySelectorAll('[data-troop-count]').find(e=>e.dataset.troopSide==='friendly'&&e.dataset.troopKind==='units'&&e.dataset.troopType==='2').textContent,'4');assert.equal(table.querySelector('[data-troop-total="friendly"]').textContent,'6');assert.equal(f.doc.body.querySelector('[data-troop-counts]'),table);assert.deepEqual(table.querySelectorAll('[data-troop-count]'),cells);assert.equal(f.byPath('rules.abilities.harvesterDamagePerTick'),field);assert.equal(f.doc.activeElement,field);assert.equal(field.value,'');assert.equal(field.getAttribute('aria-invalid'),'true');assert.deepEqual(f.handle.getDraft(),draft);assert.equal(f.commits().length,0);assert.equal(f.current.paused,true);f.handle.destroy();
});

test('batch spawn selects species and exact manual quantity while retaining convenient counts',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const species=spawnInput(f,'species'),count=spawnInput(f,'count'),quick=spawnInput(f,'count-preset');assert.equal(species.value,'zombie-0');species.value='zombie-3';quick.value='10';await quick.emit('change');assert.equal(count.value,'10');count.value='17';await spawnInput(f,'batch').click();assert.deepEqual(queueCalls(f),[['enqueueSpawn','enemy',{kind:'zombie',type:3},17]]);assert.equal(f.commits().length,0);f.handle.destroy();
});

test('both persistent forms reject non-positive, fractional, blank and nonfinite counts without spawning',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();for(const side of ['enemy','friendly'])for(const value of ['0','-1','1.5','','Infinity']){spawnInput(f,'count',side).value=value;await spawnInput(f,'batch',side).click();assert.equal(message(f).getAttribute('role'),'alert');}assert.equal(queueCalls(f).length,0);f.handle.destroy();
});

test('both persistent camp forms route all 20 combinations with exact descriptors and quantities',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();assert.equal(f.doc.body.querySelector('[data-spawn-side]'),null);assert.equal(f.doc.body.querySelectorAll('[data-spawn-form]').length,2);const expected=[],choices=['unit','zombie'].flatMap(kind=>Array.from({length:5},(_,type)=>kind+'-'+type));
  for(const side of ['friendly','enemy']){const species=spawnInput(f,'species',side),count=spawnInput(f,'count',side);assert.equal(species.children.length,10);assert.deepEqual(new Set(species.children.map(o=>o.value)),new Set(choices));assert.doesNotMatch(species.textContent,/基地/);for(const kind of ['unit','zombie'])for(let type=0;type<5;type++){species.value=kind+'-'+type;count.value=String(type+2);await spawnInput(f,'batch',side).click();expected.push(['enqueueSpawn',side,{kind,type},type+2]);}}
  assert.deepEqual(queueCalls(f),expected);assert.equal(f.commits().length,0);assert.equal(f.handle.isOpen(),true);f.handle.destroy();
});

test('both camps retain independent species, quantity, rate and focus while either side enqueues or polling runs',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const enemy=spawnInput(f,'species'),friendly=spawnInput(f,'species','friendly'),ec=spawnInput(f,'count'),fc=spawnInput(f,'count','friendly'),er=spawnInput(f,'rate'),fr=spawnInput(f,'rate','friendly');
  enemy.value='unit-3';friendly.value='zombie-2';ec.value='17';fc.value='23';er.value='0.1';fr.value='2';friendly.focus();await spawnInput(f,'batch').click();f.tick();assert.equal(f.doc.activeElement,friendly);assert.equal(friendly.value,'zombie-2');assert.equal(fc.value,'23');assert.equal(fr.value,'2');await spawnInput(f,'batch','friendly').click();assert.deepEqual(f.calls.filter(c=>c[0]==='enqueueSpawn'),[['enqueueSpawn','enemy',{kind:'unit',type:3},17,{rate:0.1}],['enqueueSpawn','friendly',{kind:'zombie',type:2},23,{rate:2}]]);
  await tab(f,'units');await tab(f,'sandbox');for(const [key,side,value]of [['species','enemy','unit-3'],['species','friendly','zombie-2'],['count','enemy','17'],['count','friendly','23'],['rate','enemy','0.1'],['rate','friendly','2']])assert.equal(spawnInput(f,key,side).value,value);f.handle.destroy();
});

test('invalid or base species descriptors never reach batch spawn or typed cleanup APIs',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const species=spawnInput(f,'species');for(const value of ['','unit-5','zombie-5','converted-3','unit--1','__proto__-0']){species.value=value;await spawnInput(f,'batch').click();assert.equal(message(f).getAttribute('role'),'alert');for(const camp of ['friendly','enemy']){const choose=f.doc.body.querySelector('[data-clear-type="'+camp+'"]');choose.value=value;await f.doc.body.querySelector('[data-clear-selected="'+camp+'"]').click();assert.equal(message(f).getAttribute('role'),'alert');}}assert.equal(f.calls.some(c=>c[0]==='enqueueSpawn'||c[0].startsWith('clear')),false);f.handle.destroy();
});

test('both batch camps require an active custom battle and the generic spawn API',async()=>{
  for(const flags of [{},{battle:true},{custom:true}]){const f=fixture(flags);f.handle.open();for(const side of ['enemy','friendly']){const b=spawnInput(f,'batch',side);assert.equal(b.disabled,true);await b.click();}assert.equal(queueCalls(f).length,0);f.handle.destroy();}
  const f=fixture({custom:true,battle:true});delete f.controller.enqueueSpawn;f.handle.open();for(const side of ['enemy','friendly'])assert.equal(spawnInput(f,'batch',side).disabled,true);const quick=f.doc.body.querySelector('[data-spawn="3"]');assert.equal(quick.disabled,false);await quick.click();assert.deepEqual(f.calls.filter(c=>c[0]==='spawn'),[['spawn',3,1]]);f.handle.destroy();
});

test('friendly batch spawn reports failure and lets the same selected controls recover on retry',async()=>{
  const f=fixture({custom:true,battle:true}),original=f.controller.enqueueSpawn;let attempts=0;f.controller.enqueueSpawn=(...args)=>{if(++attempts===1)throw new Error('刷兵暂时失败');return original(...args);};f.handle.open();const species=spawnInput(f,'species','friendly'),count=spawnInput(f,'count','friendly'),button=spawnInput(f,'batch','friendly');species.value='unit-4';count.value='7';await button.click();assert.equal(message(f).getAttribute('role'),'alert');assert.match(message(f).textContent,/刷兵暂时失败/);assert.equal(button.disabled,false);assert.equal(species.value,'unit-4');assert.equal(count.value,'7');await button.click();assert.equal(attempts,2);assert.deepEqual(queueCalls(f),[['enqueueSpawn','friendly',{kind:'unit',type:4},7]]);assert.equal(message(f).getAttribute('role'),'status');assert.equal(f.commits().length,0);f.handle.destroy();
});

test('pending enqueue locks duplicates only on its own camp and captures species, quantity and rate',async()=>{
  const f=fixture({custom:true,battle:true}),original=f.controller.enqueueSpawn;let release;const gate=new Promise(resolve=>{release=resolve;});f.controller.enqueueSpawn=(side,descriptor,count,options)=>{if(side==='friendly'){f.calls.push(['enqueueSpawn',side,clone(descriptor),count,clone(options)]);return gate;}return original(side,descriptor,count,options);};f.handle.open();const species=spawnInput(f,'species','friendly'),count=spawnInput(f,'count','friendly'),button=spawnInput(f,'batch','friendly');species.value='unit-3';count.value='9';const pending=button.click();assert.equal(button.disabled,true);assert.equal(spawnInput(f,'batch').disabled,false);await button.click();species.value='zombie-1';count.value='2';await spawnInput(f,'batch').click();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(queueCalls(f),[['enqueueSpawn','friendly',{kind:'unit',type:3},9],['enqueueSpawn','enemy',{kind:'zombie',type:0},1]]);release({id:'spawn-2',side:'friendly',count:9});await pending;assert.equal(button.disabled,false);await button.click();assert.deepEqual(queueCalls(f).at(-1),['enqueueSpawn','friendly',{kind:'zombie',type:1},2]);f.handle.destroy();
});

test('large batches enqueue immediately and both camps capture independent rates without full spawning',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const species=spawnInput(f,'species'),count=spawnInput(f,'count'),rate=spawnInput(f,'rate'),button=spawnInput(f,'batch');assert.equal(button.textContent,'加入出兵队列');assert.equal(count.max,'2147483647');assert.equal(rate.value,'120');species.value='zombie-3';count.value='1000';rate.value='0.5';await button.click();assert.equal(button.disabled,false);assert.equal(f.current.spawnQueue.jobs[0].remaining,1000);assert.equal(f.current.spawnQueue.jobs[0].spawned,0);assert.equal(f.current.paused,true);
  spawnInput(f,'species','friendly').value='unit-4';spawnInput(f,'count','friendly').value='7';spawnInput(f,'rate','friendly').value='2';await spawnInput(f,'batch','friendly').click();assert.deepEqual(f.calls.filter(c=>c[0]==='enqueueSpawn'),[['enqueueSpawn','enemy',{kind:'zombie',type:3},1000,{rate:0.5}],['enqueueSpawn','friendly',{kind:'unit',type:4},7,{rate:2}]]);assert.deepEqual(f.current.spawnQueue.jobs.map(j=>[j.rate,j.remaining]),[[0.5,1000],[2,7]]);assert.equal(f.calls.some(c=>['spawn','spawnFriendly','spawnFaction'].includes(c[0])),false);assert.equal(f.commits().length,0);f.handle.destroy();
});

test('pending enqueue keeps its captured rate but cannot overwrite the newer next-batch rate preference',async()=>{
  const f=fixture({custom:true,battle:true});let release;const gate=new Promise(resolve=>{release=resolve;});f.controller.enqueueSpawn=(side,descriptor,count,options)=>{f.calls.push(['enqueueSpawn',side,clone(descriptor),count,clone(options)]);return gate;};f.handle.open();const rate=spawnInput(f,'rate'),count=spawnInput(f,'count');count.value='1000';rate.value='0.5';await rate.emit('input');const pending=spawnInput(f,'batch').click();rate.value='2';await rate.emit('input');await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(f.calls.filter(c=>c[0]==='enqueueSpawn'),[['enqueueSpawn','enemy',{kind:'zombie',type:0},1000,{rate:0.5}]]);release({id:'spawn-1',side:'enemy',descriptor:{kind:'zombie',type:0},count:1000,remaining:1000,rate:0.5});await pending;assert.equal(rate.value,'2');await tab(f,'units');await tab(f,'sandbox');assert.equal(spawnInput(f,'rate').value,'2');assert.equal(queueCalls(f).length,1);f.handle.destroy();
});

test('batch enqueue allows zero rate and INTMAX pending count but rejects invalid or overflowing rates and counts',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const count=spawnInput(f,'count'),rate=spawnInput(f,'rate'),button=spawnInput(f,'batch');count.value='2147483647';rate.value='0';await button.click();assert.deepEqual(f.calls.filter(c=>c[0]==='enqueueSpawn')[0],['enqueueSpawn','enemy',{kind:'zombie',type:0},2147483647,{rate:0}]);assert.equal(f.current.spawnQueue.jobs[0].remaining,2147483647);count.value='1';for(const value of ['-1','','Infinity','1000001']){rate.value=value;await button.click();assert.equal(message(f).getAttribute('role'),'alert');}rate.value='0.1';count.value='2147483648';await button.click();assert.equal(message(f).getAttribute('role'),'alert');assert.equal(queueCalls(f).length,1);count.value='2';await button.click();assert.equal(f.current.spawnQueue.jobs[1].rate,0.1);assert.equal(f.current.spawnQueue.jobs[1].remaining,2);f.handle.destroy();
});

test('each queued batch rate changes immediately and independently with zero pause and Enter/blur deduplication',async()=>{
  const f=fixture({custom:true,battle:true});const a=f.controller.enqueueSpawn('enemy',{kind:'zombie',type:3},1000,{rate:20}),b=f.controller.enqueueSpawn('friendly',{kind:'unit',type:2},9,{rate:5});f.handle.open();const rate=f.doc.body.querySelector('[data-spawn-job-rate="'+a.id+'"]');assert.ok(rate);rate.focus();rate.value='1.5';await rate.emit('change');await rate.emit('keydown',{key:'Enter'});await rate.emit('blur');assert.deepEqual(f.calls.filter(c=>c[0]==='spawnJobRate'),[['spawnJobRate',a.id,1.5]]);assert.equal(f.current.spawnQueue.jobs.find(j=>j.id===b.id).rate,5);rate.value='0';await rate.emit('keydown',{key:'Enter'});assert.equal(f.current.spawnQueue.jobs.find(j=>j.id===a.id).rate,0);rate.value='-1';await rate.emit('change');assert.equal(rate.getAttribute('aria-invalid'),'true');assert.equal(f.current.spawnQueue.jobs.find(j=>j.id===a.id).rate,0);assert.equal(f.calls.filter(c=>c[0]==='spawnJobRate').length,2);rate.value='0.25';await rate.emit('blur');assert.equal(rate.getAttribute('aria-invalid'),null);assert.equal(f.current.spawnQueue.jobs.find(j=>j.id===a.id).rate,0.25);assert.equal(f.calls.filter(c=>c[0]==='spawnJobRate').length,3);assert.equal(f.commits().length,0);assert.equal(f.current.paused,true);f.handle.destroy();
});

test('asynchronous rate edits serialize only their own batch and preserve newer input without duplicate commits',async()=>{
  const f=fixture({custom:true,battle:true}),a=f.controller.enqueueSpawn('enemy',{kind:'zombie',type:3},1000,{rate:20}),b=f.controller.enqueueSpawn('friendly',{kind:'unit',type:2},9,{rate:5}),original=f.controller.setSpawnJobRate;let release,firstA=true;const gate=new Promise(resolve=>{release=resolve;}),entered=[];f.controller.setSpawnJobRate=async(id,rate)=>{entered.push([id,rate]);if(id===a.id&&firstA){firstA=false;await gate;}return original(id,rate);};f.handle.open();const ar=f.doc.body.querySelector('[data-spawn-job-rate="'+a.id+'"]'),br=f.doc.body.querySelector('[data-spawn-job-rate="'+b.id+'"]');ar.focus();ar.value='3';const first=ar.emit('change');await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(entered,[[a.id,3]]);await ar.emit('keydown',{key:'Enter'});await ar.emit('blur');br.value='2';await br.emit('change');assert.deepEqual(entered,[[a.id,3],[b.id,2]]);assert.equal(f.current.spawnQueue.jobs.find(j=>j.id===b.id).rate,2);ar.focus();ar.value='4';const second=ar.emit('keydown',{key:'Enter'});await new Promise(resolve=>setImmediate(resolve));assert.equal(entered.length,2);release();await Promise.all([first,second]);assert.deepEqual(entered,[[a.id,3],[b.id,2],[a.id,4]]);assert.equal(f.current.spawnQueue.jobs.find(j=>j.id===a.id).rate,4);assert.equal(ar.value,'4');assert.equal(ar.dataset.committedValue,'4');await ar.emit('blur');assert.equal(entered.length,3);f.handle.destroy();
});

test('queue polling keys rows by ID and preserves focused pending rate edits while counters update',()=>{
  const f=fixture({custom:true,battle:true});const a=f.controller.enqueueSpawn('enemy',{kind:'zombie',type:3},1000,{rate:20});f.handle.open();const row=f.doc.body.querySelector('[data-spawn-job-id="'+a.id+'"]'),rate=f.doc.body.querySelector('[data-spawn-job-rate="'+a.id+'"]');assert.ok(row);rate.focus();rate.value='0.25';f.current.spawnQueue.jobs[0].spawned=5;f.current.spawnQueue.jobs[0].remaining=995;f.current.spawnQueue.pending=f.current.spawnQueue.totalPending=995;f.tick();assert.equal(f.doc.body.querySelector('[data-spawn-job-id="'+a.id+'"]'),row);assert.equal(f.doc.body.querySelector('[data-spawn-job-rate="'+a.id+'"]'),rate);assert.equal(f.doc.activeElement,rate);assert.equal(rate.value,'0.25');assert.match(row.textContent,/995/);assert.match(f.doc.body.querySelector('[data-spawn-queue-summary]').textContent,/995/);assert.equal(f.calls.some(c=>c[0]==='spawnJobRate'),false);f.handle.destroy();
});

test('queue rows describe the real blocking reason and display occupancy including bases without calling every pause full',()=>{
  const f=fixture({custom:true,battle:true}),job=f.controller.enqueueSpawn('enemy',{kind:'zombie',type:3},1000,{rate:20});
  Object.assign(f.current.spawnQueue,{entityCount:302,baseCount:2,entityLimit:1000,capacity:698});f.handle.open();
  const row=f.doc.body.querySelector('[data-spawn-job-id="'+job.id+'"]'),summary=f.doc.body.querySelector('[data-spawn-queue-summary]');
  assert.match(summary.textContent,/场上占用 302 \/ 1000（含基地）/);
  for(const [reason,label] of [['game-paused','游戏暂停中'],['runtime-paused','战斗暂停中'],['rate-paused','所有批次速率为 0'],['battle-ended','战斗已结束'],['no-active-battle','等待开始战局'],['unknown-future-reason','等待继续出兵']]){
    f.current.spawnQueue.blocked=reason;f.tick();assert.ok(row.textContent.includes(label),reason);
    assert.doesNotMatch(row.textContent,/场上已满|等待场上空位/);assert.match(summary.textContent,/302 \/ 1000/);
  }
  Object.assign(f.current.spawnQueue,{blocked:'entity-limit',entityCount:1000,capacity:0});f.tick();
  assert.match(row.textContent,/场上已满，等待单位退场/);assert.match(summary.textContent,/1000 \/ 1000（含基地）/);
  f.current.spawnQueue.jobs[0].rate=0;f.tick();assert.match(row.textContent,/该批已暂停（速率 0）/);assert.doesNotMatch(row.textContent,/场上已满/);
  Object.assign(f.current.spawnQueue,{blocked:null,entityCount:999,capacity:1});f.current.spawnQueue.jobs[0].rate=20;f.tick();
  assert.doesNotMatch(row.textContent,/暂停|场上已满|等待/);assert.match(summary.textContent,/999 \/ 1000/);
  assert.equal(f.calls.some(c=>c[0]==='spawnJobRate'),false);assert.equal(f.commits().length,0);f.handle.destroy();
});

test('a completed focused batch remains as a readonly stable row until focus leaves',()=>{
  const f=fixture({custom:true,battle:true}),job=f.controller.enqueueSpawn('enemy',{kind:'zombie',type:3},1,{rate:20});f.handle.open();const row=f.doc.body.querySelector('[data-spawn-job-id="'+job.id+'"]'),rate=f.doc.body.querySelector('[data-spawn-job-rate="'+job.id+'"]');rate.focus();f.current.spawnQueue.jobs=[];f.current.spawnQueue.pending=f.current.spawnQueue.totalPending=0;f.tick();assert.equal(f.doc.body.querySelector('[data-spawn-job-id="'+job.id+'"]'),row);assert.equal(f.doc.activeElement,rate);assert.equal(rate.readOnly,true);assert.equal(rate.getAttribute('aria-readonly'),'true');assert.equal(row.querySelector('[data-cancel-spawn-job]').disabled,true);assert.match(row.textContent,/已结束/);f.canvas.focus();f.tick();assert.equal(f.doc.body.querySelector('[data-spawn-job-id="'+job.id+'"]'),null);f.handle.destroy();
});

test('cancel one batch or all pending batches leaves other jobs or already-spawned actors untouched',async()=>{
  const f=fixture({custom:true,battle:true});const a=f.controller.enqueueSpawn('enemy',{kind:'zombie',type:3},1000,{rate:20}),b=f.controller.enqueueSpawn('friendly',{kind:'unit',type:2},9,{rate:5});f.current.spawnQueue.jobs[0].spawned=5;f.current.spawnQueue.jobs[0].remaining=995;f.handle.open();await f.doc.body.querySelector('[data-cancel-spawn-job="'+a.id+'"]').click();assert.deepEqual(f.current.spawnQueue.jobs.map(j=>j.id),[b.id]);assert.equal(f.doc.body.querySelector('[data-spawn-job-id="'+a.id+'"]'),null);assert.ok(f.doc.body.querySelector('[data-spawn-job-id="'+b.id+'"]'));await f.doc.body.querySelector('[data-cancel-spawn-all]').click();assert.equal(f.current.spawnQueue.jobs.length,0);assert.equal(f.doc.body.querySelectorAll('[data-spawn-job-id]').length,0);assert.deepEqual(f.calls.filter(c=>c[0]==='cancelSpawnJob'),[['cancelSpawnJob',a.id],['cancelSpawnJob']]);assert.equal(f.calls.some(c=>c[0].startsWith('clear')||['spawn','spawnFriendly','spawnFaction'].includes(c[0])),false);assert.equal(f.commits().length,0);assert.equal(f.current.paused,true);f.handle.destroy();
});

test('queued job actions require custom battle and independently disable missing rate or cancellation APIs',()=>{
  for(const flags of [{},{battle:true},{custom:true}]){const f=fixture(flags);f.controller.enqueueSpawn('enemy',{kind:'zombie',type:3},1000,{rate:20});f.handle.open();assert.ok(f.doc.body.querySelectorAll('[data-spawn-job-rate],[data-cancel-spawn-job],[data-cancel-spawn-all]').every(e=>e.disabled));f.handle.destroy();}
  const f=fixture({custom:true,battle:true});f.controller.enqueueSpawn('enemy',{kind:'zombie',type:3},1000,{rate:20});delete f.controller.setSpawnJobRate;f.handle.open();assert.equal(f.doc.body.querySelector('[data-spawn-job-rate]').disabled,true);assert.equal(f.doc.body.querySelector('[data-cancel-spawn-job]').disabled,false);delete f.controller.cancelSpawnJob;f.notify();assert.equal(f.doc.body.querySelector('[data-cancel-spawn-job]').disabled,true);assert.equal(f.doc.body.querySelector('[data-cancel-spawn-all]').disabled,true);assert.equal(spawnInput(f,'batch').disabled,false);f.handle.destroy();
});

test('queue rate and cancellation remain independent of invalid parameter drafts and never unpause the battle',async()=>{
  const f=fixture({custom:true,battle:true}),job=f.controller.enqueueSpawn('enemy',{kind:'zombie',type:3},1000,{rate:20});f.handle.open();await edit(f,'rules.abilities.harvesterDamagePerTick','');const rate=f.doc.body.querySelector('[data-spawn-job-rate="'+job.id+'"]');rate.value='0';await rate.emit('change');await f.doc.body.querySelector('[data-cancel-spawn-job="'+job.id+'"]').click();assert.deepEqual(f.calls.filter(c=>['spawnJobRate','cancelSpawnJob'].includes(c[0])),[['spawnJobRate',job.id,0],['cancelSpawnJob',job.id]]);assert.equal(f.handle.getDraft().rules.abilities.harvesterDamagePerTick,100);assert.equal(f.commits().length,0);assert.equal(f.current.paused,true);assert.equal(f.current.spawnQueue.jobs.length,0);f.handle.destroy();
});

test('all spawn and filtered clear actions disable when battle ends or required APIs are absent',()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();assert.equal(spawnInput(f,'batch').disabled,false);f.current.isBattle=false;f.notify();assert.equal(spawnInput(f,'batch').disabled,true);for(const b of f.doc.body.querySelectorAll('[data-clear-selected]'))assert.equal(b.disabled,true);f.current.isBattle=true;delete f.controller.clearEnemyTroops;f.notify();assert.equal(f.doc.body.querySelector('[data-clear-selected="enemy"]').disabled,true);assert.equal(f.doc.body.querySelector('[data-clear-selected="friendly"]').disabled,false);f.handle.destroy();
});

test('whole-side cleanup preserves existing shortcuts and never triggers merely by opening settings',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();assert.equal(f.calls.some(c=>c[0].startsWith('clear')),false);await f.findText('一键杀死己方小兵').click();await f.findText('一键杀死敌方小兵').click();assert.deepEqual(f.calls.filter(c=>c[0].startsWith('clear')),[['clearFriendly'],['clearEnemy']]);assert.equal(f.handle.isOpen(),true);assert.equal(f.current.paused,true);assert.match(message(f).textContent,/已击杀 5 个敌方小兵/);f.handle.destroy();
});

test('kill-both button calls the atomic combined API once and works beside an invalid unfinished field',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const both=f.doc.body.querySelector('[data-clear-troops="all"]');assert.ok(both);assert.equal(both.textContent,'一键杀死双方小兵');assert.equal(both.disabled,false);await edit(f,'rules.abilities.harvesterDamagePerTick','');await both.click();assert.deepEqual(f.calls.filter(c=>c[0].startsWith('clear')),[['clearAll']]);assert.match(message(f).textContent,/已击杀 8 个双方小兵/);assert.equal(f.commits().length,0);assert.equal(f.current.paused,true);f.handle.destroy();
});

test('all cleanup actions lock during combined death processing and recover after failure without falling back to partial calls',async()=>{
  const f=fixture({custom:true,battle:true});let reject;f.controller.clearAllTroops=()=>{f.calls.push(['clearAll']);return new Promise((yes,no)=>{reject=no;});};f.handle.open();const both=f.doc.body.querySelector('[data-clear-troops="all"]'),pending=both.click();assert.ok(f.doc.body.querySelectorAll('[data-clear-troops],[data-clear-selected]').every(b=>b.disabled));await both.click();assert.deepEqual(f.calls.filter(c=>c[0].startsWith('clear')),[['clearAll']]);reject(new Error('清场预检失败'));await pending;assert.equal(both.disabled,false);assert.match(message(f).textContent,/清场预检失败/);delete f.controller.clearAllTroops;f.notify();assert.equal(both.disabled,true);assert.equal(f.findText('一键杀死己方小兵').disabled,false);f.handle.destroy();
});

test('filtered cleanup offers the same ten species in both camps and routes all 20 descriptors',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const expected=[],choices=['unit','zombie'].flatMap(kind=>Array.from({length:5},(_,type)=>kind+'-'+type));for(const camp of ['friendly','enemy']){const choose=f.doc.body.querySelector('[data-clear-type="'+camp+'"]');assert.equal(choose.children.length,10);assert.deepEqual(new Set(choose.children.map(o=>o.value)),new Set(choices));assert.doesNotMatch(choose.textContent,/基地/);for(const kind of ['unit','zombie'])for(let type=0;type<5;type++){choose.value=kind+'-'+type;await f.doc.body.querySelector('[data-clear-selected="'+camp+'"]').click();expected.push([camp==='friendly'?'clearFriendly':'clearEnemy',{kind,type}]);}}assert.deepEqual(f.calls.filter(c=>c[0].startsWith('clear')),expected);assert.equal(f.commits().length,0);f.handle.destroy();
});

test('cleanup works independently of an invalid unfinished parameter and does not apply it',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await edit(f,'rules.abilities.harvesterDamagePerTick','');await f.findText('一键杀死敌方小兵').click();assert.deepEqual(f.calls.filter(c=>c[0].startsWith('clear')),[['clearEnemy']]);assert.equal(f.commits().length,0);assert.equal(f.handle.getDraft().rules.abilities.harvesterDamagePerTick,100);f.handle.destroy();
});

test('cleanup locks every side/filter while pending and recovers controls after controller failure',async()=>{
  const f=fixture({custom:true,battle:true});let reject;f.controller.clearEnemyTroops=()=>{f.calls.push(['clearEnemy']);return new Promise((_,no)=>{reject=no;});};f.handle.open();const enemy=f.findText('一键杀死敌方小兵'),friendly=f.findText('一键杀死己方小兵');const pending=enemy.click();assert.equal(enemy.disabled,true);assert.equal(friendly.disabled,true);for(const b of f.doc.body.querySelectorAll('[data-clear-selected]'))assert.equal(b.disabled,true);await enemy.click();await friendly.click();assert.deepEqual(f.calls.filter(c=>c[0].startsWith('clear')),[['clearEnemy']]);reject(new Error('当前没有可操作的战局'));await pending;assert.equal(enemy.disabled,false);assert.equal(friendly.disabled,false);assert.equal(message(f).getAttribute('role'),'alert');assert.match(message(f).textContent,/当前没有可操作的战局/);assert.equal(f.current.paused,true);f.handle.destroy();
});

test('both base cards appear directly after cleanup with independent maximum and current HP controls',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const sections=f.doc.getElementById('ztps-content').children;const i=sections.findIndex(e=>e.textContent.startsWith('清理当前小兵'));assert.ok(i>=0);assert.match(sections[i+1].textContent,/^基地生命/);assert.ok(f.byPath('config.units.5.health'));assert.ok(f.byPath('config.zombies.5.health'));assert.equal(f.byLabel('我方基地当前生命').value,'1000');assert.equal(f.byLabel('敌方基地当前生命').value,'2000');
  await edit(f,'config.units.5.health',1000000000);assert.equal(f.current.config.units[5].health,1000000000);const input=f.byLabel('我方基地当前生命');input.value='321';await input.emit('change');await input.emit('blur');await input.emit('keydown',{key:'Enter'});assert.deepEqual(f.calls.filter(c=>c[0]==='base'),[['base','friendly',321]]);assert.equal(f.current.bases.friendly.current,321);assert.equal(f.commits().length,1);f.handle.destroy();
});

test('base HP polling refreshes live values without overwriting a focused in-progress input',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const input=f.byLabel('敌方基地当前生命');input.focus();input.value='777';f.current.bases.enemy.current=1666;f.tick();assert.equal(input.value,'777');assert.equal(f.doc.activeElement,input);await input.emit('keydown',{key:'Enter'});assert.equal(f.current.bases.enemy.current,777);f.canvas.focus();f.current.bases.enemy.current=666;f.tick();assert.equal(input.value,'666');assert.match(f.doc.body.querySelector('[data-base-status="enemy"]').textContent,/666/);f.handle.destroy();
});

test('asynchronous base HP changes deduplicate Enter/blur and serialize distinct submitted values',async()=>{
  const f=fixture({custom:true,battle:true});const original=f.controller.setBaseHealth;let release;const gate=new Promise(resolve=>{release=resolve;});const entered=[];
  f.controller.setBaseHealth=async(side,value)=>{entered.push([side,value]);if(entered.length===1)await gate;return original(side,value);};f.handle.open();const input=f.byLabel('我方基地当前生命');input.focus();input.value='321';const first=input.emit('change');await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(entered,[['friendly',321]]);
  await input.emit('keydown',{key:'Enter'});await input.emit('blur');assert.equal(entered.length,1);input.value='654';const second=input.emit('keydown',{key:'Enter'});await new Promise(resolve=>setImmediate(resolve));assert.equal(entered.length,1);assert.equal(input.value,'654');release();await Promise.all([first,second]);assert.deepEqual(entered,[['friendly',321],['friendly',654]]);assert.deepEqual(f.calls.filter(c=>c[0]==='base'),[['base','friendly',321],['base','friendly',654]]);assert.equal(f.current.bases.friendly.current,654);assert.equal(input.value,'654');assert.equal(input.dataset.committedValue,'654');await input.emit('blur');assert.equal(entered.length,2);f.handle.destroy();
});

test('negative and out-of-range base current HP never reach successful mutation',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const input=f.byLabel('我方基地当前生命');for(const value of ['-1','1.5','','Infinity',String(f.current.bases.friendly.maximum+1)]){input.value=value;await input.emit('change');assert.equal(message(f).getAttribute('role'),'alert');}assert.equal(f.calls.some(c=>c[0]==='base'),false);assert.equal(f.current.bases.friendly.current,1000);f.handle.destroy();
});

test('independent all-unit and all-zombie multipliers appear before the per-entity picker and apply instantly',async()=>{
  const f=fixture({battle:true});f.handle.open();for(const kind of ['units','zombies']){await tab(f,kind);const content=f.doc.getElementById('ztps-content');assert.equal(content.children[0].classList.contains('ztps-multipliers'),true);assert.equal(content.children[0].querySelector('h2').textContent,kind==='units'?'人类兵种通用倍率':'僵尸通用倍率');assert.match(content.children[0].querySelector('p').textContent,/按兵种类型生效，双方共用；基地除外/);for(const key of ['health','moveSpeed','damage'])await edit(f,'rules.multipliers.'+kind+'.'+key,1.5);assert.equal(f.current.rules.multipliers[kind].health,1.5);assert.equal(f.current.rules.multipliers[kind].moveSpeed,1.5);assert.equal(f.current.rules.multipliers[kind].damage,1.5);}assert.equal(f.commits().length,6);assert.equal(f.current.config.levels[0].zombieHealthMultiplier,f.current.defaults.levels[0].zombieHealthMultiplier);assert.equal(f.current.config.units[5].health,f.current.defaults.units[5].health);f.handle.destroy();
});

test('invalid global health multiplier is rejected without replacing the last valid value',async()=>{
  const f=fixture({battle:true});f.handle.open();await tab(f,'zombies');await edit(f,'rules.multipliers.zombies.health',0);assert.equal(f.commits().length,0);assert.equal(f.handle.getDraft().rules.multipliers.zombies.health,1);assert.equal(f.byPath('rules.multipliers.zombies.health').getAttribute('aria-invalid'),'true');await edit(f,'rules.multipliers.zombies.health',1.5);assert.equal(f.current.rules.multipliers.zombies.health,1.5);f.handle.destroy();
});

test('combined species, army and stage multipliers are prevalidated before any draft or runtime mutation',async()=>{
  const f=fixture({battle:true});f.current.config.zombies[4].health=800000000;f.handle.open();await tab(f,'zombies');await edit(f,'rules.multipliers.zombies.health',1.5);assert.equal(f.commits().length,1);await tab(f,'levels');const before=f.handle.getDraft();await edit(f,'config.levels.0.zombieHealthMultiplier',2);assert.equal(f.commits().length,1);assert.deepEqual(f.handle.getDraft(),before);assert.equal(f.current.config.levels[0].zombieHealthMultiplier,1);assert.equal(f.current.rules.multipliers.zombies.health,1.5);assert.equal(f.byPath('config.levels.0.zombieHealthMultiplier').getAttribute('aria-invalid'),'true');assert.match(message(f).textContent,/effective health|2,147,483,647|2147483647/);f.handle.destroy();
});

test('Angry Mob offers all five friendly species and accepts counts above the old 1000 cap',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'powers');for(const [key,count] of [['shovelCount',2001],['shotgunCount',2002],['survivalistCount',2003],['bomberCount',2004],['preacherCount',2005]]){const path='config.powers.0.effect.'+key;const input=f.byPath(path);assert.ok(input,'missing mob option '+key);assert.notEqual(input.max,'1000');await edit(f,path,count);assert.equal(f.current.config.powers[0].effect[key],count);}assert.equal(f.commits().length,5);f.handle.destroy();
});

test('skill cancellation routes the selected power IDs and all-power action without applying parameters',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'powers');for(let id=0;id<3;id++){const pick=f.byLabel('选择技能');pick.value=String(id);await pick.emit('change');const current=f.doc.body.querySelector('[data-cancel-power-effects="'+id+'"]');assert.ok(current);assert.equal(current.textContent,'取消当前技能效果');assert.equal(f.doc.body.querySelectorAll('[data-cancel-power-effects]').length,2);await current.click();}await f.doc.body.querySelector('[data-cancel-power-effects="all"]').click();assert.deepEqual(f.calls.filter(c=>c[0]==='cancelPower'),[['cancelPower',0],['cancelPower',1],['cancelPower',2],['cancelPower']]);assert.equal(f.commits().length,0);assert.equal(f.current.paused,true);assert.equal(f.handle.isOpen(),true);assert.match(message(f).textContent,/全部技能效果.*待生成 23.*在场 14/);f.handle.destroy();
});

test('skill cancellation ignores an invalid unfinished parameter and preserves editor or original pause',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'powers');const before=f.handle.getDraft();await edit(f,'config.powers.0.xp','');assert.equal(f.commits().length,0);await f.doc.body.querySelector('[data-cancel-power-effects="0"]').click();assert.deepEqual(f.handle.getDraft(),before);assert.equal(f.commits().length,0);assert.equal(f.current.paused,true);assert.match(message(f).textContent,/画面暂停/);f.handle.resumePlayback();f.current.gamePaused=true;await f.doc.body.querySelector('[data-cancel-power-effects="all"]').click();assert.equal(f.current.paused,false);assert.equal(f.current.gamePaused,true);assert.match(message(f).textContent,/画面暂停/);assert.deepEqual(f.calls.filter(c=>c[0]==='cancelPower'),[['cancelPower',0],['cancelPower']]);assert.equal(f.calls.filter(c=>c[0]==='resume').length,1);f.handle.destroy();
});

test('skill cancellation is unavailable outside custom battle or when its API is missing',async()=>{
  for(const flags of [{},{battle:true},{custom:true}]){const f=fixture(flags);f.handle.open();await tab(f,'powers');const buttons=f.doc.body.querySelectorAll('[data-cancel-power-effects]');assert.equal(buttons.length,2);assert.ok(buttons.every(b=>b.disabled));for(const button of buttons)await button.click();assert.equal(f.calls.some(c=>c[0]==='cancelPower'),false);f.handle.destroy();}
  const f=fixture({custom:true,battle:true});delete f.controller.cancelPowerEffects;f.handle.open();await tab(f,'powers');assert.ok(f.doc.body.querySelectorAll('[data-cancel-power-effects]').every(b=>b.disabled));f.handle.destroy();
  const ended=fixture({custom:true,battle:true});ended.handle.open();await tab(ended,'powers');assert.ok(ended.doc.body.querySelectorAll('[data-cancel-power-effects]').every(b=>!b.disabled));ended.current.isBattle=false;ended.notify();assert.ok(ended.doc.body.querySelectorAll('[data-cancel-power-effects]').every(b=>b.disabled));ended.handle.destroy();
});

test('pending skill cancellation locks both actions, rejects duplicate clicks and recovers after failure',async()=>{
  const f=fixture({custom:true,battle:true});const original=f.controller.cancelPowerEffects;let reject;f.controller.cancelPowerEffects=id=>{f.calls.push(id===undefined?['cancelPower']:['cancelPower',id]);return new Promise((_,no)=>{reject=no;});};f.handle.open();await tab(f,'powers');const current=f.doc.body.querySelector('[data-cancel-power-effects="0"]'),all=f.doc.body.querySelector('[data-cancel-power-effects="all"]');const pending=current.click();assert.equal(current.disabled,true);assert.equal(all.disabled,true);await current.click();await all.click();assert.deepEqual(f.calls.filter(c=>c[0]==='cancelPower'),[['cancelPower',0]]);reject(new Error('取消效果失败'));await pending;assert.equal(current.disabled,false);assert.equal(all.disabled,false);assert.equal(message(f).getAttribute('role'),'alert');assert.match(message(f).textContent,/取消效果失败/);assert.equal(f.current.paused,true);f.controller.cancelPowerEffects=original;await all.click();assert.deepEqual(f.calls.filter(c=>c[0]==='cancelPower'),[['cancelPower',0],['cancelPower']]);assert.equal(message(f).getAttribute('role'),'status');assert.equal(f.commits().length,0);f.handle.destroy();
});

test('skill pending status uses controller counts and polling never replaces focused skill inputs',async()=>{
  const f=fixture({custom:true,battle:true});f.current.powerProgress.pendingTotal=1234;f.handle.open();await tab(f,'powers');const pending=f.doc.body.querySelector('[data-power-pending]');assert.ok(pending);assert.match(pending.textContent,/1234/);const xp=f.byPath('config.powers.0.xp');xp.focus();xp.value='777';f.current.powerProgress.pendingTotal=321;f.tick();assert.equal(f.doc.body.querySelector('[data-power-pending]'),pending);assert.match(pending.textContent,/321/);assert.equal(f.byPath('config.powers.0.xp'),xp);assert.equal(f.doc.activeElement,xp);assert.equal(xp.value,'777');assert.equal(f.commits().length,0);f.handle.destroy();
});

test('selected skill status reports its own real actors, pending and charging with honest legacy fallback',async()=>{
  const f=fixture({custom:true,battle:true});f.current.powerProgress={pendingTotal:999,byPower:[{id:0,pending:11,actors:2,powerups:3,projectiles:4,explosions:5,charging:1},{id:1,pending:22,actors:7,powerups:0,projectiles:1,explosions:2,charging:0},{id:2,pending:33,actors:0,powerups:1,projectiles:2,explosions:3,charging:1}]};f.handle.open();await tab(f,'powers');assert.match(f.doc.body.querySelector('[data-power-pending]').textContent,/当前技能.*在场 14.*待生成 11.*蓄力中/);const pick=f.byLabel('选择技能');pick.value='1';await pick.emit('change');assert.match(f.doc.body.querySelector('[data-power-pending]').textContent,/当前技能.*在场 10.*待生成 22/);assert.doesNotMatch(f.doc.body.querySelector('[data-power-pending]').textContent,/蓄力中/);const next=f.byLabel('选择技能');next.value='2';await next.emit('change');assert.match(f.doc.body.querySelector('[data-power-pending]').textContent,/当前技能.*在场 6.*待生成 33.*蓄力中/);delete f.current.powerProgress.byPower;f.tick();assert.match(f.doc.body.querySelector('[data-power-pending]').textContent,/全部技能.*待生成 999/);assert.doesNotMatch(f.doc.body.querySelector('[data-power-pending]').textContent,/在场/);f.handle.destroy();
});

test('wave table is newest first while displayed fields still target original execution indices',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'levels');const waves=f.handle.getDraft().config.levels[0].waves,n=waves.length;const counts=f.doc.body.querySelectorAll('[data-path]').filter(e=>/^config\.levels\.0\.waves\.\d+\.count$/.test(e.dataset.path));assert.ok(counts.length<=12);assert.equal(counts[0].dataset.path,'config.levels.0.waves.'+(n-1)+'.count');
  await edit(f,counts[0].dataset.path,7);assert.equal(f.current.config.levels[0].waves[n-1].count,7);assert.equal(f.current.config.levels[0].waves[0].count,waves[0].count);f.handle.destroy();
});

test('wave header pause and resume toggle the actual spawning flag without resetting progress or runtime pause',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'levels');const button=f.doc.body.querySelector('[data-toggle-waves]'),progress=clone(f.current.waveProgress),config=clone(f.current.config),pauses=f.calls.filter(c=>['pause','resume'].includes(c[0]));assert.ok(button);assert.equal(button.textContent,'暂停波次');await button.click();assert.equal(f.current.rules.automaticSpawning,false);assert.equal(f.handle.getDraft().rules.automaticSpawning,false);assert.equal(button.textContent,'继续波次');assert.match(f.doc.body.querySelector('[data-wave-pause-status]').textContent,/暂停|停止/);assert.deepEqual(f.current.waveProgress,progress);assert.deepEqual(f.current.config,config);assert.equal(f.current.paused,true);await button.click();assert.equal(f.current.rules.automaticSpawning,true);assert.equal(button.textContent,'暂停波次');assert.deepEqual(f.current.waveProgress,progress);assert.deepEqual(f.calls.filter(c=>['pause','resume'].includes(c[0])),pauses);assert.equal(f.commits().length,2);assert.equal(f.findText('应用本局'),undefined);f.handle.destroy();
});

test('wave shortcut uses current committed state and leaves an invalid focused draft field entirely untouched',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'levels');const n=f.handle.getDraft().config.levels[0].waves.length-1,path='config.levels.0.waves.'+n+'.count',count=f.byPath(path);count.focus();count.value='';await count.emit('change');const draft=clone(f.handle.getDraft());f.current.config.zombies[0].health=77;f.current.rules.economy.salvagePayout=70;const currentConfig=clone(f.current.config),currentRules=clone(f.current.rules);await f.doc.body.querySelector('[data-toggle-waves]').click();assert.equal(f.commits().length,1);assert.deepEqual(f.commits()[0][1],{config:currentConfig,rules:{...currentRules,automaticSpawning:false}});assert.deepEqual(f.handle.getDraft(),{config:draft.config,rules:{...draft.rules,automaticSpawning:false}});assert.equal(f.byPath(path),count);assert.equal(f.doc.activeElement,count);assert.equal(count.value,'');assert.equal(count.getAttribute('aria-invalid'),'true');assert.equal(f.current.config.zombies[0].health,77);assert.equal(f.current.rules.economy.salvagePayout,70);assert.equal(f.current.paused,true);f.handle.destroy();
});

test('wave header and sandbox spawning checkbox reflect each other immediately across tabs',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'levels');await f.doc.body.querySelector('[data-toggle-waves]').click();await tab(f,'sandbox');assert.equal(f.byPath('rules.automaticSpawning').checked,false);await edit(f,'rules.automaticSpawning',true);await tab(f,'levels');assert.equal(f.doc.body.querySelector('[data-toggle-waves]').textContent,'暂停波次');assert.equal(f.current.rules.automaticSpawning,true);assert.equal(f.handle.getDraft().rules.automaticSpawning,true);assert.equal(f.commits().length,2);f.handle.destroy();
});

test('wave shortcut stages menu settings or promotes an original battle with no confirmation or pause manipulation',async()=>{
  for(const flags of [{},{battle:true}]){const f=fixture(flags);f.win.confirm=()=>{throw new Error('unexpected confirmation');};f.handle.open();await tab(f,'levels');const pauses=f.calls.filter(c=>['pause','resume'].includes(c[0]));await f.doc.body.querySelector('[data-toggle-waves]').click();assert.equal(f.current.rules.automaticSpawning,false);assert.equal(f.current.isBattle,!!flags.battle);assert.equal(f.current.isCustom,!!flags.battle);assert.equal(f.commits().length,1);assert.deepEqual(f.calls.filter(c=>['pause','resume'].includes(c[0])),pauses);assert.equal(f.doc.body.querySelector('[data-toggle-waves]').textContent,'继续波次');f.handle.destroy();}
});

test('failed wave shortcut keeps both actual and draft flags unchanged and can be retried',async()=>{
  const f=fixture({custom:true,battle:true}),original=f.controller.commitSettings;let attempts=0;f.controller.commitSettings=(spec,options)=>{if(++attempts===1)throw new Error('切换波次失败');return original(spec,options);};f.handle.open();await tab(f,'levels');const button=f.doc.body.querySelector('[data-toggle-waves]');await button.click();assert.equal(f.current.rules.automaticSpawning,true);assert.equal(f.handle.getDraft().rules.automaticSpawning,true);assert.equal(button.textContent,'暂停波次');assert.equal(button.disabled,false);assert.equal(message(f).getAttribute('role'),'alert');assert.match(message(f).textContent,/切换波次失败/);await button.click();assert.equal(attempts,2);assert.equal(f.current.rules.automaticSpawning,false);assert.equal(f.handle.getDraft().rules.automaticSpawning,false);assert.equal(button.textContent,'继续波次');assert.equal(message(f).getAttribute('role'),'status');assert.equal(f.commits().length,1);f.handle.destroy();
});

test('a valid attribute edit queued during wave pausing cannot silently re-enable spawning from its stale snapshot',async()=>{
  const f=fixture({custom:true,battle:true}),original=f.controller.commitSettings;let release,entered=0;const gate=new Promise(resolve=>{release=resolve;});f.controller.commitSettings=async(spec,options)=>{if(++entered===1)await gate;return original(spec,options);};f.handle.open();await tab(f,'levels');const progress=clone(f.current.waveProgress),toggle=f.doc.body.querySelector('[data-toggle-waves]'),pending=toggle.click();await new Promise(resolve=>setImmediate(resolve));assert.equal(entered,1);assert.equal(toggle.disabled,true);await toggle.click();await tab(f,'zombies');const hp=f.byPath('config.zombies.0.health');hp.focus();hp.value='123';const editing=hp.emit('change');await new Promise(resolve=>setImmediate(resolve));assert.equal(entered,1);release();await Promise.all([pending,editing]);await f.handle.whenSettled();assert.equal(entered,2);assert.deepEqual(f.commits().map(c=>c[1].rules.automaticSpawning),[false,false]);assert.equal(f.current.rules.automaticSpawning,false);assert.equal(f.handle.getDraft().rules.automaticSpawning,false);assert.equal(f.current.config.zombies[0].health,123);assert.equal(f.byPath('config.zombies.0.health'),hp);assert.equal(f.doc.activeElement,hp);assert.equal(hp.value,'123');assert.deepEqual(f.current.waveProgress,progress);f.handle.destroy();
});

test('adding a wave displays it immediately on the first page with a unique ID and instant commit',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'levels');await lastWavePage(f);const before=f.handle.getDraft().config.levels[0].waves.length;await f.findText('＋ 添加一组').click();const waves=f.handle.getDraft().config.levels[0].waves,id=waves.at(-1).id;assert.match(id,/^wave-[A-Za-z0-9_-]+$/);assert.equal(waves.length,before+1);const count=f.doc.body.querySelectorAll('[data-path]').find(e=>/^config\.levels\.0\.waves\.\d+\.count$/.test(e.dataset.path));assert.equal(count.dataset.path,'config.levels.0.waves.'+before+'.count');assert.equal(f.current.config.levels[0].waves.at(-1).id,id);assert.equal(f.commits().length,1);await f.byLabel('第 '+(before+1)+' 组上移').click();assert.equal(f.handle.getDraft().config.levels[0].waves[before-1].id,id);assert.equal(f.handle.getDraft().config.levels[0].waves.filter(w=>w.id===id).length,1);f.handle.destroy();
});

test('wave enable/type/count/delay edits commit immediately and preserve stable source identity',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'levels');const n=f.handle.getDraft().config.levels[0].waves.length-1,initial=clone(f.handle.getDraft().config.levels[0].waves[n]),prefix='config.levels.0.waves.'+n;await edit(f,prefix+'.enabled',false);await edit(f,prefix+'.type',5);await edit(f,prefix+'.count',2);await edit(f,prefix+'.delay',9);assert.deepEqual(f.current.config.levels[0].waves[n],{...initial,type:5,count:2,delay:9,enabled:false});assert.equal(f.commits().length,4);f.handle.destroy();
});

test('an invalid unfinished wave count cannot block a valid independent species selection',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'levels');const n=f.handle.getDraft().config.levels[0].waves.length-1,prefix='config.levels.0.waves.'+n,before=f.handle.getDraft().config.levels[0].waves[n].count;await edit(f,prefix+'.count','');assert.equal(f.commits().length,0);await edit(f,prefix+'.type',5);assert.equal(f.commits().length,1);assert.equal(f.current.config.levels[0].waves[n].type,5);assert.equal(f.current.config.levels[0].waves[n].count,before);assert.equal(f.byPath(prefix+'.count').getAttribute('aria-invalid'),'true');f.handle.destroy();
});

test('completed wave controls become readonly while new pending rows remain editable',async()=>{
  const f=fixture({custom:true,battle:true});const first=f.current.config.levels[0].waves[0].id;f.current.waveProgress.completed=[first];f.current.waveProgress.completedGroups=1;f.current.waveProgress.current=null;f.handle.open();await tab(f,'levels');await lastWavePage(f);const controls=f.doc.body.querySelectorAll('[data-wave-control-id]').filter(e=>e.dataset.waveControlId===first);assert.ok(controls.length>=7);assert.ok(controls.every(e=>e.disabled));const row=f.doc.body.querySelectorAll('[data-wave-row-id]').find(e=>e.dataset.waveRowId===first);assert.match(row.textContent,/已完成.*不补刷/s);const other=f.doc.body.querySelectorAll('[data-wave-control-id]').find(e=>e.dataset.waveControlId!==first&&!e.dataset.path?.endsWith('.type'));assert.ok(other);f.handle.destroy();
});

test('current wave status polling updates counts without replacing focused input',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'zombies');const health=f.byPath('config.zombies.0.health');health.value='111';await health.emit('change');health.focus();f.current.waveProgress.current.spawned=3;f.current.waveProgress.current.consumed=3;f.current.waveProgress.current.remaining=2;f.current.waveProgress.remainingTotal=2;f.tick();assert.equal(f.byPath('config.zombies.0.health'),health);assert.equal(f.doc.activeElement,health);assert.equal(health.value,'111');assert.match(f.doc.body.querySelector('[data-wave-status]').textContent,/已出 3.*剩余 2/);f.handle.destroy();assert.equal(f.intervals.size,0);
});

test('current stage is selected first and genuinely deferred other-stage changes remain explicit',async()=>{
  const f=fixture({custom:true,battle:true});f.current.stage=3;f.current.applyReport={deferred:['$.levels[0].startingCash']};f.handle.open();await tab(f,'levels');assert.equal(f.byLabel('选择关卡 / 出怪').value,'2');assert.match(f.doc.body.querySelector('[data-editing-stage]').textContent,/第 3 关/);const select=f.byLabel('选择关卡 / 出怪');select.value='0';await select.emit('change');assert.match(f.doc.body.querySelector('[data-editing-stage]').textContent,/当前正在第 3 关.*编辑第 1 关/);await edit(f,'config.levels.0.startingCash',199);assert.match(message(f).textContent,/下局/);assert.equal(f.commits().length,1);f.handle.destroy();
});

test('legacy wave synchronization result briefly explains that only this plan needs a new battle',async()=>{
  const f=fixture({custom:true,battle:true});f.current.applyReport={waveReport:{requiresNewBattle:true,reason:'missing identifiers'}};f.handle.open();await edit(f,'rules.automaticSpawning',false);assert.match(message(f).textContent,/旧波次.*新开一局.*其他参数已生效/);f.handle.destroy();
});

test('reinforcement additions preserve strict no-wave-ID shape and stage immediately',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'levels');const buttons=f.doc.body.querySelectorAll('button').filter(b=>b.textContent==='＋ 添加一组');assert.equal(buttons.length,2);await buttons[1].click();const spec=f.handle.getDraft(),call=spec.config.levels[0].reinforcements[0].calls.at(-1);assert.equal(call.id,undefined);assert.deepEqual(call,{type:1,count:1,delay:1,enabled:true});assert.doesNotThrow(()=>GameConfig.validate(spec.config));assert.equal(f.commits().length,1);f.handle.destroy();
});

test('building cap zero applies immediately without original small input limit',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await tab(f,'buildings');const maximum=f.byPath('config.buildings.0.maximum');assert.equal(maximum.min,'0');assert.equal(maximum.max,'100000');assert.match(UI.fieldInfo('maximum')[1],/0.*不设/);await edit(f,'config.buildings.0.maximum',0);assert.equal(f.current.config.buildings[0].maximum,0);assert.match(f.doc.body.querySelector('[data-building-status]').textContent,/实际已建 1.*不设上限/);f.handle.destroy();
});

test('base maximum fields retain the safe integer health range above the old one-hundred-million cap',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const health=f.byPath('config.units.5.health');assert.equal(health.min,'1');assert.equal(health.max,String(GameConfig.HEALTH_SAFETY_LIMIT));assert.equal(health.step,'1');await edit(f,'config.units.5.health',1000000000);assert.equal(f.current.config.units[5].health,1000000000);assert.equal(f.commits().length,1);f.handle.destroy();
});

test('external time controls pause/resume only the editor token, never original game pause',()=>{
  const f=fixture({custom:true,battle:true});f.current.gamePaused=true;f.handle.open();assert.equal(typeof f.handle.resumePlayback,'function');assert.equal(typeof f.handle.pausePlayback,'function');f.handle.resumePlayback();assert.equal(f.current.paused,false);assert.equal(f.current.gamePaused,true);f.handle.pausePlayback();assert.equal(f.current.paused,true);f.handle.pausePlayback();assert.equal(f.calls.filter(c=>c[0]==='pause').length,2);f.handle.resumePlayback();f.handle.close();assert.equal(f.calls.filter(c=>c[0]==='resume').length,2);assert.equal(f.current.gamePaused,true);assert.equal(f.findText('暂停战斗'),undefined);f.handle.destroy();
});

test('running dock does not trap Tab or canvas keys and release events remain available',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();f.handle.resumePlayback();f.canvas.focus();const key=await f.win.emit('keydown',{key:'Tab',target:f.canvas});assert.equal(key.prevented,false);assert.equal(key.stopped,false);assert.equal((await f.win.emit('keydown',{key:'Escape',target:f.canvas})).stopped,false);assert.equal(f.handle.isOpen(),true);assert.equal((await f.win.emit('keyup',{key:'ArrowLeft',target:f.canvas})).stopped,false);const pane=f.doc.body.querySelector('.ztps-overlay');assert.equal((await pane.emit('keydown',{key:'a'})).stopped,true);assert.equal((await pane.emit('keyup',{key:'a'})).stopped,false);assert.equal((await pane.emit('pointerup')).stopped,false);f.byLabel('规则名称').focus();assert.equal((await f.win.emit('keydown',{key:'Escape',target:f.doc.activeElement})).stopped,true);assert.equal(f.handle.isOpen(),false);f.handle.destroy();
});

test('invalid in-progress field never blocks independent time-control resume',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await edit(f,'rules.abilities.harvesterDamagePerTick','');f.handle.resumePlayback();assert.equal(f.current.paused,false);assert.equal(f.commits().length,0);f.handle.destroy();
});
