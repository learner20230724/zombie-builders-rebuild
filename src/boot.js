/* Stable browser entry point. Configuration is applied outside generated code. */
(async function () {
  const status = document.querySelector('#status');
  const report = error => {
    status.className = 'error';
    status.textContent = `游戏运行错误（未忽略）：\n${error?.stack || error}`;
    (window.__gameErrors ||= []).push(String(error?.stack || error));
    console.error(error);
  };
  window.addEventListener('error', event => report(event.error || event.message));
  window.addEventListener('unhandledrejection', event => report(event.reason));
  window.addEventListener('ztp-runtime-error', event => report(event.detail.stack || event.detail.message));
  try {
    async function loadDocuments(directory) {
      return Object.fromEntries(await Promise.all(
        ['units', 'zombies', 'buildings', 'powers', 'levels'].map(async name => {
          const response = await fetch(`/${directory}/${name}.json`, {cache:'no-store'});
          if (!response.ok) throw new Error(`配置 /${directory}/${name}.json HTTP ${response.status}`);
          return [name, await response.json()];
        })
      ));
    }
    const [documents,defaultDocuments] = await Promise.all([loadDocuments('config'),loadDocuments('defaults')]);
    const defaults = GameConfig.fromDocuments(defaultDocuments);
    window.gameDefaults = defaults;
    const prepared = Customization.prepare(defaults,GameConfig.fromDocuments(documents),globalThis);
    const configuration = prepared.configuration;
    GameConfig.install(globalThis, configuration);
    CustomRules.install(globalThis,prepared.rules);
    window.gameConfig = configuration;
    const response = await fetch('/public/assets/manifest.json');
    if (!response.ok) throw new Error(`资源清单 HTTP ${response.status}`);
    const manifest = await response.json();
    const splashResponse = await fetch('/public/assets/splash.json');
    if (!splashResponse.ok) throw new Error(`开场清单 HTTP ${splashResponse.status}`);
    const splash = await splashResponse.json();
    window.gameManifest = manifest;
    await bootRuntime({
      canvas: document.querySelector('#game'),
      storageKey: prepared.storageKey,
      assets: {...manifest.images, ...manifest.sounds},
      movies: {splash},
      create() { bb_Init(); bb_Main(); }
    });
    status.textContent = '';
    window.gameReady = true;
    Customization.attach(globalThis,{prepared});
  } catch (error) { report(error); }
})();
