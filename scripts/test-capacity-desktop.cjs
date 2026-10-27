'use strict';

// Targeted real-EXE functional acceptance. This deliberately does NOT stand in
// for the separate native window-resize/F11 suite when its host preconditions
// are unavailable. Every actor and queue boundary below is the real runtime.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {makeRunDirectory,inside}=require('./test-desktop.cjs');
const capacityAcceptance=require('./acceptance-performance-v043.cjs');
const ROOT=path.resolve(__dirname,'..');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const PRESET='10000 entity capacity QA';
const RUNTIME_NAMES=Object.freeze(['game-config.js','custom-rules.js','customization.js','factions.js','effect-lists.js','spawn-queue.js','settings-ui.js','generated-game.js']);
async function expectedHashes(root=ROOT){
  let document;
  try{document=await fs.readFile(path.join(root,'output/v044-source-freeze.json'),'utf8');}
  catch(error){
    if(error.code!=='ENOENT')throw error;
    const entries=await Promise.all(RUNTIME_NAMES.map(async name=>['src/'+name,hash(await fs.readFile(path.join(root,'src',name)))]));
    return{source:'checkout',sha256:Object.fromEntries(entries)};
  }
  const frozen=JSON.parse(document);
  for(const name of RUNTIME_NAMES)assert.match(frozen.sha256?.['src/'+name]||'',/^[0-9a-f]{64}$/,'Frozen hash for '+name);
  return{source:'freeze',sha256:frozen.sha256};
}
function optionsFrom(args){
  const result={};
  for(let n=0;n<args.length;n++){
    const key={'--executable':'executable','--relocated-executable':'relocatedExecutable'}[args[n]];
    if(!key||!args[n+1])throw Error('Use --executable EXE --relocated-executable EXE');
    result[key]=path.resolve(ROOT,args[++n]);
  }
  for(const key of ['executable','relocatedExecutable'])
    if(!result[key]||!inside(path.join(ROOT,'output'),result[key]))throw Error(key+' must be an explicit verified EXE inside project output/');
  return result;
}
async function run(options){
  const {_electron:electron}=require('playwright');
  const out=await makeRunDirectory(path.join(ROOT,'output/playwright/v044-targeted'));
  const profile=path.join(out,'profile'),artifact=name=>path.join(out,name);
  const freeze=await expectedHashes();
  const evidence={passed:false,scope:'Actual canonical and fully extracted/relocated EXEs, isolated persistent profile, real ztp renderer, real UI queue and 9998+2 capacity. Targeted functional acceptance only; NOT the complete 45-check native window suite or a 10000-actor FPS claim.',
    notCovered:['OS window resize/maximize, native F11/fullscreen and foreground/second-instance focus; separate full suite retains its failed WINDOW-SCALE report.','Natural stage completion, all combat mixtures, clean-machine/signature reputation, and universal performance.'],
    started:new Date().toISOString(),output:out,profile,expectedHashSource:freeze.source,checks:[],syntheticFixtures:[],snapshots:{},pageErrors:[],consoleErrors:[],badResponses:[],failedRequests:[],remoteRequests:[],artifactWarnings:[],runtimeIdentities:[]};
  let app,page,launch=0;
  const persist=()=>fs.writeFile(artifact('report.json'),JSON.stringify(evidence,null,2)+'\n');
  async function check(id,description,fn){evidence.currentCheck=id;const start=Date.now();
    const details=await fn();evidence.checks.push({id,description,passed:true,elapsedMilliseconds:Date.now()-start,details});await persist();console.log('PASS '+id);}
  async function ready(){await page.waitForFunction(()=>window.gameReady===true,null,{timeout:90000});assert.deepEqual(await page.evaluate(()=>window.__gameErrors||[]),[]);}
  async function close(){if(app){const own=app;app=null;page=null;await own.close();}}
  async function start(executable){
    launch++;const env={...process.env,ZOMBIE_BUILDERS_DATA_DIR:profile};delete env.ELECTRON_RUN_AS_NODE;
    app=await electron.launch({executablePath:executable,args:[],cwd:ROOT,env,timeout:60000});
    page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(60000);
    page.on('pageerror',error=>evidence.pageErrors.push({launch,message:error.stack||error.message}));
    page.on('console',message=>{if(message.type()==='error')evidence.consoleErrors.push({launch,text:message.text()});});
    page.on('response',response=>{if(response.status()>=400)evidence.badResponses.push({launch,url:response.url(),status:response.status()});});
    page.on('requestfailed',request=>evidence.failedRequests.push({launch,url:request.url(),error:request.failure()?.errorText}));
    page.on('request',request=>{if(/^https?:/.test(request.url()))evidence.remoteRequests.push(request.url());});
    page.on('dialog',dialog=>dialog.accept());
    const mode=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];
      w.webContents.setBackgroundThrottling(false);w.setFocusable(false);w.setIgnoreMouseEvents(true);w.setSkipTaskbar(true);w.setOpacity(0);w.showInactive();
      return{visible:w.isVisible(),minimized:w.isMinimized(),content:w.getContentBounds(),opacity:w.getOpacity(),focusable:w.isFocusable()};});
    (evidence.ownedWindowModes||=[]).push({launch,...mode});
    await ready();
    await page.waitForFunction(()=>[1,2].includes(ZTPGamePort.state.bb_Game.bbmainState),null,{timeout:35000});
    await page.evaluate(()=>ZTPRuntime.stop());
  }
  async function freezeClock(){await page.evaluate(()=>{ZTPRuntime.stop();ZTPRuntime.advance(0);});}
  async function state(){return page.evaluate(()=>{const s=Customization.getState();return{customization:{paused:s.paused,isCustom:s.isCustom},
    queue:s.spawnQueue,bases:s.bases,troopCounts:s.troopCounts,runtime:getRuntimeStatus(),config:{damage:s.config.units[0].damage},presets:s.presets};});}
  async function screenshot(filename){await page.screenshot({path:filename});}
  async function save(name){const value=await state();evidence.snapshots[name]=value;await screenshot(artifact(name+'.png'));return value;}
  async function openEditor(){if(!(await page.locator('.ztps-overlay').isVisible()))await page.keyboard.press('F2');await page.locator('#ztps-panel').waitFor({state:'visible'});}
  async function togglePlayback(){await page.evaluate(()=>{if(!Customization.getState().paused&&!ZTPRuntime.getStatus().running){ZTPRuntime.useRealtime();ZTPRuntime.start();}});await page.locator('[data-time-pause]').click();}
  async function closeEditor(){
    if(await page.locator('.ztps-overlay').isVisible()){await page.locator('.ztps-close').focus();await page.keyboard.press('Escape');}
    if(await page.evaluate(()=>Customization.getState().paused)){await openEditor();await page.locator('[data-time-pause]').click();await page.locator('.ztps-close').focus();await page.keyboard.press('Escape');}
    await page.locator('.ztps-overlay').waitFor({state:'hidden'});await freezeClock();
  }
  async function step(frames){assert.equal(await page.evaluate(()=>Customization.getState().paused),false);assert.equal(await page.evaluate(()=>ZTPRuntime.getStatus().running),false);await page.evaluate(n=>ZTPRuntime.step(n),frames);}
  async function importAndStart(document,filename){
    await openEditor();await page.locator('input[type=file]').setInputFiles({name:filename,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(document))});
    await page.waitForFunction(()=>!document.querySelector('input[type=file]')?.value&&!document.querySelector('.ztps-dirty')?.textContent.includes('正在生效'));
    assert.equal(await page.locator('.ztps-message.ztps-error').count(),0);
    await page.locator('#ztps-tab-sandbox').click();
    await Promise.all([page.waitForEvent('domcontentloaded'),page.getByRole('button',{name:'开始自定义战局',exact:true}).click()]);
    await ready();await page.waitForFunction(()=>Customization.getState().isBattle);await freezeClock();
  }
  async function identity(){
    assert.equal(page.url(),'ztp://game/');
    const info=await app.evaluate(({app,BrowserWindow})=>{const prefs=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return{version:app.getVersion(),profile:app.getPath('userData'),nodeIntegration:prefs.nodeIntegration,contextIsolation:prefs.contextIsolation,sandbox:prefs.sandbox};});
    assert.equal(info.version,'0.4.4');assert.equal(path.resolve(info.profile),path.resolve(profile));assert.equal(info.nodeIntegration,false);assert.equal(info.contextIsolation,true);assert.equal(info.sandbox,true);
    const contents=await page.evaluate(async names=>Promise.all(names.map(async name=>{
      const r=await fetch('/src/'+name);if(!r.ok)throw Error('Runtime HTTP '+r.status);return{name,bytes:Array.from(new Uint8Array(await r.arrayBuffer()))};})),RUNTIME_NAMES);
    const hashes=Object.fromEntries(contents.map(({name,bytes})=>[name,hash(Buffer.from(bytes))]));
    for(const[name,sha]of Object.entries(hashes))assert.equal(sha,freeze.sha256['src/'+name],name);
    const result={...info,sourceHashes:hashes};evidence.runtimeIdentities.push(result);return result;
  }
  try{
    await start(options.executable);
    await check('ACTUAL-EXE-IDENTITY','Canonical v0.4.4 boots the real ztp runtime in this isolated profile, with its eight actual source bytes matching the frozen product.',identity);
    await check('CAPACITY-AND-INDEPENDENT-VISUAL-LIMITS','All actor paths declare 10000, while the separate aircraft/effect guard and 256-per-base decorative budget remain unchanged.',async()=>{
      const limits=await page.evaluate(()=>({rules:CustomRules.ENTITY_LIMIT,factions:Factions.ENTITY_LIMIT,queue:SpawnQueue.ENTITY_LIMIT,config:GameConfig.ENTITY_SAFETY_LIMIT,effects:GameConfig.POWER_EFFECT_SAFETY_LIMIT,baseDebris:GameConfig.BASE_DEBRIS_LIMIT_PER_SIDE,perTick:SpawnQueue.MAX_PER_TICK}));
      for(const key of ['rules','factions','queue','config'])assert.equal(limits[key],10000,key);
      assert.equal(limits.effects,1000);assert.equal(limits.baseDebris,256);assert.equal(limits.perTick,32);return limits;
    });
    await capacityAcceptance({page,check,state,save,screenshot,artifact,openEditor,closeEditor,togglePlayback,importAndStart,step,freeze:freezeClock,evidence});
    await check('NO-OVER-CAPACITY-ATOMIC-PREFLIGHT','A request exceeding the real remaining space is refused atomically before birth, without consuming combat RNG.',async()=>{
      const result=await page.evaluate(()=>{Customization.spawnFactionUnit('friendly',{kind:'unit',type:0},1);const before=Customization.getState().spawnQueue,seed=ZTPGamePort.state.bb_std_random_Seed;let message='';try{Customization.spawnFactionUnit('enemy',{kind:'zombie',type:0},9998);}catch(error){message=error.message;}return{before,after:Customization.getState().spawnQueue,seed,afterSeed:ZTPGamePort.state.bb_std_random_Seed,message};});
      assert.equal(result.before.entityCount,3);assert.equal(result.before.capacity,9997);
      assert.ok(result.message);assert.match(result.message,/10000/);assert.deepEqual(result.after,result.before);assert.equal(result.afterSeed,result.seed);return{message:result.message,occupancy:result.after.entityCount,remaining:result.after.capacity,requested:9998};
    });
    let saved;
    await check('CONFIG-AND-PRESET-SAVED','A valid custom edit and named preset are persisted through public product APIs in the isolated profile.',async()=>{
      saved=await page.evaluate(name=>{const draft=Customization.getDraft();draft.config.units[0].damage=17;Customization.commitSettings(draft);const preset=Customization.savePreset(name,Customization.getDraft());return{preset,damage:Customization.getState().config.units[0].damage,mode:Customization.getState().mode};},PRESET);
      assert.equal(saved.damage,17);assert.equal(saved.mode,'custom');assert.equal(saved.preset.name,PRESET);return saved;
    });
    await close();
    await start(options.relocatedExecutable);
    await check('FULL-ZIP-RELOCATED-RESTART','The fully extracted and relocated v0.4.4 EXE reuses this profile, retains the edit/preset, exposes the same 10000 limit, and matches all eight actual runtime hashes.',async()=>{
      const info=await identity(),persisted=await page.evaluate(()=>{const s=Customization.getState();return{damage:s.config.units[0].damage,presets:Customization.listPresets(),mode:s.mode,limit:s.spawnQueue.entityLimit,capacity:s.spawnQueue.capacity,occupancy:s.spawnQueue.entityCount};});
      assert.equal(persisted.damage,17);assert.equal(persisted.mode,'custom');assert.equal(persisted.limit,10000);assert.equal(persisted.capacity,9998);assert.equal(persisted.occupancy,2);assert.ok(persisted.presets.some(p=>p.id===saved.preset.id&&p.name===PRESET));return{executable:options.relocatedExecutable,info,persisted};
    });
    await check('NO-RUNTIME-OR-REMOTE-ERRORS','These actual-EXE workflows observed no JavaScript, console, failed local asset, remote dependency or runtime diagnostic errors.',async()=>{
      for(const key of ['pageErrors','consoleErrors','badResponses','failedRequests','remoteRequests'])assert.deepEqual(evidence[key],[],key);
      assert.deepEqual(await page.evaluate(()=>getRuntimeStatus().diagnostics.errors),[]);return{launches:launch};
    });
    evidence.passed=true;
  }catch(error){evidence.failure={check:evidence.currentCheck,message:error.stack||String(error)};process.exitCode=1;console.error(error.stack||error);
    try{if(page&&!page.isClosed())await screenshot(artifact('failure.png'));}catch(_){}
  }finally{
    try{await close();evidence.ownedAppsClosed=true;}catch(error){evidence.closeFailure=String(error);evidence.passed=false;process.exitCode=1;}
    delete evidence.currentCheck;evidence.finished=new Date().toISOString();await persist();console.log(JSON.stringify({passed:evidence.passed,checks:evidence.checks.length,output:out,failure:evidence.failure}));
  }
  return evidence;
}
module.exports={run,optionsFrom,expectedHashes,RUNTIME_NAMES};
if(require.main===module)run(optionsFrom(process.argv.slice(2))).catch(error=>{console.error(error.stack||error);process.exitCode=1;});
