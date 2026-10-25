'use strict';

// Real Electron QA, intentionally separate from the fast Node test suite.
// All filesystem writes go to a new output/ fixture. No user's profile is read,
// removed, or reset. Only ElectronApplication instances launched here are closed.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_NAMES = ['units', 'zombies', 'buildings', 'powers', 'levels'];
const PRESET_NAME = '桌面 QA 肥胖';
const PRESET_FILENAME = 'zombie-builders-preset-桌面-QA-肥胖.json';
const HELP = `Usage: node scripts/test-desktop.cjs [options]
  --executable PATH            Test a packaged game EXE (default: local Electron + this project).
  --relocated-executable PATH  Optional second installed copy, reusing the isolated QA profile.
  --output DIR                 Artifact parent, strictly inside this project's output/.
  --help                       Show this help. No app is launched.

The script creates output/playwright/desktop-qa-*/ by default. It retains its
own profile, screenshots, exported preset, and report.json for inspection.
Requires the project's pinned playwright and Electron development dependencies.
No natural victory, every ability combination, or clean-machine installation is claimed.
`;

function inside(base, filename) {
  const relative = path.relative(base, filename);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}
function parseArguments(argv, root = ROOT) {
  const result = {output: path.join(root, 'output', 'playwright')};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--help') { result.help = true; continue; }
    const key = {'--executable': 'executable', '--relocated-executable': 'relocatedExecutable', '--output': 'output'}[flag];
    if (!key) throw new Error('Unknown argument: ' + flag);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error('Missing value for ' + flag);
    result[key] = path.resolve(root, value);
  }
  const outputRoot = path.join(root, 'output');
  if (!inside(outputRoot, result.output)) throw new Error('--output must be strictly inside ' + outputRoot);
  if (result.relocatedExecutable && !result.executable) throw new Error('--relocated-executable requires --executable');
  return result;
}
async function makeRunDirectory(parent, root = ROOT) {
  const outputRoot = path.join(root, 'output');
  if (!inside(outputRoot, parent)) throw new Error('Artifact parent must stay inside output/');
  // Refuse junctions/symlinks, including ancestors of a yet-to-be-created path.
  let cursor = root;
  for (const part of path.relative(root, parent).split(path.sep)) {
    cursor = path.join(cursor, part);
    try {
      const stat = await fs.lstat(cursor);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Artifact path is not a real directory: ' + cursor);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await fs.mkdir(cursor);
    }
  }
  const actualRoot = await fs.realpath(outputRoot), actualParent = await fs.realpath(parent);
  if (!inside(actualRoot, actualParent)) throw new Error('Resolved artifact parent escapes output/');
  return fs.mkdtemp(path.join(parent, 'desktop-qa-'));
}
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function rectanglesOverlap(a, b, tolerance = 1) {
  return Math.min(a.right, b.right) - Math.max(a.left, b.left) > tolerance &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > tolerance;
}
function expectedIncome(before, afterTicks, buildings, payout = 50, interval = 600) {
  const accumulated = before.coins + (afterTicks - before.ticks) * buildings;
  return {cash: before.cash + Math.floor(accumulated / interval) * payout, coins: accumulated % interval};
}

async function run(options) {
  const {_electron: electron} = require('playwright');
  const out = await makeRunDirectory(options.output);
  const profile = path.join(out, 'profile');
  const artifact = name => path.join(out, name);
  const evidence = {
    schemaVersion: 1, started: new Date().toISOString(), passed: false,
    executable: options.executable || require('electron'), sourceMode: !options.executable,
    output: out, profile,
    scope: 'Real Electron application, isolated persistent profile, real canvas and dock-button interaction. Deterministic runtime steps advance real gameplay only with the editor pause released; actual dock Continue/Pause is also exercised in realtime.',
    checks: [], snapshots: {}, pageErrors: [], consoleErrors: [], badResponses: [], failedRequests: [], remoteRequests: [], dialogs: [], syntheticFixtures: [], inputEvents: [], ownedWindowModes: [], artifactWarnings: [],
    notCovered: ['Natural victory and every ability/attack-animation combination.', 'Clean-machine installer, unsigned EXE reputation/SmartScreen, and visual/audio equivalence to native Flash.']
  };
  if (!options.relocatedExecutable) evidence.notCovered.push('Moving the installation directory: supply --relocated-executable to exercise a separately located installed copy.');
  if (!options.executable) evidence.notCovered.push('Packaged-EXE second-instance focus/lock: supply --executable for that native-process check.');
  let app, page, launchIndex = 0, isolatedInteractionMode=false, nativeCaptureUnavailable=false;
  const ownedChildren = new Set();
  const monitored = new WeakSet();
  function installInputLog(){
    if(window.__desktopQAInputEvents)return;
    window.__desktopQAInputEvents=[];
    function record(event){
      if(event.type==='keydown'&&!['F1','F2','F11','Escape'].includes(event.key))return;
      const target=event.target;
      window.__desktopQAInputEvents.push({type:event.type,key:event.key,trusted:event.isTrusted,x:event.clientX,y:event.clientY,
        target:{tag:target?.tagName,id:target?.id,classes:typeof target?.className==='string'?target.className:null},
        dockVisible:!!document.querySelector('.ztps-overlay:not([hidden])'),mainState:window.ZTPGamePort?.state.bb_Game?.bbmainState});
      if(window.__desktopQAInputEvents.length>256)window.__desktopQAInputEvents.shift();
    }
    window.addEventListener('keydown',record,true);window.addEventListener('pointerdown',record,true);
  }
  async function isolateOwnedWindow(){
    const mode=await app.evaluate(async({BrowserWindow})=>{
      const win=BrowserWindow.getAllWindows()[0];
      win.webContents.setBackgroundThrottling(false);
      // Windows can throttle even an unthrottled hidden renderer after reload.
      // Keep only this owned QA window composited but invisible/noninteractive.
      win.setFocusable(false);win.setIgnoreMouseEvents(true);win.setSkipTaskbar(true);
      if(!win.__desktopQAFocusGuard){
        win.__desktopQAFocusGuard={events:0};
        win.on('focus',()=>{win.__desktopQAFocusGuard.events++;if(!win.isDestroyed())win.blur();});
      }
      win.setOpacity(0);win.blur();win.showInactive();
      await new Promise(resolve=>setTimeout(resolve,100));
      return {visible:win.isVisible(),opacity:win.getOpacity(),focusable:win.isFocusable(),focused:win.isFocused(),
        focusGuardEvents:win.__desktopQAFocusGuard.events,backgroundThrottling:win.webContents.getBackgroundThrottling(),mouseIgnoredRequested:true,skipTaskbarRequested:true};
    });
    assert.equal(mode.visible,true);assert.equal(mode.opacity,0);assert.equal(mode.focusable,false);
    assert.equal(mode.backgroundThrottling,false);
    evidence.ownedWindowModes.push({launch:launchIndex,...mode});
  }
  async function inputLog(){
    if(!page||page.isClosed())return [];
    return page.evaluate(()=>{const events=window.__desktopQAInputEvents||[];window.__desktopQAInputEvents=[];return events;});
  }
  function watch(current) {
    if (monitored.has(current)) return;
    monitored.add(current);
    current.on('pageerror', error => evidence.pageErrors.push({launch: launchIndex, message: error.stack || error.message}));
    current.on('console', message => {
      if (message.type() === 'error') evidence.consoleErrors.push({launch: launchIndex, text: message.text()});
    });
    current.on('response', response => {
      if (response.status() >= 400) evidence.badResponses.push({launch: launchIndex, status: response.status(), url: response.url()});
    });
    current.on('requestfailed', request => evidence.failedRequests.push({launch: launchIndex, url: request.url(), error: request.failure()?.errorText}));
    current.on('request', request => {
      if (/^https?:/i.test(request.url())) evidence.remoteRequests.push({launch: launchIndex, url: request.url()});
    });
    current.on('dialog', async dialog => {
      evidence.dialogs.push({launch: launchIndex, type: dialog.type(), message: dialog.message()});
      await dialog.accept();
    });
  }
  async function launch(executable = options.executable, replayObservedBoot = false) {
    ++launchIndex;
    const env = {...process.env, ZOMBIE_BUILDERS_DATA_DIR: profile};
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({
      executablePath: executable || require('electron'), args: executable ? [] : [ROOT], cwd: ROOT,
      env, timeout: 60000
    });
    app.context().on('page', watch);
    for (const current of app.context().pages()) watch(current);
    page = await app.firstWindow({timeout: 60000}); watch(page);
    await app.context().addInitScript(installInputLog);await page.evaluate(installInputLog);
    page.setDefaultTimeout(15000);
    if(isolatedInteractionMode)await isolateOwnedWindow();
    if (replayObservedBoot) {
      // Let the first splash finish before an observed reload. Interrupting its
      // asynchronous image/audio fetches would fabricate ERR_ABORTED failures.
      await ready(); await menu();
      await page.reload({waitUntil: 'domcontentloaded'});
    }
    await ready();
  }
  async function close() {
    if (!app) return;
    const own = app; app = null; page = null;
    await own.close();
  }
  async function ready() {
    await page.waitForFunction(() => window.gameReady || window.__gameErrors?.length, null, {timeout: 90000});
    assert.deepEqual(await page.evaluate(() => window.__gameErrors || []), [], 'Boot/runtime error banner must remain empty');
  }
  async function menu() {
    await page.waitForFunction(() => window.ZTPGamePort?.state.bb_Game?.bbmainState === 1, null, {timeout: 35000});
  }
  async function freeze() { await page.evaluate(() => { ZTPRuntime.stop(); ZTPRuntime.advance(0); }); }
  async function step(frames) {
    assert.equal(await page.evaluate(() => Customization.getState().paused), false, 'Never step gameplay through an editor pause token');
    assert.equal(await page.evaluate(() => ZTPRuntime.getStatus().running), false, 'Deterministic steps require an explicitly stopped real clock');
    await page.evaluate(n => ZTPRuntime.step(n), frames);
  }
  async function canvasClick(x, y) {
    const box = await page.locator('#game').boundingBox(); assert.ok(box, 'Canvas must have a real layout');
    const point={x:box.x+x*box.width/800,y:box.y+y*box.height/600};
    const hit=await page.evaluate(point=>{const el=document.elementFromPoint(point.x,point.y);return {tag:el?.tagName,id:el?.id,classes:el?.className};},point);
    (evidence.pointerActions ||= []).push({requested:{x,y},point,box,hit});
    assert.equal(hit.id,'game','A canvas gameplay action must hit the real canvas, not a floating control');
    await page.mouse.move(point.x,point.y);
    await page.mouse.down();
    try {
      if (await page.evaluate(() => ZTPRuntime.getStatus().running)) {
        // A fixed 45 ms click can fit entirely between rendered frames while
        // another app owns focus or this large game frame is being painted.
        // Hold one genuine pointer press until two real frames have completed,
        // without injecting a second click or calling gameplay methods.
        const frame=await page.evaluate(()=>ZTPRuntime.getStatus().diagnostics.frames);
        await page.waitForFunction(frame=>ZTPRuntime.getStatus().diagnostics.frames>=frame+2,frame,{timeout:5000});
      } else await step(1);
    } finally { await page.mouse.up(); }
  }
  async function state() {
    return page.evaluate(() => {
      const g = ZTPGamePort.state.bb_Game;
      function entries(list) {
        const values = [], iterator = list?.bbObjectEnumerator();
        if (iterator) while (iterator.bbHasNext()) values.push(iterator.bbNextObject());
        return values;
      }
      const entity = value => value ? ({type: value.bbunit?.bbtype, x: value.bbxpos, y: value.bbypos, health: value.bbhealth, speed: value.bbwalkspeed,
        faction: window.Factions?.getSide(window, value), maximum: value.bbunit?.bbhealth, damage: value.bbunit?.bbdamage, mode: value.bbmode, angry: value.bbisangry, wasZombie: value.bbwaszombie, direction: value.bbdirection, people: value.bbunit?.bbpeople}) : null;
      return {
        mainState: g.bbmainState, ticks: g.bbgameticks, cash: g.bbztp?.bbcash, coins: g.bbcoins,
        force: g.bbztp?.bbforce, maxForce: g.bbztp?.bbmaxforce, xp: g.bbztp?.bbxp, difficulty: g.bbdifficulty,
        buildings: g.bbztp?.bbbuildingcount?.slice(),
        buildingOrders: g.bbbuildings.map(building => ({maximum: building.bbmaximum, orders: building.bborders, busy: building.bbbusy, enabled: building.bbenabled})),
        records: [...g.bbrecords], people: entries(g.bbpeople).map(entity), zombies: entries(g.bbzombies).map(entity), converted: entries(g.bbpombies).map(entity),
        bases: {friendly: entity(g.bbpeoplebase), enemy: entity(g.bbzombiebase)},
        kills: g.bbzombieskilled, lost: g.bbkinlost, randomSeed: ZTPGamePort.state.bb_std_random_Seed,
        powers: g.bbpowers.map(power => ({busy: power.bbbusy, cooldown: power.bbcooldown, enabled: power.bbenabled, locked: power.bblocked})),
        // Detached native death visuals are tracked separately: clearing must
        // preserve existing projectiles/skills, while adding cosmetic deaths.
        effects: Object.fromEntries(['bbbottles', 'bbexplosions', 'bbsmokelist', 'bbflinglist', 'bbbodyparts', 'bbdeathlist', 'bbpowerups'].map(name => [name, entries(g[name]).filter(effect=>!effect.bbSandboxDeath).length])),
        clearVisuals: Object.fromEntries(['bbexplosions','bbbodyparts','bbdeathlist'].map(name=>[name,entries(g[name]).filter(effect=>effect.bbSandboxDeath).length])),
        units: g.bbunits.map(unit => ({cost: unit.bbcost, health: unit.bbhealth, damage: unit.bbdamage, speed: unit.bbwalkspeed, orders: unit.bborders, busy: unit.bbbusy})),
        zombieUnits: g.bbzunits.map(unit => ({health: unit.bbhealth, damage: unit.bbdamage, speed: unit.bbwalkspeed})),
        liveBases: Customization.getState().bases, rules: Customization.getState().rules,
        waves: entries(ZTPGamePort.bb_ZombieMob.bbqueue).map(wave => ({type: wave.bbtype, count: wave.bbcount, delay: wave.bbdelay, time: wave.bbtime})),
        waveTicks: ZTPGamePort.bb_ZombieMob.bbticks, stageHealthMultiplier: g.bbZombieHealthMultiplier, stageDamageMultiplier: g.bbZombieDamageMultiplier,
        runtime: {timeScale: ZTPRuntime.getStatus().timeScale, running: ZTPRuntime.getStatus().running, milliseconds: ZTPRuntime.getStatus().milliseconds, errors: ZTPRuntime.getStatus().diagnostics.errors},
        customization: {mode: Customization.getState().mode, paused: Customization.getState().paused, isBattle: Customization.getState().isBattle},
        waveProgress: Customization.getState().waveProgress
      };
    });
  }
  async function screenshot(filename){
    if(!isolatedInteractionMode){await page.screenshot({path:filename});return;}
    if(nativeCaptureUnavailable){
      evidence.artifactWarnings.push({filename,available:false,reason:'Native capture backend was unavailable earlier in this run; no replacement image is fabricated.'});return;
    }
    // Capture the actual owned webContents image. OS opacity does not change
    // renderer pixels, unlike hiding the view which can stall its compositor.
    // This is the actual owned webContents image, never a synthetic canvas dump.
    let timer;
    let captured;
    try { captured=await Promise.race([
      app.evaluate(async({BrowserWindow})=>{
        const win=BrowserWindow.getAllWindows()[0];
        win.blur();
        const image=await win.webContents.capturePage(undefined,{stayHidden:false,stayAwake:true});
        if(image.isEmpty())throw new Error('Owned Electron screenshot is empty');
        return {png:image.toPNG().toString('base64'),size:image.getSize(),visible:win.isVisible(),opacity:win.getOpacity(),focusable:win.isFocusable(),focused:win.isFocused(),focusGuardEvents:win.__desktopQAFocusGuard?.events||0};
      }),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Owned transparent Electron capture timed out')),3000);})
    ]).finally(()=>clearTimeout(timer));
    } catch(error){
      // Capture is an optional artifact, not a substitute for gameplay/DOM
      // assertions. Report a compositor limitation instead of inventing pixels.
      const mode=await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];return {opacity:win.getOpacity(),focused:win.isFocused()};});
      assert.equal(mode.opacity,0,'A failed capture may not expose the QA window');
      nativeCaptureUnavailable=true;
      evidence.artifactWarnings.push({filename,available:false,reason:error.message,...mode});
      evidence.notCovered.push('Transparent-native screenshots after navigation are unavailable on this compositor. Initial visible native layout screenshots and all real packaged DOM/gameplay assertions remain exercised; no missing image is counted as a pass.');
      return;
    }
    assert.equal(captured.visible,true);assert.equal(captured.opacity,0,'A native screenshot may not expose the QA app');assert.equal(captured.focusable,false);
    assert.ok(captured.size.width>0&&captured.size.height>0);
    await fs.writeFile(filename,Buffer.from(captured.png,'base64'));
    (evidence.nativeCaptures ||= []).push({filename,size:captured.size,opacity:captured.opacity,focusable:captured.focusable,focused:captured.focused,focusGuardEvents:captured.focusGuardEvents,backend:'Electron webContents.capturePage stayAwake on owned noninteractive transparent window'});
  }
  async function save(name) {
    evidence.snapshots[name] = await state();
    await screenshot(artifact(name + '.png'));
    return evidence.snapshots[name];
  }
  async function check(id, description, fn) {
    evidence.currentCheck = id;
    const started = Date.now(), details = await fn();
    evidence.checks.push({id, description, passed: true, elapsedMilliseconds: Date.now() - started, ...(details === undefined ? {} : {details})});
    evidence.inputEvents.push({check:id,launch:launchIndex,events:await inputLog()});
    console.log('PASS ' + id);
  }
  async function openEditor() {
    if (!(await page.locator('.ztps-overlay').isVisible())) await page.keyboard.press('F2');
    await page.locator('#ztps-panel[role="complementary"]').waitFor({state: 'visible'});
  }
  async function closeEditor() {
    if (await page.locator('.ztps-overlay').isVisible()) {
      // Esc is intentionally scoped to the dock; the canvas keeps its own game
      // pause key. Focus the dock rather than sending Esc to the battle.
      await page.locator('.ztps-close').focus(); await page.keyboard.press('Escape');
    }
    await page.locator('.ztps-overlay').waitFor({state: 'hidden'});
    // The independent time panel legitimately keeps its own explicit pause
    // after the settings dock closes. These gameplay journeys request play,
    // so release it through the real Continue button instead of bypassing it.
    if (await page.evaluate(() => Customization.getState().paused)) {
      // Its controls are intentionally hidden with F2 closed. Reopen, request
      // Continue through the visible real button, then close again.
      await openEditor(); await page.locator('[data-time-pause]').click();
      await page.locator('.ztps-close').focus(); await page.keyboard.press('Escape');
      await page.locator('.ztps-overlay').waitFor({state:'hidden'});
    }
    await freeze();
  }
  async function settled() { await page.waitForFunction(() => !document.querySelector('.ztps-dirty')?.textContent.includes('正在生效')); }
  async function field(name, value, commit = 'change') {
    const input = page.locator('[data-path="' + name + '"]');
    if (typeof value === 'boolean') await input.setChecked(value);
    else if (await input.evaluate(el => el.tagName) === 'SELECT') await input.selectOption(String(value));
    else { await input.fill(String(value)); if (commit === 'enter') await input.press('Enter'); else if (commit === 'blur') await input.blur(); else await input.dispatchEvent('change'); }
    await settled();
  }
  async function togglePlayback() {
    // The independent clock button distinguishes a stopped QA clock from a
    // battle pause; briefly restore realtime before explicitly pausing it.
    await page.evaluate(() => { if (!Customization.getState().paused && !ZTPRuntime.getStatus().running) { ZTPRuntime.useRealtime(); ZTPRuntime.start(); } });
    await page.locator('[data-time-pause]').click();
  }
  async function imported() {
    await page.waitForFunction(() => !document.querySelector('input[type=file]')?.value);
    await settled();
    assert.equal(await page.locator('.ztps-message.ztps-error').count(), 0, 'A valid import must not display an error');
  }
  async function clickButton(name) { await page.getByRole('button', {name, exact: true}).click(); }
  async function nativeKey(keyCode) {
    await app.evaluate(({BrowserWindow}, key) => {
      const contents = BrowserWindow.getAllWindows()[0].webContents;
      contents.sendInputEvent({type: 'keyDown', keyCode: key});
      contents.sendInputEvent({type: 'keyUp', keyCode: key});
    }, keyCode);
  }
  async function exportedDraft() {
    return page.evaluate(() => SettingsUI.mount().getDraft());
  }
  async function storage() { return page.evaluate(() => Object.fromEntries(Object.entries(localStorage))); }
  async function importAndStart(fixture, filename) {
    await openEditor();
    await page.locator('input[type="file"]').setInputFiles({name: filename || 'desktop-fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture))});
    await imported();
    await page.locator('#ztps-tab-sandbox').click();
    await Promise.all([page.waitForEvent('domcontentloaded'), clickButton('开始自定义战局')]);
    await ready(); await page.waitForFunction(() => Customization.getState().isBattle); await freeze();
  }

  try {
    await launch(undefined, true);
    await check('DESKTOP-BOOT', 'Local ztp:// boot, immutable renderer boundary, real isolated userData, and the full intro/menu.', async () => {
      assert.equal(page.url(), 'ztp://game/');
      const main = await app.evaluate(({BrowserWindow, app}) => {
        const win = BrowserWindow.getAllWindows()[0], prefs = win.webContents.getLastWebPreferences();
        return {userData: app.getPath('userData'), name: app.getName(), version: app.getVersion(), prefs: {
          nodeIntegration: prefs.nodeIntegration, contextIsolation: prefs.contextIsolation, sandbox: prefs.sandbox,
          webSecurity: prefs.webSecurity, webviewTag: prefs.webviewTag
        }};
      });
      assert.equal(path.resolve(main.userData), path.resolve(profile));
      assert.deepEqual(main.prefs, {nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, webviewTag: false});
      assert.deepEqual(await page.evaluate(() => ({require: typeof window.require, process: typeof window.process})), {require: 'undefined', process: 'undefined'});
      await menu();
      const fresh = await save('01-fresh-menu'); assert.equal(fresh.customization.mode, 'original'); assert.deepEqual(fresh.records, [0, 0, 0, 0]);
      assert.ok(fresh.runtime.milliseconds >= 8200, 'Do not substitute or skip the real intro');
      const configNames = (await fs.readdir(path.join(profile, 'config'))).sort();
      assert.deepEqual(configNames, CONFIG_NAMES.map(name => name + '.json').sort());
      return main;
    });

    await check('WINDOW-SCALE', 'Real BrowserWindow resize/maximize/F11 scales the whole 4:3 canvas without changing its 800×600 game coordinate system.', async () => {
      async function layout() {
        return page.evaluate(() => {
          const canvas = document.getElementById('game'), box = canvas.getBoundingClientRect();
          return {width: box.width, height: box.height, viewportWidth: innerWidth, viewportHeight: innerHeight, backingWidth: canvas.width, backingHeight: canvas.height};
        });
      }
      function valid(box) {
        assert.ok(Math.abs(box.width / box.height - 4 / 3) < 0.003, 'Canvas aspect ratio');
        assert.equal(box.backingWidth, 800); assert.equal(box.backingHeight, 600);
        assert.ok(Math.abs(box.width - Math.min(box.viewportWidth, box.viewportHeight * 4 / 3)) <= 2, 'Canvas fills available viewport');
      }
      await app.evaluate(({BrowserWindow}) => { const win = BrowserWindow.getAllWindows()[0]; win.unmaximize(); win.setBounds({width: 720, height: 600}); });
      await page.waitForTimeout(250); const small = await layout(); valid(small);
      await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].maximize());
      await page.waitForTimeout(300); const large = await layout(); valid(large);
      assert.ok(large.width > small.width || large.height > small.height, 'Maximize actually enlarges the game canvas');
      // Electron handles F11 in main's before-input-event, not the renderer.
      // CDP keyboard injection bypasses that native event on current Electron;
      // sendInputEvent exercises the actual handler without setting fullscreen.
      await nativeKey('F11');
      await page.waitForTimeout(300);
      assert.equal(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].isFullScreen()), true);
      const fullscreen = await layout(); valid(fullscreen);
      await nativeKey('F11');
      await page.waitForTimeout(300);
      assert.equal(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].isFullScreen()), false);
      return {small, large, fullscreen};
    });

    await check('DOCK-LAYOUT', 'The non-modal editor reserves its own space: wide side-by-side and narrow stacked layouts never cover the 4:3 game canvas.', async () => {
      assert.equal(await page.locator('.ztps-entry').count(),0,'The settings entry button is removed: F2 is the sole entry');
      assert.equal(await page.locator('[data-time-controls]').isVisible(),false,'Time controls are hidden with the F2 panel closed');
      assert.equal(await page.locator('body > [data-time-controls], main [data-time-controls]').count(),0,'No time controls float over the game');
      await openEditor();
      assert.equal(await page.locator('#ztps-panel #ztps-time-host [data-time-controls]').count(),1,'The time section is structurally inside the F2 dock');
      async function measure() {
        return page.evaluate(() => {
          const rect = selector => {
            const b = document.querySelector(selector).getBoundingClientRect();
            return {left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height};
          };
          return {canvas: rect('#game'), dock: rect('.ztps-overlay'), main: rect('main'), viewportWidth: innerWidth, viewportHeight: innerHeight,
            docked: document.body.classList.contains('ztps-docked'), role: document.querySelector('#ztps-panel').getAttribute('role'),
            modal: document.querySelector('#ztps-panel').getAttribute('aria-modal')};
        });
      }
      function validate(box, narrow) {
        assert.equal(box.docked, true); assert.equal(box.role, 'complementary'); assert.equal(box.modal, null);
        assert.ok(box.canvas.width > 0 && box.canvas.height > 0); assert.ok(box.dock.width > 0 && box.dock.height > 0);
        assert.equal(rectanglesOverlap(box.canvas, box.dock), false, 'Dock and canvas bounding boxes must not intersect');
        assert.ok(Math.abs(box.canvas.width / box.canvas.height - 4 / 3) < 0.003);
        assert.ok(Math.abs(box.canvas.width - Math.min(box.main.width, box.main.height * 4 / 3)) <= 2, 'Canvas fills remaining game area');
        if (narrow) assert.ok(box.canvas.bottom <= box.dock.top + 1, 'Narrow view puts the dock below the canvas');
        else assert.ok(box.canvas.right <= box.dock.left + 1, 'Wide view puts the dock beside the canvas');
      }
      await app.evaluate(({BrowserWindow}) => { const win = BrowserWindow.getAllWindows()[0]; win.unmaximize(); win.setBounds({width: 1280, height: 900}); });
      await page.waitForTimeout(300); const wide = await measure(); validate(wide, false);
      await screenshot(artifact('01a-dock-wide.png'));
      await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setBounds({width: 720, height: 800}));
      await page.waitForTimeout(300); const narrow = await measure(); validate(narrow, true);
      await screenshot(artifact('01b-dock-narrow.png'));
      await closeEditor(); await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].maximize());
      await page.waitForTimeout(250); return {wide, narrow};
    });

    await check('NATIVE-F1-HELP', 'Native F1 reaches the real desktop help handler, identifying this profile/config directory and F2/F11 shortcuts without opening Explorer.', async () => {
      await app.evaluate(({dialog}) => {
        globalThis.__desktopQAHelp = {calls: []};
        globalThis.__desktopQAShowMessageBox = dialog.showMessageBox;
        dialog.showMessageBox = function (_window, options) {
          globalThis.__desktopQAHelp.calls.push({title: options.title, message: options.message, detail: options.detail, buttons: options.buttons});
          // Only the owned QA process is mocked. Selecting Close guarantees
          // the genuine handler does not invoke shell.openPath/Explorer.
          return Promise.resolve({response: 1, checkboxChecked: false});
        };
      });
      try {
        await nativeKey('F1');
        let result;
        for (let n = 0; n < 50; n++) {
          result = await app.evaluate(() => globalThis.__desktopQAHelp);
          if (result.calls.length) break;
          await page.waitForTimeout(100);
        }
        assert.equal(result.calls.length, 1, 'One F1 press must reach the native help handler once');
        const help = result.calls[0];
        assert.equal(help.title, '配置与存档'); assert.match(help.message, /建筑工大战僵尸/);
        assert.ok(help.detail.includes(path.join(profile, 'config')), 'Help identifies the actual editable config directory');
        assert.ok(help.detail.includes(profile), 'Help identifies the actual persistent profile');
        assert.match(help.detail, /F2[：:]\s*自定义/); assert.match(help.detail, /F11[：:]\s*切换全屏/);
        assert.deepEqual(help.buttons, ['打开配置文件夹', '关闭']);
        return {dialogMock: 'This owned QA main process only; response=Close.', ...help};
      } finally {
        await app.evaluate(({dialog}) => { dialog.showMessageBox = globalThis.__desktopQAShowMessageBox; delete globalThis.__desktopQAShowMessageBox; });
      }
    });

    if (options.executable) {
      await check('SECOND-INSTANCE', 'A second owned packaged EXE with the same QA profile exits normally and focuses/restores the single existing window.', async () => {
        await app.evaluate(({app, BrowserWindow}) => {
          globalThis.__desktopQASecondInstance = {events: 0};
          app.on('second-instance', () => { ++globalThis.__desktopQASecondInstance.events; });
          BrowserWindow.getAllWindows()[0].minimize();
        });
        await page.waitForTimeout(150);
        const env = {...process.env, ZOMBIE_BUILDERS_DATA_DIR: profile}; delete env.ELECTRON_RUN_AS_NODE;
        const child = spawn(options.executable, [], {cwd: path.dirname(options.executable), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
        ownedChildren.add(child);
        let stdout = '', stderr = '', timer;
        child.stdout.on('data', data => { stdout = (stdout + data.toString()).slice(-8192); });
        child.stderr.on('data', data => { stderr = (stderr + data.toString()).slice(-8192); });
        const result = await new Promise((resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Owned second EXE did not exit naturally within 15 seconds')), 15000);
          child.once('error', error => { clearTimeout(timer); reject(error); });
          child.once('close', (code, signal) => { clearTimeout(timer); ownedChildren.delete(child); resolve({pid: child.pid, code, signal, stdout, stderr}); });
        });
        assert.equal(result.code, 0, 'Single-instance secondary must exit normally, not be killed'); assert.equal(result.signal, null);
        let primary;
        for (let n = 0; n < 50; n++) {
          primary = await app.evaluate(({BrowserWindow}) => {
            const windows = BrowserWindow.getAllWindows(), win = windows[0];
            return {events: globalThis.__desktopQASecondInstance.events, windows: windows.length, visible: win.isVisible(), minimized: win.isMinimized(), focused: win.isFocused()};
          });
          if (primary.events > 0 && primary.visible && !primary.minimized && primary.focused) break;
          await page.waitForTimeout(100);
        }
        assert.equal(primary.events, 1); assert.equal(primary.windows, 1);
        assert.equal(primary.visible, true); assert.equal(primary.minimized, false); assert.equal(primary.focused, true);
        return {secondary: result, primary};
      });
    }

    // Native resize/fullscreen/help/single-instance checks above intentionally
    // use a visible owned window. Renderer workflows below keep that same real
    // BrowserWindow transparent, unfocusable and mouse-transparent, with only
    // its own throttling disabled. Every restart uses the same isolated mode.
    isolatedInteractionMode=true;await isolateOwnedWindow();

    await check('GAMEPLAY-POINTER', 'Scaled canvas pointer events select stage one and spend real starting cash to recruit a unit.', async () => {
      await freeze(); await canvasClick(650, 60);
      for (let n = 0; n < 230 && (await state()).mainState !== 2; n++) await step(1);
      const initial = await state(); assert.equal(initial.mainState, 2); assert.equal(initial.cash, 100);
      await canvasClick(40, 90);
      assert.equal((await state()).cash, 50);
      for (let n = 0; n < 80 && !(await state()).people.some(person => person.type === 0); n++) await step(1);
      const recruited = await save('02-real-recruit');
      assert.equal(recruited.people.filter(person => person.type === 0).length, 1);
      assert.equal(recruited.people.find(person => person.type === 0).health, 50);
      return {cash: recruited.cash, force: recruited.force, soldier: recruited.people.find(person => person.type === 0)};
    });

    await check('EDITOR-PAUSE', 'F2 genuinely stops realtime simulation; Escape resumes without replaying the time spent editing.', async () => {
      await page.evaluate(() => { ZTPRuntime.useRealtime(); ZTPRuntime.start(); });
      await openEditor(); const before = await state();
      assert.equal(before.runtime.running, false); assert.equal(before.customization.paused, true);
      await page.waitForTimeout(450); const during = await state();
      assert.equal(during.ticks, before.ticks); assert.equal(during.cash, before.cash);
      assert.deepEqual(during.people, before.people); assert.deepEqual(during.zombies, before.zombies); assert.deepEqual(during.waves, before.waves);
      await closeEditor(); await freeze();
      const after = await state();
      assert.ok(after.ticks - before.ticks >= 0 && after.ticks - before.ticks <= 10, 'Editor closing must not replay 450 ms of battle ticks');
      await step(1); const next = await state();
      assert.ok(next.ticks - after.ticks >= 0 && next.ticks - after.ticks <= 10, 'First deterministic resumed frame has no backlog');
      return {beforeTicks: before.ticks, afterTicks: after.ticks, nextTicks: next.ticks};
    });

    // Deliberately synthetic storage fixture. It is not a victory, unlock, or
    // completed stage. Only this throwaway QA profile is ever touched.
    await page.evaluate(() => { WriteInt('ZTPBestScores', '0', 1234); FlushInts(); });
    const originalStorage = await storage();
    evidence.syntheticFixtures.push({name: 'Score namespace persistence', synthetic: true, notNaturalVictory: true, method: 'WriteInt/FlushInts platform API in the isolated QA profile', original: 1234, custom: 9876});

    await check('LIVE-VALUES', 'Checkbox clicks and numeric Enter/blur instantly update real existing entities, with no Apply button, while preserving the original score namespace.', async () => {
      await openEditor();
      await page.locator('#ztps-tab-units').click();
      assert.equal(await page.getByRole('button', {name: '应用本局', exact: true}).count(), 0);
      await field('config.units.0.cost', 25, 'enter'); assert.equal((await state()).units[0].cost, 25);
      await field('config.units.0.health', 100, 'blur'); assert.equal((await state()).people.find(person => person.type === 0).health, 100);
      await field('config.units.0.moveSpeed', 1);
      await page.locator('#ztps-tab-zombies').click(); await page.getByLabel('选择僵尸', {exact: true}).selectOption('3');
      await field('config.zombies.3.health', 2000); await field('config.zombies.3.moveSpeed', 0.8);
      await page.locator('#ztps-tab-sandbox').click();
      await field('rules.automaticSpawning', false); await field('rules.baseReinforcements', false);
      await field('rules.corpseSpawnOnImpact', false); assert.equal((await state()).rules.corpseSpawnOnImpact, false, 'Checkbox must immediately reach effective rules without a separate Apply');
      await field('rules.zombieTypesEnabled.3', false);
      await settled();
      await page.waitForFunction(() => Customization.getState().isCustom);
      const live = await state(), soldier = live.people.find(person => person.type === 0);
      assert.equal(live.customization.mode, 'custom'); assert.equal(live.units[0].cost, 25);
      assert.equal(soldier.health, 100); assert.equal(soldier.speed, 1); assert.deepEqual(live.records, [0, 0, 0, 0]);
      const stored = await storage();
      for (const [key, value] of Object.entries(originalStorage)) if (key.startsWith('zombie-trailer-park-0.33')) assert.equal(stored[key], value, 'Original scores must not be copied or overwritten');
      return {soldier, cost: live.units[0].cost, scoreFixture: 'Original=1234 remains untouched; custom starts at zero.'};
    });

    await check('DOCK-CONTINUE-AND-PLAY', 'A paused dock can continue realtime battle, leave the canvas usable for recruitment, then pause again without elapsed-time catch-up.', async () => {
      // Enter with a real running clock, not an earlier deterministic QA clock,
      // so releasing this editor's token exercises genuine realtime resume.
      await closeEditor(); await page.evaluate(() => { ZTPRuntime.useRealtime(); ZTPRuntime.start(); }); await openEditor();
      const paused = await state(); assert.equal(paused.customization.paused, true); assert.equal(paused.runtime.running, false);
      await togglePlayback();
      await page.waitForFunction(() => !Customization.getState().paused && ZTPRuntime.getStatus().running);
      await page.waitForTimeout(250); const moving = await state();
      assert.ok(moving.ticks > paused.ticks); assert.ok(moving.people.find(person => person.type === 0).x > paused.people.find(person => person.type === 0).x);
      assert.equal(await page.locator('.ztps-overlay').isVisible(), true, 'Continuing must keep the settings dock visible');
      const beforePurchase = await state(); await canvasClick(40, 90); const purchased = await state();
      assert.equal(purchased.force, beforePurchase.force + 1, 'Canvas click reserves one more recruit while dock is open');
      const income = Math.floor((beforePurchase.coins + (purchased.ticks - beforePurchase.ticks) * beforePurchase.buildings[1]) / 600) * 50;
      assert.equal(purchased.cash, beforePurchase.cash + income - 25, 'Real pointer interaction charges the currently configured price');
      await togglePlayback(); const again = await state();
      assert.equal(again.customization.paused, true); assert.equal(again.runtime.running, false);
      await page.waitForTimeout(450); const held = await state();
      assert.equal(held.ticks, again.ticks); assert.equal(held.cash, again.cash); assert.deepEqual(held.people, again.people); assert.deepEqual(held.zombies, again.zombies);
      await togglePlayback(); await freeze(); const resumed = await state();
      assert.ok(resumed.ticks >= held.ticks && resumed.ticks - held.ticks <= 10, 'Continue must not replay the 450 ms editor pause');
      await step(1); const firstFrame = await state(); assert.ok(firstFrame.ticks - resumed.ticks >= 0 && firstFrame.ticks - resumed.ticks <= 10);
      // Re-acquire the actual editor token before the following editing tests.
      await togglePlayback(); assert.equal((await state()).customization.paused, true);
      await save('02a-dock-paused-after-playing');
      return {pausedTicks: paused.ticks, movingTicks: moving.ticks, purchase: {before: beforePurchase.cash, after: purchased.cash}, heldTicks: held.ticks, resumedTicks: resumed.ticks};
    });

    await check('FAT-BUTTON', 'One actual Fat Zombie button click creates exactly one type-35 instance, even when automatic waves and that automatic type are disabled.', async () => {
      const before = await state();
      await page.locator('[data-spawn="3"]').click();
      const first = await state();
      assert.equal(first.zombies.filter(zombie => zombie.type === 35).length, before.zombies.filter(zombie => zombie.type === 35).length + 1);
      const fat = first.zombies.find(zombie => zombie.type === 35);
      assert.equal(fat.health, 2000); assert.equal(fat.speed, 0.8); assert.equal(fat.x, 1600); assert.ok(fat.x > first.bases.enemy.x, 'Manual zombie enters beyond the enemy base instead of teleporting ahead of base attackers');
      assert.equal(first.ticks, before.ticks, 'Clicking a spawn card must not unpause or render-advance production');
      await page.locator('[data-spawn="3"]').click();
      assert.equal((await state()).zombies.filter(zombie => zombie.type === 35).length, before.zombies.filter(zombie => zombie.type === 35).length + 2);
      await save('03-fat-spawn-editor'); return fat;
    });

    await check('SPAWN-STOP-AND-RECRUIT', 'Automatic wave queue freezes while existing spawned zombies still move and the modified recruit price is charged.', async () => {
      const before = await state(); await closeEditor(); await step(70); const after = await state();
      assert.deepEqual(after.waves, before.waves); assert.equal(after.waveTicks, before.waveTicks);
      const oldFat = before.zombies.find(zombie => zombie.type === 35), newFat = after.zombies.find(zombie => zombie.type === 35);
      assert.ok(newFat.x < oldFat.x, 'Manual fat zombie should move after the editor closes');
      const cash = after.cash; await canvasClick(40, 90); assert.equal((await state()).cash, cash - 25);
      await openEditor(); return {waveTicks: after.waveTicks, fatXBefore: oldFat.x, fatXAfter: newFat.x, recruitCost: 25};
    });

    await check('INVALID-ATOMIC', 'A negative health edit is rejected visibly without changing the current battle, effective config, or persistent session.', async () => {
      await page.locator('#ztps-tab-units').click(); const before = await state(), stored = await storage();
      const config = await page.evaluate(() => Customization.getDraft().config);
      await field('config.units.0.health', -1); await settled();
      await page.locator('.ztps-message.ztps-error').waitFor({state: 'visible'});
      assert.match(await page.locator('.ztps-message').textContent(), /生命|health/);
      assert.deepEqual(await state(), before); assert.deepEqual(await storage(), stored);
      assert.deepEqual(await page.evaluate(() => Customization.getDraft().config), config);
      await field('config.units.0.health', 100);
    });

    await check('WAVE-TABLE', 'Each wave checkbox/type/count/reorder edit hot-updates future groups immediately, retaining stable IDs and current progress; newest-first display does not reverse execution order.', async () => {
      await page.locator('#ztps-tab-levels').click();
      const waves = page.locator('.ztps-section').filter({has: page.getByRole('heading', {name: '关卡波次顺序', exact: true})});
      const before = await state();
      const untouched = await exportedDraft(), movedId = untouched.config.levels[0].waves[2].id;
      assert.equal(typeof movedId, 'string', 'Live schedules must have stable identities');
      for (let n = 0; n < 20 && !await waves.getByLabel('第 5 组启用', {exact: true}).count(); n++) await waves.getByRole('button', {name: '下一页', exact: true}).click();
      const indices = await waves.locator('tbody tr[data-wave-index]').evaluateAll(rows => rows.map(row => Number(row.dataset.waveIndex)));
      assert.ok(indices.length > 1 && indices.every((index, n) => n === 0 || index < indices[n - 1]), 'Visible rows are newest-first without changing original config indices');
      await waves.getByLabel('第 5 组启用', {exact: true}).uncheck(); await settled();
      await field('config.levels.0.waves.2.count', 3);
      await waves.getByLabel('第 3 组类型', {exact: true}).selectOption('4');
      await waves.getByLabel('第 3 组下移', {exact: true}).click();
      const draft = await exportedDraft(), selected = draft.config.levels[0].waves.filter(wave => wave.enabled !== false);
      assert.equal(draft.config.levels[0].waves[4].enabled, false);
      assert.equal(draft.config.levels[0].waves[3].id, movedId);
      assert.equal(draft.config.levels[0].waves[3].type, 4); assert.equal(draft.config.levels[0].waves[3].count, 3);
      assert.equal(before.waveProgress.current.index, 0, 'The genuine original opening group should still be in progress');
      await settled(); const after = await state();
      assert.equal(after.waveTicks, before.waveTicks); assert.deepEqual(after.waves[0], before.waves[0]);
      assert.equal(after.waveProgress.current.id, before.waveProgress.current.id);
      assert.equal(after.waveProgress.current.consumed, before.waveProgress.current.consumed);
      assert.deepEqual(after.waves.slice(1), selected.slice(1).map(wave => ({type: wave.type, count: wave.count, delay: wave.delay | 0, time: 0})));
      assert.equal(after.units[0].cost, before.units[0].cost);
      await page.getByLabel('规则名称', {exact: true}).fill(PRESET_NAME); await clickButton('保存规则');
      assert.equal(await page.evaluate(() => Customization.listPresets().length), 1);
      return {retainedCurrent: after.waveProgress.current, enabledUpcomingGroups: selected.length - 1, editedFatGroup: draft.config.levels[0].waves[3]};
    });

    await check('EXPORT-JSON', 'The actual export button produces a validated JSON file through the unchanged desktop download guard, with a QA-only save destination.', async () => {
      const destination = artifact(PRESET_FILENAME);
      await app.evaluate(({session}, filename) => {
        globalThis.__desktopQAExport = null;
        session.defaultSession.on('will-download', (_event, item) => {
          // Main's earlier security handler remains in place. This test listener
          // replaces only the interactive destination for this owned session.
          item.setSavePath(filename);
          const record = {filename: item.getFilename(), mimeType: item.getMimeType(), url: item.getURL(), state: 'pending'};
          globalThis.__desktopQAExport = record;
          item.once('done', (_event, result) => { record.state = result; record.receivedBytes = item.getReceivedBytes(); });
        });
      }, destination);
      await clickButton('导出 JSON');
      for (let n = 0; n < 100; n++) {
        const result = await app.evaluate(() => globalThis.__desktopQAExport);
        if (result?.state === 'completed') break;
        if (result && result.state !== 'pending') throw new Error('Preset download ended with ' + result.state);
        await page.waitForTimeout(100);
      }
      const result = await app.evaluate(() => globalThis.__desktopQAExport);
      assert.equal(result?.state, 'completed', 'Native download did not complete; no user interaction should be required');
      const text = await fs.readFile(destination, 'utf8'), parsed = await page.evaluate(value => Customization.importPreset(value), text);
      assert.equal(parsed.name, PRESET_NAME); assert.equal(result.filename, PRESET_FILENAME); assert.equal(parsed.config.units[0].cost, 25);
      assert.equal(parsed.config.zombies[3].health, 2000);
      return {...result, bytes: Buffer.byteLength(text), sha256: sha256(text)};
    });

    await check('EMPTY-WAVES', 'An empty schedule cancels unspawned normal waves, keeps already-spawned entities, and the schedule-only compatibility API cannot leak unrelated draft attributes.', async () => {
      const before = await state();
      const report = await page.evaluate(() => {
        const draft = Customization.getDraft().config; draft.levels[0].waves = []; draft.units[0].cost = 999;
        return Customization.applyUpcomingWaves(draft);
      });
      const after = await state();
      assert.equal(report.requiresNewBattle, false); assert.deepEqual(after.waves, []);
      assert.equal(after.waveProgress.current, null); assert.equal(after.waveProgress.remainingTotal, 0);
      assert.deepEqual(after.people, before.people); assert.deepEqual(after.zombies, before.zombies);
      assert.equal(after.units[0].cost, 25);
      return report;
    });

    await check('AUTOMATIC-TYPE-FILTER', 'Real imported wave schedule skips disabled groups, consumes banned Fat types, then spawns the allowed normal type in order.', async () => {
      const fixture = await page.evaluate(() => {
        const draft = Customization.getDraft();
        draft.config.levels[0].waves = [
          {type: 1, count: 99, delay: 0, enabled: false},
          {type: 4, count: 2, delay: 0, enabled: true},
          {type: 1, count: 1, delay: 0, enabled: true}
        ];
        draft.rules.automaticSpawning = true; draft.rules.zombieTypesEnabled[3] = false;
        return {schemaVersion: 1, name: 'Ordered filter fixture', ...draft};
      });
      await page.locator('input[type="file"]').setInputFiles({name: 'ordered-waves.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture))});
      await imported();
      await page.locator('#ztps-tab-sandbox').click();
      await Promise.all([page.waitForEvent('domcontentloaded'), clickButton('开始自定义战局')]);
      await ready(); await page.waitForFunction(() => Customization.getState().isBattle); await freeze();
      const initial = await state(); assert.equal(initial.customization.mode, 'custom');
      assert.deepEqual(initial.waves.map(wave => wave.type), [4, 1]);
      await step(115); const after = await save('04-ordered-type-filter');
      assert.equal(after.zombies.filter(zombie => zombie.type === 35).length, 0);
      assert.equal(after.zombies.filter(zombie => zombie.type === 32).length, 1);
      assert.equal(after.waves.length, 0);
      // A manual card remains deliberately independent from automatic filters.
      await openEditor(); await page.locator('[data-spawn="3"]').click();
      assert.equal((await state()).zombies.filter(zombie => zombie.type === 35).length, 1);
      return {fixtureSchedule: fixture.config.levels[0].waves, before: initial.waves, remainingGroups: after.waves.length};
    });

    await check('WAVE-CONSUMED-PROGRESS', 'After one completed group and two current spawns, committing five→four immediately leaves only two remaining, agrees with live status, and never replays completed groups.', async () => {
      const fixture = await page.evaluate(() => {
        const draft = Customization.getDraft();
        draft.config.levels[0].waves = [
          {id: 'qa-completed', type: 2, count: 1, delay: 0, enabled: true},
          {id: 'qa-current', type: 1, count: 5, delay: 0, enabled: true},
          {id: 'qa-future', type: 4, count: 1, delay: 30, enabled: true}
        ];
        draft.rules.automaticSpawning = true; draft.rules.baseReinforcements = false; draft.rules.corpseSpawnOnImpact = false;
        draft.rules.zombieTypesEnabled = [true, true, true, true, true];
        return {schemaVersion: 1, name: 'Consumed wave progress fixture', ...draft};
      });
      await importAndStart(fixture, 'consumed-wave-progress.json');
      for (let n = 0; n < 160 && (await state()).zombies.filter(zombie => zombie.type === 32).length < 2; n++) await step(1);
      const before = await state(), count = (snapshot, type) => snapshot.zombies.filter(zombie => zombie.type === type).length;
      assert.equal(count(before, 33), 1); assert.equal(count(before, 32), 2);
      assert.equal(before.waveProgress.completedGroups, 1);
      assert.deepEqual({id: before.waveProgress.current.id, total: before.waveProgress.current.total, consumed: before.waveProgress.current.consumed,
        spawned: before.waveProgress.current.spawned, remaining: before.waveProgress.current.remaining},
      {id: 'qa-current', total: 5, consumed: 2, spawned: 2, remaining: 3});
      assert.equal(before.waves[0].count, 3);
      await openEditor(); await page.locator('#ztps-tab-levels').click();
      await page.waitForFunction(() => document.querySelector('[data-wave-status]')?.textContent.includes('总量 5 · 已出 2 · 已调度 2 · 剩余 3'));
      await field('config.levels.0.waves.1.count', 4);
      assert.equal((await state()).waveProgress.current.total, 4, 'Committing a wave count instantly updates the running schedule');
      await settled(); const changed = await state();
      assert.equal(changed.waveTicks, before.waveTicks); assert.equal(changed.waves[0].time, before.waves[0].time);
      assert.deepEqual({id: changed.waveProgress.current.id, total: changed.waveProgress.current.total, consumed: changed.waveProgress.current.consumed,
        spawned: changed.waveProgress.current.spawned, remaining: changed.waveProgress.current.remaining},
      {id: 'qa-current', total: 4, consumed: 2, spawned: 2, remaining: 2});
      assert.equal(changed.waves[0].count, 2); assert.deepEqual(changed.waves.map(wave => wave.type), [1, 4]);
      await page.waitForFunction(() => {
        const text = document.querySelector('[data-wave-status]')?.textContent || '';
        return text.includes('已完成 1 组') && text.includes('队列剩余 3 次') && text.includes('总量 4 · 已出 2 · 已调度 2 · 剩余 2');
      });
      await save('04a-wave-total-four-remaining-two');
      await closeEditor();
      for (let n = 0; n < 100 && count(await state(), 32) < 4; n++) await step(1);
      await step(90); const completed = await state();
      assert.equal(count(completed, 33), 1, 'The already-completed first ghoul group must never replay');
      assert.equal(count(completed, 32), 4, 'Only two further normal zombies may spawn, not a fresh total of four');
      assert.equal(completed.waveProgress.completedGroups, 2); assert.equal(completed.waveProgress.current.id, 'qa-future');
      // Applying another future change after both preceding groups completed
      // must not reintroduce either of their IDs into the actual queue.
      await openEditor(); await field('config.levels.0.waves.2.count', 2); await settled();
      const reapplied = await state();
      assert.equal(reapplied.waveProgress.completedGroups, 2); assert.equal(reapplied.waveProgress.current.id, 'qa-future');
      assert.deepEqual(reapplied.waves.map(wave => wave.type), [4]); assert.equal(reapplied.waves[0].count, 2);
      await closeEditor(); await step(30); const later = await state();
      assert.equal(count(later, 33), 1); assert.equal(count(later, 32), 4);
      return {before: before.waveProgress, afterApply: changed.waveProgress, completed: completed.waveProgress, reapplied: reapplied.waveProgress,
        actualSpawnCounts: {ghouls: count(later, 33), normal: count(later, 32), fat: count(later, 35)}};
    });

    await check('BUILDING-LIMITS-AND-INCOME', 'Real construction reaches a live-edited sixth salvage yard, then seventh/eighth with maximum=0; every actual yard contributes to income beyond the five original drawing slots.', async () => {
      const fixture = await page.evaluate(() => {
        const draft = Customization.getDraft();
        draft.config.levels[0].startingCash = 10000; draft.config.levels[0].waves = [];
        Object.assign(draft.config.buildings[1], {cost: 1, buildTicks: 1, maximum: 5});
        draft.rules.automaticSpawning = false; draft.rules.baseReinforcements = false; draft.rules.corpseSpawnOnImpact = false;
        draft.rules.economy.salvagePayout = 50; draft.rules.economy.salvageIntervalTicks = 600;
        return {schemaVersion: 1, name: 'Real construction limits fixture', ...draft};
      });
      await importAndStart(fixture, 'construction-limits.json');
      assert.equal((await state()).buildings[1], 1);
      async function buildTo(target) {
        await canvasClick(378, 88);
        for (let n = 0; n < 20 && (await state()).buildings[1] < target; n++) await step(1);
        const result = await state(); assert.equal(result.buildings[1], target); assert.equal(result.buildingOrders[1].orders, 0); return result;
      }
      for (let target = 2; target <= 5; target++) await buildTo(target);
      const capped = await state(); await canvasClick(378, 88); const denied = await state();
      assert.equal(denied.buildings[1], 5); assert.equal(denied.buildingOrders[1].orders, 0);
      assert.equal(denied.cash, expectedIncome(capped, denied.ticks, 5).cash, 'An over-limit click must not charge cash');
      await openEditor(); await page.locator('#ztps-tab-buildings').click(); await page.getByLabel('选择建筑', {exact: true}).selectOption('1');
      await field('config.buildings.1.maximum', 6); await settled();
      assert.equal((await state()).buildingOrders[1].maximum, 6, 'Building limit change applies to this battle without restart');
      await closeEditor(); await buildTo(6);
      const sixBefore = await state(); await step(60); const sixAfter = await state(), sixExpected = expectedIncome(sixBefore, sixAfter.ticks, 6);
      assert.equal(sixAfter.cash, sixExpected.cash); assert.equal(sixAfter.coins, sixExpected.coins);
      assert.equal(sixAfter.buildings[1], 6, 'Rendering may not overwrite the real six-yard count');
      await openEditor(); await field('config.buildings.1.maximum', 0); await settled();
      assert.equal((await state()).buildingOrders[1].maximum, 0); await closeEditor(); await buildTo(7); await buildTo(8);
      const eightBefore = await state(); await step(60); const eightAfter = await save('06-buildings-unlimited'), eightExpected = expectedIncome(eightBefore, eightAfter.ticks, 8);
      assert.equal(eightAfter.cash, eightExpected.cash); assert.equal(eightAfter.coins, eightExpected.coins); assert.equal(eightAfter.buildings[1], 8);
      return {cappedCount: 5, liveLimit: 6, unlimitedCount: 8, six: {before: sixBefore, after: sixAfter, expected: sixExpected}, eight: {before: eightBefore, after: eightAfter, expected: eightExpected}};
    });

    await check('CLEAR-FIELD-TROOPS', 'Real paused friendly/enemy one-click buttons remove only on-field troops, retain both bases/orders/waves/XP/records, release only used friendly population, are idempotent, and allow queued recruits and future waves to continue.', async () => {
      const fixture = await page.evaluate(() => {
        const draft = Customization.getDraft();
        draft.config.levels[0].startingCash = 10000;
        draft.config.levels[0].waves = [{id: 'qa-clear-future', type: 1, count: 3, delay: 5, enabled: true}];
        Object.assign(draft.config.units[0], {cost: 1, buildTicks: 50, dependency: 0, people: 1});
        draft.rules.automaticSpawning = true; draft.rules.baseReinforcements = false; draft.rules.corpseSpawnOnImpact = false;
        draft.rules.zombieTypesEnabled = [true, true, true, true, true];
        return {schemaVersion: 1, name: 'Clear on-field troops fixture', ...draft};
      });
      await importAndStart(fixture, 'clear-field-troops.json');
      await canvasClick(40, 90);
      for (let n = 0; n < 80 && !(await state()).people.some(person => person.type === 0); n++) await step(1);
      assert.equal((await state()).people.filter(person => person.type === 0).length, 1, 'Recruit one real shovel worker through the canvas');
      await canvasClick(40, 90);
      assert.equal((await state()).units[0].orders, 1, 'A paid second recruit remains queued at clear time');
      await openEditor(); await page.locator('#ztps-tab-sandbox').click();
      await page.locator('[data-spawn="0"]').click(); await page.locator('[data-spawn="3"]').click();
      // The recruited worker and enemies above use actual canvas/UI controls.
      // Additional converted/angry members are explicitly synthetic fixtures,
      // built with the original methods and exact conversion list transfer.
      // This exercises cleanup coverage, not natural preacher/skill activation.
      await page.evaluate(() => {
        const g = ZTPGamePort.state.bb_Game, iterator = g.bbzombies.bbObjectEnumerator();
        let converted;
        while (iterator.bbHasNext()) { const member = iterator.bbNextObject(); if (member.bbunit.bbtype === 32) { converted = member; break; } }
        if (!converted) throw new Error('Missing real spawned zombie conversion fixture');
        g.bbzombies.bbRemove(converted); g.bbpombies.bbAddLast(converted); converted.bbTurn();
        const angry = g.bbAddPerson(g.bbunits[0]); angry.bbAnger();
      });
      evidence.syntheticFixtures.push({name: 'Clear-button converted/angry coverage', synthetic: true, notNaturalConversionOrSkill: true,
        method: 'Transfer a real UI-spawned normal zombie with original bbRemove/bbAddLast/bbTurn; create an angry worker with original bbAddPerson/bbAnger. Other soldier recruited through real canvas.'});
      const before = await state(), stored = await storage();
      assert.equal(before.customization.paused, true); assert.equal(before.runtime.running, false);
      assert.equal(before.converted.length, 1); assert.equal(before.people.filter(person => person.angry === 1).length, 1);
      assert.equal(before.people.filter(person => person.type !== 5 && !person.angry).length, 1);
      assert.equal(before.force, 2, 'One living recruit and one paid order reserve population; angry/converted do not');
      function invariant(snapshot) {
        return {ticks: snapshot.ticks, cash: snapshot.cash, coins: snapshot.coins, xp: snapshot.xp, records: snapshot.records,
          kills: snapshot.kills, lost: snapshot.lost, randomSeed: snapshot.randomSeed, bases: snapshot.bases,
          buildingOrders: snapshot.buildingOrders, units: snapshot.units, powers: snapshot.powers, effects: snapshot.effects,
          waves: snapshot.waves, waveTicks: snapshot.waveTicks, waveProgress: snapshot.waveProgress, runtime: snapshot.runtime,
          customization: snapshot.customization};
      }
      await page.locator('[data-clear-troops="friendly"]').click();
      const friendly = await state();
      assert.match(await page.locator('.ztps-message').textContent(), /3.*己方/);
      assert.deepEqual(friendly.people, [before.bases.friendly]); assert.deepEqual(friendly.converted, []);
      assert.deepEqual(friendly.zombies, before.zombies, 'Friendly clear may not affect enemy troops');
      assert.equal(friendly.force, 1, 'Only the living recruited worker releases population; the paid order remains reserved');
      assert.deepEqual(invariant(friendly), invariant(before)); assert.deepEqual(await storage(), stored);
      await page.locator('[data-clear-troops="friendly"]').click(); const repeatedFriendly = await state();
      assert.match(await page.locator('.ztps-message').textContent(), /0.*己方/); assert.deepEqual(repeatedFriendly, friendly);
      await page.locator('[data-clear-troops="enemy"]').click(); const enemy = await save('07-cleared-field-troops');
      assert.match(await page.locator('.ztps-message').textContent(), /1.*敌方/);
      assert.deepEqual(enemy.zombies, [before.bases.enemy]); assert.deepEqual(enemy.people, friendly.people); assert.deepEqual(enemy.converted, []);
      assert.equal(enemy.force, 1); assert.deepEqual(invariant(enemy), invariant(before)); assert.deepEqual(await storage(), stored);
      await page.locator('[data-clear-troops="enemy"]').click(); const repeatedEnemy = await state();
      assert.match(await page.locator('.ztps-message').textContent(), /0.*敌方/); assert.deepEqual(repeatedEnemy, enemy);
      // Release only this editor pause, then step the real original queue and
      // construction update. Clearing a field must not disable future spawns.
      await togglePlayback(); await freeze();
      assert.equal((await state()).customization.paused, false);
      for (let n = 0; n < 500 && (!(await state()).people.some(person => person.type === 0) || !(await state()).zombies.some(zombie => zombie.type === 32)); n++) await step(1);
      const resumed = await save('07a-clear-resumed-orders-and-waves');
      assert.equal(resumed.units[0].orders, 0); assert.equal(resumed.people.filter(person => person.type === 0).length, 1);
      assert.ok(resumed.zombies.some(zombie => zombie.type === 32), 'The untouched future wave must still generate real enemies');
      assert.equal(resumed.force, 1); assert.equal(resumed.xp, before.xp); assert.deepEqual(resumed.records, before.records);
      assert.deepEqual(resumed.bases, before.bases);
      await page.evaluate(() => { ZTPRuntime.useRealtime(); ZTPRuntime.start(); });
      await page.locator('[data-clear-troops="enemy"]').click(); const realtime = await state();
      assert.equal(realtime.customization.paused, false); assert.equal(realtime.runtime.running, true, 'Clearing while playing must restore the actual realtime clock');
      assert.deepEqual(realtime.zombies, [before.bases.enemy]); assert.equal(realtime.xp, before.xp);
      assert.equal(realtime.kills, before.kills); assert.equal(realtime.lost, before.lost); assert.deepEqual(realtime.records, before.records);
      await page.waitForFunction(before=>ZTPGamePort.state.bb_Game.bbgameticks>before,realtime.ticks,{timeout:5000});
      assert.ok((await state()).ticks > realtime.ticks, 'Real battle keeps advancing with the settings dock still open');
      await togglePlayback(); assert.equal((await state()).customization.paused, true);
      return {before, friendly, enemy, resumed, realtime};
    });

    await check('LARGE-HEALTH-AND-READABLE-ERROR', 'An actual friendly-base health edit above the old 100M guard applies live and survives starting a new battle; values beyond int32 are rejected visibly with the named base and unchanged battle/storage.', async () => {
      await page.locator('#ztps-tab-units').click(); await page.getByLabel('选择兵种', {exact: true}).selectOption('5');
      const before = await state();
      await field('config.units.5.health', 200000000); await settled();
      const live = await state(); assert.equal(live.units[5].health, 200000000); assert.equal(live.bases.friendly.health, 200000000);
      assert.equal(live.ticks, before.ticks); assert.equal(live.customization.paused, true);
      const stored = await storage(), effective = await page.evaluate(() => Customization.getDraft());
      await field('config.units.5.health', 2147483648); await settled();
      const message = await page.locator('.ztps-message.ztps-error').textContent();
      assert.match(message, /(?:己方|我方)基地/); assert.match(message, /生命/); assert.match(message.replace(/,/g, ''), /2147483647/);
      assert.deepEqual(await state(), live); assert.deepEqual(await storage(), stored);
      assert.deepEqual(await page.evaluate(() => Customization.getDraft()), effective);
      await screenshot(artifact('08a-large-base-health-readable-error.png'));
      await field('config.units.5.health', 200000000); await page.locator('#ztps-tab-sandbox').click();
      await Promise.all([page.waitForEvent('domcontentloaded'), clickButton('开始自定义战局')]);
      await ready(); await page.waitForFunction(() => Customization.getState().isBattle); await freeze();
      const restarted = await save('08-large-base-health-new-battle');
      assert.equal(restarted.units[5].health, 200000000); assert.equal(restarted.bases.friendly.health, 200000000);
      return {liveHealth: live.bases.friendly.health, newBattleHealth: restarted.bases.friendly.health, invalidMessage: message};
    });

    await require('./acceptanceinstant.cjs')({page, app, check, state, save, screenshot, artifact, openEditor, closeEditor, field, settled, togglePlayback, importAndStart, step, freeze, canvasClick, evidence});

    await page.evaluate(() => { WriteInt('ZTPBestScores', '0', 9876); FlushInts(); });
    const externalFile = path.join(profile, 'config', 'units.json');
    await close();
    const external = JSON.parse(await fs.readFile(externalFile, 'utf8'));
    external.units[0].name = 'QA external config survives upgrade';
    const externalBytes = Buffer.from(JSON.stringify(external, null, 2) + '\n');
    await fs.writeFile(externalFile, externalBytes);

    await check('RESTART-PERSISTENCE', 'A real app restart retains named presets/custom scores and preserves externally edited configuration instead of overwriting it.', async () => {
      await launch(); await menu(); await freeze();
      assert.equal(sha256(await fs.readFile(externalFile)), sha256(externalBytes));
      const selected = await page.evaluate(() => ({state: Customization.getState(), presets: Customization.listPresets()}));
      assert.equal(selected.state.mode, 'custom'); assert.equal(selected.state.config.units[0].name, external.units[0].name);
      assert.ok(selected.state.warnings.some(message => message.includes('外置 JSON')));
      assert.equal(selected.presets.length, 1); assert.equal(selected.presets[0].name, PRESET_NAME);
      assert.equal((await state()).records[0], 9876, 'Custom nonzero storage fixture must survive restart');
      await openEditor();
      await page.getByLabel('选择已保存的规则', {exact: true}).selectOption(selected.presets[0].id);
      assert.equal((await exportedDraft()).config.zombies[3].health, 2000);
      return {externalSha256: sha256(externalBytes), preset: selected.presets[0], customScoreFixture: 9876};
    });

    await check('RESTORE-ORIGINAL', 'The real restore-original button restores immutable baseline values and the separate original score namespace, without deleting presets or external JSON.', async () => {
      await page.locator('#ztps-tab-sandbox').click();
      await Promise.all([page.waitForEvent('domcontentloaded'), clickButton('回到原版模式')]);
      await ready(); await menu(); await freeze();
      const selected = await page.evaluate(() => Customization.getState());
      assert.equal(selected.mode, 'original'); assert.equal(selected.config.units[0].cost, 50);
      assert.equal(selected.config.units[0].name, 'Shovel Man'); assert.equal(selected.config.zombies[3].health, 1000);
      assert.equal(selected.presets.length, 1); assert.equal((await state()).records[0], 1234);
      assert.equal(sha256(await fs.readFile(externalFile)), sha256(externalBytes));
      await save('05-restored-original');
    });

    if (options.relocatedExecutable) {
      await close();
      await check('RELOCATED-INSTALL', 'A separately located installed EXE opens the same external profile and keeps presets/progress/configuration.', async () => {
        await launch(options.relocatedExecutable); await menu(); await freeze();
        const selected = await page.evaluate(() => Customization.getState());
        assert.equal(selected.mode, 'original'); assert.equal(selected.presets.length, 1);
        assert.equal((await state()).records[0], 1234); assert.equal(sha256(await fs.readFile(externalFile)), sha256(externalBytes));
        return {executable: options.relocatedExecutable, profile};
      });
    }

    await check('NO-RUNTIME-ERRORS', 'Observed boots, UI workflows, real simulation and restarts report no page errors, CSP/console errors, failed asset responses or HTTP dependencies.', async () => {
      assert.deepEqual(evidence.pageErrors, []); assert.deepEqual(evidence.consoleErrors, []);
      assert.deepEqual(evidence.badResponses, []); assert.deepEqual(evidence.failedRequests, []); assert.deepEqual(evidence.remoteRequests, []);
      assert.deepEqual((await state()).runtime.errors, []);
    });
    evidence.passed = true;
  } catch (error) {
    evidence.failure = {check: evidence.currentCheck, message: error.stack || String(error)};
    process.exitCode = 1;
    console.error(error.stack || error);
    if (page && !page.isClosed()) {
      try { evidence.inputEvents.push({check:evidence.currentCheck,launch:launchIndex,failed:true,events:await inputLog()}); } catch (_) {}
      try { evidence.failureSnapshot = await state(); } catch (_) {}
      try { await screenshot(artifact('failure.png')); } catch (_) {}
    }
  } finally {
    // Only precise child handles created above can ever be terminated. A timed
    // out secondary remains a failed check, even if this cleanup succeeds.
    for (const child of ownedChildren) {
      if (child.exitCode === null && child.signalCode === null) {
        try { child.kill(); }
        catch (error) { evidence.childCleanupFailure = String(error); evidence.passed = false; process.exitCode = 1; }
      }
    }
    try { await close(); }
    catch (error) { evidence.passed = false; evidence.closeFailure = error.stack || String(error); process.exitCode = 1; }
    evidence.finished = new Date().toISOString(); delete evidence.currentCheck;
    await fs.writeFile(artifact('report.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({passed: evidence.passed, checks: evidence.checks.length, output: out, report: artifact('report.json'), failure: evidence.failure}, null, 2));
  }
  return evidence;
}

module.exports = {inside, parseArguments, makeRunDirectory, rectanglesOverlap, expectedIncome, run, HELP, PRESET_NAME, PRESET_FILENAME};
if (require.main === module) {
  Promise.resolve().then(() => {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) { console.log(HELP); return; }
    return run(options);
  }).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}
