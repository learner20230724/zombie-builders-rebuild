/* Game customization editor. Runtime operations are delegated to Customization. */
(function (root, factory) {
  'use strict';
  const common = typeof module === 'object' && module.exports;
  const api = factory(common ? require('./game-config.js') : root.GameConfig, common ? require('./custom-rules.js') : root.CustomRules);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.SettingsUI = api;
    root.addEventListener('customization-ready', event => {
      const controller = event.detail && (event.detail.controller || event.detail);
      api.mount(controller && typeof controller.getState === 'function' ? controller : root.Customization);
    });
  }
})(typeof globalThis === 'object' ? globalThis : this, function (GameConfig, CustomRules) {
  'use strict';
  const HEALTH_SAFETY_LIMIT = GameConfig.HEALTH_SAFETY_LIMIT;
  const ZOMBIES = ['普通僵尸', '跳跃食尸鬼', '快速僵尸', '肥胖僵尸', '投尸僵尸'];
  const NAMES = {
    units: ['铲工', '愤怒农夫', '生存专家', '燃烧瓶投手', '牧师', '我方基地'],
    zombies: ZOMBIES.concat('僵尸基地'),
    buildings: ['拖车', '废品回收场', '农舍', '车库', '酿酒屋', '教堂'],
    powers: ['愤怒暴民', '收割机', '空袭'],
    levels: ['第 1 关', '第 2 关', '第 3 关', '第 4 关']
  };
  const TABS = [['sandbox', '沙盒 / 刷怪'], ['units', '兵种'], ['zombies', '僵尸'], ['buildings', '建筑'], ['powers', '技能'], ['levels', '关卡 / 出怪']];
  const FIELDS = {
    name: ['名称', '文字', '立即'], title: ['关卡标题', '文字', '下局'], description: ['说明', '文字', '立即'],
    cost: ['招募 / 建造费用', '现金', '立即'], health: ['最大生命', 'HP；正整数', '按生命策略'], damage: ['攻击伤害', '伤害', '立即'],
    projectileDamage: ['投射物伤害', '伤害', '新投射物'], moveSpeed: ['移动速度', '距离 / 战斗 tick', '立即'],
    buildTicks: ['生产 / 蓄力时间', '战斗 tick', '保留进度'], cooldownTicks: ['冷却时间', '战斗 tick', '保留进度'],
    dependency: ['所需建筑 ID', '0–5（见建筑页）', '下局'], people: ['占用人口', '人', '下局'], maximum: ['最大建筑数', '0 = 不设上限', '立即'],
    hitRadius: ['水平命中半径', '距离', '立即'], hitOffset: ['水平命中偏移', '距离', '立即'], xp: ['技能所需经验', 'XP', '立即'],
    unlockAfterStage: ['通关解锁要求', '0=直接；1–4=需通关', '下局'],
    shovelCount: ['暴民铲工数量', '人', '下次技能'], shotgunCount: ['暴民农夫数量', '人', '下次技能'],
    survivalistCount: ['暴民机枪手数量', '人', '下次技能'], bomberCount: ['暴民炸弹手数量', '人', '下次技能'], preacherCount: ['暴民牧师数量', '人', '下次技能'],
    angerSpeedMultiplier: ['暴民速度倍率', '倍', '立即（含在场暴民）'], jetCount: ['空袭飞机数量', '架', '下次技能'],
    zombieDamageMultiplier: ['僵尸近战伤害倍率', '倍；结果取整', '立即'], zombieHealthMultiplier: ['僵尸生命倍率', '倍率先取整', '按生命策略'],
    startingCash: ['开局现金', '现金', '下局'], startingXp: ['开局经验', 'XP', '下局'],
    automaticSpawning: ['自动波次出怪', '开 / 关', '立即'], baseReinforcements: ['基地受伤触发增援', '开 / 关', '立即'],
    corpseSpawnOnImpact: ['尸弹落地额外生成僵尸', '开 / 关', '立即'], preacherConversion: ['牧师转化敌人', '开 / 关', '立即'],
    fatAreaAttack: ['肥胖僵尸范围攻击', '开 / 关', '立即'], corpseThrowing: ['投尸僵尸投掷尸体', '开 / 关', '立即'],
    ghoulLongLeap: ['食尸鬼远距离长跃', '开 / 关', '下个战斗 tick'],
    harvesterDamagePerTick: ['收割机每 tick 伤害', '伤害 / 战斗 tick', '立即'], harvesterRange: ['收割机命中范围', '距离', '立即'],
    salvagePayout: ['废品场每次收入', '现金', '立即'], salvageIntervalTicks: ['废品场结算间隔', '战斗 tick', '立即'], populationPerTrailer: ['每辆拖车提供人口', '人', '立即']
  };
  const IMMUTABLE = new Set(['id', 'key', 'type', 'schemaVersion']);
  const clone = value => JSON.parse(JSON.stringify(value));
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function pathParts(path) {
    const parts = Array.isArray(path) ? path : String(path).replace(/^\$\.?/, '').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
    if (parts.some(part => ['__proto__', 'prototype', 'constructor'].includes(String(part)))) throw new Error('不允许的字段路径');
    return parts;
  }
  function getAt(value, path) { for (const part of pathParts(path)) { if (value == null) return undefined; value = value[part]; } return value; }
  function setAt(value, path, next) {
    const parts = pathParts(path); if (!parts.length) throw new Error('字段路径不能为空');
    const key = parts.pop(); let parent = value;
    for (const part of parts) { if (parent == null || !Object.prototype.hasOwnProperty.call(parent, part)) throw new Error('字段路径不存在'); parent = parent[part]; }
    if (parent == null || !Object.prototype.hasOwnProperty.call(parent, key)) throw new Error('字段路径不存在');
    parent[key] = next; return value;
  }
  function flattenFields(value, prefix = '') {
    const result = [];
    for (const [key, item] of Object.entries(value || {})) {
      if (IMMUTABLE.has(key) || ['waves', 'reinforcements', 'zombieTypesEnabled'].includes(key)) continue;
      const path = prefix ? prefix + '.' + key : key;
      if (item && typeof item === 'object' && !Array.isArray(item)) result.push(...flattenFields(item, path));
      else if (['string', 'number', 'boolean'].includes(typeof item)) result.push({path, key, value: item});
    }
    return result;
  }
  function fieldInfo(key) { return FIELDS[key] || [key, '配置值', '按规则生效']; }
  function presetFilename(name) {
    const safe = String(name || 'custom').normalize('NFKC').replace(/[^a-zA-Z0-9\u3400-\u9fff_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'custom';
    return 'zombie-builders-preset-' + safe + '.json';
  }
  function waveLabel(type) { return type === 0 ? '等待（不出怪）' : ZOMBIES[type - 1] || '未知类型'; }
  function numericValue(value) {
    if (String(value).trim() === '') throw new Error('请输入数值，不能留空');
    const result = Number(value); if (!Number.isFinite(result)) throw new Error('请输入有效的有限数值'); return result;
  }
  function summarizeReport(report) {
    const applied = report && report.applied || [], deferred = report && report.deferred || [];
    return '本局已应用 ' + applied.length + ' 项' + (deferred.length ? '；' + deferred.length + ' 项下局生效（人口 / 前置建筑 / 开局资源等）' : '。');
  }
  let instance = null;
  function mount(controller, options) {
    if (instance && !options) return instance;
    options = options || {};
    if (!controller || typeof controller.getState !== 'function') throw new Error('SettingsUI 需要 Customization 控制器');
    const doc = options.document || document, win = options.window || window;
    const canvas = options.canvas || doc.getElementById('game');
    let opened = false, pauseToken, pollTimer, previousFocus = null, draft, baseline, baselineSaved = false, selectedPresetId = '', activeTab = 'sandbox', lastBattleStage = null, waveSequence = 0;
    let selection = {units: 0, zombies: 0, buildings: 0, powers: 0, levels: 0}, wavePage = 0, reinforcementPage = 0, reinforcementIndex = 0;
    const undo = [], invalid = new Map(), cleanups = [], consumedKeys = new Set();
    let disposed = false, clearingTroops = false, spawningBatch = false, cancelingPowerEffects = false, togglingWaves = false, committing = false, commitSequence = 0, committedSequence = 0, commitQueue = Promise.resolve();
    const baseQueues = {friendly: Promise.resolve(), enemy: Promise.resolve()};
    const spawnJobNodes = new Map(), spawnJobRateQueues = new Map(), cancelingSpawnJobs = new Set();
    let cancelingAllSpawnJobs = false, spawnFormRate;
    function node(tag, className, text) {
      const el = doc.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = String(text); return el;
    }
    function on(el, event, fn, opt) { el.addEventListener(event, fn, opt); cleanups.push(() => el.removeEventListener(event, fn, opt)); return el; }
    function button(text, fn, cls = '') { const b = node('button', 'ztps-button ' + cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; }
    function option(select, value, text) { const o = node('option', '', text); o.value = String(value); select.appendChild(o); return o; }
    function labeled(text, input, cls = '') { const label = node('label', 'ztps-label ' + cls); label.appendChild(node('span', '', text)); label.appendChild(input); return label; }
    function state() { return controller.getState(); }
    function snapshot() { undo.push(clone(draft)); if (undo.length > 30) undo.shift(); }
    function dirty() { return draft && !equal(draft, baseline); }
    function validateDraft(next) {
      const rules = CustomRules ? CustomRules.validate(next.rules) : next.rules;
      GameConfig.compile(next.config, {multipliers: rules.multipliers});
      return next;
    }
    function change(path, value) {
      if (equal(getAt(draft, path), value)) return commitQueue;
      const assign = target => {
        const parts = pathParts(path), key = parts[parts.length - 1];
        // Wave enabled is optional in the original JSON; only this known flag
        // may be introduced, never arbitrary configuration/prototype keys.
        if (key === 'enabled' && /^config\.levels\.\d+\.(waves\.\d+|reinforcements\.\d+\.calls\.\d+)\.enabled$/.test(path)) getAt(target, parts.slice(0, -1))[key] = value;
        else if (/^config\.powers\.\d+\.effect\.(survivalistCount|bomberCount|preacherCount)$/.test(path) && target.config.powers[Number(parts[2])].id === 0) getAt(target, parts.slice(0, -1))[key] = value;
        else setAt(target, path, value);
      };
      const next = clone(draft); assign(next); validateDraft(next);
      snapshot(); assign(draft); updateDirty(); return commitDraft(path !== 'rules.automaticSpawning');
    }
    function commitDraft(mergeAutomaticSpawning = false) {
      const next = validateDraft(clone(draft)), sequence = ++commitSequence, healthPolicy = hpPolicy.value;
      committing = true; updateDirty();
      const pending = commitQueue.then(async () => {
        if (disposed) return;
        // Independent field edits queued while the dedicated wave switch is
        // pending must not re-enable an old automatic-spawning snapshot.
        if(mergeAutomaticSpawning)next.rules.automaticSpawning=state().rules.automaticSpawning;
        // One atomic controller transaction, never separate config/rules writes.
        const report = await controller.commitSettings(next, {healthPolicy});
        committedSequence = sequence;
        if (sequence !== commitSequence || disposed) return report;
        draft.rules.automaticSpawning=next.rules.automaticSpawning;
        for(const input of content.querySelectorAll('[data-path]'))if(input.dataset.path==='rules.automaticSpawning')input.checked=next.rules.automaticSpawning;
        const waveReport = report && report.waveReport;
        notice(waveReport && waveReport.requiresNewBattle ? '旧波次方案需新开一局。其他参数已生效。' : report && report.deferred && report.deferred.length ? '已生效；标注“下局”的参数下次开局使用。' : report && report.staged ? '已保留，下一局使用。' : '已生效。');
        return report;
      });
      commitQueue = pending.catch(error => { if (!disposed && sequence === commitSequence) notice(error.message || String(error), true); }).finally(() => {
        if (sequence === commitSequence) committing = false;
        if (!disposed) renderBattleState();
      });
      return commitQueue;
    }
    function updateDirty(s) {
      s = s || state();
      const saved = dirty() ? '未另存规则' : baselineSaved ? '已保存规则' : '默认规则';
      const applied = draft && equal(draft.config, s.config) && equal(draft.rules, s.rules);
      dirtyLabel.textContent = (committing ? '正在生效…' : committedSequence === commitSequence ? s.isBattle ? '即时生效' : '下局使用' : '等待生效') + ' · ' + saved;
      dirtyLabel.dataset.saved = String(!dirty() && baselineSaved); dirtyLabel.dataset.applied = String(!!applied);
      undoButton.disabled = undo.length === 0;
    }
    function defaults() { const s = state(); return {config: s.defaults, rules: s.defaultRules}; }
    function newWaveId() {
      const used = new Set(draft.config.levels.flatMap(level => level.waves.map(wave => wave.id)));
      let id;
      do { id = 'wave-' + (win.crypto && typeof win.crypto.randomUUID === 'function' ? win.crypto.randomUUID() : Date.now().toString(36) + '-' + (++waveSequence).toString(36)); } while (used.has(id));
      return id;
    }
    function notice(text, error) { message.textContent = text || ''; message.classList.toggle('ztps-error', !!error); message.setAttribute('role', error ? 'alert' : 'status'); }
    function focusError(error) {
      const text = String(error && error.message || error);
      notice(text, true);
      const match = text.match(/\$\.([a-z]+)\[(\d+)\]/i);
      if (match && NAMES[match[1]]) {
        activeTab = match[1]; selection[activeTab] = Math.min(Number(match[2]), draft.config[activeTab].length - 1);
        const waveMatch = text.match(/\.waves\[(\d+)\]/);
        const groupMatch = text.match(/\.reinforcements\[(\d+)\]/);
        const callMatch = text.match(/\.calls\[(\d+)\]/);
        if (waveMatch) wavePage = Math.floor((draft.config.levels[selection.levels].waves.length - 1 - Number(waveMatch[1])) / 12);
        if (groupMatch) reinforcementIndex = Number(groupMatch[1]);
        if (callMatch) reinforcementPage = Math.floor(Number(callMatch[1]) / 12);
        render();
      } else if (text.includes('CustomRules ')) { activeTab = 'sandbox'; render(); }
      const path = text.match(/\$\.([a-zA-Z0-9_.\[\]]+)/);
      const all = Array.from(content.querySelectorAll('[data-path]'));
      const exact = path && all.find(el => el.dataset.path === (text.includes('CustomRules ') ? 'rules.' : 'config.') + path[1].replace(/\[(\d+)\]/g, '.$1'));
      if (exact) { exact.classList.add('ztps-invalid'); exact.setAttribute('aria-invalid', 'true'); exact.focus(); }
    }
    async function action(fn, allowInvalid = false) {
      try {
        if (!allowInvalid && invalid.size) { const entry = invalid.entries().next().value; throw new Error(entry[1]); }
        await fn();
      } catch (error) { focusError(error); }
    }
    function resetDraft(next, saved, persisted = false) {
      draft = clone(next); baseline = clone(saved || next); baselineSaved = persisted; invalid.clear(); undo.length = 0; wavePage = reinforcementPage = reinforcementIndex = 0;
      updateDirty(); render();
    }
    function refreshPresets() {
      while (presetSelect.firstChild) presetSelect.removeChild(presetSelect.firstChild);
      option(presetSelect, '', '当前规则 / 尚未命名');
      for (const preset of controller.listPresets()) option(presetSelect, preset.id, preset.name);
      presetSelect.value = selectedPresetId;
      deleteButton.disabled = !selectedPresetId;
    }
    const overlay = node('div', 'ztps-overlay'); overlay.hidden = true;
    const modal = node('section', 'ztps-modal'); modal.id = 'ztps-panel'; modal.setAttribute('role', 'complementary'); modal.setAttribute('aria-labelledby', 'ztps-title'); modal.tabIndex = -1;
    overlay.appendChild(modal);
    const header = node('header', 'ztps-header'), heading = node('div');
    const title = node('h1', '', '自定义规则与沙盒'); title.id = 'ztps-title';
    heading.appendChild(title);
    const closeButton = button('关闭 · Esc', () => close(), 'ztps-close'); header.appendChild(heading); header.appendChild(closeButton); modal.appendChild(header);
    const timeHost=node('div','ztps-time-host');timeHost.id='ztps-time-host';modal.appendChild(timeHost);
    const presetBar = node('div', 'ztps-preset-bar');
    const presetSelect = node('select'); presetSelect.setAttribute('aria-label', '选择已保存的规则');
    presetSelect.addEventListener('change', () => action(async () => {
      if (!presetSelect.value) { selectedPresetId = ''; presetName.value = ''; refreshPresets(); return; }
      if (dirty() && !win.confirm('加载规则将替换尚未保存的修改，继续吗？')) { presetSelect.value = selectedPresetId; return; }
      selectedPresetId = presetSelect.value; const next = await controller.loadPreset(selectedPresetId);
      presetName.value = (controller.listPresets().find(p => p.id === selectedPresetId) || {}).name || ''; resetDraft(next, undefined, true); refreshPresets(); await commitDraft();
    }));
    const presetName = node('input'); presetName.type = 'text'; presetName.maxLength = 80; presetName.placeholder = '规则名称，例如：胖僵尸挑战'; presetName.setAttribute('aria-label', '规则名称');
    const saveButton = button('保存规则', () => action(async () => {
      const name = presetName.value.trim(); if (!name) { presetName.focus(); throw new Error('请先给这套规则起个名字。'); }
      await commitQueue;
      const meta = await controller.savePreset(name, clone(draft), selectedPresetId || undefined); selectedPresetId = meta.id; baseline = clone(draft); baselineSaved = true; updateDirty(); refreshPresets(); notice('规则已保存。');
    }), 'ztps-primary');
    const saveNew = button('另存为', () => { selectedPresetId = ''; baselineSaved = false; presetSelect.value = ''; presetName.value = ''; presetName.focus(); deleteButton.disabled = true; updateDirty(); notice('输入新名称后点击“保存规则”。'); });
    const deleteButton = button('删除', () => action(async () => {
      if (!selectedPresetId || !win.confirm('删除这套已保存的规则？当前编辑内容和存档不受影响。')) return;
      await controller.deletePreset(selectedPresetId); selectedPresetId = ''; baselineSaved = false; refreshPresets(); updateDirty(); notice('已删除已保存的规则；编辑中的内容仍保留。');
    }));
    presetBar.appendChild(labeled('已保存规则', presetSelect)); presetBar.appendChild(labeled('名称', presetName, 'ztps-grow'));
    presetBar.appendChild(saveButton); presetBar.appendChild(saveNew); presetBar.appendChild(deleteButton); modal.appendChild(presetBar);
    const nav = node('nav', 'ztps-tabs'); nav.setAttribute('aria-label', '自定义分类'); nav.setAttribute('role', 'tablist');
    const tabButtons = new Map();
    for (const [key, text] of TABS) {
      const b = button(text, () => { activeTab = key; render(); }, 'ztps-tab'); b.id = 'ztps-tab-' + key; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'ztps-content');
      tabButtons.set(key, b); nav.appendChild(b);
    }
    nav.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const keys = TABS.map(t => t[0]), index = keys.indexOf(activeTab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? keys.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + keys.length) % keys.length;
      event.preventDefault(); activeTab = keys[next]; render(); tabButtons.get(activeTab).focus();
    });
    modal.appendChild(nav);
    const waveStatus = node('p', 'ztps-wave-status'); waveStatus.dataset.waveStatus = 'true'; waveStatus.setAttribute('role', 'status'); modal.appendChild(waveStatus);
    const content = node('div', 'ztps-content'); content.id = 'ztps-content'; content.setAttribute('role', 'tabpanel'); content.tabIndex = -1; modal.appendChild(content);
    const message = node('p', 'ztps-message'); message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite'); modal.appendChild(message);
    const footer = node('footer', 'ztps-footer'), tools = node('div', 'ztps-tools'), actions = node('div', 'ztps-apply');
    const dirtyLabel = node('span', 'ztps-dirty');
    const undoButton = button('撤销修改', () => action(async () => { if (!undo.length) return; draft = undo.pop(); invalid.clear(); updateDirty(); render(); await commitDraft(); }));
    const resetButton = button('恢复原版默认', () => action(async () => {
      if (!win.confirm('恢复全部默认参数？已保存的命名规则不会删除。')) return;
      snapshot(); draft = clone(defaults()); invalid.clear(); updateDirty(); render(); await commitDraft();
    }));
    const importInput = node('input', 'ztps-file'); importInput.type = 'file'; importInput.accept = '.json,application/json'; importInput.tabIndex = -1; importInput.setAttribute('aria-hidden', 'true');
    importInput.addEventListener('change', () => action(async () => {
      const file = importInput.files && importInput.files[0]; if (!file) return;
      try {
        if (file.size > 2 * 1024 * 1024) throw new Error('规则文件超过 2 MB，请选择较小的 JSON 文件。');
        const parsed = await controller.importPreset(await file.text());
        if (dirty() && !win.confirm('导入规则将替换尚未保存的修改，继续吗？')) return;
        selectedPresetId = ''; presetName.value = parsed.name || ''; resetDraft({config: parsed.config, rules: parsed.rules}); refreshPresets(); await commitDraft();
      } finally { importInput.value = ''; }
    }));
    const importButton = button('导入 JSON', () => importInput.click());
    const exportButton = button('导出 JSON', () => action(async () => {
      const text = await controller.exportPreset(clone(draft), presetName.value.trim() || 'custom');
      const url = win.URL.createObjectURL(new win.Blob([text], {type: 'application/json;charset=utf-8'}));
      const a = node('a'); a.href = url; a.download = presetFilename(presetName.value); a.hidden = true; doc.body.appendChild(a); a.click(); a.remove();
      win.setTimeout(() => win.URL.revokeObjectURL(url), 1000); notice('已导出规则 JSON。');
    }));
    tools.appendChild(undoButton); tools.appendChild(resetButton); tools.appendChild(importButton); tools.appendChild(exportButton); tools.appendChild(importInput); tools.appendChild(dirtyLabel);
    const hpPolicy = node('select'); option(hpPolicy, 'ratio', '存量单位保持生命百分比'); option(hpPolicy, 'new-only', '生命值仅影响新生成单位');
    hpPolicy.setAttribute('aria-label', '已有单位生命值应用策略'); actions.appendChild(labeled('生命调整方式', hpPolicy));
    footer.appendChild(tools); footer.appendChild(actions); modal.appendChild(footer);
    doc.body.appendChild(overlay);
    function makeInput(path, value, label) {
      let input;
      if (typeof value === 'boolean') { input = node('input'); input.type = 'checkbox'; input.checked = value; }
      else if (typeof value === 'number') {
        input = node('input'); input.type = 'number'; input.step = 'any'; input.value = String(value); input.inputMode = 'decimal';
        if (path.endsWith('.maximum')) { input.min = '0'; input.max = '100000'; input.step = '1'; }
        if (path.endsWith('.health') && !path.startsWith('rules.multipliers.')) { input.min = '1'; input.max = String(HEALTH_SAFETY_LIMIT); input.step = '1'; input.inputMode = 'numeric'; }
        if (path.startsWith('rules.multipliers.')) { input.min = '0'; input.max = String(HEALTH_SAFETY_LIMIT); input.step = '0.1'; }
        if (/Count$/.test(path)) { input.min = '0'; input.max = String(HEALTH_SAFETY_LIMIT); input.step = '1'; input.inputMode = 'numeric'; }
      }
      else { input = node(path.endsWith('description') ? 'textarea' : 'input'); if (input.tagName === 'INPUT') input.type = 'text'; input.value = value; input.maxLength = path.endsWith('description') ? 2000 : 120; }
      input.dataset.path = path; input.setAttribute('aria-label', label);
      function commit() {
        try {
          const next = typeof value === 'boolean' ? input.checked : typeof value === 'number' ? numericValue(input.value) : input.value;
          const pending = change(path, next); invalid.delete(path); input.classList.remove('ztps-invalid'); input.removeAttribute('aria-invalid'); return pending;
        } catch (error) {
          invalid.set(path, label + '：' + error.message); input.classList.add('ztps-invalid'); input.setAttribute('aria-invalid', 'true'); notice(label + '：' + error.message, true);
          return Promise.resolve();
        }
      }
      input.addEventListener('change', commit);
      if (typeof value !== 'boolean') {
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing && (input.tagName !== 'TEXTAREA' || event.ctrlKey || event.metaKey)) { event.preventDefault(); return commit(); } });
      }
      return input;
    }
    function parameterTable(entity, original, prefix) {
      const wrap = node('div', 'ztps-table-scroll'), table = node('table', 'ztps-table');
      const head = node('thead'), hrow = node('tr'); for (const text of ['属性', '默认', '当前值', '单位 / 范围']) hrow.appendChild(node('th', '', text)); head.appendChild(hrow); table.appendChild(head);
      const body = node('tbody');
      for (const field of flattenFields(entity)) {
        const info = fieldInfo(field.key), row = node('tr'), titleCell = node('th');
        titleCell.scope = 'row'; titleCell.appendChild(node('span', '', info[0]));
        if (info[2] === '下局') titleCell.appendChild(node('small', 'ztps-next-battle', '下局'));
        else if (info[2] === '下次技能') titleCell.appendChild(node('small', 'ztps-next-battle', '下次施放'));
        row.appendChild(titleCell);
        const originalValue = getAt(original, field.path), def = typeof originalValue === 'boolean' ? originalValue ? '开启' : '关闭' : originalValue;
        row.appendChild(node('td', 'ztps-default', def === undefined ? '—' : def)); const cell = node('td'); cell.appendChild(makeInput(prefix + '.' + field.path, field.value, info[0])); row.appendChild(cell);
        row.appendChild(node('td', 'ztps-unit', info[1])); body.appendChild(row);
      }
      table.appendChild(body); wrap.appendChild(table); return wrap;
    }
    function mutate(fn) {
      const before = clone(draft);
      try { fn(); validateDraft(draft); undo.push(before); if (undo.length > 30) undo.shift(); updateDirty(); render(); return commitDraft(true); }
      catch (error) { draft = before; render(); notice(error.message || String(error), true); return Promise.resolve(); }
    }
    function render() {
      if (!draft) return;
      // Non-numeric text never entered the draft. A re-render restores the last
      // valid field value, so it must not leave an invisible validation blocker.
      invalid.clear();
      spawnJobNodes.clear();
      while (content.firstChild) content.removeChild(content.firstChild);
      for (const [key, b] of tabButtons) { b.setAttribute('aria-selected', String(key === activeTab)); b.tabIndex = key === activeTab ? 0 : -1; }
      content.setAttribute('aria-labelledby', 'ztps-tab-' + activeTab);
      if (activeTab === 'sandbox') renderSandbox(); else renderEntities(activeTab);
      renderBattleState(); updateDirty();
    }
    function renderBattleState() {
      if (!draft) return; const s = state();
      const battle = typeof controller.getBattleStatus === 'function' ? controller.getBattleStatus() : s.battleStatus || s;
      const ownsPause = pauseToken !== undefined;
      const status = content.querySelector('[data-battle-status]');
      if (status) status.textContent = s.isCustom && s.isBattle ? '自定义战局 · 第 ' + s.stage + ' 关' + (ownsPause ? ' · 设置暂停中' : ' · 设置与游戏可同时操作') : s.isBattle ? '原版战局 · 修改参数后转为自定义'  : '先选择关卡，开始自定义战局。';
      for (const b of content.querySelectorAll('[data-spawn]')) b.disabled = !(s.isCustom && s.isBattle) || typeof controller.spawnZombie !== 'function';
      for (const b of content.querySelectorAll('[data-spawn-batch]')) b.disabled = spawningBatch || !(s.isCustom && s.isBattle) || typeof controller.enqueueSpawn !== 'function';
      for (const b of content.querySelectorAll('[data-clear-troops]')) {
        const method = b.dataset.clearTroops === 'friendly' ? 'clearFriendlyTroops' : 'clearEnemyTroops';
        b.disabled = clearingTroops || !(s.isCustom && s.isBattle) || typeof controller[method] !== 'function';
      }
      for (const b of content.querySelectorAll('[data-clear-selected]')) {
        const method = b.dataset.clearSelected === 'friendly' ? 'clearFriendlyTroops' : 'clearEnemyTroops';
        b.disabled = clearingTroops || !(s.isCustom && s.isBattle) || typeof controller[method] !== 'function';
      }
      for (const b of content.querySelectorAll('[data-cancel-power-effects]')) b.disabled = cancelingPowerEffects || !(s.isCustom && s.isBattle) || typeof controller.cancelPowerEffects !== 'function';
      for(const b of content.querySelectorAll('[data-toggle-waves]')){b.textContent=s.rules.automaticSpawning?'暂停波次':'继续波次';b.disabled=togglingWaves||typeof controller.commitSettings!=='function';b.setAttribute('aria-pressed',String(!s.rules.automaticSpawning));}
      for(const text of content.querySelectorAll('[data-wave-pause-status]'))text.textContent=s.rules.automaticSpawning?'波次进行中':'波次已暂停（保留进度）';
      const bases = battle.bases || s.bases;
      for (const input of content.querySelectorAll('[data-base-current]')) {
        const base = bases && bases[input.dataset.baseCurrent];
        input.disabled = !(s.isCustom && s.isBattle && base && typeof controller.setBaseHealth === 'function');
        if (base) {
          input.max = String(base.maximum);
          if (doc.activeElement !== input && input.dataset.pending !== 'true') { input.value = String(base.current); input.dataset.committedValue = input.value; }
        } else if (doc.activeElement !== input) { input.value = ''; input.dataset.committedValue = ''; }
      }
      for (const text of content.querySelectorAll('[data-base-status]')) {
        const base = bases && bases[text.dataset.baseStatus]; text.textContent = base ? '本局 ' + base.current + ' / ' + base.maximum : '开始自定义战局后可调当前生命';
      }
      const pendingPower = content.querySelector('[data-power-pending]');
      if (pendingPower) {
        const progress=battle.powerProgress||s.powerProgress,selected=progress&&Array.isArray(progress.byPower)?progress.byPower.find(value=>value.id===Number(pendingPower.dataset.powerId)):null;
        if(!s.isBattle)pendingPower.textContent='尚未开始战局';
        else if(selected) {
          const active=['actors','powerups','projectiles','explosions'].reduce((sum,key)=>sum+(Number(selected[key])||0),0);
          pendingPower.textContent='当前技能 · 在场 '+active+' · 待生成 '+(Number(selected.pending)||0)+(selected.charging?' · 蓄力中':'');
        } else pendingPower.textContent='全部技能 · 待生成 '+(progress&&Number(progress.pendingTotal)||0)+(progress&&progress.activeTotal!==undefined?' · 在场 '+progress.activeTotal:'');
      }
      refreshSpawnQueue(battle.spawnQueue||s.spawnQueue,s);
      refreshTroopCounts(battle.troopCounts||s.troopCounts);
      const editing = content.querySelector('[data-editing-stage]');
      if (editing) { const other = Number(editing.dataset.editingStage); editing.textContent = s.isBattle && s.stage !== other ? '当前正在第 ' + s.stage + ' 关；你正在编辑第 ' + other + ' 关。此关波次下一次开该关时才生效。' : s.isBattle ? '第 ' + s.stage + ' 关 · 修改未完成波次即时生效'  : '正在编辑第 ' + other + ' 关，开始该关自定义战局后生效。'; editing.classList.toggle('ztps-warning', !!(s.isBattle && s.stage !== other)); }
      const buildingStatus = content.querySelector('[data-building-status]');
      if (buildingStatus) { const building = (battle.buildings || []).find(value => value.id === Number(buildingStatus.dataset.buildingStatus)); buildingStatus.textContent = building ? '本局实际已建 ' + building.built + ' 座 · 排队 ' + building.queued + ' 座 · 当前上限 ' + (building.maximum === 0 ? '不设上限' : building.maximum + ' 座') : '尚未开始战局；这里将显示实际已建数量、排队数量与已生效上限。'; }
      refreshWaveStatus(s, battle); refreshWaveRows(s, battle.waveProgress || s.waveProgress); updateDirty(s);
    }
    function refreshWaveRows(s, progress) {
      const completed = new Set(progress && progress.completed || []);
      for (const cell of content.querySelectorAll('[data-wave-row-id]')) {
        const id = cell.dataset.waveRowId, stageId = Number(cell.dataset.waveStage), level = draft.config.levels.find(value => value.id === stageId), wave = level.waves.find(value => value.id === id);
        if (!s.isBattle || stageId !== s.stage) { cell.textContent = '下次进入第 ' + stageId + ' 关生效'; continue; }
        if (!id) { cell.textContent = '旧规则：需新局追踪'; continue; }
        const current = progress && progress.current && progress.current.id === id ? progress.current : null;
        const queued = progress && Array.isArray(progress.upcomingGroups) ? progress.upcomingGroups.find(value => value.id === id) : null;
        if (completed.has(id)) cell.textContent = '已完成 · 不补刷\n需重放请新增一组';
        else if (current) cell.textContent = '当前 · 已调度 ' + current.consumed + '\n剩余 ' + current.remaining + ' / 总量 ' + current.total;
        else if (queued) cell.textContent = '待出 · 剩余 ' + queued.remaining;
        else cell.textContent = wave && wave.enabled === false ? '禁用' : '新增 / 同步中';
        if (wave && wave.enabled === false && (current || queued)) cell.textContent += '\n正在禁用…';
        if (wave && current && wave.count !== current.total) cell.textContent += '\n新总量 ' + wave.count + '，同步中…';
        cell.classList.toggle('ztps-wave-completed', completed.has(id)); cell.classList.toggle('ztps-wave-current', !!current);
      }
      for (const control of content.querySelectorAll('[data-wave-control-id]')) {
        const locked = s.isBattle && Number(control.dataset.waveControlStage) === s.stage && completed.has(control.dataset.waveControlId);
        control.disabled = locked || control.dataset.boundaryDisabled === 'true';
        if (locked) control.setAttribute('title', '已完成；需要再次出怪请添加新组'); else control.removeAttribute('title');
      }
    }
    function refreshWaveStatus(s, battle) {
      if (!s.isBattle) { waveStatus.textContent = '当前没有进行中的战局。'; return; }
      const progress = battle.waveProgress || s.waveProgress;
      if (!progress) { waveStatus.textContent = '第 ' + s.stage + ' 关 · 波次状态加载中'; return; }
      const current = progress.current, upcoming = Array.isArray(progress.upcomingGroups) ? progress.upcomingGroups.length : progress.upcomingGroups || 0;
      const summary = '第 ' + s.stage + ' 关 · 已完成 ' + (progress.completedGroups || 0) + ' 组 · 后续 ' + upcoming + ' 组 · 队列剩余 ' + (progress.remainingTotal || 0) + ' 次';
      waveStatus.textContent = current ? summary + '\n' + (current.source === 'reinforcement' ? '当前增援组' : '当前第 ' + (Number(current.index) + 1) + ' 组') + '：' + waveLabel(current.type) + ' · 总量 ' + current.total + ' · 已出 ' + current.spawned + ' · 已调度 ' + current.consumed + ' · 剩余 ' + current.remaining : summary + '\n当前没有待出组（在场敌人与未触发的增援不包含在队列中）。';
    }
    function renderEntities(kind) {
      if ((kind === 'units' || kind === 'zombies') && draft.rules.multipliers && draft.rules.multipliers[kind]) {
        const section = node('section', 'ztps-multipliers'); section.appendChild(node('h2', '', kind === 'units' ? '人类兵种通用倍率' : '僵尸通用倍率'));
        section.appendChild(node('p', 'ztps-help', '按兵种类型生效，双方共用；基地除外。'));
        const controls = node('div', 'ztps-multiplier-grid');
        for (const [key, label] of [['health', '生命倍率'], ['moveSpeed', '移动速度倍率'], ['damage', '攻击伤害倍率']]) controls.appendChild(labeled(label, makeInput('rules.multipliers.' + kind + '.' + key, draft.rules.multipliers[kind][key], (kind === 'units' ? '人类兵种' : '僵尸') + label)));
        section.appendChild(controls); content.appendChild(section);
      }
      const toolbar = node('div', 'ztps-section-heading'), picker = node('select'); picker.setAttribute('aria-label', '选择' + TABS.find(t => t[0] === kind)[1]);
      draft.config[kind].forEach((item, i) => option(picker, i, NAMES[kind][item.id - (kind === 'levels' ? 1 : 0)] + ' · ' + item.name)); picker.value = String(selection[kind]);
      picker.addEventListener('change', () => { selection[kind] = Number(picker.value); wavePage = reinforcementPage = reinforcementIndex = 0; render(); });
      toolbar.appendChild(labeled('编辑对象', picker)); content.appendChild(toolbar);
      const index = selection[kind], entity = draft.config[kind][index], original = defaults().config[kind].find(item => item.id === entity.id);
      if (kind === 'levels') { const editing = node('p', 'ztps-editing-stage'); editing.dataset.editingStage = String(entity.id); content.appendChild(editing); }
      if (kind === 'buildings') { const actual = node('p', 'ztps-building-status'); actual.dataset.buildingStatus = String(entity.id); content.appendChild(actual); }
      if (kind === 'powers') renderPowerCancellation(entity.id);
      // Preserve legacy JSON fingerprints; absent optional counts are zero in
      // the view only until the user actually changes one of these controls.
      let displayed = entity, displayedOriginal = original;
      if (kind === 'powers' && entity.id === 0) {
        displayed = clone(entity); displayedOriginal = clone(original);
        for (const key of ['survivalistCount', 'bomberCount', 'preacherCount']) {
          if (displayed.effect[key] === undefined) displayed.effect[key] = 0;
          if (displayedOriginal.effect[key] === undefined) displayedOriginal.effect[key] = 0;
        }
      }
      content.appendChild(parameterTable(displayed, displayedOriginal, 'config.' + kind + '.' + index));
      if (kind === 'units' || kind === 'zombies') {
        const healthHelp = node('p', 'ztps-help', '生命为正整数，最高 ' + HEALTH_SAFETY_LIMIT.toLocaleString('en-US') + '；0 不代表无敌。');
        healthHelp.id = 'ztps-health-help'; content.appendChild(healthHelp);
      }
      if (kind === 'buildings') content.appendChild(node('p', 'ztps-help', '最大数量填 0 不设玩法上限；降低上限不会拆除已有建筑。'));
      if (kind === 'levels') { renderWaves(entity, index); renderReinforcements(entity, index); }
    }
    function renderPowerCancellation(powerId) {
      const section=node('section','ztps-power-actions'),controls=node('div','ztps-clear-actions');
      async function cancel(id) {
        if(cancelingPowerEffects)return;
        const s=state();if(!s.isCustom||!s.isBattle)throw new Error('请先开始自定义战局。');
        if(typeof controller.cancelPowerEffects!=='function')throw new Error('技能取消功能不可用。');
        cancelingPowerEffects=true;renderBattleState();
        try {
          const result=await controller.cancelPowerEffects(id),active=['actors','powerups','projectiles','explosions'].reduce((sum,key)=>sum+(Number(result[key])||0),0);
          const battle=typeof controller.getBattleStatus==='function'?controller.getBattleStatus():state();
          const paused=pauseToken!==undefined||battle.editorPaused||battle.gamePaused||battle.paused||battle.runtimeRunning===false;
          notice('已取消'+(id===undefined?'全部技能效果':NAMES.powers[id]+'效果')+'：待生成 '+(Number(result.pending)||0)+'，在场 '+active+'。'+(paused?' 画面暂停中，继续战斗后刷新。':''));
        } finally {cancelingPowerEffects=false;renderBattleState();}
      }
      const selected=button('取消当前技能效果',()=>action(()=>cancel(powerId),true),'ztps-danger');selected.dataset.cancelPowerEffects=String(powerId);
      const all=button('取消全部技能效果',()=>action(()=>cancel(undefined),true),'ztps-danger');all.dataset.cancelPowerEffects='all';
      controls.appendChild(selected);controls.appendChild(all);section.appendChild(controls);
      const pending=node('p','ztps-help');pending.dataset.powerPending='true';pending.dataset.powerId=String(powerId);section.appendChild(pending);content.appendChild(section);
    }
    function waveTable(list, prefix, page, setPage, allowWait) {
      const area = node('div', 'ztps-wave-area'), top = node('div', 'ztps-section-heading'), pageSize = 12, pages = Math.max(1, Math.ceil(list.length / pageSize));
      page = Math.min(Math.max(0, page), pages - 1); setPage(page);
      top.appendChild(node('span', 'ztps-help', list.length + ' 组 · 第 ' + (page + 1) + ' / ' + pages + ' 页'));
      const prev = button('上一页', () => { setPage(page - 1); render(); }); prev.disabled = page === 0;
      const next = button('下一页', () => { setPage(page + 1); render(); }); next.disabled = page === pages - 1;
      top.appendChild(prev); top.appendChild(next);
      const add = button('＋ 添加一组', () => mutate(() => { const wave = {type: 1, count: 1, delay: 1, enabled: true}; if (allowWait) wave.id = newWaveId(); list.push(wave); setPage(allowWait ? 0 : Math.floor((list.length - 1) / pageSize)); }));
      add.disabled = list.length >= (allowWait ? 10000 : 1000); top.appendChild(add); area.appendChild(top);
      const scroll = node('div', 'ztps-table-scroll'), table = node('table', 'ztps-table ztps-wave-table'), head = node('tr');
      for (const title of ['执行序号', '启用', '类型', '总数量', '调度延迟', '调整']) head.appendChild(node('th', '', title));
      const thead = node('thead'); thead.appendChild(head); table.appendChild(thead); const body = node('tbody');
      const display = list.map((wave, i) => ({wave, i})); if (allowWait) display.reverse();
      display.slice(page * pageSize, (page + 1) * pageSize).forEach(({wave, i}) => {
        const row = node('tr'); row.dataset.waveIndex = String(i); if (wave.enabled === false) row.classList.add('ztps-disabled-row');
        const indexCell = node('td', 'ztps-wave-index', i + 1);
        if (allowWait) { const live = node('small', 'ztps-wave-row-status'); live.dataset.waveRowId = wave.id || ''; live.dataset.waveStage = String(draft.config.levels[Number(prefix.split('.')[2])].id); indexCell.appendChild(live); }
        row.appendChild(indexCell);
        const enabledCell = node('td'), enabled = makeInput(prefix + '.' + i + '.enabled', wave.enabled !== false, '第 ' + (i + 1) + ' 组启用');
        enabled.addEventListener('change', () => row.classList.toggle('ztps-disabled-row', !enabled.checked)); enabledCell.appendChild(enabled); row.appendChild(enabledCell);
        const typeCell = node('td'), typeSelect = node('select'); for (let t = allowWait ? 0 : 1; t <= 5; t++) option(typeSelect, t, waveLabel(t)); typeSelect.value = String(wave.type); typeSelect.dataset.path = prefix + '.' + i + '.type'; typeSelect.setAttribute('aria-label', '第 ' + (i + 1) + ' 组类型');
        typeSelect.addEventListener('change', () => action(() => change(prefix + '.' + i + '.type', Number(typeSelect.value)), true)); typeCell.appendChild(typeSelect); row.appendChild(typeCell);
        for (const key of ['count', 'delay']) { const cell = node('td'); cell.appendChild(makeInput(prefix + '.' + i + '.' + key, wave[key], '第 ' + (i + 1) + ' 组' + (key === 'count' ? '数量' : '调度延迟'))); row.appendChild(cell); }
        const commands = node('td', 'ztps-row-actions');
        const up = button('提前', () => mutate(() => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; })); up.disabled = i === 0; up.setAttribute('aria-label', '第 ' + (i + 1) + ' 组上移');
        const down = button('延后', () => mutate(() => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; })); down.disabled = i === list.length - 1; down.setAttribute('aria-label', '第 ' + (i + 1) + ' 组下移');
        const remove = button('删除', () => mutate(() => { list.splice(i, 1); })); remove.disabled = !allowWait && list.length === 1; remove.setAttribute('aria-label', '删除第 ' + (i + 1) + ' 组');
        commands.appendChild(up); commands.appendChild(down); commands.appendChild(remove); row.appendChild(commands);
        if (allowWait) for (const control of row.querySelectorAll('input,select,button')) { control.dataset.waveControlId = wave.id || ''; control.dataset.waveControlStage = String(draft.config.levels[Number(prefix.split('.')[2])].id); control.dataset.boundaryDisabled = String(control.disabled); }
        body.appendChild(row);
      });
      table.appendChild(body); scroll.appendChild(table); area.appendChild(scroll); return area;
    }
    function renderWaves(level, index) {
      const section = node('section', 'ztps-section'),heading=node('div','ztps-section-heading');heading.appendChild(node('h2', '', '关卡波次顺序'));
      const toggle=button('暂停波次',()=>action(toggleWaves,true));toggle.dataset.toggleWaves='true';toggle.title='仅控制自动出怪，不暂停战斗';heading.appendChild(toggle);
      const status=node('span','ztps-help');status.dataset.wavePauseStatus='true';heading.appendChild(status);section.appendChild(heading);
      section.appendChild(node('p', 'ztps-help', '最新组在上方；按执行序号从小到大出怪。已完成组只读，需要再出一波请添加新组。'));
      section.appendChild(waveTable(level.waves, 'config.levels.' + index + '.waves', wavePage, value => { wavePage = value; }, true)); content.appendChild(section);
    }
    function toggleWaves() {
      if(togglingWaves)return commitQueue;
      togglingWaves=true;const sequence=++commitSequence;committing=true;renderBattleState();
      const pending=commitQueue.then(async()=>{
        if(disposed)return;
        const s=state(),next={config:clone(s.config),rules:clone(s.rules)};next.rules.automaticSpawning=!s.rules.automaticSpawning;
        const report=await controller.commitSettings(next,{healthPolicy:hpPolicy.value});
        snapshot();draft.rules.automaticSpawning=next.rules.automaticSpawning;
        for(const input of content.querySelectorAll('[data-path]'))if(input.dataset.path==='rules.automaticSpawning')input.checked=next.rules.automaticSpawning;
        committedSequence=sequence;notice(next.rules.automaticSpawning?'波次已继续。':'波次已暂停，出怪进度保留。');return report;
      });
      commitQueue=pending.catch(error=>{if(!disposed)notice(error.message||String(error),true);}).finally(()=>{togglingWaves=false;if(sequence===commitSequence)committing=false;if(!disposed)renderBattleState();});return commitQueue;
    }
    function renderReinforcements(level, index) {
      const section = node('section', 'ztps-section'); section.appendChild(node('h2', '', '基地生命阈值增援'));
      section.appendChild(node('p', 'ztps-help', '基地生命降至阈值触发。增援方案下局生效。'));
      const toolbar = node('div', 'ztps-section-heading'), choose = node('select'); choose.setAttribute('aria-label', '选择增援阈值组');
      level.reinforcements.forEach((r, i) => option(choose, i, '增援 ' + (i + 1) + ' · 基地 HP ≤ ' + r.threshold));
      reinforcementIndex = Math.min(reinforcementIndex, Math.max(0, level.reinforcements.length - 1)); choose.value = String(reinforcementIndex);
      choose.addEventListener('change', () => { reinforcementIndex = Number(choose.value); reinforcementPage = 0; render(); }); toolbar.appendChild(choose);
      const add = button('＋ 增援阈值', () => mutate(() => { const max = draft.config.zombies.find(z => z.id === 5).health - 1, used = new Set(level.reinforcements.map(r => r.threshold)); let threshold = Math.max(0, max); while (used.has(threshold) && threshold > 0) threshold--; if (used.has(threshold)) throw new Error('没有可用的增援生命阈值。'); level.reinforcements.push({threshold, calls: [{type: 1, count: 1, delay: 1}]}); reinforcementIndex = level.reinforcements.length - 1; reinforcementPage = 0; })); add.disabled = level.reinforcements.length >= 1000; toolbar.appendChild(add); section.appendChild(toolbar);
      if (level.reinforcements.length) {
        const r = level.reinforcements[reinforcementIndex], p = 'config.levels.' + index + '.reinforcements.' + reinforcementIndex;
        const controls = node('div', 'ztps-section-heading'); controls.appendChild(labeled('触发阈值（敌方基地 HP）', makeInput(p + '.threshold', r.threshold, '增援触发阈值')));
        const up = button('组上移', () => mutate(() => { [level.reinforcements[reinforcementIndex - 1], level.reinforcements[reinforcementIndex]] = [r, level.reinforcements[reinforcementIndex - 1]]; reinforcementIndex--; })); up.disabled = reinforcementIndex === 0;
        const down = button('组下移', () => mutate(() => { [level.reinforcements[reinforcementIndex + 1], level.reinforcements[reinforcementIndex]] = [r, level.reinforcements[reinforcementIndex + 1]]; reinforcementIndex++; })); down.disabled = reinforcementIndex === level.reinforcements.length - 1;
        controls.appendChild(up); controls.appendChild(down); controls.appendChild(button('删除这组增援', () => mutate(() => { level.reinforcements.splice(reinforcementIndex, 1); }))); section.appendChild(controls);
        section.appendChild(waveTable(r.calls, p + '.calls', reinforcementPage, value => { reinforcementPage = value; }, false));
      } else section.appendChild(node('p', 'ztps-help', '此关没有生命阈值增援。'));
      content.appendChild(section);
    }
    function ruleCheckbox(path, text, hint) {
      const label = node('label', 'ztps-rule'), input = makeInput('rules.' + path, getAt(draft.rules, path), text), copy = node('span');
      copy.appendChild(node('strong', '', text)); if (hint) copy.appendChild(node('small', '', hint)); label.appendChild(input); label.appendChild(copy); return label;
    }
    function addSpeciesOptions(select) {
      NAMES.units.slice(0,5).forEach((name,type)=>option(select,'unit-'+type,'兵种 · '+name));
      ZOMBIES.forEach((name,type)=>option(select,'zombie-'+type,'僵尸 · '+name));
    }
    function parseSpecies(value) {
      const match=String(value).match(/^(unit|zombie)-([0-4])$/);
      if(!match)throw new Error('请选择有效的兵种或僵尸。');
      return {kind:match[1],type:Number(match[2])};
    }
    function renderTroopCounts() {
      const section=node('section','ztps-troop-counts');section.appendChild(node('h2','','在场兵力'));
      const table=node('table','ztps-table ztps-troop-table');table.dataset.troopCounts='true';table.setAttribute('aria-label','在场兵力，按单位类型和当前阵营统计');
      const head=node('thead'),heading=node('tr');for(const label of ['单位','己方','敌方'])heading.appendChild(node('th','',label));head.appendChild(heading);table.appendChild(head);
      const body=node('tbody');for(const [kind,names] of [['units',NAMES.units.slice(0,5)],['zombies',ZOMBIES]])names.forEach((name,type)=>{
        const row=node('tr'),title=node('th','',(kind==='units'?'兵种 · ':'僵尸 · ')+name);title.scope='row';row.appendChild(title);
        for(const side of ['friendly','enemy']){const cell=node('td','ztps-troop-number','0');cell.dataset.troopCount='true';cell.dataset.troopKind=kind;cell.dataset.troopType=String(type);cell.dataset.troopSide=side;row.appendChild(cell);}body.appendChild(row);
      });table.appendChild(body);
      const foot=node('tfoot'),total=node('tr');total.appendChild(node('th','','合计'));for(const side of ['friendly','enemy']){const cell=node('td','ztps-troop-number','0');cell.dataset.troopTotal=side;total.appendChild(cell);}foot.appendChild(total);table.appendChild(foot);section.appendChild(table);content.appendChild(section);
    }
    function refreshTroopCounts(counts) {
      for(const cell of content.querySelectorAll('[data-troop-count]')){const side=counts&&counts[cell.dataset.troopSide],list=side&&side[cell.dataset.troopKind],value=list&&Number(list[Number(cell.dataset.troopType)]);cell.textContent=Number.isFinite(value)&&value>=0?String(value):'0';}
      for(const cell of content.querySelectorAll('[data-troop-total]')){const side=counts&&counts[cell.dataset.troopTotal],value=side&&Number(side.total);cell.textContent=Number.isFinite(value)&&value>=0?String(value):'0';}
    }
    function spawnRateValue(value) {
      const rate=numericValue(value);
      if(rate<0||rate>1000000)throw new Error('出兵速率须为 0–1000000；0 暂停该批，支持小数。');
      return rate;
    }
    function readSpawnRate(input) {
      try {const value=spawnRateValue(input.value);input.classList.remove('ztps-invalid');input.removeAttribute('aria-invalid');return value;}
      catch(error){input.classList.add('ztps-invalid');input.setAttribute('aria-invalid','true');throw error;}
    }
    async function cancelSpawnQueueJob(id) {
      if(cancelingAllSpawnJobs||id!==undefined&&cancelingSpawnJobs.has(String(id)))return;
      if(typeof controller.cancelSpawnJob!=='function')throw new Error('取消出兵任务接口不可用。');
      if(id===undefined)cancelingAllSpawnJobs=true;else cancelingSpawnJobs.add(String(id));
      renderBattleState();
      try {
        if(id===undefined)await Promise.all(Array.from(spawnJobRateQueues.values()));else await(spawnJobRateQueues.get(String(id))||Promise.resolve());
        await controller.cancelSpawnJob(id);notice(id===undefined?'已取消全部待生成任务。':'已取消该批待生成单位。');
      } finally {if(id===undefined)cancelingAllSpawnJobs=false;else cancelingSpawnJobs.delete(String(id));renderBattleState();}
    }
    function refreshSpawnQueue(queue,s) {
      const list=content.querySelector('[data-spawn-queue-list]');if(!list)return;
      const jobs=queue&&Array.isArray(queue.jobs)?queue.jobs:[],currentIds=new Set(jobs.map(job=>String(job.id))),eligible=s.isCustom&&s.isBattle;
      const summary=content.querySelector('[data-spawn-queue-summary]');summary.textContent=jobs.length+' 批 · 待生成 '+(queue&&queue.totalPending||0)+' · 已生成 '+(queue&&queue.totalSpawned||0);
      const cancelAll=content.querySelector('[data-cancel-spawn-all]');cancelAll.disabled=!eligible||!jobs.length||cancelingAllSpawnJobs||typeof controller.cancelSpawnJob!=='function';
      for(const [id,record] of spawnJobNodes)if(!currentIds.has(id)){
        record.active=false;record.summary.textContent='已结束';record.cancel.disabled=true;record.rate.readOnly=true;record.rate.setAttribute('aria-readonly','true');
        if(!record.row.contains(doc.activeElement)){record.row.remove();spawnJobNodes.delete(id);spawnJobRateQueues.delete(id);}
      }
      for(const job of jobs){
        const id=String(job.id);let record=spawnJobNodes.get(id);
        if(!record){
          const row=node('article','ztps-spawn-job');row.dataset.spawnJobId=id;const title=node('strong'),details=node('small','ztps-help'),rate=node('input');
          rate.type='number';rate.min='0';rate.max='1000000';rate.step='any';rate.inputMode='decimal';rate.dataset.spawnJobRate=id;rate.setAttribute('aria-label','出兵任务 '+id+' 速率（只/游戏秒）');
          record={row,title,summary:details,rate,active:true};
          const commit=()=>action(async()=>{
            if(!record.active)return;
            const submitted=rate.value;if(submitted===rate.dataset.committedValue||submitted===rate.dataset.pendingValue)return;
            const value=readSpawnRate(rate);if(typeof controller.setSpawnJobRate!=='function')throw new Error('调整出兵速率接口不可用。');
            rate.dataset.pending='true';rate.dataset.pendingValue=submitted;
            const work=(spawnJobRateQueues.get(id)||Promise.resolve()).then(async()=>{await controller.setSpawnJobRate(job.id,value);if(rate.value===submitted)rate.dataset.committedValue=submitted;notice(value===0?'该批出兵已暂停。':'该批出兵速率已更新。');});
            spawnJobRateQueues.set(id,work.catch(()=>{}));
            try{await work;}finally{if(rate.dataset.pendingValue===submitted){delete rate.dataset.pending;delete rate.dataset.pendingValue;}renderBattleState();}
          },true);
          rate.addEventListener('change',commit);rate.addEventListener('blur',commit);rate.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();return commit();}});
          const cancel=button('取消',()=>action(()=>cancelSpawnQueueJob(job.id),true),'ztps-danger');cancel.dataset.cancelSpawnJob=id;record.cancel=cancel;
          const copy=node('div','ztps-spawn-job-copy');copy.appendChild(title);copy.appendChild(details);row.appendChild(copy);row.appendChild(labeled('只/游戏秒',rate));row.appendChild(cancel);spawnJobNodes.set(id,record);list.appendChild(row);
        }
        record.active=true;const descriptor=job.descriptor||job,names=descriptor.kind==='unit'?NAMES.units:ZOMBIES;
        record.rate.readOnly=false;record.rate.removeAttribute('aria-readonly');
        record.title.textContent=(job.side==='friendly'?'己方 · ':'敌方 · ')+(names[descriptor.type]||'未知单位');
        record.summary.textContent='剩余 '+job.remaining+' / '+job.count+' · 已生成 '+job.spawned+(job.rate===0?' · 已暂停':queue&&queue.blocked?' · 等待场上空位':'');
        if(doc.activeElement!==record.rate&&record.rate.dataset.pending!=='true'){record.rate.value=String(job.rate);record.rate.dataset.committedValue=record.rate.value;}
        record.rate.disabled=!eligible||cancelingAllSpawnJobs||cancelingSpawnJobs.has(id)||typeof controller.setSpawnJobRate!=='function';
        record.cancel.disabled=!eligible||cancelingAllSpawnJobs||cancelingSpawnJobs.has(id)||typeof controller.cancelSpawnJob!=='function';
      }
    }
    function renderSandbox() {
      const battleStatus = node('p', 'ztps-battle-status'); battleStatus.dataset.battleStatus = 'true'; content.appendChild(battleStatus);
      const start = node('section', 'ztps-start'), stage = node('select'); for (let n = 1; n <= 4; n++) option(stage, n, '第 ' + n + ' 关 · ' + draft.config.levels[n - 1].name);
      stage.value = String(Math.max(1, Math.min(4, state().stage || 1))); stage.setAttribute('aria-label', '自定义战局关卡'); start.appendChild(stage);
      start.appendChild(button('开始自定义战局', () => action(async () => {
        if (state().isBattle && !win.confirm('开始新战局会结束当前这一局，继续吗？')) return;
        await controller.startCustomBattle(Number(stage.value), clone(draft));
      }), 'ztps-primary'));
      start.appendChild(button('回到原版模式', () => action(async () => { if (!win.confirm('切回原版默认规则并回到主菜单？当前战局会结束，保存的自定义规则保留。')) return; await controller.restoreOriginal(); })));
      content.appendChild(start);
      renderTroopCounts();
      const spawn = node('section', 'ztps-section'); spawn.appendChild(node('h2', '', '一键刷怪'));
      const cards = node('div', 'ztps-spawn-grid');
      ZOMBIES.forEach((name, type) => {
        const b = button('', () => action(async () => { await commitQueue; const result = await controller.spawnZombie(type, 1); notice('已生成 ' + result.count + ' 只' + name + '。'); }, true), 'ztps-spawn'); b.dataset.spawn = String(type);
        b.setAttribute('aria-label', '生成 1 只敌方' + name);
        const icon = node('span', 'ztps-zombie-icon ztps-zombie-' + type); icon.setAttribute('aria-hidden', 'true'); b.appendChild(icon); b.appendChild(node('strong', '', name)); b.appendChild(node('small', '', '敌方 ＋ 1 只')); cards.appendChild(b);
      }); spawn.appendChild(cards);
      const batch = node('div', 'ztps-batch-controls'), side = node('select'), species = node('select');
      side.dataset.spawnSide = 'true'; side.setAttribute('aria-label', '批量生成阵营'); option(side,'enemy','敌方'); option(side,'friendly','己方'); side.value='enemy';
      species.dataset.spawnSpecies = 'true'; species.setAttribute('aria-label', '批量生成类型');
      addSpeciesOptions(species); species.value = 'zombie-0';
      const count = node('input'); count.type = 'number'; count.min = '1'; count.max=String(HEALTH_SAFETY_LIMIT); count.step = '1'; count.value = '1'; count.inputMode = 'numeric'; count.dataset.spawnCount = 'true'; count.setAttribute('aria-label', '批量刷怪数量');
      const quickCount = node('select'); quickCount.dataset.spawnCountPreset = 'true'; quickCount.setAttribute('aria-label', '常用刷怪数量'); for (const n of [1,5,10,50,100]) option(quickCount,n,n+' 只'); quickCount.value='1'; quickCount.addEventListener('change',()=>{ count.value=quickCount.value; });
      const rate=node('input');rate.type='number';rate.min='0';rate.max='1000000';rate.step='any';rate.inputMode='decimal';rate.dataset.spawnRate='true';rate.setAttribute('aria-label','本批出兵速率（只/游戏秒）');
      if(spawnFormRate===undefined){const queue=state().spawnQueue;spawnFormRate=queue&&Number.isFinite(queue.rate)?String(queue.rate):'120';}rate.value=spawnFormRate;rate.addEventListener('input',()=>{spawnFormRate=rate.value;});
      const batchButton = button('加入出兵队列', () => action(async () => {
        if(spawningBatch)return;
        const amount = numericValue(count.value), selected=parseSpecies(species.value), selectedSide=side.value, selectedRate=readSpawnRate(rate);
        if (!Number.isInteger(amount) || amount < 1 || amount>HEALTH_SAFETY_LIMIT) throw new Error('生成数量须为 1–'+HEALTH_SAFETY_LIMIT+' 的整数。');
        if(typeof controller.enqueueSpawn!=='function')throw new Error('当前出兵队列接口不可用。');
        spawningBatch=true;renderBattleState();
        try { await commitQueue; await controller.enqueueSpawn(selectedSide,selected,amount,{rate:selectedRate});spawnFormRate=rate.value; notice('已加入 '+amount+' 个单位；本批 '+selectedRate+' 只/游戏秒'+(selectedRate===0?'（暂停）':'')+'。'); }
        finally { spawningBatch=false;renderBattleState(); }
      }, true), 'ztps-primary'); batchButton.dataset.spawnBatch='true';
      side.addEventListener('change',()=>{renderBattleState();});
      batch.appendChild(labeled('阵营',side)); batch.appendChild(labeled('类型',species)); batch.appendChild(labeled('常用数量',quickCount)); batch.appendChild(labeled('数量',count));batch.appendChild(labeled('本批出兵速率（只/游戏秒）',rate)); batch.appendChild(batchButton); spawn.appendChild(batch);
      const queue=node('section','ztps-spawn-queue');queue.dataset.spawnQueue='true';const queueHeading=node('div','ztps-section-heading'),summary=node('span','ztps-help');summary.dataset.spawnQueueSummary='true';queueHeading.appendChild(summary);
      const cancelAll=button('取消全部出兵任务',()=>action(()=>cancelSpawnQueueJob(),true),'ztps-danger');cancelAll.dataset.cancelSpawnAll='true';queueHeading.appendChild(cancelAll);queue.appendChild(queueHeading);const list=node('div','ztps-spawn-jobs');list.dataset.spawnQueueList='true';queue.appendChild(list);spawn.appendChild(queue);content.appendChild(spawn);
      const clear = node('section', 'ztps-section'); clear.appendChild(node('h2', '', '清理当前小兵'));
      const clearHelp = node('p', 'ztps-help', '只清理场上小兵，保留基地、招募排队与后续波次。'); clearHelp.id = 'ztps-clear-troops-help'; clear.appendChild(clearHelp);
      async function clearTroops(side, type) {
        const s=state(); if (!s.isCustom || !s.isBattle) throw new Error('请先开始自定义战局。'); if(clearingTroops)return;
        const method=side==='friendly'?'clearFriendlyTroops':'clearEnemyTroops'; if(typeof controller[method]!=='function')throw new Error('清理功能不可用。');
        clearingTroops=true; renderBattleState();
        try { const result=await controller[method](type); notice('已清理 ' + result.count + ' 个' + (side==='friendly'?'己方':'敌方') + '小兵。'); }
        finally { clearingTroops=false; renderBattleState(); }
      }
      const clearActions = node('div', 'ztps-clear-actions');
      for (const [side, label] of [['friendly','己方'],['enemy','敌方']]) {
        const b=button('一键杀死'+label+'小兵',()=>action(()=>clearTroops(side),true),'ztps-danger'); b.dataset.clearTroops=side; b.setAttribute('aria-label','一键杀死当前场上的所有'+label+'小兵'); b.setAttribute('aria-describedby',clearHelp.id); clearActions.appendChild(b);
      }
      clear.appendChild(clearActions);
      const filtered=node('div','ztps-filtered-clear');
      for(const [side,label] of [['friendly','己方'],['enemy','敌方']]) {
        const controls=node('div','ztps-batch-controls'),choose=node('select'); choose.dataset.clearType=side; choose.setAttribute('aria-label','选择清理'+label+'兵种');
        addSpeciesOptions(choose); choose.value=side==='friendly'?'unit-0':'zombie-0';
        const b=button('清理所选'+label+'兵种',()=>action(()=>clearTroops(side,parseSpecies(choose.value)),true),'ztps-danger'); b.dataset.clearSelected=side;
        controls.appendChild(labeled(label+'类型',choose)); controls.appendChild(b); filtered.appendChild(controls);
      }
      clear.appendChild(filtered); content.appendChild(clear);
      renderBases();
      const rules = node('section', 'ztps-section'); rules.appendChild(node('h2', '', '出怪与能力规则'));

      const grid = node('div', 'ztps-rule-grid');
      for (const key of ['automaticSpawning', 'baseReinforcements', 'corpseSpawnOnImpact']) if (typeof draft.rules[key] === 'boolean') grid.appendChild(ruleCheckbox(key, fieldInfo(key)[0]));
      rules.appendChild(grid);
      if (Array.isArray(draft.rules.zombieTypesEnabled)) {
        const typeGroup = node('fieldset', 'ztps-types'); typeGroup.appendChild(node('legend', '', '波次 / 增援允许出现的僵尸类型'));
        ZOMBIES.forEach((name, i) => typeGroup.appendChild(ruleCheckbox('zombieTypesEnabled.' + i, name))); rules.appendChild(typeGroup);
      }
      if (draft.rules.abilities) {
        const abilities = node('div', 'ztps-rule-grid');
        for (const field of flattenFields(draft.rules.abilities)) if (typeof field.value === 'boolean') abilities.appendChild(ruleCheckbox('abilities.' + field.path, fieldInfo(field.key)[0]));
        rules.appendChild(node('h3', '', '特殊能力')); rules.appendChild(abilities);
        const numbers = Object.fromEntries(Object.entries(draft.rules.abilities).filter(([, v]) => typeof v === 'number'));
        if (Object.keys(numbers).length) rules.appendChild(parameterTable(numbers, defaults().rules.abilities, 'rules.abilities'));

      }
      if (draft.rules.economy) {
        rules.appendChild(node('h3', '', '经济与人口'));
        rules.appendChild(parameterTable(draft.rules.economy, defaults().rules.economy, 'rules.economy'));
      }
      content.appendChild(rules);
      const s = state(); if (s.storageAvailable === false) content.appendChild(node('p', 'ztps-warning', '当前环境不能写入本机存储，请导出 JSON 保存规则。'));
      for (const text of s.warnings || []) content.appendChild(node('p', 'ztps-warning', String(text)));
    }
    function renderBases() {
      const section=node('section','ztps-section'); section.appendChild(node('h2','','基地生命'));
      const grid=node('div','ztps-base-grid');
      for(const [side,label,kind] of [['friendly','我方基地','units'],['enemy','敌方基地','zombies']]) {
        const box=node('section','ztps-base-card'); box.appendChild(node('h3','',label));
        const index=draft.config[kind].findIndex(item=>item.id===5);
        box.appendChild(labeled('最大生命'+(side==='enemy'?'（基础值）':''),makeInput('config.'+kind+'.'+index+'.health',draft.config[kind][index].health,label+'最大生命')));
        const input=node('input'); input.type='number'; input.min='0'; input.step='1'; input.inputMode='numeric'; input.dataset.baseCurrent=side; input.setAttribute('aria-label',label+'当前生命');
        const commit=()=>action(async()=>{
          const submitted=input.value;
          if(submitted===input.dataset.committedValue || submitted===input.dataset.pendingValue)return;
          const value=numericValue(submitted); if(!Number.isInteger(value)||value<0)throw new Error('当前生命须为非负整数。');
          input.dataset.pending='true'; input.dataset.pendingValue=submitted;
          const work=baseQueues[side].then(async()=>{
            await commitQueue; await controller.setBaseHealth(side,value);
            if(input.value===submitted)input.dataset.committedValue=submitted;
            input.classList.remove('ztps-invalid'); input.removeAttribute('aria-invalid'); notice(label+'当前生命已更新。');
          });
          baseQueues[side]=work.catch(()=>{});
          try { await work; }
          finally { if(input.dataset.pendingValue===submitted){delete input.dataset.pending;delete input.dataset.pendingValue;} renderBattleState(); }
        },true);
        input.addEventListener('change',commit);input.addEventListener('blur',commit);input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();return commit();}});
        box.appendChild(labeled('当前生命',input)); const actual=node('small','ztps-help');actual.dataset.baseStatus=side;box.appendChild(actual);grid.appendChild(box);
      }
      section.appendChild(grid);content.appendChild(section);
    }
    function open() {
      if (opened || disposed) return;
      try { pauseToken = controller.pauseForEditor(); } catch (error) { notice(error.message, true); return; }
      previousFocus = doc.activeElement; opened = true; overlay.hidden = false;
      doc.body.classList.add('ztps-docked');
      const s = state();
      if (!draft) { const next = controller.getDraft(); draft = clone(next); baseline = clone(next); selectedPresetId = s.selectedPresetId || ''; baselineSaved = !!selectedPresetId; }
      if (s.isBattle && s.stage >= 1 && s.stage <= 4 && s.stage !== lastBattleStage) { selection.levels = s.stage - 1; lastBattleStage = s.stage; }
      refreshPresets(); if (selectedPresetId) presetName.value = (controller.listPresets().find(p => p.id === selectedPresetId) || {}).name || '';
      render(); notice(''); closeButton.focus();
      if (typeof win.setInterval === 'function') pollTimer = win.setInterval(() => { if (opened) renderBattleState(); }, 250);
    }
    function close() {
      if (!opened) return; opened = false; overlay.hidden = true;
      doc.body.classList.remove('ztps-docked');
      if (pollTimer !== undefined) { win.clearInterval(pollTimer); pollTimer = undefined; }
      if (pauseToken !== undefined) { const held = pauseToken; pauseToken = undefined; controller.resumeFromEditor(held); }
      if (previousFocus && typeof previousFocus.focus === 'function' && previousFocus.isConnected !== false) previousFocus.focus(); else if (canvas) canvas.focus();
    }
    function resumePlayback() {
      if (pauseToken !== undefined) { const held = pauseToken; pauseToken = undefined; controller.resumeFromEditor(held); }
      if (opened) renderBattleState();
    }
    function pausePlayback() {
      if (pauseToken === undefined) pauseToken = controller.pauseForEditor();
      if (opened) renderBattleState();
    }
    function keys(event) {
      if (event.key === 'F2') { consumedKeys.add(event.key); event.preventDefault(); event.stopImmediatePropagation(); if (opened) close(); else open(); return; }
      if (!opened) return;
      const inPanel = modal.contains(event.target) || modal.contains(doc.activeElement);
      if (event.key === 'Escape' && inPanel) { consumedKeys.add(event.key); event.preventDefault(); event.stopImmediatePropagation(); close(); }
    }
    // Editor keydowns never trigger the game. Keyup/pointerup remain available
    // to release a key/click originally held while interacting with the canvas.
    overlay.addEventListener('keydown', e => e.stopPropagation());
    on(win, 'keydown', keys, true);
    on(win, 'keyup', event => { if (consumedKeys.delete(event.key)) event.stopImmediatePropagation(); }, true);
    if (typeof controller.subscribe === 'function') { const unsubscribe = controller.subscribe(() => { if (opened) { renderBattleState(); refreshPresets(); } }); if (typeof unsubscribe === 'function') cleanups.push(unsubscribe); }
    const handle = {open, close, resumePlayback, pausePlayback, whenSettled: () => commitQueue, isOpen: () => opened, getDraft: () => draft && clone(draft), destroy() { if (disposed) return; close(); disposed = true; for (const cleanup of cleanups) cleanup(); overlay.remove(); if (instance === handle) instance = null; }};
    if (!options.document) instance = handle; return handle;
  }
  return {mount, resumePlayback: () => instance && instance.resumePlayback(), pausePlayback: () => instance && instance.pausePlayback(), flattenFields, getAt, setAt, fieldInfo, presetFilename, waveLabel, numericValue, summarizeReport, ZOMBIES, TABS};
});
