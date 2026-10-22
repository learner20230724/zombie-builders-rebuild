'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../desktop/protocol.cjs');

const ROOT = path.resolve(__dirname,'..');
function fixture(t) {
  const out = path.join(ROOT,'output');
  fs.mkdirSync(out,{recursive:true});
  assert.ok(!fs.lstatSync(out).isSymbolicLink());
  const base = fs.mkdtempSync(path.join(out,'desktop-protocol-test-'));
  const app = path.join(base,'app'), config = path.join(base,'profile/config');
  function write(root,name,data) {const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
  write(app,'index.html','<!doctype html><canvas id="game"></canvas>');
  write(app,'public/assets/manifest.json',JSON.stringify({images:{test:{src:'/assets/images/test.png'}},sounds:{test:{src:'/assets/sounds/test.wav'}}}));
  write(app,'public/assets/splash.json',JSON.stringify({frames:[],sounds:[]}));
  write(app,'public/assets/images/test.png',Buffer.from([1,2,3]));
  write(app,'public/assets/sounds/test.wav',Buffer.from([0,1,2,3,4,5,6,7,8,9]));
  write(app,'public/assets/images/unlisted.png','private-unlisted');
  write(app,'desktop/main.cjs','private-main');
  for(const name of api.SOURCE_NAMES)write(app,'src/'+name,'/* runtime */');
  for(const name of api.CONFIG_NAMES){
    write(app,'config/'+name+'.json',JSON.stringify({source:'bundled'}));
    write(app,'config/defaults/'+name+'.json',JSON.stringify({source:'original'}));
    write(config,name+'.json',JSON.stringify({source:'user'}));
  }
  t.after(() => {
    const relative=path.relative(out,base);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    assert.ok(!fs.lstatSync(out).isSymbolicLink() && !fs.lstatSync(base).isSymbolicLink());
    fs.rmSync(base,{recursive:true,force:false});
  });
  return {base,app,config,write};
}

test('desktop URL parsing accepts only the declared local origin without traversal',() => {
  assert.equal(api.requestPath('ztp://game/src/runtime.js?cache=1'),'/src/runtime.js');
  assert.ok(api.isEntryURL('ztp://game/'));
  assert.ok(api.isEntryURL('ztp://game/index.html'));
  for(const url of ['https://game/','file:///index.html','ztp://evil/','ztp://game:80/',
    'ztp://user@game/','ztp://user:password@game/','ztp://game/../index.html',
    'ztp://game/src/%2e%2e/index.html','ztp://game/src/%5cprivate','ztp://game/src/runtime.js:stream',
    'ztp://game/src/%00private','ztp://game/src/%FF','ztp://game//index.html']) {
    assert.equal(api.requestPath(url),null,url);
  }
});

test('preset export accepts Chinese safe names and exact same-origin Blob UUIDs only',() => {
  assert.ok(api.isPresetFilename('zombie-builders-preset-胖僵尸挑战.json'));
  assert.ok(api.isPresetFilename('zombie-builders-preset-my-rules-1.json'));
  for(const name of ['zombie-builders-preset-../bad.json','zombie-builders-preset-a\\b.json',
    'zombie-builders-preset-a:bad.json','zombie-builders-preset-a\n.json','other.json',
    'zombie-builders-preset-'+ 'a'.repeat(200)+'.json']) assert.equal(api.isPresetFilename(name),false);
  assert.ok(api.isExportBlobURL('blob:ztp://game/12345678-abcd-abcd-abcd-123456789abc'));
  for(const url of ['blob:https://example.com/12345678-abcd-abcd-abcd-123456789abc',
    'blob:ztp://evil/12345678-abcd-abcd-abcd-123456789abc','blob:ztp://game/---'])assert.equal(api.isExportBlobURL(url),false);
});

test('desktop routes serve exact declared assets, custom config and immutable defaults',async t => {
  const {app,config}=fixture(t),routes=await api.createRoutes(app,config),handler=api.createHandler(routes);
  const get=(url,options={})=>handler(new Request('ztp://game'+url,options));
  assert.equal((await get('/')).status,200);
  assert.equal((await get('/src/settings-ui.js')).status,200);
  assert.equal((await get('/assets/images/test.png')).status,200);
  assert.equal((await get('/public/assets/images/test.png')).status,200);
  assert.deepEqual(await (await get('/config/units.json')).json(),{source:'user'});
  assert.deepEqual(await (await get('/defaults/units.json')).json(),{source:'original'});
  for(const url of ['/desktop/main.cjs','/README.md','/config/README.md','/config/defaults/units.json',
    '/assets/images/unlisted.png','/original/game.swf','/node_modules/electron/package.json'])
    assert.equal((await get(url)).status,404,url);
  const html=await get('/');
  assert.match(html.headers.get('content-security-policy'),/script-src 'self'/);
  assert.doesNotMatch(html.headers.get('content-security-policy'),/unsafe-eval/);
  assert.equal(html.headers.get('x-content-type-options'),'nosniff');
  assert.equal((await get('/config/units.json',{method:'POST',body:'x'})).status,405);
});

test('desktop media supports complete, ranged, suffix, invalid and HEAD responses',async t => {
  const {app,config}=fixture(t),handler=api.createHandler(await api.createRoutes(app,config));
  const get=(headers={},method='GET')=>handler(new Request('ztp://game/assets/sounds/test.wav',{headers,method}));
  const complete=await get();assert.equal(complete.status,200);assert.equal(complete.headers.get('accept-ranges'),'bytes');
  const range=await get({range:'bytes=2-4'});assert.equal(range.status,206);
  assert.equal(range.headers.get('content-range'),'bytes 2-4/10');
  assert.deepEqual([...new Uint8Array(await range.arrayBuffer())],[2,3,4]);
  const suffix=await get({range:'bytes=-2'});assert.deepEqual([...new Uint8Array(await suffix.arrayBuffer())],[8,9]);
  assert.equal((await get({range:'bytes=11-20'})).status,416);
  assert.equal((await get({range:'bytes=0-1,4-5'})).status,416);
  const head=await get({},'HEAD');assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'');
});

test('first-use configuration seeding never overwrites a user modification',async t => {
  const {app,base}=fixture(t),destination=path.join(base,'new-profile/config');
  await api.initializeConfiguration(path.join(app,'config'),destination);
  const file=path.join(destination,'units.json');fs.writeFileSync(file,'{"modified":true}');
  await api.initializeConfiguration(path.join(app,'config'),destination);
  assert.equal(fs.readFileSync(file,'utf8'),'{"modified":true}');
  assert.ok(fs.existsSync(path.join(destination,'levels.json')));
});

test('manifest URLs cannot point into tools, parent paths, network or Windows streams',() => {
  assert.equal(api.assetRelative('/assets/sounds/example.wav'),'public/assets/sounds/example.wav');
  for(const input of ['https://example.org/test.png','/assets/../test.png','/assets/images/a.png:secret',
    '/assets/images/../../README.png','/original/game.png','/assets/images/a\\b.png'])
    assert.throws(()=>api.assetRelative(input));
});

test('desktop file reads reject junction traversal and do not disclose real paths to renderer',async t => {
  const {app,config,base,write}=fixture(t);
  const outside=path.join(base,'outside');write(outside,'secret.js','secret');
  const link=path.join(app,'src/link');
  try{fs.symlinkSync(outside,link,process.platform==='win32'?'junction':'dir');}
  catch(error){if(['EPERM','EACCES'].includes(error.code)){t.skip('OS does not permit symlink fixture');return;}throw error;}
  await assert.rejects(api.readSafe(app,'src/link/secret.js'),/Symbolic/);
  const routes=await api.createRoutes(app,config);routes.set('/blocked.js',{root:app,file:'src/link/secret.js'});
  const response=await api.createHandler(routes)(new Request('ztp://game/blocked.js'));
  assert.equal(response.status,500);assert.equal(await response.text(),'Asset unavailable');
});

test('desktop main declares isolation, no preload, no HTTP listener and locked navigation',() => {
  const source=fs.readFileSync(path.join(ROOT,'desktop/main.cjs'),'utf8');
  for(const pattern of [/nodeIntegration:false/,/contextIsolation:true/,/sandbox:true/,/webSecurity:true/,
    /action:'deny'/,/setPermissionRequestHandler/,/setPermissionCheckHandler/,/will-frame-navigate/,/will-redirect/])
    assert.match(source,pattern);
  assert.doesNotMatch(source,/\bpreload\s*:|createServer\(|shell\.openExternal|--no-sandbox/);
  assert.ok(source.indexOf('fs.mkdirSync(dataRoot') < source.indexOf("app.setPath('userData'"));
  for(const pattern of [/item\.hasUserGesture\(\)/,/item\.getInitiatorOrigin\(\)/,
    /frame === window\.webContents\.mainFrame/,/getTotalBytes\(\) > 0/,/getReceivedBytes\(\) > limit/])
    assert.match(source,pattern);
});
