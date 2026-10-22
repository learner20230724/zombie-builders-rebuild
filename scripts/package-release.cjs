'use strict';

// No npm dependencies, downloaders, native-game execution, or external ZIP tools.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const UINT32_MAX = 0xffffffff;
const FIXED_DOS_DATE = 0x21; // 1980-01-01, independent of source mtimes/time zone.
const SOURCE_FILES = ['boot.js', 'data.js', 'game-config.js', 'generated-game.js', 'physics.js', 'runtime.js'];
const CONFIG_FILES = ['units.json', 'zombies.json', 'buildings.json', 'powers.json', 'levels.json'];
const ASSET_DIRECTORIES = ['images', 'images-canonical', 'images-native-jpeg', 'sounds', 'sounds-pcm', 'splash'];
const CRC_TABLE = Array.from({length: 256}, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function compareNames(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function validateArchiveName(name) {
  if (typeof name !== 'string' || !name || /[\\<>:"|?*\x00-\x1f]/.test(name) || name.startsWith('/'))
    throw new Error(`Unsafe archive path: ${JSON.stringify(name)}`);
  if (Buffer.from(name, 'utf8').toString('utf8') !== name) throw new Error('ZIP paths must be well-formed Unicode');
  for (const part of name.split('/')) {
    if (!part || part === '.' || part === '..' || /[. ]$/.test(part) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))
      throw new Error(`Unsafe archive path: ${JSON.stringify(name)}`);
  }
  if (Buffer.byteLength(name, 'utf8') > 0xffff) throw new Error('ZIP filename exceeds 65535 UTF-8 bytes');
  return name;
}

/** Build a deterministic, UTF-8 ZIP containing regular files only (not ZIP64). */
function createZipBuffer(inputEntries, {compressionLevel = 9} = {}) {
  if (!Array.isArray(inputEntries)) throw new TypeError('ZIP entries must be an array');
  if (inputEntries.length >= 0xffff) throw new Error('ZIP64 is not supported: too many files');
  if (!Number.isInteger(compressionLevel) || compressionLevel < 0 || compressionLevel > 9)
    throw new Error('compressionLevel must be an integer in 0..9');
  const seen = new Set();
  const entries = inputEntries.map(entry => {
    const name = validateArchiveName(entry.name);
    const key = name.normalize('NFC').toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate or case-colliding ZIP entry: ${name}`);
    seen.add(key);
    if (!(typeof entry.data === 'string' || Buffer.isBuffer(entry.data) || entry.data instanceof Uint8Array))
      throw new TypeError(`Missing file bytes: ${name}`);
    return {name, data: Buffer.from(entry.data), mode: entry.mode === 0o755 ? 0o755 : 0o644};
  }).sort((left, right) => compareNames(left.name, right.name));
  for (const name of seen) {
    const parts = name.split('/');
    for (let index = 1; index < parts.length; index++)
      if (seen.has(parts.slice(0, index).join('/'))) throw new Error(`ZIP file/directory prefix collision: ${name}`);
  }

  const localParts = [];
  const directoryParts = [];
  let offset = 0;
  let directorySize = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    if (entry.data.length >= UINT32_MAX) throw new Error('ZIP64 is not supported: file too large');
    const compressed = zlib.deflateRawSync(entry.data, {level: compressionLevel});
    const useDeflate = compressed.length < entry.data.length;
    const payload = useDeflate ? compressed : entry.data;
    const checksum = crc32(entry.data);
    if (offset + 30 + name.length + payload.length >= UINT32_MAX)
      throw new Error('ZIP64 is not supported: archive too large');

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8; no data descriptor/encryption.
    local.writeUInt16LE(useDeflate ? 8 : 0, 8);
    local.writeUInt16LE(FIXED_DOS_DATE, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4); // Unix regular-file mode, compatible with Windows unzip.
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(useDeflate ? 8 : 0, 10);
    central.writeUInt16LE(FIXED_DOS_DATE, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(((0o100000 | entry.mode) << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    directoryParts.push(central, name);
    offset += local.length + name.length + payload.length;
    directorySize += central.length + name.length;
  }
  if (directorySize >= UINT32_MAX || offset + directorySize + 22 >= UINT32_MAX)
    throw new Error('ZIP64 is not supported: archive too large');
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directorySize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, ...directoryParts, end]);
}

function readRegularFile(filename) {
  const resolved = path.resolve(filename);
  // Check every component, including parent directories: no symlink/junction input.
  const parsed = path.parse(resolved);
  let current = parsed.root;
  const parts = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`Symbolic links are not allowed: ${current}`);
    if (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())
      throw new Error(`Expected a regular file with real parent directories: ${resolved}`);
  }
  return fs.readFileSync(resolved);
}

function ensureRealDirectory(filename) {
  const resolved = path.resolve(filename);
  const parsed = path.parse(resolved);
  let current = parsed.root;
  for (const part of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      fs.mkdirSync(current);
      stat = fs.lstatSync(current);
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Output directory must have real directories, not symbolic links: ${current}`);
  }
}

function assertWritableFile(filename) {
  let stat;
  try { stat = fs.lstatSync(filename); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Refusing to overwrite a non-regular file or symbolic link: ${filename}`);
}

function readRuntimeFile(root, name) {
  validateArchiveName(name);
  const resolved = path.resolve(root, ...name.split('/'));
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
    throw new Error(`File escapes the project directory: ${name}`);
  return readRegularFile(resolved);
}

function assetName(url) {
  if (typeof url !== 'string') throw new Error('Every runtime asset must have a local src URL');
  const name = url.startsWith('/assets/') ? 'public' + url : url.startsWith('/public/assets/') ? url.slice(1) : '';
  validateArchiveName(name);
  if (!ASSET_DIRECTORIES.some(directory => name.startsWith(`public/assets/${directory}/`)) ||
      !/\.(png|jpe?g|wav|mp3)$/i.test(name))
    throw new Error(`Asset is outside the runtime image/audio allowlist: ${url}`);
  return name;
}

function runtimePackageMetadata(pkg) {
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    if (pkg[field] && Object.keys(pkg[field]).length) throw new Error(`Runtime package must have zero npm ${field}`);
  }
  const runtime = {};
  for (const field of ['name', 'version', 'private', 'description', 'license', 'type', 'engines', 'repository'])
    if (Object.hasOwn(pkg, field)) runtime[field] = pkg[field];
  runtime.scripts = {start: 'node scripts/server.mjs'};
  return Buffer.from(JSON.stringify(runtime, null, 2) + '\n');
}

function makeWindowsLauncher() {
  return Buffer.from([
    '@echo off',
    'setlocal DisableDelayedExpansion',
    'cd /d "%~dp0"',
    'if exist "%~dp0node\\node.exe" (',
    '  set "NODE_EXE=%~dp0node\\node.exe"',
    ') else (',
    '  where node >nul 2>nul',
    '  if errorlevel 1 (',
    '    echo Node.js 20 or newer is required for the web package.',
    '    echo Use the windows-x64 release for the bundled, no-install runtime.',
    '    pause',
    '    exit /b 1',
    '  )',
    '  set "NODE_EXE=node"',
    ')',
    'echo Open the local URL printed below in your browser.',
    'echo Keep this window open while playing. Press Ctrl+C to stop.',
    '"%NODE_EXE%" "%~dp0scripts\\server.mjs"',
    'set "EXIT_CODE=%ERRORLEVEL%"',
    'if not "%EXIT_CODE%"=="0" pause',
    'exit /b %EXIT_CODE%',
    ''
  ].join('\r\n'), 'utf8');
}

function releaseReadme(pkg, windows) {
  return Buffer.from([
    `${pkg.name} v${pkg.version}`, '',
    windows ? 'Windows x64 package: Node.js is bundled; no Node.js installation is needed.' :
      'Web/source package: install Node.js 20 or newer; no npm install is needed.',
    'Extract the entire ZIP before starting. Do not run from inside the ZIP.',
    'Windows: double-click Start-Game.cmd.',
    'Other systems (web package): in the extracted directory, run node scripts/server.mjs.',
    'Open http://127.0.0.1:8318/ in a current browser (or the URL printed by the server).',
    'The server binds to this computer only. Keep its window open; Ctrl+C stops it.',
    'If the default port is busy, set PORT to another free port before starting.',
    'Do not open index.html directly as file://; use the local server.', '',
    'See README.md / README.zh-CN.md and THIRD_PARTY_NOTICES.md for scope and rights.',
    windows ? 'The original, complete Node.js license and third-party notices are in node/LICENSE.' : '',
    'No original game EXE, SWF, Flash player, or recovery/research tools are included.', '',
    '启动说明', '',
    windows ? '这是 Windows x64 免安装运行时包：已内置 Node.js，无需另行安装。' :
      '这是跨平台 Web／源码运行包：需要已安装 Node.js 20 或更新版本，无需 npm install。',
    '先完整解压 ZIP，再双击 Start-Game.cmd（Windows）；不要直接在压缩包内运行。',
    '其他系统在解压目录运行：node scripts/server.mjs。',
    '在浏览器手动打开 http://127.0.0.1:8318/，或服务器输出的本机网址。',
    '游戏期间保持终端窗口开启；按 Ctrl+C 停止服务。不能直接以 file:// 打开 index.html。',
    '端口被占用时，可先设置 PORT 环境变量后重新启动。服务只监听本机。',
    '授权与分发边界见 README.zh-CN.md 和 THIRD_PARTY_NOTICES.md。',
    windows ? 'Node.js 完整原始许可证及第三方声明保留于 node/LICENSE。' : '',
    '本包不含原游戏 EXE／SWF、Flash 播放器、恢复脚本或研究资料。', ''
  ].join('\n'), 'utf8');
}

/** Exact runtime allowlist; do not recurse through project/public directories. */
function collectRuntimeFiles(projectRoot = ROOT) {
  const root = path.resolve(projectRoot);
  const pkg = JSON.parse(readRuntimeFile(root, 'package.json').toString('utf8'));
  const files = new Map();
  const add = name => {
    if (!files.has(name)) files.set(name, {name, data: readRuntimeFile(root, name)});
    return files.get(name).data;
  };
  for (const name of ['index.html', 'scripts/server.mjs', 'public/vendor/box2dweb.js',
    'public/vendor/BOX2D-LICENSE.txt', 'README.md', 'README.zh-CN.md', 'THIRD_PARTY_NOTICES.md',
    ...SOURCE_FILES.map(name => 'src/' + name), ...CONFIG_FILES.map(name => 'config/' + name)]) add(name);
  for (const name of ['LICENSE', 'LICENSE.txt', 'LICENSE.md'])
    if (fs.existsSync(path.join(root, name))) add(name);
  for (const name of ['config/README.md', 'docs/DEVELOPMENT.md', 'docs/DEVELOPMENT.zh-CN.md', 'licenses/Node.js-LICENSE.txt'])
    if (fs.existsSync(path.join(root, name))) add(name);
  files.set('package.json', {name: 'package.json', data: runtimePackageMetadata(pkg)});
  files.set('Start-Game.cmd', {name: 'Start-Game.cmd', data: makeWindowsLauncher()});

  const manifest = JSON.parse(add('public/assets/manifest.json').toString('utf8'));
  const splash = JSON.parse(add('public/assets/splash.json').toString('utf8'));
  if (!manifest.images || !manifest.sounds || !Array.isArray(splash.frames) || !Array.isArray(splash.sounds))
    throw new Error('Runtime manifests must contain images, sounds, splash frames, and splash sounds');
  for (const record of [...Object.values(manifest.images), ...Object.values(manifest.sounds), ...splash.frames, ...splash.sounds]) {
    const name = assetName(record.src);
    const data = add(name);
    if (record.bytes !== undefined && record.bytes !== data.length) throw new Error(`Asset size mismatch: ${name}`);
    if (record.sha256 !== undefined && record.sha256 !== crypto.createHash('sha256').update(data).digest('hex'))
      throw new Error(`Asset SHA-256 mismatch: ${name}`);
  }
  return {pkg, entries: [...files.values()].sort((left, right) => compareNames(left.name, right.name))};
}

function readWindowsRuntime(nodeBinary, nodeLicense) {
  if (!nodeBinary || !nodeLicense)
    throw new Error('Windows package requires NODE_BINARY and NODE_LICENSE (or --node-binary / --node-license). Use --web-only to omit it.');
  if (path.basename(nodeBinary).toLowerCase() !== 'node.exe') throw new Error('Windows runtime input must be named node.exe');
  const executable = readRegularFile(nodeBinary);
  const peOffset = executable.length >= 64 ? executable.readUInt32LE(0x3c) : UINT32_MAX;
  if (executable.toString('ascii', 0, 2) !== 'MZ' || peOffset < 64 || peOffset + 6 > executable.length ||
      executable.readUInt32LE(peOffset) !== 0x00004550 || executable.readUInt16LE(peOffset + 4) !== 0x8664)
    throw new Error('NODE_BINARY must be a Windows x64 PE executable (AMD64)');
  const license = readRegularFile(nodeLicense);
  if (!license.length || !license.toString('utf8').includes('Node.js'))
    throw new Error('NODE_LICENSE must be the original complete Node.js LICENSE, including third-party notices');
  return [{name: 'node/node.exe', data: executable, mode: 0o755}, {name: 'node/LICENSE', data: license}];
}

function buildReleasePackages(options = {}) {
  const root = path.resolve(options.root || ROOT);
  const outputDir = path.resolve(options.outputDir || path.join(root, 'output', 'releases'));
  const {pkg, entries} = collectRuntimeFiles(root);
  const releaseName = pkg.release?.name || pkg.name;
  if (typeof releaseName !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(releaseName))
    throw new Error('package.json release.name (or name) must be a safe unscoped release basename');
  if (typeof pkg.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(pkg.version))
    throw new Error('package.json version must be a safe semantic version');
  const nodeBinary = options.nodeBinary || process.env.NODE_BINARY;
  const nodeLicense = options.nodeLicense || process.env.NODE_LICENSE;
  // Validate the entire request before writing either archive, including the external runtime.
  const runtimeEntries = options.webOnly ? [] : readWindowsRuntime(nodeBinary, nodeLicense);
  const plans = [{flavor: 'web', entries: [...entries, {name: 'RUN.txt', data: releaseReadme(pkg, false)}]}];
  if (!options.webOnly) plans.push({flavor: 'windows-x64', entries: [...entries, ...runtimeEntries,
    {name: 'RUN.txt', data: releaseReadme(pkg, true)}]});
  ensureRealDirectory(outputDir);
  const checksumsPath = path.join(outputDir, 'checksums.txt');
  for (const plan of plans) assertWritableFile(path.join(outputDir, `${releaseName}-${plan.flavor}-v${pkg.version}.zip`));
  assertWritableFile(checksumsPath);
  const packages = [];
  for (const plan of plans) {
    const filename = `${releaseName}-${plan.flavor}-v${pkg.version}.zip`;
    const archive = createZipBuffer(plan.entries);
    const archivePath = path.join(outputDir, filename);
    fs.writeFileSync(archivePath, archive);
    packages.push({filename, path: archivePath, sha256: crypto.createHash('sha256').update(archive).digest('hex'),
      bytes: archive.length, files: plan.entries.length});
  }
  fs.writeFileSync(checksumsPath, packages.map(item => `${item.sha256}  ${item.filename}\n`).join(''), 'utf8');
  return {releaseName, version: pkg.version, packages, checksumsPath};
}

function parseArguments(argv) {
  const options = {};
  const keys = {'--output': 'outputDir', '--node-binary': 'nodeBinary', '--node-license': 'nodeLicense'};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--web-only') options.webOnly = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else if (keys[argument]) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
      options[keys[argument]] = value;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

if (require.main === module) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log('Usage: node scripts/package-release.cjs [--output DIR] [--node-binary node.exe] [--node-license LICENSE] [--web-only]\nEnvironment: NODE_BINARY, NODE_LICENSE. Without runtime inputs, only the web package is produced. No downloads are performed.');
    else {
      if (!options.nodeBinary && !options.nodeLicense && !process.env.NODE_BINARY && !process.env.NODE_LICENSE)
        options.webOnly = true;
      console.log(JSON.stringify(buildReleasePackages(options), null, 2));
    }
  } catch (error) {
    console.error(`Release packaging failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {crc32, validateArchiveName, createZipBuffer, collectRuntimeFiles, makeWindowsLauncher,
  buildReleasePackages, parseArguments};
