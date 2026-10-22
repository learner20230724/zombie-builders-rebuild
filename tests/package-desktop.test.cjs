'use strict';

// Synthetic fixtures and an injected packager only: never download or start Electron.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const {ELECTRON_VERSION, desktopReadme, collectDesktopFiles, collectPackagedDirectory,
  renameDirectoryWithRetry, buildDesktopPackage, parseArguments} = require('../scripts/package-desktop.cjs');

const PROJECT = path.resolve(__dirname, '..');
const BASE = path.join(PROJECT, 'output');
const SOURCE_NAMES = ['boot.js', 'data.js', 'game-config.js', 'generated-game.js', 'physics.js', 'runtime.js'];
const CONFIG_NAMES = ['units.json', 'zombies.json', 'buildings.json', 'powers.json', 'levels.json'];
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

function checkRealParents(filename) {
  const resolved = path.resolve(filename);
  const parsed = path.parse(resolved);
  let current = parsed.root;
  for (const part of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) fs.mkdirSync(current);
    const stat = fs.lstatSync(current);
    assert(stat.isDirectory() && !stat.isSymbolicLink(), `Fixture parent must be a real directory: ${current}`);
  }
}

function fixture(t) {
  checkRealParents(BASE);
  const root = fs.mkdtempSync(path.join(BASE, 'desktop-package-test-'));
  t.after(() => {
    checkRealParents(BASE);
    assert(path.basename(root).startsWith('desktop-package-test-'));
    assert.equal(path.dirname(root), BASE);
    assert(fs.lstatSync(root).isDirectory() && !fs.lstatSync(root).isSymbolicLink());
    const relative = path.relative(fs.realpathSync(BASE), fs.realpathSync(root));
    assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    fs.rmSync(root, {recursive: true, force: true});
  });
  const write = (name, contents) => {
    const filename = path.join(root, ...name.split('/'));
    fs.mkdirSync(path.dirname(filename), {recursive: true});
    fs.writeFileSync(filename, contents);
    return filename;
  };
  const pkg = {name: 'synthetic-desktop-fixture', version: '0.3.0', release: {name: 'zombie-builders'},
    private: true, type: 'commonjs', license: 'UNLICENSED', description: 'Synthetic fixture only.',
    scripts: {start: 'node scripts/server.mjs', recover: 'private'},
    devDependencies: {electron: ELECTRON_VERSION, '@electron/packager': '20.3.0'}};
  write('package.json', JSON.stringify(pkg));
  for (const name of ['index.html', 'scripts/server.mjs', 'public/vendor/box2dweb.js', 'public/vendor/BOX2D-LICENSE.txt',
    'README.md', 'README.zh-CN.md', 'THIRD_PARTY_NOTICES.md', 'desktop/main.cjs', 'desktop/protocol.cjs',
    'config/README.md', 'docs/DEVELOPMENT.md', 'docs/DEVELOPMENT.zh-CN.md', 'licenses/Node.js-LICENSE.txt',
    ...SOURCE_NAMES.map(name => 'src/' + name), ...CONFIG_NAMES.map(name => 'config/' + name)])
    write(name, `Synthetic fixture: ${name}\n`);
  write('public/assets/images/sprite.png', 'test image');
  write('public/assets/sounds-pcm/beep.wav', 'test sound');
  write('public/assets/splash/frame.png', 'test splash');
  write('public/assets/splash/intro.wav', 'test intro');
  write('public/assets/manifest.json', JSON.stringify({images: {sprite: {src: '/assets/images/sprite.png'}},
    sounds: {beep: {src: '/assets/sounds-pcm/beep.wav'}}}));
  write('public/assets/splash.json', JSON.stringify({frames: [{src: '/assets/splash/frame.png'}],
    sounds: [{src: '/assets/splash/intro.wav'}]}));
  for (const name of ['.git/private', 'node_modules/private/index.js', 'research/private.txt', 'original/game.exe',
    'original/game.swf', 'private/secret.txt', 'public/assets/images/unused.png', 'desktop/private.txt']) write(name, 'PRIVATE');
  return {root, write, pkg};
}

function fakePackager(onOptions) {
  return async options => {
    onOptions?.(options);
    const directory = path.join(options.out, `${options.name}-win32-x64`);
    fs.mkdirSync(directory);
    const app = path.join(directory, 'resources', 'app');
    fs.mkdirSync(app, {recursive: true});
    // Keep the fixture copy independent of the native fs.cp implementation.
    for (const entry of collectPackagedDirectory(options.dir)) {
      const filename = path.join(app, ...entry.name.split('/'));
      fs.mkdirSync(path.dirname(filename), {recursive: true});
      fs.writeFileSync(filename, entry.data);
    }
    for (const name of ['ZombieBuilders.exe', 'LICENSE', 'LICENSES.chromium.html', 'locales/en-US.pak',
      'ffmpeg.dll', 'resources.pak', 'icudtl.dat', 'v8_context_snapshot.bin']) {
      fs.mkdirSync(path.dirname(path.join(directory, name)), {recursive: true});
      fs.writeFileSync(path.join(directory, name), `Synthetic Electron runtime: ${name}\n`);
    }
    return [directory];
  };
}

// Independent central directory reader; the shared ZIP writer has separate CRC/header tests.
function unpack(archive) {
  const end = archive.length - 22;
  assert.equal(archive.readUInt32LE(end), 0x06054b50);
  const files = new Map();
  let cursor = archive.readUInt32LE(end + 16);
  for (let count = archive.readUInt16LE(end + 10); count > 0; count--) {
    assert.equal(archive.readUInt32LE(cursor), 0x02014b50);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const name = archive.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    const local = archive.readUInt32LE(cursor + 42);
    const start = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
    const bytes = archive.subarray(start, start + archive.readUInt32LE(cursor + 20));
    const method = archive.readUInt16LE(cursor + 10);
    assert([0, 8].includes(method));
    const data = method === 8 ? zlib.inflateRawSync(bytes) : bytes;
    assert.equal(data.length, archive.readUInt32LE(cursor + 24));
    files.set(name, data);
    cursor += 46 + nameLength + archive.readUInt16LE(cursor + 30) + archive.readUInt16LE(cursor + 32);
  }
  assert.equal(cursor, end);
  return files;
}

test('desktop staging contains exact runtime/config and two desktop sources, not web launchers or developer tools', t => {
  const input = fixture(t);
  const {pkg, entries} = collectDesktopFiles(input.root);
  assert.equal(pkg.version, '0.3.0');
  const files = new Map(entries.map(entry => [entry.name, entry.data]));
  for (const name of ['desktop/main.cjs', 'desktop/protocol.cjs', 'src/generated-game.js', 'src/game-config.js',
    'config/README.md', 'docs/DEVELOPMENT.md', 'docs/DEVELOPMENT.zh-CN.md', 'README.md', 'README.zh-CN.md',
    'THIRD_PARTY_NOTICES.md', 'public/assets/images/sprite.png', ...CONFIG_NAMES.map(name => 'config/' + name)])
    assert(files.has(name), `Missing ${name}`);
  for (const name of ['scripts/server.mjs', 'Start-Game.cmd', 'licenses/Node.js-LICENSE.txt', 'desktop/private.txt',
    'public/assets/images/unused.png']) assert(!files.has(name), `Unexpected ${name}`);
  assert(![...files.keys()].some(name => /^(?:\.git|node_modules|research|original|private)\//.test(name)));
  const metadata = JSON.parse(files.get('package.json'));
  assert.equal(metadata.main, 'desktop/main.cjs');
  assert.equal(metadata.type, 'commonjs');
  assert.equal(metadata.version, pkg.version);
  for (const name of ['scripts', 'dependencies', 'devDependencies', 'engines', 'release']) assert(!Object.hasOwn(metadata, name));
  assert.deepEqual(files.get('config/units.json'), fs.readFileSync(path.join(input.root, 'config/units.json')));
});

test('desktop packaging uses pinned win32-x64 Electron and retains all supplied runtime binaries/notices', async t => {
  const input = fixture(t);
  let observed;
  const result = await buildDesktopPackage({root: input.root, packager: fakePackager(options => { observed = options; })});
  assert.equal(observed.electronVersion, ELECTRON_VERSION);
  assert.equal(observed.platform, 'win32'); assert.equal(observed.arch, 'x64');
  assert.equal(observed.name, 'ZombieBuilders'); assert.equal(observed.executableName, 'ZombieBuilders');
  assert.equal(observed.asar, false); assert.equal(observed.prune, true); assert.equal(observed.overwrite, false);
  assert.equal(observed.win32metadata.ProductName, '建筑工大战僵尸');
  assert.equal(result.installationDir, path.join(input.root, 'output', 'desktop-v0.3.0'));
  assert.equal(result.executablePath, path.join(result.installationDir, 'ZombieBuilders.exe'));
  assert(fs.existsSync(result.executablePath));
  assert.equal(result.package.filename, 'zombie-builders-desktop-win-x64-v0.3.0.zip');
  const archive = fs.readFileSync(result.package.path);
  assert.equal(result.package.sha256, hash(archive));
  assert.equal(result.package.bytes, archive.length);
  assert.equal(fs.readFileSync(result.checksumsPath, 'utf8'), `${hash(archive)}  ${result.package.filename}\n`);
  assert.equal(path.basename(result.checksumsPath), 'desktop-checksums.txt');
  const files = unpack(archive);
  for (const name of ['ZombieBuilders.exe', 'LICENSE', 'LICENSES.chromium.html', 'locales/en-US.pak', 'ffmpeg.dll',
    'resources.pak', 'icudtl.dat', 'v8_context_snapshot.bin', 'DESKTOP-RUN.txt',
    'resources/app/desktop/main.cjs', 'resources/app/desktop/protocol.cjs', 'resources/app/config/units.json'])
    assert(files.has(name), `Missing runtime ${name}`);
  assert.equal(files.size, result.package.files);
  assert.equal([...files.values()].reduce((sum, data) => sum + data.length, 0), result.package.uncompressedBytes);
  assert(!files.has('resources/app/scripts/server.mjs'));
  assert(files.get('DESKTOP-RUN.txt').toString().includes('%APPDATA%\\ZombieBuilders\\config'));
  assert.deepEqual(files.get('resources/app/config/units.json'), fs.readFileSync(path.join(input.root, 'config/units.json')));
});

test('existing installation and custom configuration are untouched; subsequent install gets a unique directory', async t => {
  const input = fixture(t);
  const marker = input.write('output/desktop-v0.3.0/custom-config.json', 'CUSTOM CONFIG');
  input.write('output/releases/checksums.txt', 'existing web release checksums');
  const result = await buildDesktopPackage({root: input.root, packager: fakePackager()});
  assert.notEqual(result.installationDir, path.dirname(marker));
  assert(result.installationDir.startsWith(path.dirname(marker) + '-'));
  assert.equal(fs.readFileSync(marker, 'utf8'), 'CUSTOM CONFIG');
  assert.equal(fs.readFileSync(path.join(input.root, 'output/releases/checksums.txt'), 'utf8'), 'existing web release checksums');
  assert(fs.existsSync(result.executablePath));
});

test('fixed archives/checksums cannot be overwritten and are checked before invoking packager', async t => {
  const input = fixture(t);
  const archive = input.write('output/releases/zombie-builders-desktop-win-x64-v0.3.0.zip', 'existing archive');
  let calls = 0;
  const options = {root: input.root, packager: async () => { calls++; }};
  await assert.rejects(buildDesktopPackage(options), /Refusing to overwrite/);
  assert.equal(calls, 0); assert.equal(fs.readFileSync(archive, 'utf8'), 'existing archive');
  await assert.rejects(buildDesktopPackage({...options, outputDir: input.root}), /must stay inside/);
  assert.equal(calls, 0);
});

test('unexpected packager paths, missing notices, and mutated staged files are rejected', async t => {
  const input = fixture(t);
  await assert.rejects(buildDesktopPackage({root: input.root, packager: async () => [input.root]}), /unexpected desktop output path/);
  await assert.rejects(buildDesktopPackage({root: input.root, packager: async options => {
    const result = await fakePackager()(options);
    fs.unlinkSync(path.join(result[0], 'LICENSES.chromium.html'));
    return result;
  }}), /missing LICENSES/);
  await assert.rejects(buildDesktopPackage({root: input.root, packager: async options => {
    const result = await fakePackager()(options);
    fs.writeFileSync(path.join(result[0], 'resources/app/config/units.json'), 'mutated');
    return result;
  }}), /differs from staging: config\/units.json/);
  await assert.rejects(buildDesktopPackage({root: input.root, packager: async options => {
    const result = await fakePackager()(options);
    fs.writeFileSync(path.join(result[0], 'resources/app/private.txt'), 'unexpected');
    return result;
  }}), /Unexpected application file/);
});

test('desktop collector refuses symlinked files and output ancestors', async t => {
  const input = fixture(t);
  const linkedDirectory = path.join(input.root, 'linked');
  fs.symlinkSync(path.join(input.root, 'desktop'), linkedDirectory, 'junction');
  assert.throws(() => collectPackagedDirectory(linkedDirectory), /real directories/);
  const redirected = input.write('redirect-target/keep.txt', 'untouched');
  fs.mkdirSync(path.join(input.root, 'output'));
  const output = path.join(input.root, 'output/releases');
  fs.symlinkSync(path.dirname(redirected), output, 'junction');
  await assert.rejects(buildDesktopPackage({root: input.root, packager: fakePackager()}), /real directories/);
  assert.equal(fs.readFileSync(redirected, 'utf8'), 'untouched');
});

test('CLI rejects unknown/missing arguments and accepts only scoped build options', () => {
  assert.deepEqual(parseArguments(['--output', 'output/test', '--electron-zip-dir', 'cache']),
    {outputDir: 'output/test', electronZipDir: 'cache'});
  assert.deepEqual(parseArguments(['--help']), {help: true});
  assert.throws(() => parseArguments(['--output']), /Missing value/);
  assert.throws(() => parseArguments(['--electron-zip-dir', '--help']), /Missing value/);
  assert.throws(() => parseArguments(['--unknown']), /Unknown argument/);
});

test('bilingual desktop instructions distinguish a standalone window from the older browser launcher', () => {
  const text = desktopReadme({version: '0.3.0'}).toString('utf8');
  for (const expected of ['ZombieBuilders.exe', 'Windows x64', 'No browser', '无需浏览器', '%APPDATA%\\ZombieBuilders',
    'does not overwrite', '不会覆盖', '重新启动', 'LICENSES.chromium.html']) assert(text.includes(expected));
  assert(!text.includes('Start-Game.cmd'));
});

test('directory rename retries transient Windows locks with bounded asynchronous backoff', async t => {
  const input = fixture(t);
  const marker = input.write('output/build-source/keep.txt', 'source bytes');
  const source = path.dirname(marker);
  const destination = path.join(input.root, 'output', 'install-target');
  const delays = [];
  let calls = 0;
  await renameDirectoryWithRetry(source, destination, {
    boundary: path.join(input.root, 'output'),
    rename: async (from, to) => {
      assert.equal(from, source); assert.equal(to, destination);
      calls++;
      if (calls <= 2) throw Object.assign(new Error('temporary scanner lock'), {code: calls === 1 ? 'EPERM' : 'EBUSY'});
      await fs.promises.rename(from, to);
    },
    sleep: async milliseconds => { delays.push(milliseconds); }
  });
  assert.equal(calls, 3);
  assert.deepEqual(delays, [50, 100]);
  assert(!fs.existsSync(source));
  assert.equal(fs.readFileSync(path.join(destination, 'keep.txt'), 'utf8'), 'source bytes');
});

test('directory rename does not swallow permanent errors or delete its unchanged source', async t => {
  const input = fixture(t);
  const marker = input.write('output/build-source/keep.txt', 'source bytes');
  const source = path.dirname(marker);
  const destination = path.join(input.root, 'output', 'install-target');
  const failure = Object.assign(new Error('cross-device move is not allowed'), {code: 'EXDEV'});
  let calls = 0;
  await assert.rejects(renameDirectoryWithRetry(source, destination, {
    boundary: path.join(input.root, 'output'),
    rename: async () => { calls++; throw failure; },
    sleep: async () => { assert.fail('permanent errors must not sleep/retry'); }
  }), error => error === failure);
  assert.equal(calls, 1);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'source bytes');
  assert(!fs.existsSync(destination));
});

test('directory rename stops at its attempt limit and preserves the original transient error/source', async t => {
  const input = fixture(t);
  const marker = input.write('output/build-source/keep.txt', 'source bytes');
  const source = path.dirname(marker);
  const destination = path.join(input.root, 'output', 'install-target');
  const failure = Object.assign(new Error('lock never released'), {code: 'EPERM'});
  let calls = 0;
  const delays = [];
  await assert.rejects(renameDirectoryWithRetry(source, destination, {
    boundary: path.join(input.root, 'output'), maxAttempts: 4, baseDelayMs: 10, maxDelayMs: 20,
    rename: async () => { calls++; throw failure; },
    sleep: async milliseconds => { delays.push(milliseconds); }
  }), error => error === failure);
  assert.equal(calls, 4);
  assert.deepEqual(delays, [10, 20, 20]);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'source bytes');
  assert(!fs.existsSync(destination));
});

test('directory rename never overwrites a destination created during the retry delay', async t => {
  const input = fixture(t);
  const marker = input.write('output/build-source/keep.txt', 'source bytes');
  const source = path.dirname(marker);
  const destination = path.join(input.root, 'output', 'install-target');
  let calls = 0;
  await assert.rejects(renameDirectoryWithRetry(source, destination, {
    boundary: path.join(input.root, 'output'),
    rename: async () => { calls++; throw Object.assign(new Error('temporary lock'), {code: 'EPERM'}); },
    sleep: async () => {
      fs.mkdirSync(destination);
      fs.writeFileSync(path.join(destination, 'existing.txt'), 'existing installation');
    }
  }), /Refusing to overwrite/);
  assert.equal(calls, 1);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'source bytes');
  assert.equal(fs.readFileSync(path.join(destination, 'existing.txt'), 'utf8'), 'existing installation');
});

test('directory rename rejects escaped paths and redirected destination parents before moving anything', async t => {
  const input = fixture(t);
  const marker = input.write('output/build-source/keep.txt', 'source bytes');
  const source = path.dirname(marker);
  let calls = 0;
  const options = {boundary: path.join(input.root, 'output'), rename: async () => { calls++; }};
  await assert.rejects(renameDirectoryWithRetry(source, path.join(input.root, 'escaped'), options), /output boundary/);
  input.write('outside-parent/keep.txt', 'other bytes');
  fs.symlinkSync(path.join(input.root, 'outside-parent'), path.join(input.root, 'output', 'linked'), 'junction');
  await assert.rejects(renameDirectoryWithRetry(source, path.join(input.root, 'output', 'linked', 'target'), options), /real directories/);
  assert.equal(calls, 0);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'source bytes');
});
