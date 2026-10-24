/* Game-clock controls inside the F2 customization dock, never on the game. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.TimeControls = api;
    root.addEventListener('customization-ready', event => {
      const controller = event.detail && (event.detail.controller || event.detail);
      api.mount(controller && typeof controller.getState === 'function' ? controller : root.Customization);
    });
  }
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const MAX_SCALE = 20;
  const PRESETS = Object.freeze([0, 0.5, 1, 2, 4, 8, 12, MAX_SCALE]);
  let instance;
  function normalizeScale(value) {
    const text = String(value).trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
    return Math.round(Math.max(0, Math.min(MAX_SCALE, Number(text))) * 10) / 10;
  }
  function mount(controller, options) {
    if (!options && instance) return instance;
    options = options || {};
    const win = options.window || window, doc = options.document || win.document;
    const runtime = options.runtime || win.ZTPRuntime;
    if (!controller || typeof controller.getState !== 'function' || typeof controller.pauseForEditor !== 'function'
      || typeof controller.resumeFromEditor !== 'function') throw new TypeError('TimeControls requires a game customization controller');
    if (!runtime || typeof runtime.setTimeScale !== 'function' || typeof runtime.getStatus !== 'function') throw new TypeError('TimeControls requires the game clock');
    const host = options.root || doc.getElementById('ztps-time-host'), cleanups = [];
    if (!host || typeof host.appendChild !== 'function') throw new TypeError('TimeControls requires the F2 customization dock host');
    let disposed = false, timePause, interval, lastPositiveScale = 1;
    const node = (tag, text) => { const el = doc.createElement(tag); if (text !== undefined) el.textContent = text; return el; };
    function on(target, type, listener, args) {
      target.addEventListener(type, listener, args); cleanups.push(() => target.removeEventListener(type, listener, args));
    }
    const element = node('section'); element.className = 'ztp-time-controls';
    element.setAttribute('data-time-controls', ''); element.setAttribute('aria-label', '时间控制');
    const header = node('div'); header.className = 'ztp-time-header'; element.appendChild(header);
    const toggle = node('button', '时间控制'); toggle.type = 'button'; toggle.className = 'ztp-time-toggle';
    toggle.setAttribute('data-time-toggle', ''); toggle.setAttribute('aria-expanded', 'true'); toggle.setAttribute('aria-controls', 'ztp-time-body');
    header.appendChild(toggle);
    const pause = node('button', '暂停战斗'); pause.type = 'button'; pause.className = 'ztp-time-pause';
    pause.setAttribute('data-time-pause', ''); header.appendChild(pause);
    const body = node('div'); body.id = 'ztp-time-body'; body.className = 'ztp-time-body'; body.hidden = false; element.appendChild(body);
    const scaleRow = node('div'); scaleRow.className = 'ztp-time-scale-row'; body.appendChild(scaleRow);
    const range = node('input'); range.type = 'range'; range.min = '0'; range.max = String(MAX_SCALE); range.step = '0.1';
    range.setAttribute('aria-label', '游戏倍速滑块，0 为暂停'); range.setAttribute('data-time-range', ''); scaleRow.appendChild(range);
    const numeric = node('input'); numeric.type = 'text'; numeric.inputMode = 'decimal'; numeric.min = '0'; numeric.max = String(MAX_SCALE); numeric.step = '0.1';
    numeric.setAttribute('aria-label', '游戏倍速数值，0 到 20'); numeric.setAttribute('data-time-number', ''); scaleRow.appendChild(numeric);
    const presets = node('div'); presets.className = 'ztp-time-presets'; body.appendChild(presets);
    const speedButtons = PRESETS.map(scale => {
      const b = node('button', scale + '×'); b.type = 'button'; b.setAttribute('data-time-speed', String(scale));
      b.setAttribute('aria-label', scale === 0 ? '零倍速，暂停' : scale + ' 倍模拟速度');
      on(b, 'click', () => setScale(scale)); presets.appendChild(b); return b;
    });
    const status = node('div'); status.className = 'ztp-time-status'; status.setAttribute('data-time-status', '');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'off'); body.appendChild(status);
    const error = node('div'); error.className = 'ztp-time-error'; error.hidden = true;
    error.setAttribute('data-time-error', ''); error.setAttribute('role', 'status'); error.setAttribute('aria-live', 'polite'); body.appendChild(error);
    function fail(message) { error.textContent = message; error.hidden = !message; }
    function read() {
      const state = controller.getState(), battle = controller.getBattleStatus ? controller.getBattleStatus() : state.battleStatus || state;
      const clock = runtime.getStatus(), scale = clock.timeScale === undefined ? 1 : clock.timeScale;
      return {state, battle, clock, scale, paused: timePause !== undefined || scale === 0 || !!battle.editorPaused || !!state.paused || !clock.running || !!battle.gamePaused};
    }
    function setScale(value, editing = false) {
      if (disposed) return false;
      try {
        if (read().scale !== value) runtime.setTimeScale(value); if (value > 0) lastPositiveScale = value;
        fail(''); refresh(editing); return true;
      } catch (e) { fail(e.message || String(e)); return false; }
    }
    function commitNumber() {
      if (disposed) return;
      const scale = normalizeScale(numeric.value);
      if (scale === null) { fail('请输入数字，已恢复当前倍速。'); numeric.value = String(read().scale); return; }
      if (setScale(scale)) numeric.value = String(scale);
    }
    function resume() {
      if (disposed) return;
      try {
        if (read().scale === 0) runtime.setTimeScale(lastPositiveScale || 1);
        // Settings owns its default-open pause. Explicit clock pause owns a
        // different token; neither operation can release a third-party token.
        const resumeEditor = options.resumeEditor || (() => win.SettingsUI?.resumePlayback?.());
        resumeEditor();
        if (timePause !== undefined) { const token = timePause; timePause = undefined; controller.resumeFromEditor(token); }
        fail(''); refresh();
      } catch (e) { fail(e.message || String(e)); }
    }
    function pauseBattle() {
      if (disposed) return;
      try { if (timePause === undefined) timePause = controller.pauseForEditor(); fail(''); refresh(); }
      catch (e) { fail(e.message || String(e)); }
    }
    function refresh(preserveEditing = false) {
      if (disposed) return;
      const value = read();
      if (value.scale > 0) lastPositiveScale = value.scale;
      toggle.textContent = '时间 · ' + value.scale + '×';
      pause.textContent = value.paused ? '继续战斗' : '暂停战斗'; pause.setAttribute('aria-pressed', String(value.paused));
      range.value = String(value.scale);
      if (!preserveEditing && doc.activeElement !== numeric) numeric.value = String(value.scale);
      speedButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(PRESETS[i] === value.scale)));
      status.textContent = value.battle.gamePaused ? '原游戏暂停中，请在游戏内继续'
        : value.paused ? '已暂停' : '正在运行';
      status.setAttribute('aria-label', '目标 ' + value.scale + ' 倍模拟速度 · ' + status.textContent);
    }
    function expand(open) { body.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); }
    on(toggle, 'click', () => expand(body.hidden));
    on(pause, 'click', () => read().paused ? resume() : pauseBattle());
    on(range, 'input', () => { const scale = normalizeScale(range.value); if (scale !== null) setScale(scale); });
    on(numeric, 'change', commitNumber); on(numeric, 'blur', commitNumber);
    on(numeric, 'keydown', event => { if (event.key === 'Enter' || event.code === 'NumpadEnter') { event.preventDefault(); commitNumber(); } });
    // Leave keyup/pointerup available to release input held on the canvas. The
    // runtime already ignores keydowns originating in native editable controls.
    for (const type of ['pointerdown', 'click', 'wheel', 'keydown']) on(element, type, event => event.stopPropagation());
    if (typeof controller.subscribe === 'function') { const unsubscribe = controller.subscribe(() => refresh()); if (typeof unsubscribe === 'function') cleanups.push(unsubscribe); }
    host.appendChild(element); refresh();
    if (typeof win.setInterval === 'function') interval = win.setInterval(() => refresh(), 250);
    const handle = Object.freeze({element, refresh, pause: pauseBattle, resume, expand, destroy() {
      if (disposed) return;
      if (timePause !== undefined) { const token = timePause; timePause = undefined; controller.resumeFromEditor(token); }
      disposed = true; if (interval !== undefined) win.clearInterval(interval);
      for (const cleanup of cleanups) cleanup(); element.remove(); if (instance === handle) instance = undefined;
    }});
    if (!options.document) instance = handle;
    return handle;
  }
  return Object.freeze({mount, normalizeScale, PRESETS, MAX_SCALE});
});
