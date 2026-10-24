'use strict';

// Stage the exact public runtime allowlist, never the repository or node_modules.
// Only the generated Electron distribution is recursively collected for the ZIP.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {collectRuntimeFiles, createZipBuffer, validateArchiveName} = require('./package-release.cjs');

const ROOT = path.resolve(__dirname, '..');
const ELECTRON_VERSION = '45.0.0';
const EXECUTABLE_NAME = 'ZombieBuilders';
const DESKTOP_FILES = ['desktop/main.cjs', 'desktop/protocol.cjs'];
const WEB_ONLY_FILES = new Set(['package.json', 'scripts/server.mjs', 'Start-Game.cmd', 'licenses/Node.js-LICENSE.txt']);

function within(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative !== '' && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative);
}

function realDirectory(filename, create = false) {
  const resolved = path.resolve(filename);
  const parsed = path.parse(resolved);
  let current = parsed.root;
  for (const part of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) {
      if (error.code !== 'ENOENT' || !create) throw error;
      fs.mkdirSync(current);
      stat = fs.lstatSync(current);
    }
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error(`Desktop packaging requires real directories, not symbolic links: ${current}`);
  }
  return resolved;
}

function readRegularFile(filename) {
  const resolved = path.resolve(filename);
  realDirectory(path.dirname(resolved));
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Expected a regular, non-symbolic file: ${resolved}`);
  return fs.readFileSync(resolved);
}

function requireAbsent(filename) {
  try { fs.lstatSync(filename); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw new Error(`Refusing to overwrite an existing desktop output: ${filename}`);
}

/** Windows scanners may briefly hold freshly generated binaries/directories open. */
async function renameDirectoryWithRetry(source, destination, options = {}) {
  if (typeof options.boundary !== 'string') throw new TypeError('Directory rename requires an explicit output boundary');
  const boundary = realDirectory(options.boundary);
  const from = path.resolve(source);
  const to = path.resolve(destination);
  if (!within(boundary, from) || !within(boundary, to) || within(from, to) || within(to, from))
    throw new Error('Desktop directory rename must stay inside its output boundary without nesting source/destination');
  const maxAttempts = options.maxAttempts ?? 8;
  const baseDelayMs = options.baseDelayMs ?? 50;
  const maxDelayMs = options.maxDelayMs ?? 1000;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20 ||
      !Number.isInteger(baseDelayMs) || baseDelayMs < 0 || baseDelayMs > 1000 ||
      !Number.isInteger(maxDelayMs) || maxDelayMs < baseDelayMs || maxDelayMs > 5000)
    throw new RangeError('Invalid bounded directory rename retry options');
  const rename = options.rename || ((left, right) => fs.promises.rename(left, right));
  const sleep = options.sleep || (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
  const transient = new Set(['EPERM', 'EBUSY', 'EACCES', 'ETXTBSY']);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Recheck before every attempt; never remove a competing target or redirected parent.
    realDirectory(from);
    realDirectory(path.dirname(to));
    requireAbsent(to);
    try {
      await rename(from, to);
      return;
    } catch (error) {
      if (!transient.has(error.code) || attempt + 1 === maxAttempts) throw error;
      // A concurrent output must stop the operation, even after a transient error.
      requireAbsent(to);
      await sleep(Math.min(baseDelayMs * (2 ** attempt), maxDelayMs));
    }
  }
}

function safeVersion(pkg) {
  if (typeof pkg.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(pkg.version))
    throw new Error('package.json version must be a safe semantic version');
  const name = pkg.release?.name || pkg.name;
  if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(name))
    throw new Error('package.json release.name (or name) must be a safe unscoped release basename');
  return {version: pkg.version, releaseName: name};
}

function desktopMetadata(pkg) {
  const metadata = {};
  for (const field of ['name', 'version', 'description', 'license', 'repository'])
    if (Object.hasOwn(pkg, field)) metadata[field] = pkg[field];
  metadata.productName = EXECUTABLE_NAME;
  metadata.type = 'commonjs';
  metadata.main = 'desktop/main.cjs';
  return Buffer.from(JSON.stringify(metadata, null, 2) + '\n', 'utf8');
}

function desktopReadme(pkg) {
  return Buffer.from([
    `建筑工大战僵尸 / Zombie Builders v${pkg.version}`, '',
    'Windows x64 desktop edition',
    'Extract the entire ZIP to a writable folder, then double-click ZombieBuilders.exe.',
    'Keep all DLLs, locales, and the resources folder beside the executable.',
    'No browser, Node.js installation, terminal, or local HTTP server is required.',
    'The game works offline. Close its window to exit.',
    'F11 toggles fullscreen. F1 shows the configuration/save folder. F2 opens game customization.',
    'Edit in-game with F2; supported settings apply immediately on change, Enter, or blur.',
    'Progress and editable configuration are stored separately from the installation:',
    '  %APPDATA%\\ZombieBuilders',
    '  %APPDATA%\\ZombieBuilders\\config\\{units,zombies,buildings,powers,levels}.json',
    'Defaults are copied only on first use. Updating or unpacking the game does not overwrite existing custom configuration.',
    'Configuration changes take effect the next time the desktop app is started.',
    'See README.md / README.zh-CN.md in resources/app for configuration tables and developer instructions.',
    'Keep LICENSE, LICENSES.chromium.html, and resources/app/THIRD_PARTY_NOTICES.md with the distribution.', '',
    'Windows x64 桌面版',
    '请完整解压 ZIP，再双击 ZombieBuilders.exe；不要在压缩包中直接运行。',
    '请保留 EXE 旁边所有 DLL、locales 和 resources 文件夹，不要只复制 EXE。',
    '无需浏览器、Node.js、终端窗口或本地 HTTP 服务，可以离线游玩。关闭游戏窗口即可退出。',
    'F11 切换全屏；F1 显示配置与存档目录；F2 打开游戏自定义设置。',
    '按 F2 编辑；支持本局修改的设置在勾选、回车或结束输入后立即生效。',
    '存档与可编辑配置保存在安装目录之外：',
    '  %APPDATA%\\ZombieBuilders',
    '  %APPDATA%\\ZombieBuilders\\config\\{units,zombies,buildings,powers,levels}.json',
    '默认配置仅在首次使用时复制；解压或升级游戏不会覆盖已有自定义配置。',
    '编辑配置后，重新启动桌面应用即可生效。',
    '参数表与开发说明见 resources/app 中的 README.md / README.zh-CN.md。',
    '请保留 LICENSE、LICENSES.chromium.html 和 resources/app/THIRD_PARTY_NOTICES.md。', ''
  ].join('\r\n'), 'utf8');
}

function collectDesktopFiles(projectRoot = ROOT) {
  const root = realDirectory(projectRoot);
  const {pkg, entries: runtime} = collectRuntimeFiles(root);
  safeVersion(pkg);
  const entries = runtime.filter(entry => !WEB_ONLY_FILES.has(entry.name));
  for (const name of DESKTOP_FILES) {
    validateArchiveName(name);
    entries.push({name, data: readRegularFile(path.join(root, ...name.split('/')))});
  }
  entries.push({name: 'package.json', data: desktopMetadata(pkg)});
  entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  return {pkg, entries};
}

function writeStagingFiles(directory, entries) {
  for (const entry of entries) {
    validateArchiveName(entry.name);
    const filename = path.resolve(directory, ...entry.name.split('/'));
    if (!within(directory, filename)) throw new Error(`Staged file escapes its directory: ${entry.name}`);
    realDirectory(path.dirname(filename), true);
    fs.writeFileSync(filename, entry.data, {flag: 'wx'});
  }
}

/** Only call for the packager's isolated output, never the source repository. */
function collectPackagedDirectory(directory) {
  const root = realDirectory(directory);
  const entries = [];
  function visit(current) {
    for (const name of fs.readdirSync(current).sort()) {
      const filename = path.join(current, name);
      const stat = fs.lstatSync(filename);
      if (stat.isSymbolicLink()) throw new Error(`Symbolic links are not allowed in the desktop output: ${filename}`);
      if (stat.isDirectory()) visit(filename);
      else if (stat.isFile()) {
        const archiveName = path.relative(root, filename).split(path.sep).join('/');
        validateArchiveName(archiveName);
        entries.push({name: archiveName, data: fs.readFileSync(filename), mode: /\.exe$/i.test(name) ? 0o755 : 0o644});
      } else throw new Error(`Only regular files and directories can be packaged: ${filename}`);
    }
  }
  visit(root);
  return entries;
}

function verifyPackagedFiles(entries, sourceEntries) {
  const files = new Map(entries.map(entry => [entry.name, entry.data]));
  for (const name of [`${EXECUTABLE_NAME}.exe`, 'LICENSE', 'LICENSES.chromium.html'])
    if (!files.get(name)?.length) throw new Error(`Electron desktop distribution is missing ${name}`);
  if (![...files.keys()].some(name => /^locales\/[^/]+\.pak$/.test(name)))
    throw new Error('Electron desktop distribution is missing locales/*.pak');
  for (const entry of sourceEntries) {
    const packaged = files.get('resources/app/' + entry.name);
    if (!packaged || !packaged.equals(Buffer.from(entry.data)))
      throw new Error(`Packaged application file differs from staging: ${entry.name}`);
  }
  for (const name of files.keys()) {
    if (name.startsWith('resources/app/') && !sourceEntries.some(entry => 'resources/app/' + entry.name === name))
      throw new Error(`Unexpected application file in desktop distribution: ${name}`);
  }
}

async function buildDesktopPackage(options = {}) {
  const root = realDirectory(options.root || ROOT);
  const {pkg, entries: sourceEntries} = collectDesktopFiles(root);
  const {releaseName, version} = safeVersion(pkg);
  const outputBase = realDirectory(path.join(root, 'output'), true);
  const outputDir = path.resolve(options.outputDir || path.join(outputBase, 'releases'));
  if (!within(outputBase, outputDir)) throw new Error('Desktop release output must stay inside the project output directory');
  realDirectory(outputDir, true);
  const archiveName = `${releaseName}-desktop-win-x64-v${version}.zip`;
  const archivePath = path.join(outputDir, archiveName);
  const checksumsPath = path.join(outputDir, 'desktop-checksums.txt');
  // Fixed release artifacts are never overwritten silently, including symlinks.
  requireAbsent(archivePath);
  requireAbsent(checksumsPath);
  const stageDir = fs.mkdtempSync(path.join(outputBase, 'desktop-stage-'));
  const buildDir = fs.mkdtempSync(path.join(outputBase, 'desktop-build-'));
  writeStagingFiles(stageDir, sourceEntries);
  let packager = options.packager;
  if (!packager) {
    const module = await import('@electron/packager');
    packager = module.packager;
  }
  if (typeof packager !== 'function') throw new TypeError('@electron/packager must export a packaging function');
  const packagerOptions = {
    dir: stageDir, out: buildDir,
    name: EXECUTABLE_NAME, executableName: EXECUTABLE_NAME,
    platform: 'win32', arch: 'x64', electronVersion: ELECTRON_VERSION,
    asar: false, prune: true, overwrite: false,
    appVersion: version, buildVersion: version,
    // Identifies the desktop adaptation, not the original game's author/copyright.
    // Explicit CompanyName also prevents Packager from searching parent packages for author.
    win32metadata: {CompanyName: 'Zombie Builders desktop contributors',
      ProductName: '建筑工大战僵尸', FileDescription: 'Zombie Builders', OriginalFilename: `${EXECUTABLE_NAME}.exe`}
  };
  if (options.electronZipDir) packagerOptions.electronZipDir = realDirectory(options.electronZipDir);
  const packagedPaths = await packager(packagerOptions);
  const expectedBuild = path.join(buildDir, `${EXECUTABLE_NAME}-win32-x64`);
  if (!Array.isArray(packagedPaths) || packagedPaths.length !== 1 || path.resolve(packagedPaths[0]) !== expectedBuild)
    throw new Error('Packager returned an unexpected desktop output path');
  realDirectory(expectedBuild);
  const entries = collectPackagedDirectory(expectedBuild);
  verifyPackagedFiles(entries, sourceEntries);
  const runReadme = desktopReadme(pkg);
  if (entries.some(entry => entry.name.toLowerCase() === 'desktop-run.txt'))
    throw new Error('Unexpected DESKTOP-RUN.txt collision in Electron distribution');
  fs.writeFileSync(path.join(expectedBuild, 'DESKTOP-RUN.txt'), runReadme, {flag: 'wx'});
  entries.push({name: 'DESKTOP-RUN.txt', data: runReadme});
  const installationBase = path.join(outputBase, `desktop-v${version}`);
  let installationDir = installationBase;
  try {
    fs.lstatSync(installationDir);
    installationDir = fs.mkdtempSync(installationBase + '-');
    // Move into the fresh unique container without deleting an existing directory.
    installationDir = path.join(installationDir, EXECUTABLE_NAME);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  requireAbsent(installationDir);
  await renameDirectoryWithRetry(expectedBuild, installationDir, {boundary: outputBase});
  const uncompressedBytes = entries.reduce((total, entry) => total + entry.data.length, 0);
  const archive = createZipBuffer(entries, {compressionLevel: 6});
  fs.writeFileSync(archivePath, archive, {flag: 'wx'});
  const sha256 = crypto.createHash('sha256').update(archive).digest('hex');
  fs.writeFileSync(checksumsPath, `${sha256}  ${archiveName}\n`, {flag: 'wx'});
  return {
    releaseName, version, electronVersion: ELECTRON_VERSION,
    installationDir, executablePath: path.join(installationDir, `${EXECUTABLE_NAME}.exe`),
    stageDir, buildDir, checksumsPath,
    package: {filename: archiveName, path: archivePath, bytes: archive.length, uncompressedBytes, sha256, files: entries.length}
  };
}

function parseArguments(argv) {
  const options = {};
  const keys = {'--output': 'outputDir', '--electron-zip-dir': 'electronZipDir'};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') options.help = true;
    else if (keys[argument]) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
      options[keys[argument]] = value;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

if (require.main === module) {
  (async () => {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log(`Usage: node scripts/package-desktop.cjs [--output output/DIR] [--electron-zip-dir DIR]\nBuilds the Windows x64 desktop package with Electron ${ELECTRON_VERSION}. Existing release files are never overwritten.\nElectron runtime downloads may be required; the installed development tools are not bundled.`);
    else console.log(JSON.stringify(await buildDesktopPackage(options), null, 2));
  })().catch(error => { console.error(`Desktop packaging failed: ${error.message}`); process.exitCode = 1; });
}

module.exports = {ELECTRON_VERSION, EXECUTABLE_NAME, desktopMetadata, desktopReadme,
  collectDesktopFiles, collectPackagedDirectory, verifyPackagedFiles, renameDirectoryWithRetry, buildDesktopPackage, parseArguments};
