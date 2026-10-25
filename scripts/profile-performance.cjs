'use strict';

// Reproducible profiling only: synthetic armies, real recovered update/render.
// Never reads the user's Electron profile or changes product files.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {performance}=require('node:perf_hooks');
const inspector=require('node:inspector');
const ROOT=path.resolve(__dirname,'..');
const MODULES=['game-config','custom-rules','factions','spawn-queue','customization'];
const SCENES=['native-walking','mixed-native','cross-humans','dense-cross'];
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');
const json=name=>JSON.parse(read(name));
const plain=value=>JSON.parse(JSON.stringify(value));
function frozenSources(ref){
  const names=[...MODULES.map(name=>'src/'+name+'.js'),'src/runtime.js','src/settings-ui.js','src/time-controls.js','src/boot.js','index.html'];
  if(ref==='current'&&fs.existsSync(path.join(ROOT,'src/death-effects.js')))names.push('src/death-effects.js');
  return Object.fromEntries(names.map(name=>[name,
    ref==='current'?read(name):execFileSync('git',['-c','safe.directory='+ROOT,'show',ref+':'+name],{cwd:ROOT,encoding:'utf8',maxBuffer:10*1024*1024})]));
}
function loadModules(sources,out){
  const folder=path.join(out,'frozen-src');fs.mkdirSync(folder,{recursive:true});
  const names=MODULES.concat(sources['src/death-effects.js']?['death-effects']:[]);
  for(const name of names)fs.writeFileSync(path.join(folder,name+'.js'),sources['src/'+name+'.js']);
  return Object.fromEntries(names.map(name=>[name,require(path.join(folder,name+'.js'))]));
}
function baselineConfig(GameConfig){return GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map(kind=>[kind,json('config/'+kind+'.json')])));}
function items(list){const a=[],it=list.bbObjectEnumerator();while(it.bbHasNext())a.push(it.bbNextObject());return a;}
function setScene(target,scene,count){
  const port=target.ZTPGamePort,g=port.state.bb_Game,GC=target.GameConfig,CR=target.CustomRules,F=target.Factions;
  const c=GC.getCurrent(target),r=CR.snapshot(target);r.automaticSpawning=false;r.baseReinforcements=false;r.abilities.preacherConversion=false;r.corpseSpawnOnImpact=false;
  for(const kind of ['units','zombies'])for(const unit of c[kind].slice(0,5)){unit.health=1000000;if(scene==='dense-cross')unit.moveSpeed=0;}
  for(const level of c.levels)level.waves=[];
  GC.updateLive(target,c);CR.update(target,r);g.bbPlayGame(1);
  const halves=[Math.floor(count/2),count-Math.floor(count/2)];
  for(let camp=0;camp<2;camp++){
    const side=camp?'enemy':'friendly',groups=new Map();
    for(let i=0;i<halves[camp];i++){
      const kind=scene==='native-walking'||scene==='mixed-native'?(camp?'zombie':'unit'):'unit';
      const type=scene==='native-walking'?0:scene==='mixed-native'?i%5:i%4;
      const key=kind+':'+type;if(!groups.has(key))groups.set(key,{kind,type,count:0});groups.get(key).count++;
    }
    let index=0;
    for(const d of groups.values())for(const body of CR.withManualSpawn(target,()=>F.spawn(target,side,{kind:d.kind,type:d.type},d.count))){
      body.bbxpos=scene==='dense-cross'?(camp?805:775)+(index%9)*2:(camp?1350:100)+(index%60)*2;
      body.bbypos=0;body.bblayer=index%8;index++;
    }
  }
  return {scene,requested:count,actual:items(g.bbpeople).length+items(g.bbpombies).length+items(g.bbzombies).length-2,
    campCounts:[items(g.bbpeople).length+items(g.bbpombies).length-1,items(g.bbzombies).length-1],
    fixture:'Synthetic evenly split armies, elevated HP; dense-cross additionally stationary and close-range. Every measured frame executes real update and render; no unit skipped.'};
}
function nodeFixture(modules){
  const GC=modules['game-config'],CR=modules['custom-rules'],F=modules.factions,Q=modules['spawn-queue'],D=modules['death-effects'],manifest=json('public/assets/manifest.json');
  let clock=0,drawCalls=0;const noop=()=>0,draw=()=>{drawCalls++;return 0;};
  const graphics=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){const i=manifest.images[name];if(!i)throw Error('Missing '+name);return{Width:()=>i.width,Height:()=>i.height};}},{get:(o,k)=>o[k]||draw});
  const input=new Proxy({}, {get:()=>noop}),audio={LoadSample:name=>({name}),PlaySample:noop,StopChannel:noop};
  class App{GraphicsDevice(){return graphics;}InputDevice(){return input;}AudioDevice(){return audio;}SetUpdateRate(){return 0;}MilliSecs(){return clock;}}
  const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class{},ReadInt:noop,WriteInt:noop,FlushInts:noop,PlayMovie:noop,MovieFinished:()=>1,EndMovie:noop,ShowMochi:noop,ShowMochiScores:noop,HideMochiScores:noop,MochiState:noop,Redirect:noop,
    GameConfig:GC,CustomRules:CR,Factions:F,SpawnQueue:Q,DeathEffects:D});
  vm.runInContext(read('src/generated-game.js'),target,{filename:'src/generated-game.js'});
  GC.install(target,baselineConfig(GC));CR.install(target,CR.defaults());F.install(target);if(D)D.install(target);Q.install(target);
  target.bb_Init();target.bb_Main();const p=target.ZTPGamePort,d=p.state.bb_mojo_app_device;d.OnCreate();d.OnUpdate();p.state.bb_Game.bbPlayGame(1);
  return {target,frame(){clock+=1000/60;const a=performance.now();d.OnUpdate();const b=performance.now();d.OnRender();const c=performance.now();return{update:b-a,render:c-b,total:c-a};},get drawCalls(){return drawCalls;}};
}
function distribution(values){const sorted=values.slice().sort((a,b)=>a-b);return{mean:values.reduce((a,b)=>a+b,0)/values.length,median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],max:sorted.at(-1)};}
function summarizeProfile(profile){
  const counts=new Map();for(const id of profile.samples||[])counts.set(id,(counts.get(id)||0)+1);
  return profile.nodes.map(n=>({name:n.callFrame.functionName||'(anonymous)',url:n.callFrame.url,line:n.callFrame.lineNumber+1,samples:counts.get(n.id)||0})).filter(n=>n.samples).sort((a,b)=>b.samples-a.samples).slice(0,40);
}
const post=(session,name,args={})=>new Promise((resolve,reject)=>session.post(name,args,(error,value)=>error?reject(error):resolve(value)));
async function nodeRun(sources,out,options={}){
  const modules=loadModules(sources,out),results=[];
  for(const count of options.counts||[250,400,800])for(const scene of options.scenes||SCENES){
    const h=nodeFixture(modules),setup=setScene(h.target,scene,count);for(let i=0;i<5;i++)h.frame();
    const samples=[];for(let i=0;i<(options.frames||30);i++)samples.push(h.frame());
    const row={...setup,frames:samples.length,updateMs:distribution(samples.map(s=>s.update)),renderMs:distribution(samples.map(s=>s.render)),fullFrameMs:distribution(samples.map(s=>s.total)),drawCalls:h.drawCalls};
    results.push(row);console.log(JSON.stringify({scene,count,update:row.updateMs.mean,render:row.renderMs.mean,p95:row.fullFrameMs.p95}));
    fs.writeFileSync(path.join(out,'node-results.json'),JSON.stringify({scope:'Node VM real gameplay update/render, MOCK drawing (not real browser FPS)',results},null,2));
  }
  const h=nodeFixture(modules);setScene(h.target,'cross-humans',400);for(let i=0;i<5;i++)h.frame();
  const session=new inspector.Session();session.connect();await post(session,'Profiler.enable');await post(session,'Profiler.start');
  for(let i=0;i<120;i++)h.frame();const {profile}=await post(session,'Profiler.stop');session.disconnect();
  fs.writeFileSync(path.join(out,'node-cross-400.cpuprofile'),JSON.stringify(profile));fs.writeFileSync(path.join(out,'node-hotspots.json'),JSON.stringify(summarizeProfile(profile),null,2));
  return results;
}
async function browserRun(sources,out,options={}){
  const {chromium}=require('playwright'),base=process.env.GAME_URL||'http://127.0.0.1:8344';
  const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const results=[],errors=[];
  // A published-tag baseline overrides index/boot and every product module,
  // so concurrent candidate edits cannot contaminate its measurements.
  const context=await browser.newContext({viewport:{width:1600,height:1100}});
  await context.route('**/*',async route=>{const url=new URL(route.request().url()),name=url.pathname==='/'?'index.html':url.pathname.slice(1);if(Object.hasOwn(sources,name))return route.fulfill({body:sources[name],contentType:name.endsWith('.html')?'text/html':'application/javascript'});return route.continue();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(base+'/');await page.waitForFunction(()=>window.gameReady===true,null,{timeout:60000});
    if(options.verifyCustomStartup){
      // Exercise the real persisted-session reload before touching its cadence.
      // This catches the historical custom-start path retaining the 30Hz intro
      // rate; the pressure matrix below separately normalizes to gameplay 60Hz.
      await page.evaluate(()=>Customization.startCustomBattle(1,Customization.getDraft()));
      await page.waitForFunction(()=>window.gameReady===true&&window.Customization?.getState().isCustom&&window.ZTPGamePort?.state.bb_Game.bbmainState===2,null,{timeout:60000});
      const cadence=await page.evaluate(()=>{stopRuntime();const g=ZTPGamePort.state.bb_Game;const updateRate=app.updateRate;stepRuntime(20);const before=g.bbgameticks;stepRuntime(60);return{updateRate,mainState:g.bbmainState,isCustom:Customization.getState().isCustom,measuredFrames:60,tickDelta:g.bbgameticks-before,gameSpeed:g.bbgamespeed};});
      cadence.passed=cadence.updateRate===60&&cadence.mainState===2&&cadence.isCustom&&Math.abs(cadence.tickDelta-120)<=2;
      fs.writeFileSync(path.join(out,'custom-startup-cadence.json'),JSON.stringify(cadence,null,2));
      if(!cadence.passed)throw Error('Real custom startup retained an incorrect cadence: '+JSON.stringify(cadence));
    }
    await page.evaluate(()=>{stopRuntime();EndMovie();ZTPGamePort.state.bb_Game.bbmainState=1;app.SetUpdateRate(60);});
    const setup=new Function('args','const items='+items.toString()+';return ('+setScene.toString()+')(window,args.scene,args.count);');
    const cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});
    for(const count of options.counts||[250,400,800])for(const scene of options.scenes||SCENES)for(const panel of [false,true]){
      // Restore defaults before each scene; setScene applies its documented HP
      // and position fixture without skipping any member of either army.
      await page.evaluate(()=>{stopRuntime();const g=ZTPGamePort.state.bb_Game;g.bbmainState=1;GameConfig.updateLive(window,GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map((kind,i)=>[kind,window.__perfDocuments[i]]))));});
      const sceneDetails=await page.evaluate(setup,{scene,count});
      const open=await page.locator('#ztps-panel').isVisible();if(open!==panel)await page.keyboard.press('F2');
      if(panel)await page.evaluate(()=>{SettingsUI.resumePlayback();stopRuntime();});
      await page.evaluate(()=>{
        const app=window.app;window.__perfFrameRows=[];
        if(!app.__perfOriginalUpdate){app.__perfOriginalUpdate=app.InvokeOnUpdate;app.__perfOriginalRender=app.InvokeOnRender;
          app.InvokeOnUpdate=function(){const start=performance.now();try{return this.__perfOriginalUpdate();}finally{window.__perfLastUpdate=performance.now()-start;}};
          app.InvokeOnRender=function(){const start=performance.now();try{return this.__perfOriginalRender();}finally{window.__perfLastRender=performance.now()-start;}};}
        stepRuntime(20);
      });
      const profiling=options.cpuProfile===true&&count===400&&scene==='cross-humans'&&!panel;if(profiling)await cdp.send('Profiler.start');
      const before=await page.evaluate(()=>({ticks:ZTPGamePort.state.bb_Game.bbgameticks,drawCalls:ZTPRuntime.diagnostics.drawCalls,frames:ZTPRuntime.diagnostics.frames}));
      const samples=await page.evaluate(async frames=>{
        const rows=[];for(let n=0;n<frames;n++){const start=performance.now();stepRuntime(1);rows.push({update:window.__perfLastUpdate,render:window.__perfLastRender,total:performance.now()-start});if(n%5===4)await new Promise(resolve=>setTimeout(resolve,0));}return rows;
      },options.frames||60);
      if(profiling){const {profile}=await cdp.send('Profiler.stop');fs.writeFileSync(path.join(out,'browser-cross-400.cpuprofile'),JSON.stringify(profile));fs.writeFileSync(path.join(out,'browser-hotspots.json'),JSON.stringify(summarizeProfile(profile),null,2));}
      const after=await page.evaluate(()=>({ticks:ZTPGamePort.state.bb_Game.bbgameticks,drawCalls:ZTPRuntime.diagnostics.drawCalls,frames:ZTPRuntime.diagnostics.frames,counts:Customization.getState().troopCounts,updateRate:app.updateRate}));
      const tickDelta=after.ticks-before.ticks;
      if(after.updateRate!==60||Math.abs(tickDelta-samples.length*2)>2)throw Error('Unexpected simulation cadence: '+JSON.stringify({tickDelta,frames:samples.length,updateRate:after.updateRate}));
      if(after.frames-before.frames!==samples.length)throw Error('Rendering skipped a measured frame');
      if(after.counts.friendly.total+after.counts.enemy.total!==count)throw Error('The test army was not retained');
      const row={...sceneDetails,panel,frames:samples.length,tickDelta,updateRate:after.updateRate,updateMs:distribution(samples.map(s=>s.update)),renderMs:distribution(samples.map(s=>s.render)),fullFrameMs:distribution(samples.map(s=>s.total)),before,after};results.push(row);
      console.log(JSON.stringify({browser:true,scene,count,panel,update:row.updateMs.mean,render:row.renderMs.mean,p95:row.fullFrameMs.p95}));
      fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({scope:'Real Chromium Canvas CPU submission timings, complete update/render; not guaranteed RAF FPS or GPU completion. Synthetic armies; manual stepping yields every five frames for editor polling.',results,errors},null,2));
    }
    await page.screenshot({path:path.join(out,'browser-final-scene.png')});
  }finally{await context.close();await browser.close();}
  if(errors.length)throw Error(errors.join('; '));return results;
}
async function main(){
  const args=process.argv.slice(2),ref=args.includes('--current')?'current':'v0.4.1';
  const out=fs.mkdtempSync(path.join(ROOT,'output','perf-'+(ref==='current'?'current':'baseline')+'-'));
  const sources=frozenSources(ref);fs.writeFileSync(path.join(out,'frozen-sources.json'),JSON.stringify(sources));
  const quick=args.includes('--quick');let results;
  if(args.includes('--browser')){
    // Documents are public immutable configuration files, not user presets.
    const original=browserRun;const browserSources={...sources};
    browserSources['src/boot.js']='window.__perfDocuments='+JSON.stringify(['units','zombies','buildings','powers','levels'].map(kind=>json('config/'+kind+'.json')))+';\n'+browserSources['src/boot.js'];
    results=await original(browserSources,out,{...(quick?{counts:[400],frames:60}:{}),cpuProfile:args.includes('--cpu-profile'),verifyCustomStartup:args.includes('--verify-custom-startup')});
  }else results=await nodeRun(sources,out,quick?{counts:[400],frames:15}:{});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,ref,out,results},null,2));console.log(JSON.stringify({passed:true,out}));
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={SCENES,frozenSources,loadModules,nodeFixture,setScene,nodeRun,browserRun,distribution,summarizeProfile};
