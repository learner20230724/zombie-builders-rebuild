'use strict';

const path = require('node:path');
const fs = require('node:fs');
const {app,BrowserWindow,Menu,protocol,session,dialog,shell} = require('electron');
const {SCHEME,ENTRY_URL,CONFIG_NAMES,createRoutes,createHandler,initializeConfiguration,isEntryURL,requestPath,readSafe,isExportBlobURL,isPresetFilename} = require('./protocol.cjs');

app.setName('ZombieBuilders');
app.setAppUserModelId('com.learner20230724.zombiebuilder');
const dataOverride = process.env.ZOMBIE_BUILDERS_DATA_DIR;
const dataRoot = dataOverride ? path.resolve(dataOverride) : path.join(app.getPath('appData'),'ZombieBuilders');
let startupError = null;
try {
  if (dataOverride && !path.isAbsolute(dataOverride)) throw new Error('ZOMBIE_BUILDERS_DATA_DIR must be an absolute directory');
  fs.mkdirSync(dataRoot,{recursive:true});
  if(fs.lstatSync(dataRoot).isSymbolicLink() || !fs.statSync(dataRoot).isDirectory())
    throw new Error('The data directory must be a real directory, not a symbolic link');
  app.setPath('userData',dataRoot);
} catch(error) { startupError = error; }
protocol.registerSchemesAsPrivileged([{scheme:SCHEME,privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,corsEnabled:true}}]);

let window = null;
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
else {
  app.on('second-instance',() => { if(window && !window.isDestroyed()){if(window.isMinimized())window.restore();window.show();window.focus();} });
  app.on('window-all-closed',() => app.quit());
  app.whenReady().then(() => { if(startupError)throw startupError; return start(); }).catch(error => {
    dialog.showErrorBox('建筑工大战僵尸 · 启动失败',`无法启动游戏。配置与存档位置：\n${dataRoot}\n\n${error.message}`);
    app.exit(1);
  });
}

async function start() {
  const root = app.getAppPath(), configRoot = path.join(dataRoot,'config');
  await initializeConfiguration(path.join(root,'config'),configRoot);
  const documents = {};
  for (const name of CONFIG_NAMES) documents[name] = JSON.parse(await readSafe(configRoot,`${name}.json`));
  require(path.join(root,'src/game-config.js')).fromDocuments(documents);
  const routes = await createRoutes(root,configRoot), current = session.defaultSession;
  current.protocol.handle(SCHEME,createHandler(routes));
  current.setPermissionRequestHandler((_contents,_permission,callback) => callback(false));
  current.setPermissionCheckHandler(() => false);
  current.webRequest.onBeforeRequest({urls:['<all_urls>']},(details,callback) => {
    const route = requestPath(details.url);
    const exportBlob = isExportBlobURL(details.url);
    callback({cancel:!exportBlob && (!route || !routes.has(route))});
  });
  current.on('will-download',(event,item,contents,frame) => {
    // Only the user-facing rule-export command may create a JSON download.
    // This does not grant a renderer arbitrary filesystem access or navigation.
    const limit = 2*1024*1024;
    const valid = window && contents === window.webContents && frame === window.webContents.mainFrame &&
      item.hasUserGesture() && item.getInitiatorOrigin() === 'ztp://game' &&
      isExportBlobURL(item.getURL()) && isPresetFilename(item.getFilename()) &&
      item.getMimeType() === 'application/json' && item.getTotalBytes() > 0 && item.getTotalBytes() <= limit;
    if (!valid) { event.preventDefault(); return; }
    item.setSaveDialogOptions({title:'导出自定义规则',defaultPath:path.join(app.getPath('documents'),item.getFilename()),
      filters:[{name:'JSON 规则',extensions:['json']}]});
    item.on('updated',() => {if(item.getReceivedBytes() > limit)item.cancel();});
  });
  Menu.setApplicationMenu(null);
  const win = window = new BrowserWindow({title:`建筑工大战僵尸 · v${app.getVersion()}`,width:1120,height:860,
    minWidth:480,minHeight:360,backgroundColor:'#000000',show:false,autoHideMenuBar:true,
    webPreferences:{nodeIntegration:false,nodeIntegrationInWorker:false,nodeIntegrationInSubFrames:false,
      contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,
      webviewTag:false,autoplayPolicy:'no-user-gesture-required',devTools:!app.isPackaged}});
  win.removeMenu();
  // Keep the release number visible instead of replacing it with index.html's
  // generic web-page title after navigation.
  win.on('page-title-updated',event => event.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  win.webContents.on('will-navigate',(event) => { if(!isEntryURL(event.url))event.preventDefault(); });
  win.webContents.on('will-frame-navigate',(event) => {
    if(!event.isMainFrame || !isEntryURL(event.url)) event.preventDefault();
  });
  win.webContents.on('will-redirect',(event) => event.preventDefault());
  win.webContents.on('before-input-event',(event,input) => {
    if(win.isDestroyed() || input.type !== 'keyDown' || input.isAutoRepeat) return;
    if(input.key === 'F11') {event.preventDefault();win.setFullScreen(!win.isFullScreen());}
    else if(input.key === 'F1') {
      event.preventDefault();
      dialog.showMessageBox(win,{type:'info',title:'配置与存档',message:`建筑工大战僵尸 v${app.getVersion()}`,
        detail:`F2：自定义与沙盒\nF11：切换全屏\n\n配置文件：${configRoot}\n存档与预设：${dataRoot}\n\n修改的配置不会被软件升级覆盖。旧浏览器存档不会自动导入桌面版。`,
        buttons:['打开配置文件夹','关闭'],defaultId:1,cancelId:1}).then(async ({response}) => {
          if(response===0 && !win.isDestroyed()) {
            const error=await shell.openPath(configRoot);
            if(error)dialog.showErrorBox('无法打开文件夹',error);
          }
        }).catch(error => {if(!win.isDestroyed())dialog.showErrorBox('无法显示数据位置',error.message);});
    }
  });
  win.once('ready-to-show',() => {if(!win.isDestroyed()){win.maximize();win.show();}});
  win.webContents.on('render-process-gone',(_event,details) => {
    if(details.reason !== 'clean-exit' && !win.isDestroyed()) dialog.showErrorBox('游戏画面已停止',`渲染进程退出：${details.reason}。请关闭并重新启动游戏。`);
  });
  win.on('closed',() => {if(window===win)window = null;});
  await win.loadURL(ENTRY_URL);
}
