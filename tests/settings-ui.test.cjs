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
  const urls=[],revoked=[];win.URL={createObjectURL(blob){urls.push(blob);return 'blob:test';},revokeObjectURL(url){revoked.push(url);}};
  const baseline=defaults(),rules=CustomRules.defaults(),calls=[],presets=[],listeners=new Set();let nextId=0;
  const current={mode:custom?'custom':'original',isCustom:custom,isBattle:battle,stage:1,config:clone(baseline),rules:clone(rules),defaults:clone(baseline),defaultRules:clone(rules),presets,selectedPresetId:'',storageAvailable:true,warnings:[],paused:false};
  const notify=()=>{for(const fn of listeners)fn();};
  const controller={
    getState(){return clone(current);},getDraft(){return {config:clone(current.config),rules:clone(current.rules)};},listPresets(){return presets.map(({id,name,updatedAt})=>({id,name,updatedAt}));},
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
    applyDraft(spec,options){GameConfig.validate(spec.config);CustomRules.validate(spec.rules);calls.push(['applyDraft',clone(spec),options]);current.config=clone(spec.config);current.rules=clone(spec.rules);current.isCustom=true;notify();return {applied:['$.zombies[3].health'],deferred:[]};},
    applyUpcomingWaves(config){GameConfig.validate(config);calls.push(['waves',clone(config)]);return {retainedCurrent:true,upcomingGroups:config.levels[0].waves.filter(w=>w.enabled!==false).length};},
    spawnZombie(type,count){calls.push(['spawn',type,count]);return {count,type,positions:[1500]};}
  };
  const handle=UI.mount(controller,{document:doc,window:win,canvas});
  const findText=text=>doc.body.querySelectorAll('button').find(b=>b.textContent===text);
  const byPath=p=>doc.body.querySelectorAll('[data-path]').find(e=>e.dataset.path===p);
  const byLabel=label=>doc.body.querySelectorAll('input,select,button').find(e=>e.getAttribute('aria-label')===label);
  return {doc,win,canvas,controller,current,calls,presets,handle,findText,byPath,byLabel,urls,revoked,notify};
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
test('modal pauses once, restores token and focus, and has accessible dialog semantics',()=>{
  const f=fixture();f.handle.open();f.handle.open();assert.deepEqual(f.calls,[['pause']]);assert.equal(f.current.paused,true);assert.equal(f.doc.body.querySelector('.ztps-modal').getAttribute('aria-modal'),'true');
  assert.equal(f.doc.body.querySelector('.ztps-entry').hidden,true);assert.equal(f.byLabel('打开自定义设置，快捷键 F2').style.top,'270px');assert.equal(f.byLabel('打开自定义设置，快捷键 F2').style.left,'108px');
  f.handle.close();assert.deepEqual(f.calls.at(-1),['resume','pause-token']);assert.equal(f.doc.activeElement,f.canvas);assert.equal(f.handle.isOpen(),false);f.handle.destroy();assert.equal(f.doc.body.querySelector('.ztps-overlay'),null);
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
test('attribute edits remain draft only; save and apply are separate, original promotion explicit',async()=>{
  const f=fixture({battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-zombies').click();const pick=f.byLabel('选择僵尸');pick.value='3';await pick.emit('change');
  const hp=f.byPath('config.zombies.3.health');hp.value='1800';await hp.emit('change');assert.equal(f.handle.getDraft().config.zombies[3].health,1800);assert.equal(f.current.config.zombies[3].health,1000);
  f.byLabel('规则名称').value='胖僵尸规则';await f.findText('保存规则').click();assert.equal(f.presets.length,1);assert.equal(f.calls.some(c=>['apply','applyDraft'].includes(c[0])),false);
  let confirmation='';f.win.confirm=text=>{confirmation=text;return false;};await f.findText('应用本局').click();assert.match(confirmation,/不计入原版成绩/);assert.equal(f.calls.some(c=>['apply','applyDraft'].includes(c[0])),false);
  f.win.confirm=()=>true;f.byLabel('已有单位生命值应用策略').value='new-only';await f.findText('应用本局').click();assert.equal(f.current.config.zombies[3].health,1800);assert.deepEqual(f.calls.find(c=>c[0]==='applyDraft')[2],{healthPolicy:'new-only'});assert.equal(f.calls.filter(c=>c[0]==='applyDraft').length,1);assert.equal(f.calls.filter(c=>['apply','rules'].includes(c[0])).length,0);assert.equal(f.calls.filter(c=>c[0]==='save').length,1);f.handle.destroy();
});
test('wave editor paginates, edits enable/type/count/delay, and reorders safely',async()=>{
  const f=fixture({custom:true,battle:true});f.handle.open();await f.doc.getElementById('ztps-tab-levels').click();
  assert.ok(f.doc.body.querySelectorAll('[data-path]').filter(e=>/\.waves\.\d+\.count$/.test(e.dataset.path)).length<=12);
  const enabled=f.byPath('config.levels.0.waves.0.enabled');enabled.checked=false;await enabled.emit('change');
  const type=f.byPath('config.levels.0.waves.0.type');type.value='4';await type.emit('change');const count=f.byPath('config.levels.0.waves.0.count');count.value='2';await count.emit('change');
  assert.deepEqual(f.handle.getDraft().config.levels[0].waves[0],{type:4,count:2,delay:3,enabled:false});
  await f.byLabel('第 1 组下移').click();assert.equal(f.handle.getDraft().config.levels[0].waves[1].type,4);
  await f.findText('替换本局后续队列…').click();assert.equal(f.calls.filter(c=>c[0]==='waves').length,1);f.handle.destroy();
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
