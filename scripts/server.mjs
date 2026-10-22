import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile, realpath, stat} from 'node:fs/promises';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILES = new Set(['boot.js', 'runtime.js', 'physics.js', 'generated-game.js', 'generated-game.report.json', 'data.js', 'game-config.js', 'custom-rules.js', 'customization.js', 'settings-ui.js', 'settings-ui.css']);
const CONFIG_FILES = new Set(['units.json', 'zombies.json', 'buildings.json', 'powers.json', 'levels.json']);
const TYPES = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.mp3':'audio/mpeg', '.wav':'audio/wav'};

// Public snapshot server: loopback only, with no original/reference/research routes.
export function createGameServer() {
  const server = http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405, {Allow:'GET, HEAD'}); res.end(); return;
      }
      const name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      if (name === '/health') {
        const body = JSON.stringify({project:'zombie-builders-rebuild', port:server.address()?.port});
        res.writeHead(200, {'content-type':'application/json', 'content-length':Buffer.byteLength(body)});
        res.end(req.method === 'HEAD' ? undefined : body); return;
      }
      const route = name === '/' ? '/index.html' :
        (name.startsWith('/defaults/') && CONFIG_FILES.has(name.slice(10))) ? '/config/defaults/' + name.slice(10) :
        name.startsWith('/assets/') || name.startsWith('/vendor/') ? '/public' + name : name;
      const allowed = route === '/index.html' ||
        (route.startsWith('/src/') && SOURCE_FILES.has(route.slice(5))) ||
        (route.startsWith('/config/') && CONFIG_FILES.has(route.slice(8))) ||
        (route.startsWith('/config/defaults/') && CONFIG_FILES.has(route.slice(17))) ||
        route.startsWith('/public/assets/') ||
        ['/public/vendor/box2dweb.js', '/public/vendor/BOX2D-LICENSE.txt'].includes(route);
      const file = path.resolve(ROOT, '.' + route);
      if (!allowed || !file.startsWith(ROOT + path.sep)) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const actual = await realpath(file);
      if (!actual.startsWith(ROOT + path.sep) || !(await stat(actual)).isFile()) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const body = await readFile(actual);
      res.writeHead(200, {'content-type':TYPES[path.extname(actual)] || 'application/octet-stream',
        'content-length':body.length, 'cache-control':'no-store', 'x-content-type-options':'nosniff'});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      const missing = ['ENOENT', 'ENOTDIR', 'ERR_INVALID_ARG_VALUE'].includes(error.code) || error instanceof URIError;
      res.writeHead(missing ? 404 : 500); res.end(missing ? 'Not found' : 'Local server error');
    }
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8318);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer in 0..65535');
  const server = createGameServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Zombie Trailer Park reconstruction: http://127.0.0.1:${server.address().port}/`));
}
