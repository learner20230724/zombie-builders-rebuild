'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const CustomRules=require('../src/custom-rules.js');
const GameConfig=require('../src/game-config.js');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture({unlocked=false,adapt=true,records=[0,0,0,0]}={}) {
  const manifest=JSON.parse(read('public/assets/manifest.json'));
  const draws=[],writes=[],mouse={x:0,y:0},inputCalls=[];
  const drawing=new Proxy({Width:()=>800,Height:()=>600,
    LoadSurface(name){const image=manifest.images[name];assert.ok(image,name);return {name,Width:()=>image.width,Height:()=>image.height};},
    DrawSurface(surface){draws.push(surface.name);},DrawSurface2(surface){draws.push(surface.name);}
  },{get:(object,key)=>object[key]||(()=>0)});
  const input=new Proxy({MouseX:()=>{inputCalls.push('x');return mouse.x;},MouseY:()=>{inputCalls.push('y');return mouse.y;}},{get:(object,key)=>object[key]||(()=>0)});
  const audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
  class App {GraphicsDevice(){return drawing;}InputDevice(){return input;}AudioDevice(){return audio;}SetUpdateRate(){return 0;}MilliSecs(){return 0;}}
  const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class {},
    ReadInt:(group,key)=>group==='ZTPBestScores'?(records[Number(key)]||0):0,
    WriteInt:(...args)=>writes.push(args),FlushInts:()=>writes.push(['flush']),
    PlayMovie:()=>0,MovieFinished:()=>1,EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0});
  vm.runInContext(read('src/generated-game.js'),target);
  const configuration=GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map(kind=>[kind,JSON.parse(read('config/'+kind+'.json'))])));
  GameConfig.install(target,configuration);
  const rules=CustomRules.defaults();rules.unlockAllStages=unlocked;
  if(adapt)CustomRules.install(target,rules);
  target.bb_Init();target.bb_Main();
  const port=target.ZTPGamePort,device=port.state.bb_mojo_app_device;device.OnCreate();device.OnUpdate();
  const game=port.state.bb_Game;
  assert.equal(game.bbmainState,1);
  draws.length=inputCalls.length=writes.length=0;
  return {target,port,game,mouse,draws,inputCalls,writes,
    render(stage,hit=0){mouse.x=600;mouse.y=16+92*(stage-1)+30;game.bbmousehit=hit;draws.length=inputCalls.length=0;return game.bbRenderMenu();},
    locks(){return draws.filter(name=>name==='lock.png').length;}};
}

test('stage unlock is optional, strict, independent and legacy-compatible',()=>{
  const legacy=CustomRules.defaults();delete legacy.unlockAllStages;
  assert.deepEqual(CustomRules.validate(legacy),CustomRules.defaults());
  assert.equal(CustomRules.defaults().unlockAllStages,false);
  const custom={...legacy,unlockAllStages:true};assert.equal(CustomRules.validate(custom).unlockAllStages,true);
  for(const value of [0,1,'true',null,undefined,{},[]])assert.throws(()=>CustomRules.validate({...legacy,unlockAllStages:value}),/unlockAllStages.*boolean/);
  assert.throws(()=>CustomRules.validate(Object.defineProperty({...legacy},'unlockAllStages',{enumerable:true,get(){throw Error('must not access');}})),/expected a JSON value/);
  const h=fixture(),before=CustomRules.snapshot(h.target);
  assert.throws(()=>CustomRules.update(h.target,{...before,unlockAllStages:'true'}),/unlockAllStages/);
  assert.deepEqual(CustomRules.snapshot(h.target),before);
});

test('default menu preserves original rendering, native selection, input calls and RNG exactly',()=>{
  for(const stage of [1,2,3,4,5,6])for(const hit of [0,1]) {
    const native=fixture({adapt:false}),adapted=fixture();
    const draw=adapted.target.bb_mojo_graphics_DrawImage2,alias=adapted.port.bb_mojo_graphics_DrawImage2;
    native.render(stage,hit);adapted.render(stage,hit);
    const view=h=>plain({state:h.game.bbmainState,item:h.game.bbmenuitem,count:h.game.bbmenucount,difficulty:h.game.bbdifficulty,records:h.game.bbrecords,seed:h.port.state.bb_std_random_Seed});
    assert.deepEqual(view(adapted),view(native));assert.deepEqual(adapted.draws,native.draws);assert.deepEqual(adapted.inputCalls,native.inputCalls);
    assert.equal(adapted.target.bb_mojo_graphics_DrawImage2,draw);assert.equal(adapted.port.bb_mojo_graphics_DrawImage2,alias);
    assert.deepEqual(adapted.writes,[]);
  }
});

test('all four unlocked native stage buttons enter their real stage without changing records or stored scores',()=>{
  for(const stage of [1,2,3,4]) {
    const h=fixture({unlocked:true}),records=h.game.bbrecords,seed=h.port.state.bb_std_random_Seed;
    const draw=h.target.bb_mojo_graphics_DrawImage2,alias=h.port.bb_mojo_graphics_DrawImage2;
    assert.equal(h.render(stage,1),0);assert.equal(h.locks(),0);
    assert.equal(h.game.bbmenuitem,stage);assert.equal(h.game.bbmenucount,1);
    assert.equal(h.target.bb_mojo_graphics_DrawImage2,draw);assert.equal(h.port.bb_mojo_graphics_DrawImage2,alias);
    assert.equal(h.port.state.bb_std_random_Seed,seed,'menu unlock must not consume random draws');
    for(let i=0;i<100;i++)h.game.bbUpdateMenu();
    assert.equal(h.game.bbmainState,2);assert.equal(h.game.bbdifficulty,stage-1);
    assert.equal(h.game.bbrecords,records);assert.deepEqual(plain(records),[0,0,0,0]);assert.deepEqual(h.writes,[]);
  }
});

test('unlock only hides stage locks during one menu render and restores the original gates when disabled',()=>{
  const h=fixture(),draw=h.target.bb_mojo_graphics_DrawImage2,alias=h.port.bb_mojo_graphics_DrawImage2;
  h.render(4,1);assert.equal(h.locks(),3);assert.equal(h.game.bbmenuitem,0);assert.equal(h.game.bbmenucount,0);
  CustomRules.update(h.target,{...CustomRules.snapshot(h.target),unlockAllStages:true});
  h.render(4);assert.equal(h.locks(),0);assert.equal(h.game.bbmenuitem,4);assert.equal(h.game.bbmenucount,0);
  // A lock drawn outside this menu invocation must still use the real draw.
  h.draws.length=0;h.target.bb_mojo_graphics_DrawImage2(h.game.bblock,1,1,0,1,1,0);assert.equal(h.locks(),1);
  CustomRules.update(h.target,CustomRules.defaults());
  h.render(4,1);assert.equal(h.locks(),3);assert.equal(h.game.bbmenuitem,0);assert.equal(h.game.bbmenucount,0);
  assert.equal(h.target.bb_mojo_graphics_DrawImage2,draw);assert.equal(h.port.bb_mojo_graphics_DrawImage2,alias);assert.deepEqual(h.writes,[]);
  const fresh=fixture();fresh.render(4,1);assert.equal(fresh.locks(),3);assert.equal(fresh.game.bbmenucount,0);
});

test('real score text and record object stay untouched in unlocked menus and transition frames',()=>{
  const h=fixture({unlocked:true,records:[12345,0,600,0]}),records=h.game.bbrecords;
  const texts=[],original=h.game.bbDrawMenuButton;
  h.game.bbDrawMenuButton=function(...args){texts.push(args.slice(0,3));return original.apply(this,args);};
  h.render(4,1);
  assert.equal(texts[0][2],'  ( '+h.game.bbTime(12345)+' )');assert.equal(texts[1][2],'');
  assert.equal(texts[2][2],'  ( '+h.game.bbTime(600)+' )');assert.equal(texts[3][2],'');
  assert.equal(h.game.bbrecords,records);assert.deepEqual(plain(records),[12345,0,600,0]);
  h.render(1,1);assert.equal(h.game.bbmenuitem,4);assert.equal(h.game.bbmenucount,1,'transition ignores new hover/click exactly as native');
  assert.deepEqual(h.writes,[]);
});

test('an unlocked render exception cannot leak the temporary draw hook or change records',()=>{
  const h=fixture({unlocked:true}),draw=h.target.bb_mojo_graphics_DrawImage2,alias=h.port.bb_mojo_graphics_DrawImage2;
  const records=h.game.bbrecords,original=h.game.bbDrawMenuButton;
  h.game.bbDrawMenuButton=()=>{throw Error('intentional menu fixture failure');};
  assert.throws(()=>h.render(4),/intentional menu fixture failure/);
  assert.equal(h.target.bb_mojo_graphics_DrawImage2,draw);assert.equal(h.port.bb_mojo_graphics_DrawImage2,alias);
  assert.equal(h.game.bbrecords,records);assert.deepEqual(plain(records),[0,0,0,0]);assert.deepEqual(h.writes,[]);
  h.game.bbDrawMenuButton=original;h.render(4,1);assert.equal(h.game.bbmenuitem,4);assert.equal(h.game.bbmenucount,1);
});
