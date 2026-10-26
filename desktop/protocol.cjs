'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const SCHEME = 'ztp';
const HOST = 'game';
const ENTRY_URL = `${SCHEME}://${HOST}/`;
const CONFIG_NAMES = ['units', 'zombies', 'buildings', 'powers', 'levels'];
const SOURCE_NAMES = ['runtime.js', 'physics.js', 'generated-game.js', 'data.js', 'game-config.js',
  'custom-rules.js', 'customization.js', 'settings-ui.js', 'settings-ui.css', 'time-controls.js', 'time-controls.css', 'factions.js', 'death-effects.js', 'effect-lists.js', 'spawn-queue.js', 'boot.js'];
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const MIME = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.wav':'audio/wav', '.mp3':'audio/mpeg'};

function isExportBlobURL(value) {
  return typeof value === 'string' && /^blob:ztp:\/\/game\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
function isPresetFilename(value) {
  return typeof value === 'string' && value.length <= 180 &&
    /^zombie-builders-preset-[\p{L}\p{N}._ -]{1,140}\.json$/u.test(value);
}

function requestPath(input) {
  try {
    if (typeof input !== 'string' || /[\\\x00-\x20]/.test(input)) return null;
    // Check the literal path as well as URL's normalized path. A browser may
    // normalize dot segments before dispatch; the exact route map still keeps
    // that normalized request inside its declared asset set.
    const literal = input.match(/^ztp:\/\/[^/?#]+([^?#]*)/i)?.[1] || '/';
    const decodedLiteral = decodeURIComponent(literal);
    if (decodedLiteral.split('/').some(part => part === '.' || part === '..')) return null;
    const url = new URL(input);
    if (url.protocol !== `${SCHEME}:` || url.hostname !== HOST || url.port || url.username || url.password) return null;
    const name = decodeURIComponent(url.pathname || '/');
    if (!name.startsWith('/') || /[\\:\x00-\x1f]/.test(name) || name.includes('//') ||
        name.split('/').some(part => part === '.' || part === '..')) return null;
    return name;
  } catch { return null; }
}

function isEntryURL(input) {
  const name = requestPath(input);
  return name === '/' || name === '/index.html';
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return !!relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep);
}

async function readSafe(root, relative) {
  const base = path.resolve(root), filename = path.resolve(base, relative);
  if (!inside(base, filename)) throw new Error('File is outside its declared root');
  let current = base;
  if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Symbolic-link roots are not supported');
  for (const part of path.relative(base, filename).split(path.sep)) {
    current = path.join(current, part);
    if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Symbolic-link assets are not supported');
  }
  const actualBase = await fs.realpath(base), actual = await fs.realpath(filename);
  if (!inside(actualBase, actual) || !(await fs.stat(actual)).isFile()) throw new Error('Not a regular asset');
  return fs.readFile(actual);
}

function assetRelative(src) {
  if (typeof src !== 'string') throw new Error('Manifest asset has no local URL');
  const name = src.startsWith('/assets/') ? 'public' + src : src.startsWith('/public/assets/') ? src.slice(1) : '';
  if (!/^public\/assets\/(?:images|images-canonical|images-native-jpeg|sounds|sounds-pcm|splash)\/.+\.(?:png|jpe?g|wav|mp3)$/i.test(name) ||
      /[\\:\x00-\x1f]/.test(name) || name.split('/').some(part => !part || part === '.' || part === '..'))
    throw new Error('Manifest asset is outside the runtime allowlist');
  return name;
}

async function createRoutes(root, configRoot) {
  const routes = new Map();
  const add = (url, base, file) => routes.set(url, {root:base, file});
  add('/', root, 'index.html'); add('/index.html', root, 'index.html');
  for (const name of SOURCE_NAMES) add('/src/' + name, root, 'src/' + name);
  for (const name of CONFIG_NAMES) {
    add(`/config/${name}.json`, configRoot, `${name}.json`);
    add(`/defaults/${name}.json`, root, `config/defaults/${name}.json`);
  }
  for (const name of ['box2dweb.js', 'BOX2D-LICENSE.txt']) {
    add('/public/vendor/' + name, root, 'public/vendor/' + name);
    add('/vendor/' + name, root, 'public/vendor/' + name);
  }
  const manifest = JSON.parse(await readSafe(root, 'public/assets/manifest.json'));
  const splash = JSON.parse(await readSafe(root, 'public/assets/splash.json'));
  if (!manifest.images || !manifest.sounds || !Array.isArray(splash.frames) || !Array.isArray(splash.sounds))
    throw new Error('Invalid runtime manifests');
  for (const name of ['manifest.json', 'splash.json']) {
    add('/public/assets/' + name, root, 'public/assets/' + name);
    add('/assets/' + name, root, 'public/assets/' + name);
  }
  for (const record of [...Object.values(manifest.images), ...Object.values(manifest.sounds), ...splash.frames, ...splash.sounds]) {
    const relative = assetRelative(record.src);
    add('/' + relative, root, relative);
    add('/' + relative.slice(7), root, relative);
  }
  return routes;
}

function byteRange(header, length) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!match || (!match[1] && !match[2]) || !length) return null;
  let start, end;
  if (!match[1]) { const tail = Number(match[2]); if (!Number.isSafeInteger(tail) || tail <= 0) return null;
    start = Math.max(0, length-tail); end = length-1;
  } else { start = Number(match[1]); end = match[2] ? Number(match[2]) : length-1; }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= length || end < start) return null;
  return [start, Math.min(end,length-1)];
}

function createHandler(routes) {
  return async request => {
    const common = {'cache-control':'no-store', 'x-content-type-options':'nosniff'};
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405,headers:{...common,Allow:'GET, HEAD'}});
    const name = requestPath(request.url), route = name && routes.get(name);
    if (!route) return new Response('Not found',{status:404,headers:common});
    try {
      const bytes = await readSafe(route.root, route.file);
      const type = MIME[path.extname(route.file).toLowerCase()] || 'text/plain; charset=utf-8';
      const headers = {...common,'content-type':type,'content-length':String(bytes.length)};
      if (type.startsWith('text/html')) headers['content-security-policy'] = CSP;
      if (type.startsWith('audio/')) headers['accept-ranges'] = 'bytes';
      const requestedRange = request.headers?.get('range');
      if (request.method === 'GET' && requestedRange && type.startsWith('audio/')) {
        const range = byteRange(requestedRange, bytes.length);
        if (!range) return new Response(null,{status:416,headers:{...common,'content-range':`bytes */${bytes.length}`}});
        const [start,end] = range; headers['content-range'] = `bytes ${start}-${end}/${bytes.length}`;
        headers['content-length'] = String(end-start+1);
        return new Response(bytes.subarray(start,end+1),{status:206,headers});
      }
      return new Response(request.method === 'HEAD' ? null : bytes,{status:200,headers});
    } catch (error) {
      return new Response('Asset unavailable',{status:['ENOENT','ENOTDIR'].includes(error.code)?404:500,headers:common});
    }
  };
}

async function initializeConfiguration(defaultRoot, destination) {
  // The original defaults live in the application; user's copies are outside
  // the installation. Exclusive creation never resets a previous modification.
  await fs.mkdir(destination,{recursive:true});
  if ((await fs.lstat(destination)).isSymbolicLink()) throw new Error('Configuration directory cannot be a symbolic link');
  for (const name of CONFIG_NAMES) {
    const filename = name + '.json', defaults = await readSafe(defaultRoot,filename);
    const target = path.join(destination,filename);
    try { await fs.writeFile(target,defaults,{flag:'wx'}); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    // Validate symlink containment even when exclusive creation found a file.
    await readSafe(destination,filename);
  }
}

module.exports = {SCHEME,HOST,ENTRY_URL,CONFIG_NAMES,SOURCE_NAMES,CSP,requestPath,isEntryURL,
  readSafe,assetRelative,createRoutes,createHandler,byteRange,initializeConfiguration,isExportBlobURL,isPresetFilename};
