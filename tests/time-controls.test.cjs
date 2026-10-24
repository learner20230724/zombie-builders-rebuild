'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Time = require('../src/time-controls.js');

class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, fn) { const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list); }
  removeEventListener(type, fn) { this.listeners.set(type, (this.listeners.get(type) || []).filter(x => x !== fn)); }
  emit(type, patch = {}) {
    const event = {type, target:this, stopped:false, prevented:false, stopPropagation(){this.stopped=true;}, preventDefault(){this.prevented=true;}, ...patch};
    for (const fn of this.listeners.get(type) || []) fn(event);
    return event;
  }
}
class Element extends Target {
  constructor(tag, doc) { super(); this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.style={};this.attrs=new Map();this.hidden=false;this.value='';this._text=''; }
  set textContent(value) { this._text=String(value);this.children=[]; }
  get textContent() { return this._text+this.children.map(x=>x.textContent).join(''); }
  appendChild(child) { this.children.push(child);child.parentNode=this;return child; }
  remove() { if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null; }
  setAttribute(key,value) { this.attrs.set(key,String(value)); }
  getAttribute(key) { return this.attrs.get(key) ?? null; }
  focus() { this.ownerDocument.activeElement=this; }
  get visible() { return !this.hidden && (!this.parentNode || this.parentNode.visible); }
  find(attr,value) { for(const child of this.children){if(child.attrs.has(attr)&&(value===undefined||child.getAttribute(attr)===value))return child;const nested=child.find(attr,value);if(nested)return nested;}return null; }
}
function fixture() {
  const doc={createElement(tag){return new Element(tag,this);},getElementById(id){return id==='ztps-time-host'?host:null;},activeElement:null};
  doc.body=new Element('body',doc);
  const shell=new Element('aside',doc);shell.hidden=true;doc.body.appendChild(shell);
  const host=new Element('div',doc);host.id='ztps-time-host';shell.appendChild(host);
  const win=new Target(), timers=new Map(), subscriptions=new Set(), tokens=new Set(), calls=[];
  win.innerWidth=1000;win.innerHeight=600;win.document=doc;let sequence=0;
  win.setInterval=fn=>{const id=++sequence;timers.set(id,fn);return id;};win.clearInterval=id=>timers.delete(id);
  const clock={running:true,timeScale:1}, state={paused:false,gamePaused:false};
  function notify(){state.paused=tokens.size>0;clock.running=tokens.size===0;for(const fn of subscriptions)fn();}
  const runtime={getStatus(){return {...clock};},setTimeScale(value){calls.push(['scale',value]);clock.timeScale=value;return value;}};
  const controller={
    getState(){return {...state};},getBattleStatus(){return {editorPaused:state.paused,gamePaused:state.gamePaused,runtimeRunning:clock.running};},
    pauseForEditor(){const token=Object.freeze({id:++sequence});tokens.add(token);calls.push(['pause',token]);notify();return token;},
    resumeFromEditor(token){calls.push(['resume',token]);const result=tokens.delete(token);notify();return result;},
    subscribe(fn){subscriptions.add(fn);return()=>subscriptions.delete(fn);}
  };
  let editorToken;
  win.SettingsUI={resumePlayback(){if(editorToken){const token=editorToken;editorToken=undefined;controller.resumeFromEditor(token);}}};
  const handle=Time.mount(controller,{window:win,document:doc,runtime});
  const find=(attr,value)=>handle.element.find(attr,value), number=find('data-time-number'), range=find('data-time-range'), pause=find('data-time-pause');
  return {doc,shell,host,win,clock,state,calls,tokens,timers,subscriptions,controller,runtime,handle,find,number,range,pause,
    openEditor(){editorToken=controller.pauseForEditor();},tick(){for(const fn of timers.values())fn();}};
}

test('clock numeric normalization clamps real numbers, rounds tenths, and rejects incomplete text',()=>{
  for(const [raw,value]of [['0',0],['.5',.5],['1.54',1.5],['1.55',1.6],['-4',0],['21',20],['1e999',20],['-1e999',0]])assert.equal(Time.normalizeScale(raw),value);
  for(const raw of ['', ' ', '-', '.', 'NaN','Infinity','2×','1e'])assert.equal(Time.normalizeScale(raw),null);
  assert.deepEqual(Time.PRESETS,[0,.5,1,2,4,8,12,20]);assert.equal(Time.MAX_SCALE,20);
});

test('clock stays inside the F2 dock, hidden with its shell and expanded when opened',()=>{
  const f=fixture(), toggle=f.find('data-time-toggle');
  assert.equal(f.handle.element.parentNode,f.host);assert.equal(f.handle.element.getAttribute('aria-label'),'时间控制');
  assert.equal(f.handle.element.visible,false);f.shell.hidden=false;assert.equal(f.handle.element.visible,true);
  assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.equal(f.handle.element.children[1].hidden,false);
  toggle.emit('click');assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(f.handle.element.children[1].hidden,true);
  f.shell.hidden=true;assert.equal(f.pause.visible,false);assert.equal(f.handle.element.style.left,undefined);assert.equal(f.handle.element.style.top,undefined);
  assert.equal(f.range.min,'0');assert.equal(f.range.max,'20');assert.equal(f.range.step,'0.1');assert.equal(f.number.inputMode,'decimal');
  assert.equal(f.pause.textContent,'暂停战斗');f.handle.destroy();
});

test('resume releases only default settings pause and own explicit pause; other owners and original game pause remain',()=>{
  const f=fixture();f.openEditor();assert.equal(f.pause.textContent,'继续战斗');
  f.pause.emit('click');assert.equal(f.tokens.size,0);assert.equal(f.clock.running,true);
  f.pause.emit('click');assert.equal(f.tokens.size,1);const own=[...f.tokens][0];
  const other=f.controller.pauseForEditor();f.state.gamePaused=true;f.tick();
  f.pause.emit('click');assert.equal(f.tokens.has(own),false);assert.equal(f.tokens.has(other),true);assert.equal(f.state.gamePaused,true);
  assert.match(f.find('data-time-status').textContent,/原游戏暂停/);f.handle.destroy();assert.equal(f.tokens.has(other),true);
});

test('pause at zero resumes previous positive speed without forcing game state',()=>{
  const f=fixture();f.find('data-time-speed','4').emit('click');f.find('data-time-speed','0').emit('click');
  assert.equal(f.clock.timeScale,0);assert.equal(f.pause.textContent,'继续战斗');f.pause.emit('click');
  assert.equal(f.clock.timeScale,4);assert.equal(f.tokens.size,0);assert.equal(f.pause.textContent,'暂停战斗');f.handle.destroy();
});

test('numeric speed commits on Enter or blur, not unfinished input; polling preserves focused draft',()=>{
  const f=fixture();f.number.focus();f.number.value='0.';f.number.emit('input');assert.equal(f.clock.timeScale,1);f.tick();assert.equal(f.number.value,'0.');
  f.number.value='.5';const enter=f.number.emit('keydown',{key:'Enter'});assert.equal(enter.prevented,true);assert.equal(f.clock.timeScale,.5);
  f.number.value='999';f.number.emit('blur');assert.equal(f.clock.timeScale,20);assert.equal(f.number.value,'20');
  f.number.value='garbage';f.number.emit('change');assert.equal(f.clock.timeScale,20);assert.equal(f.number.value,'20');assert.equal(f.find('data-time-error').hidden,false);
  f.number.value='1.5';f.number.emit('change');f.number.emit('blur');assert.equal(f.clock.timeScale,1.5);
  assert.equal(f.calls.filter(x=>x[0]==='scale'&&x[1]===1.5).length,1,'change plus blur must not reset the clock twice');f.handle.destroy();
});

test('slider and presets apply immediately without committing unrelated settings or stealing focus',()=>{
  const f=fixture();f.range.value='2.1';f.range.emit('input');assert.equal(f.clock.timeScale,2.1);assert.equal(f.number.value,'2.1');
  f.find('data-time-speed','.5')?.emit('click');f.find('data-time-speed','0.5').emit('click');assert.equal(f.clock.timeScale,.5);
  assert.equal(f.find('data-time-speed','0.5').getAttribute('aria-pressed'),'true');
  assert.equal(f.calls.some(x=>x[0]==='applyDraft'),false);f.handle.destroy();
});

test('input keydowns stay local while release events can clear held game keys and pointers',()=>{
  const f=fixture();for(const type of ['keydown','pointerdown','click','wheel'])assert.equal(f.handle.element.emit(type).stopped,true);
  for(const type of ['keyup','pointerup','pointercancel'])assert.equal(f.handle.element.emit(type).stopped,false);
  f.handle.destroy();
});

test('destroy is idempotent, removes timers/listeners, and releases only its own pause',()=>{
  const f=fixture();f.handle.pause();const other=f.controller.pauseForEditor();
  assert.equal(f.timers.size,1);assert.equal(f.subscriptions.size,1);f.handle.destroy();f.handle.destroy();
  assert.equal(f.tokens.size,1);assert.equal(f.tokens.has(other),true);assert.equal(f.timers.size,0);assert.equal(f.subscriptions.size,0);
  assert.equal(f.handle.element.parentNode,null);assert.equal((f.win.listeners.get('resize')||[]).length,0);
  f.pause.emit('click');assert.equal(f.tokens.size,1);
});

test('page loads time styles and code after settings but before game readiness',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/href="\/src\/time-controls.css"/);
  assert.ok(html.indexOf('/src/settings-ui.js')<html.indexOf('/src/time-controls.js'));
  assert.ok(html.indexOf('/src/time-controls.js')<html.indexOf('/src/boot.js'));
  const css=fs.readFileSync(path.join(__dirname,'../src/time-controls.css'),'utf8');assert.match(css,/\.ztp-time-body\[hidden\]/);
  assert.match(css,/position:static/);assert.doesNotMatch(css,/position\s*:\s*(?:fixed|absolute)|z-index/);
  const js=fs.readFileSync(path.join(__dirname,'../src/time-controls.js'),'utf8');assert.doesNotMatch(js,/getBoundingClientRect|ResizeObserver|doc\.body\)\.appendChild|style\.(?:left|top)/);
});
