'use strict';

// Controlled real-Canvas diagnostics, never a user's save/profile. Every case
// gets a new browser context and frozen text sources. Run serially when using
// these CPU timings for an A/B comparison; they are not a realtime FPS claim.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const ROOT = path.resolve(__dirname, '..');
const INT_MAX = 2147483647;
const CASES = Object.freeze({
  'direct-low': {kind: 'direct', damage: 100, hits: 60},
  'direct-high': {kind: 'direct', damage: 1000000, hits: 60},
  'native-base': {kind: 'army', cross: false, count: 100, damage: 100},
  'cross-base': {kind: 'army', cross: true, count: 100, damage: 100},
  'native-base-high': {kind: 'army', cross: false, count: 20, damage: 1000000},
  'cross-base-high': {kind: 'army', cross: true, count: 20, damage: 1000000},
  'kill-friendly': {kind: 'kill', side: 'friendly', damage: INT_MAX},
  'kill-enemy': {kind: 'kill', side: 'enemy', damage: INT_MAX}
});
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const writeJSON = (out, name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n');
function distribution(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return {mean: values.reduce((a, b) => a + b, 0) / values.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))], max: sorted.at(-1)};
}
function optionsFrom(args) {
  const result = {ref: 'current', cases: Object.keys(CASES), frames: 120, warmup: 20,
    panel: 'closed', count: null, hits: null, timeout: 180000, snapshotOnly: false};
  const numeric = {frames: [1, 240], warmup: [0, 60], count: [2, 800], hits: [1, 60], timeout: [1000, 600000]};
  for (let i = 0; i < args.length; i++) {
    const [flag, inline] = args[i].split('=', 2);
    if (flag === '--help') return {...result, help: true};
    if (flag === '--snapshot-only') {result.snapshotOnly = true; continue;}
    if (!['--ref', '--case', '--frames', '--warmup', '--panel', '--count', '--hits', '--timeout'].includes(flag))
      throw new Error('Unknown option: ' + flag);
    const value = inline ?? args[++i];
    if (value === undefined) throw new Error('Missing value: ' + flag);
    const key = flag.slice(2);
    if (key in numeric) {
      const n = Number(value), [low, high] = numeric[key];
      if (!Number.isInteger(n) || n < low || n > high) throw new Error(`${flag} requires an integer ${low}..${high}`);
      result[key] = n;
    } else if (key === 'case') {
      result.cases = value === 'all' ? Object.keys(CASES) : value.split(',');
      if (!result.cases.length || result.cases.some(name => !Object.hasOwn(CASES, name))) throw new Error('Unknown case: ' + value);
    } else result[key] = value;
  }
  if (!['current', 'v0.4.2'].includes(result.ref)) throw new Error('--ref must be current or v0.4.2');
  if (!['closed', 'open', 'both'].includes(result.panel)) throw new Error('--panel must be closed, open or both');
  return result;
}
function help() {
  return ['Usage: node scripts/profile-base-damage.cjs [options]',
    '  --ref current|v0.4.2           Freeze candidate or published baseline (default current)',
    '  --case ' + Object.keys(CASES).join('|'),
    '         (comma-separated or all; default all)',
    '  --frames 120 --warmup 20       Complete real update+render frames per non-kill case',
    '  --panel closed|open|both       Default closed; each choice gets its own context',
    '  --count 100                    Override total natural-army count (default 100 low/20 high)',
    '  --hits 60                      Direct hits PER BASE, bounded to 60',
    '  --timeout 180000               Per-case deadline; owned browser/context/server cleaned in finally',
    '  --snapshot-only                Freeze and parse sources without starting browser or pressure',
    '', 'The high-damage natural cases deliberately default to 20 actors. For a heavier case,',
    'explicitly request e.g. --case cross-base-high --count 100 --frames 30.',
    'Synthetic high-HP/stationary/placed armies, waves/reinforcements disabled. Native',
    'damage, animations, update and Canvas rendering are NOT replaced or skipped.',
    'Saved native performance.now measures CPU; only the initial GAME clock is pinned',
    'to zero before switching to its real manual-clock API for deterministic A/B phase.'].join('\n');
}
function frozenSources(ref) {
  let names;
  if (ref === 'current') {
    names = ['index.html', ...fs.readdirSync(path.join(ROOT, 'src')).filter(n => /\.(js|css|json)$/.test(n)).map(n => 'src/' + n)];
    for (const directory of ['config', 'config/defaults'])
      names.push(...fs.readdirSync(path.join(ROOT, directory)).filter(n => /\.json$/.test(n)).map(n => directory + '/' + n));
    names.push('public/assets/manifest.json', 'public/assets/splash.json', 'public/vendor/box2dweb.js');
  } else {
    const listed = execFileSync('git', ['-c', 'safe.directory=' + ROOT, 'ls-tree', '-r', '--name-only', ref,
      'index.html', 'src', 'config', 'public/assets/manifest.json', 'public/assets/splash.json', 'public/vendor/box2dweb.js'],
    {cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024});
    names = listed.trim().split(/\r?\n/).filter(n => n === 'index.html' || /\.(js|css|json)$/.test(n));
  }
  return Object.fromEntries([...new Set(names)].sort().map(name => [name, ref === 'current' ? fs.readFileSync(path.join(ROOT, name), 'utf8') :
    execFileSync('git', ['-c', 'safe.directory=' + ROOT, 'show', ref + ':' + name],
      {cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024})]));
}
function verifyAssets(sources) {
  const manifest = JSON.parse(sources['public/assets/manifest.json']), result = [];
  for (const entry of [...Object.values(manifest.images), ...Object.values(manifest.sounds)]) {
    const name = entry.src.startsWith('/assets/') ? 'public' + entry.src : entry.src.replace(/^\//, '');
    if (!name.startsWith('public/assets/') || name.split('/').includes('..')) throw new Error('Unexpected asset: ' + name);
    const bytes = fs.readFileSync(path.join(ROOT, name)), sha256 = hash(bytes);
    if (bytes.length !== entry.bytes || sha256 !== entry.sha256) throw new Error('Asset bytes differ from frozen manifest: ' + name);
    result.push({name, bytes: bytes.length, sha256});
  }
  return {passed: true, count: result.length, assets: result,
    scope: 'Manifest game image/sound bytes checked against the frozen manifest; intro assets are bundled but not a measured battle.'};
}

// This function is serialized into each page; keep it closure-free. Setup uses
// supported live config/spawn APIs, not replacement combat/update functions.
function prepareCase(args) {
  const {definition, panel, warmup} = args;
  const port = ZTPGamePort, g = port.state.bb_Game;
  const items = list => {const a = [], it = list.bbObjectEnumerator(); while (it.bbHasNext()) a.push(it.bbNextObject()); return a;};
  stopRuntime(); EndMovie(); app.SetUpdateRate(60);
  // The pre-boot pinned game clock makes startMillis=0. Calling the supported
  // manual clock with zero establishes its own exact zero origin before the
  // native timer is restored for all CPU measurements.
  advanceRuntime(0);
  Object.defineProperty(performance, 'now', {value: window.__basePerfNativeNow, configurable: true});
  const c = GameConfig.getCurrent(window), r = CustomRules.snapshot(window);
  r.automaticSpawning = false; r.baseReinforcements = false; r.corpseSpawnOnImpact = false;
  r.abilities.preacherConversion = false;
  for (const level of c.levels) {level.waves = []; level.zombieDamageMultiplier = level.zombieHealthMultiplier = 1;}
  for (const kind of ['units', 'zombies']) for (const actor of c[kind].slice(0, 5)) {
    actor.health = 100000000; actor.moveSpeed = 0;
    if ('damage' in actor) actor.damage = definition.kind === 'kill' ? 100 : definition.damage;
  }
  // Distinct large maxima ensure both endpoints are tested without a casual
  // overkill ending the timed fixture. INT_MAX kill cases instead test once.
  c.units[5].health = 2000000000; c.zombies[5].health = 2100000000;
  if (definition.kind === 'kill') c[definition.side === 'friendly' ? 'units' : 'zombies'][5].health = 2147483647;
  GameConfig.updateLive(window, c); CustomRules.update(window, r); g.bbPlayGame(1);
  // One millisecond phase guard avoids floating integer boundaries; identical
  // both versions, no combat tick/animation is replaced or suppressed.
  g.bbstarttime = app.MilliSecs() - 1;
  port.setRandomSeed(0x1234567);
  const setup = {kind: definition.kind, requestedDamage: definition.damage, panel,
    baseMaxima: [g.bbpeoplebase.bbhealth, g.bbzombiebase.bbhealth], count: 0, hits: 0,
    targetGeometry: [], directResults: [], timeOrigin: app.startMillis, gameStarttime: g.bbstarttime,
    nativeTimerRestored: performance.now === window.__basePerfNativeNow};
  if (definition.kind === 'army') {
    const half = Math.floor(definition.count / 2);
    for (const [camp, count] of [['friendly', half], ['enemy', definition.count - half]]) {
      const kind = !definition.cross && camp === 'enemy' ? 'zombie' : 'unit';
      const actors = CustomRules.withManualSpawn(window, () => Factions.spawn(window, camp, {kind, type: 0}, count));
      if (actors.length !== count) throw new Error('Fixture capacity unexpectedly truncated army');
      const target = camp === 'friendly' ? g.bbzombiebase : g.bbpeoplebase;
      const boundary = target.bbxpos + target.bbunit.bbhitoffset + (camp === 'friendly' ? -1 : 1) * target.bbunit.bbhitradius;
      for (let i = 0; i < actors.length; i++) {
        const actor = actors[i], ownOffset = actor.bbunit.bbhitoffset;
        actor.bbxpos = camp === 'friendly' ? boundary - ownOffset - actor.bbunit.bbhitradius - 8 :
          boundary - ownOffset + actor.bbunit.bbhitradius + 8;
        actor.bbypos = 0; actor.bblayer = i % 8;
        setup.targetGeometry.push([camp, actor.bbunit.bbtype, actor.bbxpos, actor.bbunit.bbhitoffset,
          actor.bbunit.bbhitradius, target.bbxpos, target.bbunit.bbhitoffset, target.bbunit.bbhitradius]);
      }
      setup.count += actors.length;
    }
  }
  // Opening F2 ordinarily pauses playback; resume explicitly through its real
  // API before manual stepping. No panel setting/state is bypassed.
  if (panel && !document.querySelector('#ztps-panel').hidden) SettingsUI.resumePlayback();
  // Warm the real game/render code BEFORE the bounded direct hit fixture.
  // An army's warmup can itself deal damage, which is recorded separately.
  const baseBeforeWarmup = [g.bbpeoplebase.bbhealth, g.bbzombiebase.bbhealth];
  stepRuntime(warmup);
  setup.warmup = {frames: warmup, damage: [baseBeforeWarmup[0] - g.bbpeoplebase.bbhealth,
    baseBeforeWarmup[1] - g.bbzombiebase.bbhealth]};
  if (definition.kind === 'direct') {
    for (let n = 0; n < definition.hits; n++) {
      setup.directResults.push(['friendly', g.bbpeoplebase.bbInfect(definition.damage)]);
      setup.directResults.push(['enemy', g.bbzombiebase.bbSmack(definition.damage, 1)]);
    }
    setup.hits = definition.hits * 2;
  } else if (definition.kind === 'kill') {
    const base = definition.side === 'friendly' ? g.bbpeoplebase : g.bbzombiebase;
    setup.directResults.push([definition.side, definition.side === 'friendly' ? base.bbInfect(definition.damage) : base.bbSmack(definition.damage, 1)]);
    setup.hits = 1;
  }
  window.__basePerfCombatCapture = function () {
    return {hp: [g.bbpeoplebase.bbhealth, g.bbzombiebase.bbhealth],
      baseModes: [g.bbpeoplebase.bbmode, g.bbzombiebase.bbmode],
      ticks: g.bbgameticks, mainState: g.bbmainState, seed: port.state.bb_std_random_Seed,
      economy: [g.bbztp.bbcash, g.bbztp.bbxp, g.bbztp.bbforce, g.bbpeoplekilled, g.bbzombieskilled],
      actors: ['bbpeople', 'bbpombies', 'bbzombies'].map(key => items(g[key]).map(actor =>
        [actor.bbunit.bbtype, actor.bbxpos, actor.bbypos, actor.bbhealth, actor.bbmode,
          actor.bbhit, actor.bbdirection ?? null, actor.bbskin?.bbframe ?? null, actor.bbswing ?? null,
          actor.bbshoot ?? null, actor.bbspell ?? null, actor.bbanimrate, actor.bbwalkspeed])),
      rate: app.updateRate, gameSpeed: g.bbgamespeed};
  };
  window.__basePerfCapture = function () {
    return {...window.__basePerfCombatCapture(),
      effects: Object.fromEntries(['bbbodyparts', 'bbdeathlist', 'bbexplosions', 'bbsmokelist',
        'bbbottles', 'bbflinglist', 'bbpowerups'].map(key => [key, items(g[key]).length])),
      drawing: {frames: ZTPRuntime.diagnostics.frames, calls: ZTPRuntime.diagnostics.drawCalls}};
  };
  // Preserve and forward the complete originals, only observing CPU duration.
  const originalUpdate = app.InvokeOnUpdate, originalRender = app.InvokeOnRender;
  app.InvokeOnUpdate = function () {const start = __basePerfNativeNow(); try {return originalUpdate.apply(this, arguments);} finally {window.__basePerfUpdateMs = __basePerfNativeNow() - start;}};
  app.InvokeOnRender = function () {const start = __basePerfNativeNow(); try {return originalRender.apply(this, arguments);} finally {window.__basePerfRenderMs = __basePerfNativeNow() - start;}};
  setup.before = window.__basePerfCapture();
  if (setup.before.rate !== 60 || setup.before.gameSpeed !== 2) throw new Error('Fixture did not enter original gameplay cadence');
  if (definition.kind !== 'kill' && (setup.before.mainState !== 2 || setup.before.hp.some(n => n <= 0))) throw new Error('Base died before timed fixture');
  return setup;
}
async function sampleCase(args) {
  const rows = [], trace = [], before = __basePerfCapture(), frames = args.frames;
  for (let frame = 0; frame < frames; frame++) {
    const start = __basePerfNativeNow(); stepRuntime(1); const total = __basePerfNativeNow() - start;
    rows.push({update: window.__basePerfUpdateMs, render: window.__basePerfRenderMs, total});
    // Snapshot work and event-loop yielding are OUTSIDE the measured frame.
    trace.push(__basePerfCombatCapture());
    if (frame % 5 === 4) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return {rows, trace, before, after: __basePerfCapture()};
}
async function bounded(promise, milliseconds, label) {
  let timer;
  try {return await Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label + ' exceeded ' + milliseconds + 'ms')), milliseconds);
  })]);} finally {clearTimeout(timer);}
}
async function runCase(browser, base, sources, name, definition, panel, options, out) {
  const id = name + (panel ? '-panel-open' : '-panel-closed'), errors = [], badResponses = [], remote = [];
  const context = await browser.newContext({viewport: {width: 1600, height: 1100}});
  let closeError = null;
  try {
    // Fix only the initial game-clock origin. Save the native timer to measure
    // CPU honestly; prepareCase restores it after manualTime has been set.
    await context.addInitScript(() => {
      window.__basePerfNativeNow = performance.now.bind(performance);
      Object.defineProperty(performance, 'now', {value: () => 0, configurable: true});
    });
    await context.route('**/*', async route => {
      const u = new URL(route.request().url());
      if (u.origin !== base) {remote.push(u.href); return route.abort('blockedbyclient');}
      let key = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
      if (key.startsWith('defaults/')) key = 'config/' + key;
      if (Object.hasOwn(sources, key)) return route.fulfill({body: sources[key],
        contentType: key.endsWith('.html') ? 'text/html; charset=utf-8' : key.endsWith('.css') ? 'text/css' : key.endsWith('.json') ? 'application/json' : 'text/javascript'});
      if (key.startsWith('src/') || key.startsWith('config/')) return route.fulfill({status: 404, body: 'Not present in the frozen source snapshot'});
      return route.continue();
    });
    const page = await context.newPage(); page.setDefaultTimeout(60000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {if (response.status() >= 400) badResponses.push([response.status(), response.url()]);});
    await page.goto(base); await page.waitForFunction(() => window.gameReady === true, null, {timeout: 60000});
    await page.evaluate(() => stopRuntime());
    if (panel) await page.keyboard.press('F2');
    const setup = await page.evaluate(prepareCase, {definition, panel, warmup: definition.kind === 'kill' ? 0 : options.warmup});
    const frames = definition.kind === 'kill' ? 1 : options.frames;
    const samples = await bounded(page.evaluate(sampleCase, {frames}), options.timeout, id);
    const {before, after} = samples, tickDelta = after.ticks - before.ticks;
    if (after.rate !== 60 || after.gameSpeed !== 2) throw new Error('Cadence changed: ' + id);
    if (after.drawing.frames - before.drawing.frames !== frames) throw new Error('A full render was skipped: ' + id);
    const actorCount = state => state.actors.reduce((sum, group) => sum + group.filter(actor => ![5, 37].includes(actor[0])).length, 0);
    if (definition.kind !== 'kill') {
      if (Math.abs(tickDelta - frames * 2) > 2) throw new Error('Unexpected game tick count: ' + id);
      if (after.mainState !== 2 || after.hp.some(n => n <= 0)) throw new Error('Timed battle ended: ' + id);
      if (actorCount(after) !== (definition.kind === 'army' ? definition.count : 0)) throw new Error('An actor was lost: ' + id);
      if (definition.kind === 'army' && setup.baseMaxima[0] - after.hp[0] <= 0) throw new Error('Natural enemy army failed to damage base: ' + id);
      if (definition.kind === 'army' && setup.baseMaxima[1] - after.hp[1] <= 0) throw new Error('Natural friendly army failed to damage base: ' + id);
    } else {
      const index = definition.side === 'friendly' ? 0 : 1;
      if (after.hp[index] !== 0 || before.baseModes[index] !== 14) throw new Error('Maximum damage did not kill at full amount: ' + id);
      if (after.mainState !== (index === 0 ? 4 : 3)) throw new Error('Maximum damage did not enter original defeat/victory: ' + id);
    }
    if (setup.directResults.some(([, leftover]) => leftover !== 0)) throw new Error('Unexpected direct-hit leftover: ' + id);
    if (definition.kind === 'direct') for (let side = 0; side < 2; side++)
      if (setup.baseMaxima[side] - after.hp[side] !== definition.hits * definition.damage) throw new Error('Direct full HP damage mismatch: ' + id);
    await page.screenshot({path: path.join(out, id + '.png')});
    const semantic = {setup: {...setup, before: undefined}, before: {...before, effects: undefined, drawing: undefined},
      trace: samples.trace};
    const row = {id, definition, setup, frames, tickDelta,
      updateMs: distribution(samples.rows.map(n => n.update)), renderMs: distribution(samples.rows.map(n => n.render)),
      fullFrameMs: distribution(samples.rows.map(n => n.total)), before, after,
      damage: setup.baseMaxima.map((n, i) => n - after.hp[i]),
      combatTraceSha256: hash(JSON.stringify(semantic)), traceFile: id + '-trace.json',
      errors, badResponses, remote, scope: 'Complete real update+Canvas render CPU submission time; synthetic fixed-phase fixtures, not RAF FPS or GPU completion.'};
    writeJSON(out, id + '-trace.json', {semantic, frameSamples: samples.rows});
    if (errors.length || badResponses.length || remote.length) throw new Error('Browser/runtime/request errors: ' + id);
    return row;
  } finally {
    await context.close().catch(error => {closeError = error.message;});
    if (closeError) fs.appendFileSync(path.join(out, 'cleanup-errors.log'), id + ': ' + closeError + '\n');
  }
}
async function main(args = process.argv.slice(2)) {
  const options = optionsFrom(args);
  if (options.help) {console.log(help()); return;}
  const parent = path.join(ROOT, 'output', 'playwright'); fs.mkdirSync(parent, {recursive: true});
  const out = fs.mkdtempSync(path.join(parent, 'perf-v043-' + (options.ref === 'current' ? 'current-' : 'baseline-')));
  const sources = frozenSources(options.ref);
  writeJSON(out, 'frozen-sources.json', sources);
  const harnessSource = fs.readFileSync(__filename);
  fs.writeFileSync(path.join(out, 'frozen-harness.cjs'), harnessSource);
  const sourceHashes = Object.fromEntries(Object.entries(sources).map(([name, contents]) => [name, hash(contents)]));
  const assetVerification = verifyAssets(sources); writeJSON(out, 'asset-verification.json', assetVerification);
  const report = {passed: false, ref: options.ref, options, out, sourceHashes, harnessSha256: hash(harnessSource), measuredAt: new Date().toISOString(),
    assumptions: {browser: 'headless Microsoft Edge Chromium, isolated in-memory contexts',
      timing: 'Native performance.now frame CPU durations; no sampling profiler; not guaranteed FPS.',
      concurrency: 'Caller must serialize benchmark runs and avoid concurrent CPU tests; script cannot prove whole-system idleness.',
      clock: 'Initial game performance.now pinned at zero before runtime starts, restored after advanceRuntime(0); native timer always used for CPU durations.',
      semantics: 'Real generated damage/update/render; GameConfig stationary/high-HP fixtures, no waves/reinforcements/conversion; no unit or combat method stubbed.'},
    assetVerification: {passed: true, count: assetVerification.count}, results: [],
    cleanup: {serverClosed: null, browserClosed: null}};
  if (options.snapshotOnly) {report.snapshotOnly = true; report.passed = true; writeJSON(out, 'report.json', report); console.log(JSON.stringify({passed: true, snapshotOnly: true, out})); return report;}
  let server, browser, cleanupPromise;
  const cleanup = async () => {
    // Serialize passes, rather than memoizing the first forever: a signal can
    // arrive while browser.launch is unresolved. A later pass must also close
    // that subsequently acquired browser, not reuse an already-empty pass.
    if (cleanupPromise) await cleanupPromise;
    cleanupPromise = (async () => {
      if (browser && report.cleanup.browserClosed !== true) {try {await browser.close(); report.cleanup.browserClosed = true;} catch (error) {report.cleanup.browserClosed = false; report.cleanup.browserCloseFailure = error.message;}}
      if (server && report.cleanup.serverClosed !== true) {try {await new Promise((resolve, reject) => {server.close(error => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve()); server.closeAllConnections();}); report.cleanup.serverClosed = true;} catch (error) {report.cleanup.serverClosed = false; report.cleanup.serverCloseFailure = error.message;}}
    })();
    return cleanupPromise;
  };
  const handlers = Object.fromEntries(['SIGINT', 'SIGTERM'].map(signal => [signal, () => {
    report.interruptedBy = signal; report.passed = false;
    // Close only this script's Playwright-owned browser and loopback server.
    // Closing the context interrupts a pending evaluate even if a renderer is
    // expensive; no system process scan or user-program termination is used.
    void cleanup().finally(() => {writeJSON(out, 'report.json', report); process.exitCode = 130;});
  }]));
  for (const [signal, handler] of Object.entries(handlers)) process.on(signal, handler);
  try {
    const {createGameServer} = await import(pathToFileURL(path.join(ROOT, 'scripts/server.mjs')));
    server = createGameServer();
    await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
    if (report.interruptedBy) throw new Error('Interrupted during server startup: ' + report.interruptedBy);
    const base = 'http://127.0.0.1:' + server.address().port;
    const {chromium} = require('playwright');
    browser = await chromium.launch({channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true,
      timeout: 60000, args: ['--autoplay-policy=no-user-gesture-required']});
    if (report.interruptedBy) throw new Error('Interrupted during browser startup: ' + report.interruptedBy);
    report.browserVersion = browser.version();
    for (const name of options.cases) for (const panel of options.panel === 'both' ? [false, true] : [options.panel === 'open']) {
      const definition = {...CASES[name]};
      if (definition.kind === 'army' && options.count !== null) definition.count = options.count;
      if (definition.kind === 'direct' && options.hits !== null) definition.hits = options.hits;
      const row = await bounded(runCase(browser, base, sources, name, definition, panel, options, out), options.timeout + 120000, name + ' setup/run');
      report.results.push(row); writeJSON(out, 'report.json', report);
      console.log(JSON.stringify({ref: options.ref, case: row.id, frames: row.frames, ticks: row.tickDelta,
        effects: [row.before.effects.bbbodyparts, row.after.effects.bbbodyparts],
        meanFullMs: row.fullFrameMs.mean, p95FullMs: row.fullFrameMs.p95, damage: row.damage,
        combatTraceSha256: row.combatTraceSha256}));
    }
    report.passed = !report.interruptedBy;
  } catch (error) {report.failure = error.stack || String(error); throw error;
  } finally {
    await cleanup();
    for (const [signal, handler] of Object.entries(handlers)) process.off(signal, handler);
    if (report.cleanup.browserClosed !== true || report.cleanup.serverClosed !== true || fs.existsSync(path.join(out, 'cleanup-errors.log'))) {
      report.passed = false; report.cleanup.failure = 'Owned browser/server/context cleanup was not wholly confirmed';
    }
    writeJSON(out, 'report.json', report);
  }
  if (!report.passed) throw new Error(report.cleanup.failure || 'Benchmark interrupted');
  console.log(JSON.stringify({passed: report.passed, out})); return report;
}
if (require.main === module) main().catch(error => {console.error(error.stack || error); process.exitCode = 1;});
module.exports = {CASES, optionsFrom, frozenSources, verifyAssets, distribution, prepareCase, sampleCase, main};
