'use strict';

// These tests create tiny synthetic fixtures only. They never start the game,
// a server, a browser, Flash, or the supplied runtime executable.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const {spawnSync} = require('node:child_process');
const {crc32, validateArchiveName, createZipBuffer, collectRuntimeFiles, makeWindowsLauncher,
  buildReleasePackages, parseArguments} = require('../scripts/package-release.cjs');

const TEST_BASE = path.resolve(__dirname, '..', 'output');
const SOURCE_NAMES = ['boot.js', 'data.js', 'game-config.js', 'generated-game.js', 'physics.js', 'runtime.js'];
const CONFIG_NAMES = ['units.json', 'zombies.json', 'buildings.json', 'powers.json', 'levels.json'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function prepareTestBase() {
  const parsed = path.parse(TEST_BASE);
  let current = parsed.root;
  for (const part of TEST_BASE.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      fs.mkdirSync(current);
      stat = fs.lstatSync(current);
    }
    assert(!stat.isSymbolicLink() && stat.isDirectory(), `Fixture ancestors must be real directories: ${current}`);
  }
  const realProject = fs.realpathSync(path.resolve(__dirname, '..'));
  const relative = path.relative(realProject, fs.realpathSync(TEST_BASE));
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Fixture output must remain inside the real project');
}

function independentCrc(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

// Independent reader validates both headers, raw DEFLATE, CRC, sizes, and offsets.
function unzipFixture(archive) {
  const end = archive.length - 22;
  assert.equal(archive.readUInt32LE(end), 0x06054b50);
  assert.equal(archive.readUInt16LE(end + 4), 0);
  assert.equal(archive.readUInt16LE(end + 6), 0);
  const count = archive.readUInt16LE(end + 10);
  assert.equal(archive.readUInt16LE(end + 8), count);
  assert.equal(archive.readUInt16LE(end + 20), 0);
  const directoryOffset = archive.readUInt32LE(end + 16);
  const directoryEnd = directoryOffset + archive.readUInt32LE(end + 12);
  assert.equal(directoryEnd, end);
  let cursor = directoryOffset;
  const result = new Map();
  for (let index = 0; index < count; index++) {
    assert.equal(archive.readUInt32LE(cursor), 0x02014b50);
    const flags = archive.readUInt16LE(cursor + 8);
    const method = archive.readUInt16LE(cursor + 10);
    const checksum = archive.readUInt32LE(cursor + 16);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const size = archive.readUInt32LE(cursor + 24);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const offset = archive.readUInt32LE(cursor + 42);
    const name = archive.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    assert.equal(flags, 0x0800, 'UTF-8, no data descriptors or encryption');
    assert.equal(archive.readUInt16LE(cursor + 12), 0, 'fixed DOS time');
    assert.equal(archive.readUInt16LE(cursor + 14), 0x21, 'fixed DOS date');
    assert.equal(archive.readUInt32LE(cursor + 38) >>> 28, 8, 'regular file, not symlink');
    assert.equal(archive.readUInt32LE(offset), 0x04034b50);
    assert.equal(archive.readUInt16LE(offset + 6), flags);
    assert.equal(archive.readUInt16LE(offset + 8), method);
    assert.equal(archive.readUInt32LE(offset + 14), checksum);
    assert.equal(archive.readUInt32LE(offset + 18), compressedSize);
    assert.equal(archive.readUInt32LE(offset + 22), size);
    assert.equal(archive.readUInt16LE(offset + 26), nameLength);
    const localExtra = archive.readUInt16LE(offset + 28);
    assert.equal(archive.toString('utf8', offset + 30, offset + 30 + nameLength), name);
    const start = offset + 30 + nameLength + localExtra;
    assert(start + compressedSize <= directoryOffset);
    const compressed = archive.subarray(start, start + compressedSize);
    assert([0, 8].includes(method));
    const data = method === 8 ? zlib.inflateRawSync(compressed) : compressed;
    assert.equal(data.length, size);
    assert.equal(independentCrc(data), checksum);
    result.set(name, {data, method, flags});
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  assert.equal(cursor, directoryEnd);
  return result;
}

function fixture(t) {
  prepareTestBase();
  const root = fs.mkdtempSync(path.join(TEST_BASE, 'package-test-'));
  t.after(() => {
    prepareTestBase();
    const resolved = path.resolve(root);
    const relative = path.relative(TEST_BASE, resolved);
    assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    assert(path.basename(resolved).startsWith('package-test-'));
    assert(!fs.lstatSync(resolved).isSymbolicLink(), 'Do not recursively delete a redirected fixture');
    const realRelative = path.relative(fs.realpathSync(TEST_BASE), fs.realpathSync(resolved));
    assert(realRelative && !realRelative.startsWith('..') && !path.isAbsolute(realRelative));
    fs.rmSync(resolved, {recursive: true, force: true});
  });
  const write = (name, data) => {
    const filename = path.join(root, ...name.split('/'));
    fs.mkdirSync(path.dirname(filename), {recursive: true});
    fs.writeFileSync(filename, data);
    return filename;
  };
  const pkg = {name: 'fixture-reconstruction', version: '0.2.0', release: {name: 'zombie-builders'},
    type: 'commonjs', license: 'UNLICENSED', engines: {node: '>=20'},
    scripts: {start: 'node scripts/server.mjs', test: 'node private/tests.cjs', build: 'node scripts/recover.cjs'}};
  write('package.json', JSON.stringify(pkg));
  for (const name of ['index.html', 'scripts/server.mjs', 'public/vendor/box2dweb.js', 'public/vendor/BOX2D-LICENSE.txt',
    'README.md', 'README.zh-CN.md', 'THIRD_PARTY_NOTICES.md', 'LICENSE',
    ...SOURCE_NAMES.map(name => 'src/' + name), ...CONFIG_NAMES.map(name => 'config/' + name)])
    write(name, `Synthetic fixture only: ${name}\n`);
  const image = Buffer.from([137, 80, 78, 71]);
  write('public/assets/images/sprite.png', image);
  write('public/assets/sounds-pcm/sound.wav', Buffer.from([82, 73, 70, 70]));
  write('public/assets/splash/frame.png', 'synthetic splash');
  write('public/assets/splash/intro.wav', 'synthetic audio');
  const manifest = {images: {sprite: {src: '/public/assets/images/sprite.png', bytes: image.length, sha256: hash(image)}},
    sounds: {sound: {src: '/public/assets/sounds-pcm/sound.wav'}}};
  write('public/assets/manifest.json', JSON.stringify(manifest));
  write('public/assets/splash.json', JSON.stringify({frames: [{src: '/assets/splash/frame.png'}],
    sounds: [{src: '/assets/splash/intro.wav'}]}));
  for (const name of ['.git/private.txt', 'private/secret.txt', 'data/raw.json', 'docs/recovery.md',
    'original/game.exe', 'original/game.swf', 'scripts/recover.cjs', 'tests/internal.test.cjs',
    'public/assets/manifest-canonical.json', 'public/assets/images/unused.png']) write(name, 'DO NOT DISTRIBUTE');
  // An intentionally non-executable synthetic PE header; never invoke it.
  const pe = Buffer.alloc(128);
  pe.write('MZ'); pe.writeUInt32LE(64, 0x3c); pe.writeUInt32LE(0x00004550, 64); pe.writeUInt16LE(0x8664, 68);
  const nodeBinary = write('fixture-runtime/node.exe', pe);
  const license = Buffer.from('Node.js synthetic test fixture, not an actual distribution license.\r\nThird-party notice bytes: \xc2\xa9\r\n');
  const nodeLicense = write('fixture-runtime/LICENSE', license);
  return {root, write, pkg, manifest, nodeBinary, nodeLicense, license, pe};
}

test('CRC-32 uses the ZIP/IEEE polynomial', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  assert.equal(crc32(Buffer.alloc(0)), 0);
});

test('ZIP uses stable sorted UTF-8 filenames, valid headers/CRC, stored and DEFLATE data', () => {
  const entries = [{name: 'z-empty.txt', data: ''}, {name: '中文/说明.txt', data: 'repeat '.repeat(200)},
    {name: 'a-binary.bin', data: Buffer.from(Array.from({length: 256}, (_, index) => index))}];
  const archive = createZipBuffer(entries);
  assert.deepEqual(archive, createZipBuffer([...entries].reverse()));
  const unpacked = unzipFixture(archive);
  assert.deepEqual([...unpacked.keys()], ['a-binary.bin', 'z-empty.txt', '中文/说明.txt']);
  assert.equal(unpacked.get('中文/说明.txt').method, 8);
  assert.equal(unpacked.get('a-binary.bin').method, 0);
  assert.equal(unpacked.get('z-empty.txt').method, 0);
  for (const entry of entries) assert.deepEqual(unpacked.get(entry.name).data, Buffer.from(entry.data));
  assert.equal(unzipFixture(createZipBuffer([])).size, 0);
});

test('ZIP rejects unsafe, ambiguous, duplicate, malformed Unicode, and oversized names', () => {
  for (const name of ['../a', '/a', 'C:/a', 'a\\b', 'a/../b', 'a//b', './a', 'a/', 'a\0b', 'CON.txt', 'a./b', 'a /b'])
    assert.throws(() => createZipBuffer([{name, data: 'x'}]), /Unsafe/);
  assert.throws(() => validateArchiveName('\ud800'), /Unicode/);
  assert.throws(() => validateArchiveName('中'.repeat(21846)), /65535/);
  for (const names of [['a', 'a'], ['a.txt', 'A.txt'], ['é.txt', 'e\u0301.txt'], ['a', 'a/b'], ['A', 'a/b']])
    assert.throws(() => createZipBuffer(names.map(name => ({name, data: 'x'}))), /collision|colliding|Duplicate/);
  assert.throws(() => createZipBuffer(Array(0xffff)), /ZIP64/);
  assert.throws(() => createZipBuffer([{name: 'a'}]), /Missing file bytes/);
});

test('CLI accepts explicit runtime inputs and web-only without silent unknown options', () => {
  assert.deepEqual(parseArguments(['--output', 'out', '--node-binary', 'node.exe', '--node-license', 'LICENSE', '--web-only']),
    {outputDir: 'out', nodeBinary: 'node.exe', nodeLicense: 'LICENSE', webOnly: true});
  assert.deepEqual(parseArguments(['--help']), {help: true});
  assert.throws(() => parseArguments(['--output']), /Missing value/);
  assert.throws(() => parseArguments(['--node-binary', '--web-only']), /Missing value/);
  assert.throws(() => parseArguments(['--unknown']), /Unknown/);
});

test('runtime allowlist includes active assets/config and excludes research, unused assets, and tooling', t => {
  const input = fixture(t);
  const {entries} = collectRuntimeFiles(input.root);
  const files = new Map(entries.map(entry => [entry.name, entry.data]));
  for (const name of ['scripts/server.mjs', 'Start-Game.cmd', 'public/assets/images/sprite.png',
    'public/assets/sounds-pcm/sound.wav', 'public/assets/splash/frame.png', 'public/assets/splash/intro.wav',
    'public/vendor/BOX2D-LICENSE.txt', 'LICENSE', 'src/game-config.js', ...CONFIG_NAMES.map(name => 'config/' + name)])
    assert(files.has(name), `Missing runtime file ${name}`);
  assert(![...files.keys()].some(name => /^(?:\.git|private|data|docs|original|tests|fixture-runtime)\//.test(name)));
  assert(!files.has('scripts/recover.cjs'));
  assert(!files.has('public/assets/images/unused.png'));
  assert(!files.has('public/assets/manifest-canonical.json'));
  const packagedMetadata = JSON.parse(files.get('package.json'));
  assert.deepEqual(packagedMetadata.scripts, {start: 'node scripts/server.mjs'});
  assert.equal(packagedMetadata.license, 'UNLICENSED');
  assert(!packagedMetadata.dependencies);
  const launcher = files.get('Start-Game.cmd').toString();
  assert(launcher.indexOf('if exist "%~dp0node\\node.exe"') < launcher.indexOf('where node'));
  assert(launcher.includes('"%NODE_EXE%" "%~dp0scripts\\server.mjs"'));
  assert(!/start\s+http|powershell|Start-Process/i.test(launcher));
  assert.deepEqual(files.get('Start-Game.cmd'), makeWindowsLauncher());
});

test('fixture builds both reproducible releases, exact runtime/license copies, and matching SHA-256', t => {
  const input = fixture(t);
  const options = {root: input.root, nodeBinary: input.nodeBinary, nodeLicense: input.nodeLicense};
  const result = buildReleasePackages(options);
  assert.equal(result.version, '0.2.0');
  assert.deepEqual(result.packages.map(item => item.filename),
    ['zombie-builders-web-v0.2.0.zip', 'zombie-builders-windows-x64-v0.2.0.zip']);
  const buffers = result.packages.map(item => fs.readFileSync(item.path));
  const web = unzipFixture(buffers[0]);
  const windows = unzipFixture(buffers[1]);
  assert(!web.has('node/node.exe'));
  assert(!web.has('node/LICENSE'));
  assert.deepEqual(windows.get('node/node.exe').data, input.pe);
  assert.deepEqual(windows.get('node/LICENSE').data, input.license);
  assert.match(windows.get('RUN.txt').data.toString('utf8'), /无需另行安装/);
  assert.match(web.get('RUN.txt').data.toString('utf8'), /需要已安装 Node.js/);
  assert.equal(windows.size, web.size + 2);
  for (const [index, item] of result.packages.entries()) {
    assert.equal(item.sha256, hash(buffers[index]));
    assert.equal(item.bytes, buffers[index].length);
    assert.equal(item.files, index === 0 ? web.size : windows.size);
  }
  assert.equal(fs.readFileSync(result.checksumsPath, 'utf8'),
    result.packages.map(item => `${item.sha256}  ${item.filename}\n`).join(''));
  const repeat = buildReleasePackages(options);
  for (const [index, item] of repeat.packages.entries()) assert.deepEqual(fs.readFileSync(item.path), buffers[index]);
});

test('web-only fixture package never requires a bundled Windows runtime', t => {
  const input = fixture(t);
  const result = buildReleasePackages({root: input.root, webOnly: true, nodeBinary: 'not-an-executable', nodeLicense: 'missing'});
  assert.equal(result.packages.length, 1);
  assert(![...unzipFixture(fs.readFileSync(result.packages[0].path)).keys()].some(name => name.startsWith('node/')));
});

test('missing inputs, invalid Windows PE, license, assets, and dependency metadata fail closed', t => {
  const input = fixture(t);
  const options = {root: input.root, nodeBinary: input.nodeBinary, nodeLicense: input.nodeLicense};
  assert.throws(() => buildReleasePackages({...options, nodeLicense: path.join(input.root, 'missing-license')}), /ENOENT/);
  assert(!fs.existsSync(path.join(input.root, 'output', 'releases')));
  input.write('fixture-runtime/node.exe', 'not a Windows binary');
  assert.throws(() => buildReleasePackages(options), /Windows x64 PE/);
  input.write('fixture-runtime/node.exe', input.pe);
  input.write('fixture-runtime/LICENSE', 'not the runtime license');
  assert.throws(() => buildReleasePackages(options), /NODE_LICENSE/);
  input.write('fixture-runtime/LICENSE', input.license);
  input.write('public/assets/images/sprite.png', 'corrupted');
  assert.throws(() => collectRuntimeFiles(input.root), /Asset size mismatch/);
  input.manifest.images.sprite.src = '/public/assets/../../private/secret.txt';
  input.write('public/assets/manifest.json', JSON.stringify(input.manifest));
  assert.throws(() => collectRuntimeFiles(input.root), /Unsafe/);
  input.manifest.images.sprite.src = 'https://example.invalid/sprite.png';
  input.write('public/assets/manifest.json', JSON.stringify(input.manifest));
  assert.throws(() => collectRuntimeFiles(input.root), /Unsafe/);
  input.pkg.dependencies = {unexpected: '1.0.0'};
  input.write('package.json', JSON.stringify(input.pkg));
  assert.throws(() => collectRuntimeFiles(input.root), /zero npm dependencies/);
});

test('runtime collection rejects symlink/junction parent directories', t => {
  const input = fixture(t);
  const source = path.join(input.root, 'src');
  const real = path.join(input.root, 'real-source');
  fs.renameSync(source, real);
  try { fs.symlinkSync(real, source, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('Creating test symlinks is unavailable'); return; }
    throw error;
  }
  assert.throws(() => collectRuntimeFiles(input.root), /Symbolic links are not allowed/);
});

test('release output refuses symlink/junction ancestors', t => {
  const input = fixture(t);
  const real = path.join(input.root, 'real-output');
  const linked = path.join(input.root, 'linked-output');
  fs.mkdirSync(real);
  try { fs.symlinkSync(real, linked, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('Creating test symlinks is unavailable'); return; }
    throw error;
  }
  assert.throws(() => buildReleasePackages({root: input.root, webOnly: true, outputDir: path.join(linked, 'nested')}), /symbolic links/);
  assert.deepEqual(fs.readdirSync(real), []);
});

test('Python standard-library zipfile independently reads a tiny fixture archive when available', t => {
  const input = fixture(t);
  const archive = input.write('compatibility.zip', createZipBuffer([
    {name: 'plain.txt', data: 'plain'}, {name: '中文/说明.txt', data: 'compressible '.repeat(100)}]));
  const program = 'import json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n assert z.testzip() is None\n assert all(i.flag_bits & 0x800 for i in z.infolist())\n print(json.dumps({n:z.read(n).decode("utf-8") for n in z.namelist()},ensure_ascii=True))';
  const result = spawnSync('python', ['-c', program, archive], {encoding: 'utf8', windowsHide: true, timeout: 10000});
  if (result.error && ['ENOENT', 'EACCES'].includes(result.error.code)) { t.skip('Optional Python is unavailable'); return; }
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {'plain.txt': 'plain', '中文/说明.txt': 'compressible '.repeat(100)});
});
