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

async function run(options) {
  const {_electron: electron} = require('playwright');
  const out = await makeRunDirectory(options.output);
  const profile = path.join(out, 'profile');
  const artifact = name => path.join(out, name);
  const evidence = {
    schemaVersion: 1, started: new Date().toISOString(), passed: false,
    executable: options.executable || require('electron'), sourceMode: !options.executable,
    output: out, profile,
    scope: 'Real Electron application, isolated persistent profile, real canvas and settings-button interaction. Manual runtime steps advance real gameplay only while the editor is closed.',
    checks: [], snapshots: {}, pageErrors: [], consoleErrors: [], badResponses: [], failedRequests: [], remoteRequests: [], dialogs: [], syntheticFixtures: [],
    notCovered: ['Natural victory and every ability/attack-animation combination.', 'Clean-machine installer, unsigned EXE reputation/SmartScreen, and visual/audio equivalence to native Flash.']
  };
  if (!options.relocatedExecutable) evidence.notCovered.push('Moving the installation directory: supply --relocated-executable to exercise a separately located installed copy.');
  if (!options.executable) evidence.notCovered.push('Packaged-EXE second-instance focus/lock: supply --executable for that native-process check.');
  let app, page, launchIndex = 0;
  const ownedChildren = new Set();
  const monitored = new WeakSet();
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
    page.setDefaultTimeout(15000);
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
    assert.equal(await page.locator('.ztps-overlay').isVisible(), false, 'Never step gameplay while its editor is open');
    await page.evaluate(n => ZTPRuntime.step(n), frames);
  }
  async function canvasClick(x, y) {
    const box = await page.locator('#game').boundingBox(); assert.ok(box, 'Canvas must have a real layout');
    await page.mouse.move(box.x + x * box.width / 800, box.y + y * box.height / 600);
    await page.mouse.down(); await step(1); await page.mouse.up();
  }
  async function state() {
    return page.evaluate(() => {
      const g = ZTPGamePort.state.bb_Game;
      function entries(list) {
        const values = [], iterator = list?.bbObjectEnumerator();
        if (iterator) while (iterator.bbHasNext()) values.push(iterator.bbNextObject());
        return values;
      }
      const entity = value => ({type: value.bbunit?.bbtype, x: value.bbxpos, y: value.bbypos, health: value.bbhealth, speed: value.bbwalkspeed, mode: value.bbmode});
      return {
        mainState: g.bbmainState, ticks: g.bbgameticks, cash: g.bbztp?.bbcash, coins: g.bbcoins,
        force: g.bbztp?.bbforce, maxForce: g.bbztp?.bbmaxforce, xp: g.bbztp?.bbxp, difficulty: g.bbdifficulty,
        records: [...g.bbrecords], people: entries(g.bbpeople).map(entity), zombies: entries(g.bbzombies).map(entity),
        units: g.bbunits.map(unit => ({cost: unit.bbcost, health: unit.bbhealth, orders: unit.bborders, busy: unit.bbbusy})),
        waves: entries(ZTPGamePort.bb_ZombieMob.bbqueue).map(wave => ({type: wave.bbtype, count: wave.bbcount, delay: wave.bbdelay, time: wave.bbtime})),
        waveTicks: ZTPGamePort.bb_ZombieMob.bbticks,
        runtime: {running: ZTPRuntime.getStatus().running, milliseconds: ZTPRuntime.getStatus().milliseconds, errors: ZTPRuntime.getStatus().diagnostics.errors},
        customization: {mode: Customization.getState().mode, paused: Customization.getState().paused, isBattle: Customization.getState().isBattle}
      };
    });
  }
  async function save(name) {
    evidence.snapshots[name] = await state();
    await page.screenshot({path: artifact(name + '.png')});
    return evidence.snapshots[name];
  }
  async function check(id, description, fn) {
    evidence.currentCheck = id;
    const started = Date.now(), details = await fn();
    evidence.checks.push({id, description, passed: true, elapsedMilliseconds: Date.now() - started, ...(details === undefined ? {} : {details})});
    console.log('PASS ' + id);
  }
  async function openEditor() {
    if (!(await page.locator('.ztps-overlay').isVisible())) await page.keyboard.press('F2');
    await page.getByRole('dialog').waitFor({state: 'visible'});
  }
  async function closeEditor() {
    if (await page.locator('.ztps-overlay').isVisible()) await page.keyboard.press('Escape');
    await page.locator('.ztps-overlay').waitFor({state: 'hidden'});
  }
  async function field(name, value) {
    const input = page.locator('[data-path="' + name + '"]');
    if (typeof value === 'boolean') await input.setChecked(value);
    else { await input.fill(String(value)); await input.dispatchEvent('change'); }
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

    await check('LIVE-VALUES', 'UI-applied cost/HP/movement changes reach real existing instances and explicitly promote the battle to the custom score namespace.', async () => {
      await openEditor();
      await page.locator('#ztps-tab-units').click();
      await field('config.units.0.cost', 25); await field('config.units.0.health', 100); await field('config.units.0.moveSpeed', 1);
      await page.locator('#ztps-tab-zombies').click(); await page.getByLabel('选择僵尸', {exact: true}).selectOption('3');
      await field('config.zombies.3.health', 2000); await field('config.zombies.3.moveSpeed', 0.8);
      await page.locator('#ztps-tab-sandbox').click();
      await field('rules.automaticSpawning', false); await field('rules.baseReinforcements', false);
      await field('rules.corpseSpawnOnImpact', false); await field('rules.zombieTypesEnabled.3', false);
      await clickButton('应用本局');
      await page.waitForFunction(() => Customization.getState().isCustom);
      const live = await state(), soldier = live.people.find(person => person.type === 0);
      assert.equal(live.customization.mode, 'custom'); assert.equal(live.units[0].cost, 25);
      assert.equal(soldier.health, 100); assert.equal(soldier.speed, 1); assert.deepEqual(live.records, [0, 0, 0, 0]);
      const stored = await storage();
      for (const [key, value] of Object.entries(originalStorage)) if (key.startsWith('zombie-trailer-park-0.33')) assert.equal(stored[key], value, 'Original scores must not be copied or overwritten');
      return {soldier, cost: live.units[0].cost, scoreFixture: 'Original=1234 remains untouched; custom starts at zero.'};
    });

    await check('FAT-BUTTON', 'One actual Fat Zombie button click creates exactly one type-35 instance, even when automatic waves and that automatic type are disabled.', async () => {
      const before = await state();
      await page.locator('[data-spawn="3"]').click();
      const first = await state();
      assert.equal(first.zombies.filter(zombie => zombie.type === 35).length, before.zombies.filter(zombie => zombie.type === 35).length + 1);
      const fat = first.zombies.find(zombie => zombie.type === 35);
      assert.equal(fat.health, 2000); assert.equal(fat.speed, 0.8); assert.equal(fat.x, 1440);
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
      await field('config.units.0.health', -1); await clickButton('应用本局');
      await page.locator('.ztps-message.ztps-error').waitFor({state: 'visible'});
      assert.match(await page.locator('.ztps-message').textContent(), /health/);
      assert.deepEqual(await state(), before); assert.deepEqual(await storage(), stored);
      assert.deepEqual(await page.evaluate(() => Customization.getDraft().config), config);
      await field('config.units.0.health', 100);
    });

    await check('WAVE-TABLE', 'UI wave enabled/count/type/order edits replace only upcoming groups; the in-flight group and timer survive.', async () => {
      await page.locator('#ztps-tab-levels').click();
      const waves = page.locator('.ztps-section').filter({has: page.getByRole('heading', {name: '关卡波次顺序', exact: true})});
      await waves.getByLabel('第 1 组启用', {exact: true}).uncheck();
      await field('config.levels.0.waves.1.count', 3);
      await waves.getByLabel('第 2 组类型', {exact: true}).selectOption('4');
      await waves.getByLabel('第 2 组下移', {exact: true}).click();
      const draft = await exportedDraft(), selected = draft.config.levels[0].waves.filter(wave => wave.enabled !== false);
      assert.equal(draft.config.levels[0].waves[0].enabled, false);
      assert.equal(draft.config.levels[0].waves[2].type, 4); assert.equal(draft.config.levels[0].waves[2].count, 3);
      const before = await state();
      await clickButton('替换本局后续队列…'); const after = await state();
      assert.equal(after.waveTicks, before.waveTicks); assert.deepEqual(after.waves[0], before.waves[0]);
      assert.deepEqual(after.waves.slice(1), selected.map(wave => ({type: wave.type, count: wave.count, delay: wave.delay | 0, time: 0})));
      assert.equal(after.units[0].cost, before.units[0].cost);
      await page.getByLabel('规则名称', {exact: true}).fill(PRESET_NAME); await clickButton('保存规则');
      assert.equal(await page.evaluate(() => Customization.listPresets().length), 1);
      return {retainedCurrent: after.waves[0], enabledUpcomingGroups: selected.length, editedFatGroup: draft.config.levels[0].waves[2]};
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

    await check('EMPTY-WAVES', 'An explicitly empty future schedule is accepted safely for sandbox use and cannot leak unrelated draft attributes into the live battle.', async () => {
      const before = await state();
      const report = await page.evaluate(() => {
        const draft = Customization.getDraft().config; draft.levels[0].waves = []; draft.units[0].cost = 999;
        return Customization.applyUpcomingWaves(draft);
      });
      const after = await state();
      assert.equal(report.upcomingGroups, 0); assert.deepEqual(after.waves, before.waves.slice(0, 1));
      assert.equal(after.units[0].cost, 25); assert.equal(after.waveTicks, before.waveTicks);
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
      await page.locator('.ztps-message').filter({hasText: '导入校验通过'}).waitFor();
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
      try { evidence.failureSnapshot = await state(); } catch (_) {}
      try { await page.screenshot({path: artifact('failure.png')}); } catch (_) {}
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

module.exports = {inside, parseArguments, makeRunDirectory, run, HELP, PRESET_NAME, PRESET_FILENAME};
if (require.main === module) {
  Promise.resolve().then(() => {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) { console.log(HELP); return; }
    return run(options);
  }).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}
