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
  appendChild(child){this.children.push(child);child.parentNode=this;return child;}
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
  const intervals=new Map();let timerSequence=0;win.setInterval=fn=>{const id=++timerSequence;intervals.set(id,fn);return id;};win.clearInterval=id=>intervals.delete(id);
  const urls=[],revoked=[];win.URL={createObjectURL(blob){urls.push(blob);return 'blob:test';},revokeObjectURL(url){revoked.push(url);}};
  const baseline=defaults(),rules=CustomRules.defaults(),calls=[],presets=[],listeners=new Set();let nextId=0;
  const current={mode:custom?'custom':'original',isCustom:custom,isBattle:battle,stage:1,config:clone(baseline),rules:clone(rules),defaults:clone(baseline),defaultRules:clone(rules),presets,selectedPresetId:'',storageAvailable:true,warnings:[],paused:false,gamePaused:false,waveProgress:{stage:1,current:{id:'stage-1-wave-1',index:0,type:1,total:5,consumed:2,spawned:2,remaining:3,delay:3,enabled:true,source:'wave'},upcomingGroups:[],remainingTotal:3,completedGroups:0,completed:[],pending:[]}};
  const notify=()=>{for(const fn of listeners)fn();};
  const controller={
    getState(){return clone(current);},getDraft(){return {config:clone(current.config),rules:clone(current.rules)};},listPresets(){return presets.map(({id,name,updatedAt})=>({id,name,updatedAt}));},
    getBattleStatus(){return {isBattle:current.isBattle,stage:current.stage,runtimeRunning:!current.paused,editorPaused:current.paused,gamePaused:current.gamePaused,battleRunning:current.isBattle&&!current.paused&&!current.gamePaused,waveProgress:clone(current.waveProgress),buildings:current.config.buildings.map(b=>({id:b.id,built:b.id<2?1:0,queued:0,maximum:b.maximum}))};},
    pauseForEditor(){calls.push(['pause']);current.paused=true;return 'pause-token';},resumeFromEditor(token){calls.push(['resume',token]);current.paused=false;},
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    savePreset(name,spec,id){GameConfig.validate(spec.config);CustomRules.validate(spec.rules);calls.push(['save',name]);let p=presets.find(p=>p.id===id);if(!p){p={id:'p'+(++nextId)};presets.push(p);}Object.assign(p,{name,spec:clone(spec),updatedAt:'2026-10-23'});notify();return {id:p.id,name};},
    loadPreset(id){return clone(presets.find(p=>p.id===id).spec);},deletePreset(id){presets.splice(presets.findIndex(p=>p.id===id),1);calls.push(['delete',id]);notify();},
    exportPreset(spec,name){GameConfig.validate(spec.config);CustomRules.validate(spec.rules);calls.push(['export',name]);return JSON.stringify({schemaVersion:1,name,...spec});},
    importPreset(text){calls.push(['import']);const parsed=JSON.parse(text);GameConfig.validate(parsed.config);CustomRules.validate(parsed.rules);return parsed;},
    startCustomBattle(stage,spec){GameConfig.validate(spec.config);CustomRules.validate(spec.rules);calls.push(['start',stage,clone(spec)]);current.isBattle=current.isCustom=true;current.stage=stage;notify();},
    restoreOriginal(){calls.push(['original']);current.isCustom=current.isBattle=false;notify();},
    applyLive(config,options){GameConfig.validate(config);calls.push(['apply',clone(config),options]);current.config=clone(config);current.isCustom=true;notify();return {applied:['$.zombies[3].health'],deferred:[]};},
    applyRules(rules){CustomRules.validate(rules);calls.push(['rules',clone(rules)]);current.rules=clone(rules);notify();},
    applyDraft(spec,options){GameConfig.validate(spec.config);CustomRules.validate(spec.rules);calls.push(['applyDraft',clone(spec),options]);current.config=clone(spec.config);current.rules=clone(spec.rules);current.isCustom=true;notify();return {applied:['$.zombies[3].health'],deferred:[],...(current.applyReport||{})};},
    applyUpcomingWaves(config){GameConfig.validate(config);calls.push(['waves',clone(config)]);return {retainedCurrent:true,upcomingGroups:config.levels[0].waves.filter(w=>w.enabled!==false).length};},
    spawnZombie(type,count){calls.push(['spawn',type,count]);return {count,type,positions:[1500]};},
    clearFriendlyTroops(){calls.push(['clearFriendly']);return {side:'friendly',count:3,people:2,converted:1,zombies:0};},
    clearEnemyTroops(){calls.push(['clearEnemy']);return {side:'enemy',count:5,people:0,converted:0,zombies:5};}
  };
  const handle=UI.mount(controller,{document:doc,window:win,canvas});
  const findText=text=>doc.body.querySelectorAll('button').find(b=>b.textContent===text);
  const byPath=p=>doc.body.querySelectorAll('[data-path]').find(e=>e.dataset.path===p);
  const byLabel=label=>doc.body.querySelectorAll('input,select,button').find(e=>e.getAttribute('aria-label')===label);
  return {doc,win,canvas,controller,current,calls,presets,handle,findText,byPath,byLabel,urls,revoked,notify,intervals,tick(){for(const fn of intervals.values())fn();}};
}
test('field flattening exposes only real mutable scalar fields, recursively',()=>{
  assert.deepEqual(UI.flattenFields({id:0,key:'a',type:1,name:'A',effect:{moveSpeed:2},waves:[{}],reinforcements:[]}).map(f=>f.path),['name','effect.moveSpeed']);
  const config=defaults();for(const kind of ['units','zombies','buildings','powers','levels'])for(const item of config[kind])for(const f of UI.flattenFields(item))assert.notEqual(UI.fieldInfo(f.key)[0],f.key,'missing readable label: '+f.key);
  for(const f of UI.flattenFields(CustomRules.defaults()))assert.notEqual(UI.fieldInfo(f.key)[0],f.key,'missing rule label: '+f.key);
});
test('safe configuration paths cannot mutate prototypes or create arbitrary keys',()=>{
  const data={units:[{health:50}]};UI.setAt(data,'units.0.health',80);assert.equal(UI.getAt(data,'$.units[0].health'),80);
  assert.throws(()=>UI.setAt(data,'__proto__.polluted',true),/不允许/);assert.throws(()=>UI.setAt(data,'units.0.extra',1),/不存在/);assert.equal({}.polluted,undefined);
});
test('export filenames stay within dedicated JSON download namespace',()=>{
  for(const input of ['胖僵尸挑战','../../evil.exe','CON:<>|\\file','', 'x'.repeat(200)]){
    const filename=UI.presetFilename(input);assert.match(filename,/^zombie-builders-preset-[a-zA-Z0-9\u3400-\u9fff_-]+\.json$/);assert.ok(filename.length<90);
  }
});
test('numeric parsing rejects blanks and nonfinite inputs rather than silently storing zero',()=>{
  assert.equal(UI.numericValue('0'),0);assert.equal(UI.numericValue('1.25'),1.25);assert.throws(()=>UI.numericValue('  '),/留空/);assert.throws(()=>UI.numericValue('Infinity'),/有限/);assert.throws(()=>UI.numericValue('hello'),/有限/);
});
test('nonmodal dock reserves layout, pauses once, then restores token, timer and focus',()=>{
  const f=fixture();f.handle.open();f.handle.open();assert.deepEqual(f.calls,[['pause']]);assert.equal(f.current.paused,true);assert.equal(f.doc.body.querySelector('.ztps-modal').getAttribute('aria-modal'),null);assert.equal(f.doc.body.querySelector('.ztps-modal').getAttribute('role'),'complementary');assert.equal(f.doc.body.classList.contains('ztps-docked'),true);assert.equal(f.intervals.size,1);
  assert.equal(f.doc.body.querySelector('.ztps-entry').hidden,true);assert.equal(f.byLabel('打开自定义设置，快捷键 F2').style.top,'270px');assert.equal(f.byLabel('打开自定义设置，快捷键 F2').style.left,'108px');
  f.handle.close();assert.deepEqual(f.calls.at(-1),['resume','pause-token']);assert.equal(f.doc.activeElement,f.canvas);assert.equal(f.handle.isOpen(),false);assert.equal(f.intervals.size,0);assert.equal(f.doc.body.classList.contains('ztps-docked'),false);f.handle.destroy();assert.equal(f.doc.body.querySelector('.ztps-overlay'),null);
});
test('F2/Escape consumed on close never reach game; unhandled Escape keyup remains available',async()=>{
  const f=fixture();let gameKeys=0;await f.win.emit('keydown',{key:'F2'});assert.equal(f.handle.isOpen(),true);
  f.win.addEventListener('keydown',()=>gameKeys++);await f.win.emit('keydown',{key:'Escape'});assert.equal(f.handle.isOpen(),false);assert.equal(gameKeys,0);
  const consumed=await f.win.emit('keyup',{key:'Escape'});assert.equal(consumed.immediate,true);const ordinary=await f.win.emit('keyup',{key:'Escape'});assert.equal(ordinary.immediate,false);f.handle.destroy();
});
test('spawn controls require custom battle and call exactly one chosen zombie',async()=>{
  const f=fixture();f.handle.open();let fat=f.doc.body.querySelectorAll('[data-spawn]').find(b=>b.dataset.spawn==='3');assert.equal(fat.disabled,true);await fat.click();assert.equal(f.calls.filter(c=>c[0]==='spawn').length,0);
  await f.findText('开始自定义战局').click();fat=f.doc.body.querySelectorAll('[data-spawn]').find(b=>b.dataset.spawn==='3');assert.equal(fat.disabled,false);await fat.click();await fat.click();assert.deepEqual(f.calls.filter(c=>c[0]==='spawn'),[['spawn',3,1],['spawn',3,1]]);f.handle.destroy();
});
test('clear troop buttons need an active custom battle and never run on open or mode changes',async()=>{
  for(const flags of [{},{battle:true},{custom:true}]){
    const f=fixture(flags);f.handle.open();const buttons=f.doc.body.querySelectorAll('[data-clear-troops]');assert.equal(buttons.length,2);assert.ok(buttons.every(b=>b.disabled));for(const b of buttons)await b.click();assert.equal(f.calls.some(c=>c[0].startsWith('clear')),false);
    await f.findText('开始自定义战局').click();assert.ok(buttons.every(b=>!b.disabled));assert.equal(f.calls.some(c=>c[0].startsWith('clear')),false);f.handle.destroy();
  }
});
test('explicit clear clicks call only their side and report counts without closing or changing pause',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const friendly=f.byLabel('一键杀死当前场上的所有己方小兵'),enemy=f.byLabel('一键杀死当前场上的所有敌方小兵');
  assert.equal(friendly.getAttribute('aria-describedby'),'ztps-clear-troops-help');assert.match(f.doc.getElementById('ztps-clear-troops-help').textContent,/己方包含已转化.*不伤害基地.*不取消排队招募.*不改变后续波次/);
  await friendly.click();assert.deepEqual(f.calls.filter(c=>c[0].startsWith('clear')),[['clearFriendly']]);assert.match(f.doc.body.querySelector('.ztps-message').textContent,/已清理当前场上 3 个己方小兵.*基地、招募排队与后续波次未改变.*当前画面暂停.*继续战斗/);assert.equal(f.handle.isOpen(),true);assert.equal(f.current.paused,true);
  await f.findText('继续战斗').click();await enemy.click();assert.deepEqual(f.calls.filter(c=>c[0].startsWith('clear')),[['clearFriendly'],['clearEnemy']]);assert.match(f.doc.body.querySelector('.ztps-message').textContent,/已清理当前场上 5 个敌方小兵/);assert.doesNotMatch(f.doc.body.querySelector('.ztps-message').textContent,/画面暂停/);assert.equal(f.handle.isOpen(),true);assert.equal(f.current.paused,false);assert.equal(f.calls.filter(c=>c[0]==='pause').length,1);f.handle.destroy();
});
test('clear success explains original-game pause rather than promising the editor resume will redraw',async()=>{
  const f=fixture({custom:true,battle:true});f.current.gamePaused=true;f.handle.open();await f.findText('一键杀死敌方小兵').click();assert.match(f.doc.body.querySelector('.ztps-message').textContent,/原游戏画面暂停中，请在原游戏菜单继续后刷新/);assert.equal(f.current.gamePaused,true);assert.equal(f.current.paused,true);f.handle.destroy();
});
test('clearing current troops does not apply or validate the unfinished parameter draft',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();const health=f.byPath('rules.abilities.harvesterDamagePerTick');health.value='';await health.emit('change');
  await f.findText('一键杀死敌方小兵').click();assert.deepEqual(f.calls.filter(c=>c[0].startsWith('clear')),[['clearEnemy']]);assert.equal(f.calls.some(c=>['apply','applyDraft','save','rules'].includes(c[0])),false);assert.match(f.doc.body.querySelector('.ztps-message').textContent,/已清理当前场上 5 个敌方小兵/);f.handle.destroy();
});
test('clear action locks duplicate clicks, reports controller failure and restores enabled controls',async()=>{
  const f=fixture({custom:true,battle:true});let reject;f.controller.clearEnemyTroops=()=>{f.calls.push(['clearEnemy']);return new Promise((_,no)=>{reject=no;});};f.handle.open();const enemy=f.findText('一键杀死敌方小兵'),friendly=f.findText('一键杀死己方小兵');const pending=enemy.click();assert.equal(enemy.disabled,true);assert.equal(friendly.disabled,true);await enemy.click();await friendly.click();assert.deepEqual(f.calls.filter(c=>c[0].startsWith('clear')),[['clearEnemy']]);
  reject(new Error('当前没有可操作的战局'));await pending;assert.equal(enemy.disabled,false);assert.equal(friendly.disabled,false);const message=f.doc.body.querySelector('.ztps-message');assert.equal(message.getAttribute('role'),'alert');assert.match(message.textContent,/当前没有可操作的战局/);assert.doesNotMatch(message.textContent,/已清理/);assert.equal(f.current.paused,true);f.handle.destroy();
});
test('clear controls refresh when a battle ends or the API is unavailable',()=>{
  const f=fixture({custom:true,battle:true});delete f.controller.clearEnemyTroops;f.handle.open();assert.equal(f.findText('一键杀死敌方小兵').disabled,true);assert.equal(f.findText('一键杀死己方小兵').disabled,false);f.current.isBattle=false;f.notify();assert.equal(f.findText('一键杀死己方小兵').disabled,true);assert.equal(f.calls.some(c=>c[0].startsWith('clear')),false);f.handle.destroy();
});
test('attribute edits remain draft only; save and apply are separate, original promotion explicit',async()=>{
  const f=fixture({battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-zombies').click();const pick=f.byLabel('选择僵尸');pick.value='3';await pick.emit('change');
  const hp=f.byPath('config.zombies.3.health');hp.value='1800';await hp.emit('change');assert.equal(f.handle.getDraft().config.zombies[3].health,1800);assert.equal(f.current.config.zombies[3].health,1000);
  f.byLabel('规则名称').value='胖僵尸规则';await f.findText('保存规则').click();assert.equal(f.presets.length,1);assert.equal(f.calls.some(c=>['apply','applyDraft'].includes(c[0])),false);
  let confirmation='';f.win.confirm=text=>{confirmation=text;return false;};await f.findText('应用本局').click();assert.match(confirmation,/不计入原版成绩/);assert.equal(f.calls.some(c=>['apply','applyDraft'].includes(c[0])),false);
  f.win.confirm=()=>true;f.byLabel('已有单位生命值应用策略').value='new-only';await f.findText('应用本局').click();assert.equal(f.current.config.zombies[3].health,1800);assert.deepEqual(f.calls.find(c=>c[0]==='applyDraft')[2],{healthPolicy:'new-only'});assert.equal(f.calls.filter(c=>c[0]==='applyDraft').length,1);assert.equal(f.calls.filter(c=>['apply','rules'].includes(c[0])).length,0);assert.equal(f.calls.filter(c=>c[0]==='save').length,1);f.handle.destroy();
});
test('wave editor paginates, edits enable/type/count/delay, and reorders safely',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-levels').click();
  const initial=f.handle.getDraft().config.levels[0].waves[0];
  assert.ok(f.doc.body.querySelectorAll('[data-path]').filter(e=>/\.waves\.\d+\.count$/.test(e.dataset.path)).length<=12);
  const enabled=f.byPath('config.levels.0.waves.0.enabled');enabled.checked=false;await enabled.emit('change');
  const type=f.byPath('config.levels.0.waves.0.type');type.value='4';await type.emit('change');const count=f.byPath('config.levels.0.waves.0.count');count.value='2';await count.emit('change');
  assert.deepEqual(f.handle.getDraft().config.levels[0].waves[0],{...initial,type:4,count:2,enabled:false});
  await f.byLabel('第 1 组下移').click();assert.equal(f.handle.getDraft().config.levels[0].waves[1].type,4);
  await f.findText('应用本局').click();assert.equal(f.calls.filter(c=>c[0]==='applyDraft').length,1);assert.equal(f.calls.filter(c=>c[0]==='waves').length,0);f.handle.destroy();
});
test('real rule booleans and numeric economy fields edit the draft and apply together',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();
  const auto=f.byPath('rules.automaticSpawning');auto.checked=false;await auto.emit('change');
  const types=f.byPath('rules.zombieTypesEnabled.3');types.checked=false;await types.emit('change');
  const economy=f.byPath('rules.economy.salvagePayout');economy.value='70';await economy.emit('change');
  const damage=f.byPath('rules.abilities.harvesterDamagePerTick');damage.value='80';await damage.emit('change');await f.findText('应用本局').click();
  assert.equal(f.current.rules.automaticSpawning,false);assert.equal(f.current.rules.zombieTypesEnabled[3],false);assert.equal(f.current.rules.economy.salvagePayout,70);assert.equal(f.current.rules.abilities.harvesterDamagePerTick,80);f.handle.destroy();
});
test('invalid config focuses the offending field; undo and restore never apply automatically',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-zombies').click();const hp=f.byPath('config.zombies.0.health');hp.value='-1';await hp.emit('change');await f.findText('应用本局').click();
  assert.equal(f.calls.some(c=>['apply','applyDraft'].includes(c[0])),false);assert.equal(f.doc.activeElement.dataset.path,'config.zombies.0.health');assert.equal(f.doc.activeElement.getAttribute('aria-invalid'),'true');
  await f.findText('撤销修改').click();assert.equal(f.handle.getDraft().config.zombies[0].health,25);await f.findText('恢复原版默认').click();assert.equal(f.calls.some(c=>['apply','applyDraft'].includes(c[0])),false);f.handle.destroy();
});
test('invalid rules cannot partially apply valid attributes or promote an original battle',async()=>{
  const f=fixture({battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-zombies').click();
  const hp=f.byPath('config.zombies.0.health');hp.value='123';await hp.emit('change');await f.doc.getElementById('ztps-tab-sandbox').click();
  const range=f.byPath('rules.abilities.harvesterRange');range.value='0.5';await range.emit('change');await f.findText('应用本局').click();
  assert.equal(f.current.config.zombies[0].health,25);assert.equal(f.current.isCustom,false);assert.equal(f.calls.some(c=>['apply','applyDraft','rules'].includes(c[0])),false);
  assert.equal(f.doc.activeElement.dataset.path,'rules.abilities.harvesterRange');assert.equal(f.doc.activeElement.getAttribute('aria-invalid'),'true');
  const corrected=f.byPath('rules.abilities.harvesterRange');corrected.value='250';await corrected.emit('change');await f.findText('应用本局').click();
  assert.equal(f.current.config.zombies[0].health,123);assert.equal(f.current.rules.abilities.harvesterRange,250);assert.equal(f.calls.filter(c=>c[0]==='applyDraft').length,1);assert.equal(f.calls.some(c=>['apply','rules'].includes(c[0])),false);f.handle.destroy();
});
test('oversize import is rejected before reading and strict controller import is not saved automatically',async()=>{
  const f=fixture();f.handle.open();const input=f.doc.body.querySelectorAll('input').find(e=>e.type==='file');let read=false;
  input.files=[{size:2*1024*1024+1,async text(){read=true;return '{}';}}];await input.emit('change');assert.equal(read,false);assert.equal(f.calls.some(c=>c[0]==='import'),false);assert.match(f.doc.body.querySelector('.ztps-message').textContent,/2 MB/);
  const spec={name:'导入规则',config:defaults(),rules:CustomRules.defaults()};spec.config.zombies[3].health=1777;input.files=[{size:100,async text(){return JSON.stringify(spec);}}];await input.emit('change');assert.equal(f.handle.getDraft().config.zombies[3].health,1777);assert.equal(f.presets.length,0);assert.equal(f.calls.some(c=>['apply','applyDraft'].includes(c[0])),false);f.handle.destroy();
});
test('exports only after controller validation and revokes the Blob URL',async()=>{
  const f=fixture();f.handle.open();await f.findText('导出 JSON').click();assert.equal(f.urls.length,1);assert.deepEqual(f.revoked,['blob:test']);assert.equal(f.calls.some(c=>c[0]==='save'),false);f.handle.destroy();
});
test('untrusted preset and entity labels render as literal text, never HTML',async()=>{
  const f=fixture();const malicious='<img src=x onerror=alert(1)>';f.current.config.zombies[0].name=malicious;f.controller.savePreset(malicious,f.controller.getDraft());f.handle.open();await f.doc.getElementById('ztps-tab-zombies').click();assert.equal(f.doc.body.querySelectorAll('img').length,0);assert.ok(f.doc.body.textContent.includes(malicious));f.handle.destroy();
  const source=fs.readFileSync(path.join(__dirname,'../src/settings-ui.js'),'utf8');assert.doesNotMatch(source,/innerHTML|outerHTML|insertAdjacentHTML|\beval\s*\(|new Function/);
});
test('dock play/pause owns only its token and never forces the original game pause to resume',async()=>{
  const f=fixture({custom:true,battle:true});f.current.gamePaused=true;f.handle.open();
  assert.match(f.doc.body.querySelector('[data-editor-status]').textContent,/原游戏暂停/);await f.findText('继续战斗').click();
  assert.equal(f.current.paused,false);assert.equal(f.current.gamePaused,true);assert.match(f.doc.body.querySelector('[data-editor-status]').textContent,/原游戏暂停/);
  await f.findText('暂停战斗').click();assert.equal(f.current.paused,true);assert.equal(f.calls.filter(c=>c[0]==='pause').length,2);
  await f.findText('继续战斗').click();f.handle.close();assert.equal(f.calls.filter(c=>c[0]==='resume').length,2);assert.equal(f.current.gamePaused,true);f.handle.destroy();
});
test('running dock does not trap Tab or intercept canvas keys and all release events remain available',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await f.findText('继续战斗').click();f.canvas.focus();
  const tab=await f.win.emit('keydown',{key:'Tab',target:f.canvas});assert.equal(tab.prevented,false);assert.equal(tab.stopped,false);
  const escape=await f.win.emit('keydown',{key:'Escape',target:f.canvas});assert.equal(escape.stopped,false);assert.equal(f.handle.isOpen(),true);
  const released=await f.win.emit('keyup',{key:'ArrowLeft',target:f.canvas});assert.equal(released.stopped,false);
  const pane=f.doc.body.querySelector('.ztps-overlay');assert.equal((await pane.emit('keydown',{key:'a'})).stopped,true);assert.equal((await pane.emit('keyup',{key:'a'})).stopped,false);assert.equal((await pane.emit('pointerup')).stopped,false);
  f.byLabel('规则名称').focus();assert.equal((await f.win.emit('keydown',{key:'Escape',target:f.doc.activeElement})).stopped,true);assert.equal(f.handle.isOpen(),false);f.handle.destroy();
});
test('live status polling updates wave counters without replacing focused unsaved inputs',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-zombies').click();const health=f.byPath('config.zombies.0.health');health.value='111';await health.emit('change');health.focus();
  f.current.waveProgress.current.spawned=3;f.current.waveProgress.current.consumed=3;f.current.waveProgress.current.remaining=2;f.current.waveProgress.remainingTotal=2;f.tick();
  assert.equal(f.byPath('config.zombies.0.health'),health);assert.equal(f.doc.activeElement,health);assert.equal(health.value,'111');assert.equal(f.handle.getDraft().config.zombies[0].health,111);assert.match(f.doc.body.querySelector('[data-wave-status]').textContent,/已出 3.*剩余 2/);f.handle.destroy();assert.equal(f.intervals.size,0);
});
test('current stage is selected first; other-stage edits are clearly marked and reported',async()=>{
  const f=fixture({custom:true,battle:true});f.current.stage=3;f.handle.open();await f.doc.getElementById('ztps-tab-levels').click();assert.equal(f.byLabel('选择关卡 / 出怪').value,'2');assert.match(f.doc.body.querySelector('[data-editing-stage]').textContent,/当前第 3 关/);
  const select=f.byLabel('选择关卡 / 出怪');select.value='0';await select.emit('change');assert.match(f.doc.body.querySelector('[data-editing-stage]').textContent,/当前正在第 3 关.*编辑第 1 关/);await f.findText('应用本局').click();assert.match(f.doc.body.querySelector('.ztps-message').textContent,/第 1 关不是当前第 3 关/);f.handle.destroy();
});
test('building maximum shows zero-as-unlimited and live built counts without original cap input bounds',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-buildings').click();const maximum=f.byPath('config.buildings.0.maximum');assert.equal(maximum.min,'0');assert.equal(maximum.max,'100000');assert.match(UI.fieldInfo('maximum')[1],/0.*不设/);assert.equal(UI.fieldInfo('maximum')[2],'立即');
  maximum.value='0';await maximum.emit('change');await f.findText('应用本局').click();assert.equal(f.current.config.buildings[0].maximum,0);assert.match(f.doc.body.querySelector('[data-building-status]').textContent,/实际已建 1.*不设上限/);f.handle.destroy();
});
test('health fields expose the runtime safety range and allow base HP above the old one-hundred-million cap',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-units').click();const pick=f.byLabel('选择兵种');pick.value='5';await pick.emit('change');const health=f.byPath('config.units.5.health');
  assert.equal(health.min,'1');assert.equal(health.max,String(GameConfig.HEALTH_SAFETY_LIMIT));assert.equal(health.step,'1');assert.equal(health.getAttribute('aria-describedby'),'ztps-health-help');assert.match(f.doc.getElementById('ztps-health-help').textContent,/1–2,147,483,647.*运行时整数安全范围.*0 代表死亡，不代表无敌/);
  health.value='1000000000';await health.emit('change');await f.findText('应用本局').click();assert.equal(f.current.config.units[5].health,1000000000);assert.equal(f.calls.filter(c=>c[0]==='applyDraft').length,1);f.handle.destroy();
});
test('new wave rows get unique stable IDs and moving them never creates duplicate IDs',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-levels').click();const before=f.handle.getDraft().config.levels[0].waves.length;
  await f.findText('＋ 添加一组').click();let waves=f.handle.getDraft().config.levels[0].waves;const id=waves.at(-1).id;assert.match(id,/^wave-[A-Za-z0-9_-]+$/);assert.equal(waves.length,before+1);
  await f.byLabel('第 '+(before+1)+' 组上移').click();waves=f.handle.getDraft().config.levels[0].waves;assert.equal(waves[before-1].id,id);assert.equal(waves.filter(w=>w.id===id).length,1);f.handle.destroy();
});
test('legacy wave synchronization warning explicitly asks for a new custom battle',async()=>{
  const f=fixture({custom:true,battle:true});f.current.applyReport={waveReport:{requiresNewBattle:true,reason:'missing identifiers'}};f.handle.open();await f.findText('应用本局').click();assert.match(f.doc.body.querySelector('.ztps-message').textContent,/旧规则缺少可靠波次 ID.*开始新自定义战局/);f.handle.destroy();
});
test('new reinforcement calls retain their strict no-wave-ID shape',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-levels').click();const buttons=f.doc.body.querySelectorAll('button').filter(b=>b.textContent==='＋ 添加一组');assert.equal(buttons.length,2);await buttons[1].click();
  const spec=f.handle.getDraft(),call=spec.config.levels[0].reinforcements[0].calls.at(-1);assert.equal(call.id,undefined);assert.deepEqual(call,{type:1,count:1,delay:1,enabled:true});assert.doesNotThrow(()=>GameConfig.validate(spec.config));f.handle.destroy();
});
test('invalid unfinished field never blocks independent play/pause controls',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-zombies').click();const health=f.byPath('config.zombies.0.health');health.value='';await health.emit('change');await f.findText('继续战斗').click();assert.equal(f.current.paused,false);f.handle.destroy();
});
test('saved and applied status remain independent until explicit application',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-zombies').click();const hp=f.byPath('config.zombies.0.health');hp.value='55';await hp.emit('change');
  assert.match(f.doc.body.querySelector('.ztps-dirty').textContent,/未保存.*尚未应用本局/);f.byLabel('规则名称').value='保存不等于应用';await f.findText('保存规则').click();assert.match(f.doc.body.querySelector('.ztps-dirty').textContent,/已保存.*尚未应用本局/);
  await f.findText('应用本局').click();assert.match(f.doc.body.querySelector('.ztps-dirty').textContent,/已保存.*当前规则一致/);f.handle.destroy();
});
test('wave rows show ID-based current/completed progress and completed edits explain no replay',async()=>{
  const f=fixture({custom:true,battle:true});const first=f.current.config.levels[0].waves[0].id;f.current.waveProgress.current.id=first;f.handle.open();await f.doc.getElementById('ztps-tab-levels').click();
  const findRow=id=>f.doc.body.querySelectorAll('[data-wave-row-id]').find(el=>el.dataset.waveRowId===id);assert.match(findRow(first).textContent,/当前.*已调度 2/);
  f.current.waveProgress.completed=[first];f.current.waveProgress.completedGroups=1;f.current.waveProgress.current=null;f.tick();assert.match(findRow(first).textContent,/已完成.*不补刷/);
  const count=f.byPath('config.levels.0.waves.0.count');count.value='8';await count.emit('change');await f.findText('应用本局').click();assert.match(f.doc.body.querySelector('.ztps-message').textContent,/第 1 组已完成，不补刷.*新增一组/);assert.match(findRow(first).textContent,/需重放请新增一组/);f.handle.destroy();
});
