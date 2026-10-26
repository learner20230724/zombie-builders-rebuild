'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const EffectLists=require('../src/effect-lists.js');
const source=fs.readFileSync(path.join(__dirname,'../src/generated-game.js'),'utf8');
function fixture(install=true){
  const target=vm.createContext({});
  const listSource=source.slice(source.indexOf('class bb_std_list_List {'),source.indexOf('class bb_Blood {'));
  const iteratorSource=source.slice(source.indexOf('class bb_std_list_Enumerator {'),source.indexOf('class bb_Bottle extends'));
  // Execute the actual recovered list/node/iterator, not a substitute container.
  vm.runInContext('const __as3_int=v=>v|0;\n'+listSource+'\n'+iteratorSource+
    '\nObject.assign(globalThis,{bb_std_list_List,bb_std_list_Node,bb_std_list_Enumerator});',target);
  let game=null;
  const port={bb_std_list_List:target.bb_std_list_List,bb_std_list_Node:target.bb_std_list_Node,get state(){return {bb_Game:game,bb_std_random_Seed:123};}};
  target.ZTPGamePort=port;if(install)EffectLists.install(target);
  game=Object.fromEntries([...EffectLists.EFFECT_KEYS,'bbpeople','bbpombies','bbzombies'].map(key=>[key,new target.bb_std_list_List().bbList_new()]));
  return {target,port,game,diagnostics:()=>EffectLists.diagnostics(target)};
}
function items(list){const result=[],it=list.bbObjectEnumerator();while(it.bbHasNext())result.push(it.bbNextObject());return result;}
function labels(list){return items(list).map(value=>value?.label??value);}
function checkLinks(list){let previous=list.bb_head,node=list.bb_head.bb_succ,count=0;while(node!==list.bb_head){assert.equal(node.bb_pred,previous);assert.equal(node.bb_succ.bb_pred,node);previous=node;node=node.bb_succ;assert.ok(++count<10000);}assert.equal(list.bb_head.bb_pred,previous);}

test('effect reverse lookup is pre-Main, idempotent and restricted to effect lists',()=>{
  const h=fixture(),method=h.port.bb_std_list_List.prototype.bbRemove;
  assert.equal(EffectLists.install(h.target),h.target);assert.equal(h.port.bb_std_list_List.prototype.bbRemove,method);
  const actor={label:'actor'},effect={label:'effect'};
  h.game.bbpeople.bbAddLast(actor);h.game.bbpeople.bbRemove(actor);
  assert.equal(h.diagnostics().builds,0);
  h.game.bbbodyparts.bbAddLast(effect);h.game.bbbodyparts.bbRemove(effect);
  assert.equal(h.diagnostics().fastRemovals,1);assert.deepEqual(items(h.game.bbbodyparts),[]);
  assert.equal(h.port.state.bb_std_random_Seed,123,'the index never consumes game RNG');
  const late=fixture(false);assert.throws(()=>EffectLists.install(late.target),/before bb_Main/);
});

test('a whole expiration wave builds once rather than rescanning for every effect',()=>{
  const h=fixture(),list=h.game.bbbodyparts,values=Array.from({length:400},(_,label)=>({label}));
  for(const value of values)list.bbAddLast(value);
  const it=list.bbObjectEnumerator(),visited=[];
  while(it.bbHasNext()){const value=it.bbNextObject();visited.push(value);list.bbRemove(value);}
  assert.deepEqual(visited,values);assert.deepEqual(items(list),[]);checkLinks(list);
  const stats=h.diagnostics();assert.equal(stats.builds,1);assert.equal(stats.indexedNodes,400);assert.equal(stats.fastRemovals,400);assert.equal(stats.removedNodes,400);assert.equal(stats.fallbackRemovals,0);
});

test('duplicate object removal and AddFirst retain physical list order',()=>{
  const h=fixture(),list=h.game.bbbodyparts,a={label:'a'},b={label:'b'},c={label:'c'};
  list.bbAddLast(a);list.bbAddLast(b);list.bbAddLast(a);list.bbAddLast(c);
  list.bbRemove(c); // Lazy initial build.
  list.bbAddFirst(a);list.bbAddFirst(b);list.bbAddLast(a);
  assert.deepEqual(labels(list),['b','a','a','b','a','a']);
  list.bbRemove(a);assert.deepEqual(labels(list),['b','b']);checkLinks(list);
  list.bbRemove(b);assert.deepEqual(items(list),[]);assert.equal(h.diagnostics().builds,1);
});

test('removing current and future iterator nodes preserves recovered cursor semantics',()=>{
  for(const removeFuture of [false,true]){
    const twins=[fixture(false),fixture(true)],traces=[];
    for(const h of twins){
      const list=h.game.bbbodyparts,a={label:'a'},b={label:'b'},c={label:'c'};
      list.bbAddLast(a);list.bbAddLast(b);list.bbAddLast(c);
      const it=list.bbObjectEnumerator(),trace=[];
      trace.push(it.bbNextObject().label);list.bbRemove(removeFuture?b:a);
      while(it.bbHasNext())trace.push(it.bbNextObject().label);
      traces.push({trace,after:labels(list)});checkLinks(list);
    }
    assert.deepEqual(traces[1],traces[0]);
  }
});

test('direct node removal and list RemoveFirst/Last keep index ownership synchronized',()=>{
  const h=fixture(),list=h.game.bbbodyparts,a={label:'a'},b={label:'b'},c={label:'c'},d={label:'d'};
  const nodeA=list.bbAddLast(a);list.bbAddLast(b);const nodeC=list.bbAddLast(c);list.bbAddLast(d);
  list.bbRemove(b);nodeC.bbRemove();
  assert.equal(list.bbRemoveFirst(),a);assert.equal(list.bbRemoveLast(),d);
  assert.deepEqual(items(list),[]);checkLinks(list);
  list.bbAddFirst(a);list.bbAddLast(c);list.bbRemove(c);list.bbRemove(a);
  assert.deepEqual(items(list),[]);assert.equal(h.diagnostics().builds,1);
  assert.ok(nodeA.bb_succ,'removed nodes retain original iterator links');
});

test('clear, direct head replacement and whole-list replacement rebuild safely',()=>{
  const h=fixture(),a={label:'a'},b={label:'b'};
  let list=h.game.bbbodyparts;
  list.bbAddLast(a);list.bbAddLast(b);list.bbRemove(a);
  list.bbClear();list.bbAddLast(a);list.bbRemove(a);assert.deepEqual(items(list),[]);
  list.bb_head=new h.port.bb_std_list_Node().bbNode_new();list.bbAddLast(a);list.bbRemove(a);assert.deepEqual(items(list),[]);
  list=h.game.bbbodyparts=new h.port.bb_std_list_List().bbList_new();list.bbAddLast(b);list.bbRemove(b);
  assert.deepEqual(items(list),[]);assert.equal(h.diagnostics().builds,4);checkLinks(list);
});

test('direct node constructor at ends is indexed and middle insertion rebuilds duplicate order',()=>{
  const h=fixture(),list=h.game.bbbodyparts,a={label:'a'},b={label:'b'},c={label:'c'},spare={label:'spare'};
  list.bbAddLast(a);list.bbAddLast(b);list.bbAddLast(spare);list.bbRemove(spare);
  new h.port.bb_std_list_Node().bbNode_new2(list.bb_head,list.bb_head.bb_pred,c);
  new h.port.bb_std_list_Node().bbNode_new2(list.bb_head.bb_succ,list.bb_head,a);
  const next=list.bb_head.bb_succ.bb_succ;
  new h.port.bb_std_list_Node().bbNode_new2(next,next.bb_pred,a);
  list.bbRemove(a);assert.deepEqual(labels(list),['b','c']);checkLinks(list);assert.equal(h.diagnostics().builds,2);
});

test('primitive payloads, custom equality and custom node removal use the recovered leaf',()=>{
  {
    const h=fixture(),list=h.game.bbbodyparts,a={label:'a'};list.bbAddLast(a);list.bbAddLast(1);list.bbRemove(a);assert.deepEqual(items(list),[1]);assert.equal(h.diagnostics().fastRemovals,0);
  }
  {
    const h=fixture(),list=h.game.bbbodyparts,a={label:'a'},b={label:'a'};list.bbAddLast(a);list.bbAddLast(b);list.bbEquals=(left,right)=>left.label===right.label?1:0;list.bbRemove(a);assert.deepEqual(items(list),[]);assert.equal(h.diagnostics().fastRemovals,0);
  }
  {
    const h=fixture(),list=h.game.bbbodyparts,a={label:'a'};const node=list.bbAddLast(a),original=node.bbRemove;let calls=0;node.bbRemove=function(){calls++;return original.apply(this,arguments);};list.bbRemove(a);assert.equal(calls,1);assert.deepEqual(items(list),[]);assert.equal(h.diagnostics().fastRemovals,0);
  }
});

test('raw payload writes to missing and existing keys invalidate the reverse index',()=>{
  const h=fixture(),list=h.game.bbbodyparts,a={label:'a'},b={label:'b'},c={label:'c'};
  list.bbAddLast(a);const nodeB=list.bbAddLast(b);list.bbRemove(a);
  nodeB.bb_data=c;list.bbRemove(c);assert.deepEqual(items(list),[]);assert.equal(h.diagnostics().builds,2);
  list.bbAddLast(a);const changed=list.bbAddLast(b);list.bbAddLast(c);list.bbRemove(c);
  changed.bb_data=a;assert.deepEqual(labels(list),['a','a']);list.bbRemove(a);assert.deepEqual(items(list),[]);
  assert.equal(h.diagnostics().removedNodes,5);checkLinks(list);
});

test('unknown payload accessors and non-configurable fields fall back without active partial indices',()=>{
  for(const descriptor of [
    {get(){return this._payload;},set(value){this._payload=value;},configurable:true,enumerable:true},
    {value:null,writable:true,configurable:false,enumerable:true}
  ]){
    const h=fixture(),list=h.game.bbbodyparts,a={label:'a'},b={label:'b'},c={label:'c'};
    list.bbAddLast(a);const unknown=list.bbAddLast(b);unknown._payload=b;
    Object.defineProperty(unknown,'bb_data','value'in descriptor?{...descriptor,value:b}:descriptor);
    list.bbRemove(a);assert.deepEqual(labels(list),['b']);assert.equal(h.diagnostics().fastRemovals,0);
    list.bbAddLast(c);list.bbRemove(c);list.bbRemove(b);assert.deepEqual(items(list),[]);checkLinks(list);
    assert.equal(h.diagnostics().fastRemovals,0,'failed index is never retained by later constructor calls');
  }
});

test('each supported live effect list gets its own lookup; actor and detached lists do not',()=>{
  const h=fixture();for(const key of EffectLists.EFFECT_KEYS){const value={label:key};h.game[key].bbAddLast(value);h.game[key].bbRemove(value);assert.deepEqual(items(h.game[key]),[]);}
  for(const list of [h.game.bbpeople,h.game.bbpombies,h.game.bbzombies,new h.port.bb_std_list_List().bbList_new()]){const value={label:'outside'};list.bbAddLast(value);list.bbRemove(value);assert.deepEqual(items(list),[]);}
  assert.equal(h.diagnostics().builds,EffectLists.EFFECT_KEYS.length);
});

test('real effect update/render/recycling retains exact game state, RNG and draw order',()=>{
  const GameConfig=require('../src/game-config.js'),root=path.resolve(__dirname,'..');
  const json=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
  const manifest=json('public/assets/manifest.json');
  function engine(install){
    const config=GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map(kind=>[kind,json('config/'+kind+'.json')])));
    for(const level of config.levels)level.waves=[];
    const draws=[];
    const graphics=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){const record=manifest.images[name];assert.ok(record,name);return {name,Width:()=>record.width,Height:()=>record.height};}},
      {get:(value,key)=>value[key]||((...args)=>{draws.push([key,...args.map(arg=>objectLabel(arg))]);return 0;})});
    const input=new Proxy({},{get:()=>()=>0}),audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
    class App{GraphicsDevice(){return graphics;}InputDevice(){return input;}AudioDevice(){return audio;}SetUpdateRate(){return 0;}MilliSecs(){return 0;}}
    const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class{},ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,PlayMovie:()=>0,MovieFinished:()=>1,EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0});
    vm.runInContext(source,target);GameConfig.install(target,config);if(install)EffectLists.install(target);
    target.bb_Init();target.bb_Main();const port=target.ZTPGamePort,device=port.state.bb_mojo_app_device;
    device.OnCreate();device.OnUpdate();const game=port.state.bb_Game;game.bbPlayGame(1);port.setRandomSeed(0x1234567);
    for(let index=0;index<60;index++)game.bbbodyparts.bbAddLast(new port.bb_BodyPart().bbBodyPart_new(index%8,game.bbbitsheet,index%4+1,100+index,-1,index%3-1,2));
    for(let index=0;index<8;index++)game.bbAddDeath(game.bbshoveldeathsheet,index,200+index,0);
    for(let index=0;index<4;index++)game.bbAddExplosion(index,350+index,0,1);
    game.bbDamageBase(60,20);draws.length=0;
    return {target,port,game,draws};
  }
  function objectLabel(value){return value&&typeof value==='object'?value.name??null:value;}
  function snapshot(h){const g=h.game;return {seed:h.port.state.bb_std_random_Seed,tick:g.bbgameticks,time:g.bbgametime,main:g.bbmainState,
    economy:[g.bbztp.bbcash,g.bbztp.bbxp,g.bbztp.bbforce],bases:[g.bbpeoplebase.bbhealth,g.bbzombiebase.bbhealth],
    lists:EffectLists.EFFECT_KEYS.map(key=>items(g[key]).map(body=>[body.bbxpos,body.bbypos,body.bblayer,body.bbvelx,body.bbvely,body.bbbounce,body.bbrecycle,body.bbframe,body.bbskin?.bbframe]))};}
  const twins=[engine(false),engine(true)];
  for(let tick=0;tick<320;tick++){
    for(const h of twins){h.game.bbGameTick(0);if(tick%20===0)h.game.bbDrawPark();}
    assert.deepEqual(snapshot(twins[1]),snapshot(twins[0]),'effect state/RNG at tick '+tick);
  }
  assert.deepEqual(twins[1].draws,twins[0].draws,'actual recovered draw calls keep list and layer order');
  assert.equal(items(twins[1].game.bbbodyparts).length,0);assert.ok(EffectLists.diagnostics(twins[1].target).fastRemovals>=60);
  for(const h of twins){
    for(let hit=0;hit<20;hit++){h.game.bbDamageBase(1024,20);h.game.bbDamageBase(1024,1480);}
    assert.equal(items(h.game.bbbodyparts).length,512,'both independent base ledgers are saturated');
    for(const body of items(h.game.bbbodyparts))body.bbrecycle=1;
    h.game.bbGameTick(0);assert.equal(items(h.game.bbbodyparts).length,0);
    h.game.bbDamageBase(1024,20);h.game.bbDamageBase(1024,1480);
    assert.ok(items(h.game.bbbodyparts).length>200,'node removal returned both base-debris budgets');
    h.game.bbDrawPark();
  }
  assert.deepEqual(snapshot(twins[1]),snapshot(twins[0]),'the base-budget node wrapper and fast recycling compose');
  assert.deepEqual(twins[1].draws,twins[0].draws,'post-recycling debris drawing/RNG is still exact');
});
