import {chromium} from 'playwright';
import {mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// Real pointer events drive every gameplay action. Manual clock control only
// advances the unmodified application; it never supplies resources or a win.
const base=(process.env.GAME_URL||'http://127.0.0.1:8318').replace(/\/$/,'');
const out='output/playwright/journey';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1280,height:720}});
const page=await context.newPage();
const errors=[],badResponses=[],remoteRequests=[];
const evidence={scope:'Unmodified browser application: real intro and pointer-driven stage-one gameplay. No natural victory claim.',started:new Date().toISOString(),checks:[],snapshots:{},errors,badResponses,remoteRequests,syntheticFixtures:[]};
page.on('pageerror',error=>errors.push(error.stack||error.message));
page.on('response',response=>{if(response.status()>=400)badResponses.push({url:response.url(),status:response.status()});});
page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith(base+'/'))remoteRequests.push(request.url());});
const snapshot=()=>page.evaluate(()=>{
  const g=ZTPGamePort.state.bb_Game,a=ZTPGamePort.state.bb_Audio,r=getRuntimeStatus();
  const entities=list=>{const result=[],e=list?.bbObjectEnumerator();if(e)while(e.bbHasNext()){const p=e.bbNextObject();result.push({type:p.bbunit?.bbtype,x:p.bbxpos,y:p.bbypos,hp:p.bbhealth,mode:p.bbmode,frame:p.bbskin?.bbframe});}return result;};
  return {state:g.bbmainState,menuCount:g.bbmenucount,difficulty:g.bbdifficulty,ticks:g.bbgameticks,speed:g.bbgamespeed,records:[...g.bbrecords],cash:g.bbztp?.bbcash,coins:g.bbcoins,force:g.bbztp?.bbforce,maxforce:g.bbztp?.bbmaxforce,xp:g.bbztp?.bbxp,buildings:g.bbztp?.bbbuildingcount?.slice(),units:g.bbunits.map(u=>({type:u.bbtype,orders:u.bborders,busy:u.bbbusy,enabled:u.bbenabled})),powers:g.bbpowers.map(p=>({type:p.bbtype,busy:p.bbbusy,cooldown:p.bbcooldown,locked:p.bblocked})),people:entities(g.bbpeople),zombies:entities(g.bbzombies),peopleBase:g.bbpeoplebase?.bbhealth,zombieBase:g.bbzombiebase?.bbhealth,killed:g.bbzombieskilled,kinLost:g.bbkinlost,audio:{disabled:a.bbdisabled,music:g.bbmusicoutput?{stopped:g.bbmusicoutput.stopped,started:g.bbmusicoutput.started,loops:g.bbmusicoutput.loops}:null,state:r.audioState,started:r.diagnostics.audioStarted,pending:r.diagnostics.audioPending},runtime:{running:r.running,milliseconds:r.milliseconds,updateRate:r.updateRate,stageFrameRate:r.stageFrameRate,movie:r.movie,errors:r.diagnostics.errors,warnings:r.diagnostics.warnings,movieAssets:r.movieAssets}};
});
const save=async name=>{evidence.snapshots[name]=await snapshot();await page.mouse.move(50,680);await page.locator('#game').screenshot({path:`${out}/${name}.png`});return evidence.snapshots[name];};
const check=(id,description)=>evidence.checks.push({id,description,passed:true});
const step=frames=>page.evaluate(n=>stepRuntime(n),frames);
async function click(x,y){const b=await page.locator('#game').boundingBox();assert.ok(b);await page.mouse.move(b.x+x*b.width/800,b.y+y*b.height/600);await page.mouse.down();await step(1);await page.mouse.up();}
async function boot(){await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.gameReady||window.__gameErrors?.length,null,{timeout:60000});assert.deepEqual(await page.evaluate(()=>window.__gameErrors||[]),[]);}
async function menu(){await page.waitForFunction(()=>ZTPGamePort.state.bb_Game.bbmainState===1,null,{timeout:25000});await page.evaluate(()=>stopRuntime());}
async function startStageOne(){await click(660,65);for(let i=0;i<220;i++){if((await snapshot()).state===2)return;await step(1);}throw new Error('Stage-one menu transition never entered gameplay');}

try {
  evidence.sourceHashes={};for(const file of ['src/runtime.js','src/generated-game.js','public/assets/manifest.json','public/assets/splash.json','scripts/browser-journey.mjs'])evidence.sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
  const splash=JSON.parse(await readFile('public/assets/splash.json','utf8'));
  evidence.introDefinition={finishAt:splash.finishAt,duration:splash.duration,sourceFrames:splash.sourceFrameCount,renderedFrameSegments:splash.frames.length,sounds:splash.sounds.length,skippable:splash.skippable};
  assert.equal(splash.finishAt,8200);assert.equal(splash.skippable,false);assert.equal(splash.sourceFrameCount,247);assert.equal(splash.sounds.length,8);
  await boot();
  const intro=await save('01-intro-start');
  assert.equal(intro.state,0);assert.equal(intro.runtime.movie,'splash');
  await page.waitForTimeout(3000);
  const middle=await save('02-intro-middle');assert.equal(middle.state,0);assert.equal(middle.runtime.movie,'splash');
  await menu();
  const initialMenu=await save('03-menu');
  assert.ok(initialMenu.runtime.milliseconds>=8200,'Intro must run its full 8.2-second source timeline');
  assert.equal(initialMenu.runtime.movie,null);assert.deepEqual(initialMenu.records,[0,0,0,0]);
  assert.equal(initialMenu.runtime.movieAssets.splash.retainedImages,0,'Intro decoded images should release after playback');
  assert.equal(initialMenu.audio.state,'running');assert.ok(initialMenu.audio.started>=9,'Intro audio and music must start');
  evidence.observedIntroElapsedMilliseconds=initialMenu.runtime.milliseconds-intro.runtime.milliseconds;
  check('INTRO-UI','Unmodified startup plays the 8.2-second intro timeline and reaches the menu without a test splash substitution. The manifest declares 247 source frames, eight audio events, and skippable=false; this is not a per-frame pixel/audio or click-to-skip proof.');

  await click(660,158);await step(4);
  assert.equal((await snapshot()).state,1);assert.equal((await snapshot()).menuCount,0);
  check('UNLOCK-03/UI','Stage two is unclickable with fresh zero records.');
  await click(780,584);
  let s=await snapshot();assert.equal(s.audio.disabled,true);assert.equal(s.audio.music,null);
  await step(5);await click(780,584);
  s=await snapshot();assert.equal(s.audio.disabled,false);assert.equal(s.audio.music.loops,10000);assert.equal(s.audio.music.started,true);
  check('AUDIO-01/menu','Actual menu mute/unmute button stops the music handle and starts a new 10,000-loop handle.');

  await startStageOne();
  const start=await save('04-stage-one-start');
  assert.equal(start.cash,100);assert.equal(start.force,0);assert.equal(start.maxforce,5);assert.equal(start.xp,0);assert.equal(start.speed,2);assert.equal(start.difficulty,0);
  assert.deepEqual(start.buildings,[1,1,0,0,0,0]);assert.equal(start.peopleBase,4000);assert.equal(start.zombieBase,16000);
  check('RESET-01/UI','Stage-one selection reaches normal initial state: $100, zero reserved population, 5 capacity, original buildings and base HP.');

  await click(38,84);
  const first=await snapshot();evidence.snapshots.firstPurchase=first;assert.equal(first.cash,50);assert.equal(first.force,1);assert.equal(first.units[0].orders,1);assert.equal(first.units[0].busy,50);
  await click(38,84);
  const second=await save('05-two-shovels-queued');assert.equal(second.cash,0);assert.equal(second.force,2);assert.equal(second.units[0].orders,2);assert.equal(second.units[0].busy,first.units[0].busy-(second.ticks-first.ticks),'Additional order must not reset the active queue timer');
  await click(38,84);
  const denied=await snapshot();assert.equal(denied.cash,0);assert.equal(denied.force,2);assert.equal(denied.units[0].orders,2);
  check('UNIT-01/UI','Two actual Shovel Man clicks spend the original $100 and reserve two population; insufficient-cash third click does not add an order.');
  await click(718,18);await step(1);
  const queuePaused=await save('05a-pending-queue-paused');assert.equal(queuePaused.state,6);assert.ok(queuePaused.units[0].busy>0);
  await step(120);const queueFrozen=await snapshot();assert.equal(queueFrozen.ticks,queuePaused.ticks);assert.deepEqual(queueFrozen.units,queuePaused.units);assert.equal(queueFrozen.coins,queuePaused.coins);
  await click(500,412);assert.equal((await snapshot()).state,2);
  check('PAUSE-01/active-queue','An actually pending two-unit recruitment queue remains nonzero and unchanged during 120 paused browser frames.');
  let completed=0;
  for(let i=0;i<70;i++){await step(1);s=await snapshot();if(s.units[0].orders===1)completed=1;if(!s.units[0].orders)break;}
  const recruits=await save('06-recruits-spawned');
  assert.equal(completed,1);assert.equal(recruits.units[0].orders,0);assert.equal(recruits.units[0].busy,0);assert.equal(recruits.force,2);assert.equal(recruits.people.filter(p=>p.type===0).length,2);
  await step(90);
  const moved=await save('07-recruits-moving');
  const oldSoldiers=recruits.people.filter(p=>p.type===0),newSoldiers=moved.people.filter(p=>p.type===0);assert.equal(newSoldiers.length,2);assert.ok(newSoldiers.every((p,i)=>p.x>oldSoldiers[i].x),'Both naturally recruited soldiers must move forward');
  check('UNIT-03/UI','The real same-type queue completes one recruit at a time, does not reserve population twice, and both spawned soldiers move naturally.');

  const speeds=[2];
  for(const expected of [3,4,1,2]){await click(628,18);s=await snapshot();assert.equal(s.speed,expected);speeds.push(s.speed);}
  evidence.speedCycle=speeds;check('SPEED-01/UI','Four real speed clicks give 2 → 3 → 4 → 1 → 2.');
  await click(718,18);await step(1);
  const paused=await save('08-paused-confirmation');assert.equal(paused.state,6);
  await step(180);
  const frozen=await snapshot();
  for(const key of ['ticks','cash','coins','force','xp'])assert.equal(frozen[key],paused[key],`Paused ${key}`);
  assert.deepEqual(frozen.units,paused.units);assert.deepEqual(frozen.people,paused.people);assert.deepEqual(frozen.zombies,paused.zombies);assert.deepEqual(frozen.powers,paused.powers);
  assert.ok(frozen.runtime.milliseconds-paused.runtime.milliseconds>=2900);
  await click(500,412);
  const resumed=await snapshot();assert.equal(resumed.state,2);assert.equal(resumed.ticks,paused.ticks,'Cancel resumes without catching up paused gameplay');
  // The original integer-millisecond accumulator may legally produce zero
  // updates on the first resumed frame. Check its exact formula over several
  // frames instead of requiring a positive delta at an arbitrary clock phase.
  evidence.pauseResumeFrames=[];
  for(let frame=0;frame<4;frame++){
    const before=await page.evaluate(()=>{const g=ZTPGamePort.state.bb_Game;return {ticks:g.bbgameticks,start:g.bbstarttime,updates:g.bbupdates,speed:g.bbgamespeed};});
    await step(1);
    const after=await snapshot();
    const expected=Math.min(5,(((after.runtime.milliseconds-before.start)*60/1000)|0)-before.updates)*before.speed;
    assert.ok(expected>=0&&expected<=4,'Only the normal resumed frame interval may advance simulation.');
    assert.equal(after.ticks-before.ticks,expected,'Resume must preserve the original accumulator, not replay paused time.');
    evidence.pauseResumeFrames.push({before,afterTicks:after.ticks,afterMilliseconds:after.runtime.milliseconds,expected});
  }
  const running=await snapshot();assert.ok(running.ticks>resumed.ticks&&running.ticks-resumed.ticks<=10);
  check('PAUSE-01/UI','Quit-confirmation freezes economy, queues, cooldowns, people, enemies, and game ticks while outer time advances; Cancel resumes without backlog.');

  await click(690,18);s=await snapshot();assert.equal(s.audio.disabled,true);assert.equal(s.audio.music,null);
  await step(5);await click(690,18);s=await snapshot();assert.equal(s.audio.disabled,false);assert.equal(s.audio.music.started,true);
  check('AUDIO-01/game','Actual in-game mute/unmute button stops and resumes BGM.');
  // Wait for a genuine encounter. It is intentionally not a natural-win test.
  const preCombat=await snapshot();
  for(let batch=0;batch<30;batch++){await step(60);s=await snapshot();if(s.killed>0||s.kinLost>0||s.people.some(p=>p.type===0&&p.hp<50))break;}
  const combat=await save('09-natural-encounter');
  assert.equal(combat.state,2);assert.ok(combat.killed>0||combat.kinLost>0||combat.people.some(p=>p.type===0&&p.hp<50),'A real encounter must affect entities');
  assert.ok(combat.audio.started>preCombat.audio.started,'Natural encounter must submit real sound playback');
  check('COMBAT-AUDIO/UI','The two naturally purchased recruits meet the genuine stage wave; combat affects entities and decoded sound playback is submitted during the encounter. Exact attack-sample identity and stage completion are not proved by this check.');

  await click(718,18);assert.equal((await snapshot()).state,6);
  await click(300,412);await step(1);
  const returned=await save('10-returned-menu');assert.equal(returned.state,1);assert.deepEqual(returned.records,[0,0,0,0]);
  check('PAUSE-02/UI','Pause → OK returns to menu without fabricating a result or unlock.');
  evidence.naturalStorageBeforeReload=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.gameReady,null,{timeout:60000});await menu();
  const reload=await save('11-natural-reload');assert.deepEqual(reload.records,[0,0,0,0]);assert.equal(reload.audio.disabled,false);
  check('SAVE-01/fresh','Fresh-game zero records remain zero across an actual reload; this does not prove nonzero win-record persistence.');

  // Explicit separate storage-protocol fixture: never mixed with natural play.
  // WriteInt is the browser platform API used by the unchanged source game.
  const fixture={name:'Nonzero save/load protocol fixture',synthetic:true,notNaturalVictory:true,method:'WriteInt/FlushInts storage API only, then real page reload; no gameplay/resource/HP mutations',values:[1200,2400,3600,4800]};
  await page.evaluate(values=>{for(let i=0;i<4;i++)WriteInt('ZTPBestScores',String(i),values[i]);FlushInts();},fixture.values);
  fixture.stored=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.gameReady,null,{timeout:60000});await menu();
  fixture.readBack=(await save('12-synthetic-save-reload')).records;assert.deepEqual(fixture.readBack,fixture.values);fixture.passed=true;evidence.syntheticFixtures.push(fixture);

  assert.deepEqual(errors,[],'Browser JavaScript exceptions');assert.deepEqual(badResponses,[],'Failed local asset responses');assert.deepEqual(remoteRequests,[],'Game must not require a remote service');
  assert.deepEqual((await snapshot()).runtime.errors,[],'Runtime diagnostics');
  for(const [file,hash] of Object.entries(evidence.sourceHashes))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),hash,`Source changed while browser journey was running: ${file}`);
  await rm(`${out}/failure.png`,{force:true});
  evidence.passed=true;
}catch(error){
  evidence.passed=false;evidence.failure=error.stack||String(error);process.exitCode=1;console.error(error);
  try{evidence.failureSnapshot=await snapshot();await page.screenshot({path:`${out}/failure.png`});}catch{}
}finally{
  evidence.finished=new Date().toISOString();await writeFile(`${out}/evidence.json`,JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({passed:evidence.passed,checks:evidence.checks,syntheticFixtures:evidence.syntheticFixtures,failure:evidence.failure,errors,badResponses,remoteRequests},null,2));await browser.close();
}
