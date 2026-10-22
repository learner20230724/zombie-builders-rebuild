/* Browser bootstrap only; game logic is generated from the recovered source. */
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
    const response = await fetch('/public/assets/manifest.json');
    if (!response.ok) throw new Error(`资源清单 HTTP ${response.status}`);
    const manifest = await response.json();
    const splashResponse = await fetch('/public/assets/splash.json');
    if (!splashResponse.ok) throw new Error(`开场清单 HTTP ${splashResponse.status}`);
    const splash = await splashResponse.json();
    window.gameManifest = manifest;
    await bootRuntime({
      canvas: document.querySelector('#game'),
      assets: {...manifest.images, ...manifest.sounds},
      movies: {splash},
      create() { bb_Init(); bb_Main(); }
    });
    status.textContent = '';
    window.gameReady = true;
  } catch (error) { report(error); }
})();
