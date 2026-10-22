import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=process.env.GAME_URL||'http://127.0.0.1:8318';
const coreOnly=process.argv.includes('--core-only');
await mkdir('output/playwright',{recursive:true});
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1280,height:720}});
const page=await context.newPage();
const errors=[],badResponses=[],remoteRequests=[],runtimeRequests=[];
page.on('pageerror',error=>errors.push(error.stack||error.message));
page.on('response',response=>{if(response.status()>=400)badResponses.push({url:response.url(),status:response.status()});});
page.on('request',request=>{runtimeRequests.push(request.url());if(/^https?:/.test(request.url())&&!request.url().startsWith(base+'/'))remoteRequests.push(request.url());});
if(coreOnly){
  // Explicit temporary test fixture while original intro assets are recovered.
  // Passing this mode does NOT verify the intro or complete launch parity.
  const manifest=JSON.parse(await readFile('public/assets/manifest.json','utf8'));
  await page.route('**/public/assets/splash.json',route=>route.fulfill({json:{width:800,height:600,scale:1,frames:[{src:manifest.images['logo.png'].src,duration:1}]}}));
}
const evidence={scope:coreOnly?'Core-only; original intro NOT verified':'Real browser full startup and core gameplay',errors,badResponses,remoteRequests,runtimeRequests};
try {
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.gameReady===true||window.__gameErrors?.length,null,{timeout:60000});
  assert.deepEqual(await page.evaluate(()=>window.__gameErrors||[]),[],'Boot errors');
  await page.waitForFunction(()=>window.ZTPGamePort?.state.bb_Game?.bbmainState===1,null,{timeout:25000});
  await page.mouse.move(100,100);
  await page.locator('#game').screenshot({path:'output/playwright/rebuild-menu.png'});
  evidence.menu=await page.evaluate(()=>({state:ZTPGamePort.state.bb_Game.bbmainState,runtime:getRuntimeStatus()}));
  const box=await page.locator('#game').boundingBox();
  await page.mouse.click(box.x+660*box.width/800,box.y+65*box.height/600);
  await page.waitForFunction(()=>ZTPGamePort.state.bb_Game.bbmainState===2);
  await page.evaluate(()=>stopRuntime());
  await page.mouse.move(100,100);
  evidence.stage1=await page.evaluate(()=>{
    const g=ZTPGamePort.state.bb_Game;
    return {state:g.bbmainState,difficulty:g.bbdifficulty,peopleBase:g.bbpeoplebase.bbhealth,zombieBase:g.bbzombiebase.bbhealth,runtime:getRuntimeStatus()};
  });
  assert.equal(evidence.stage1.difficulty,0);
  assert.equal(evidence.stage1.peopleBase,4000);
  assert.equal(evidence.stage1.zombieBase,16000);
  await page.locator('#game').screenshot({path:'output/playwright/rebuild-stage1-start.png'});
  await page.evaluate(()=>{stepRuntime(600);});
  evidence.after10seconds=await page.evaluate(()=>({runtime:getRuntimeStatus(),state:ZTPGamePort.state.bb_Game.bbmainState}));
  await page.locator('#game').screenshot({path:'output/playwright/rebuild-stage1-10s.png'});
  assert.deepEqual(errors,[],'Browser JS exceptions');
  assert.deepEqual(badResponses,[],'Missing local resources');
  assert.deepEqual(remoteRequests,[],'Final game must not depend on remote requests');
  assert.deepEqual(runtimeRequests.filter(url=>/\.swf(?:[?#]|$)|ruffle|\/reference\//i.test(url)),[],'Final implementation must not load original SWF or an emulator');
  assert.deepEqual(evidence.after10seconds.runtime.diagnostics.errors,[],'Runtime errors');
  evidence.passed=true;
} catch(error) {
  evidence.passed=false;evidence.failure=error.stack||String(error);
  evidence.diagnostics=await page.evaluate(()=>({status:document.querySelector('#status')?.textContent,errors:window.__gameErrors,runtime:window.getRuntimeStatus?.()}));
  console.error(error);
  await page.screenshot({path:'output/playwright/browser-failure.png'});
  process.exitCode=1;
} finally {
  await writeFile('output/playwright/browser-evidence.json',JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({passed:evidence.passed,scope:evidence.scope,failure:evidence.failure,errors,badResponses,remoteRequests},null,2));
  await browser.close();
}
