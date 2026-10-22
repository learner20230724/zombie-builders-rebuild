/* Game customization editor. Runtime operations are delegated to Customization. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.SettingsUI = api;
    root.addEventListener('customization-ready', event => {
      const controller = event.detail && (event.detail.controller || event.detail);
      api.mount(controller && typeof controller.getState === 'function' ? controller : root.Customization);
    });
  }
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
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
    cost: ['招募 / 建造费用', '现金', '立即'], health: ['最大生命', 'HP', '按生命策略'], damage: ['攻击伤害', '伤害', '立即'],
    projectileDamage: ['投射物伤害', '伤害', '新投射物'], moveSpeed: ['移动速度', '距离 / 战斗 tick', '立即'],
    buildTicks: ['生产 / 蓄力时间', '战斗 tick', '保留进度'], cooldownTicks: ['冷却时间', '战斗 tick', '保留进度'],
    dependency: ['所需建筑 ID', '0–5（见建筑页）', '下局'], people: ['占用人口', '人', '下局'], maximum: ['最大建筑数', '座', '下局'],
    hitRadius: ['水平命中半径', '距离', '立即'], hitOffset: ['水平命中偏移', '距离', '立即'], xp: ['技能所需经验', 'XP', '立即'],
    unlockAfterStage: ['通关解锁要求', '0=直接；1–4=需通关', '下局'],
    shovelCount: ['暴民铲工数量', '人', '下次技能'], shotgunCount: ['暴民农夫数量', '人', '下次技能'],
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
    return '本局已应用 ' + applied.length + ' 项' + (deferred.length ? '；' + deferred.length + ' 项下局生效（人口 / 前置建筑 / 开局资源 / 波次等）' : '。');
  }
  let instance = null;
  function mount(controller, options) {
    if (instance && !options) return instance;
    options = options || {};
    if (!controller || typeof controller.getState !== 'function') throw new Error('SettingsUI 需要 Customization 控制器');
    const doc = options.document || document, win = options.window || window;
    const canvas = options.canvas || doc.getElementById('game');
    let opened = false, pauseToken, previousFocus = null, draft, baseline, selectedPresetId = '', activeTab = 'sandbox';
    let selection = {units: 0, zombies: 0, buildings: 0, powers: 0, levels: 0}, wavePage = 0, reinforcementPage = 0, reinforcementIndex = 0;
    const undo = [], invalid = new Map(), cleanups = [], consumedKeys = new Set();
    let disposed = false;
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
    function change(path, value) { snapshot(); setAt(draft, path, value); updateDirty(); }
    function updateDirty() { dirtyLabel.textContent = dirty() ? '有未保存的规则修改' : '规则已保存 / 未修改'; undoButton.disabled = undo.length === 0; }
    function defaults() { const s = state(); return {config: s.defaults, rules: s.defaultRules}; }
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
        if (waveMatch) wavePage = Math.floor(Number(waveMatch[1]) / 12);
        if (groupMatch) reinforcementIndex = Number(groupMatch[1]);
        if (callMatch) reinforcementPage = Math.floor(Number(callMatch[1]) / 12);
        render();
      } else if (text.includes('CustomRules ')) { activeTab = 'sandbox'; render(); }
      const path = text.match(/\$\.([a-zA-Z0-9_.\[\]]+)/);
      const all = Array.from(content.querySelectorAll('[data-path]'));
      const exact = path && all.find(el => el.dataset.path === (text.includes('CustomRules ') ? 'rules.' : 'config.') + path[1].replace(/\[(\d+)\]/g, '.$1'));
      if (exact) { exact.classList.add('ztps-invalid'); exact.setAttribute('aria-invalid', 'true'); exact.focus(); }
    }
    async function action(fn) {
      try {
        if (invalid.size) { const entry = invalid.entries().next().value; throw new Error(entry[1]); }
        await fn();
      } catch (error) { focusError(error); }
    }
    function resetDraft(next, saved) {
      draft = clone(next); baseline = clone(saved || next); invalid.clear(); undo.length = 0; wavePage = reinforcementPage = reinforcementIndex = 0;
      updateDirty(); render();
    }
    function refreshPresets() {
      while (presetSelect.firstChild) presetSelect.removeChild(presetSelect.firstChild);
      option(presetSelect, '', '当前规则 / 尚未命名');
      for (const preset of controller.listPresets()) option(presetSelect, preset.id, preset.name);
      presetSelect.value = selectedPresetId;
      deleteButton.disabled = !selectedPresetId;
    }
    const entry = button('⚙ 自定义', () => open(), 'ztps-entry');
    entry.title = '打开自定义规则与沙盒（F2）'; entry.setAttribute('aria-label', '打开自定义设置，快捷键 F2'); entry.setAttribute('aria-haspopup', 'dialog');
    const overlay = node('div', 'ztps-overlay'); overlay.hidden = true;
    const modal = node('section', 'ztps-modal'); modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'ztps-title'); modal.tabIndex = -1;
    overlay.appendChild(modal);
    const header = node('header', 'ztps-header'), heading = node('div');
    const title = node('h1', '', '自定义规则与沙盒'); title.id = 'ztps-title';
    heading.appendChild(title); heading.appendChild(node('p', '', '保存自己的规则，或调整这一局。打开面板时，战斗已暂停。'));
    const closeButton = button('关闭 · Esc', () => close(), 'ztps-close'); header.appendChild(heading); header.appendChild(closeButton); modal.appendChild(header);
    const presetBar = node('div', 'ztps-preset-bar');
    const presetSelect = node('select'); presetSelect.setAttribute('aria-label', '选择已保存的规则');
    presetSelect.addEventListener('change', () => action(async () => {
      if (!presetSelect.value) { selectedPresetId = ''; presetName.value = ''; refreshPresets(); return; }
      if (dirty() && !win.confirm('加载规则将替换尚未保存的修改，继续吗？')) { presetSelect.value = selectedPresetId; return; }
      selectedPresetId = presetSelect.value; const next = await controller.loadPreset(selectedPresetId);
      presetName.value = (controller.listPresets().find(p => p.id === selectedPresetId) || {}).name || ''; resetDraft(next); refreshPresets(); notice('已载入规则，尚未应用到本局。');
    }));
    const presetName = node('input'); presetName.type = 'text'; presetName.maxLength = 80; presetName.placeholder = '规则名称，例如：胖僵尸挑战'; presetName.setAttribute('aria-label', '规则名称');
    const saveButton = button('保存规则', () => action(async () => {
      const name = presetName.value.trim(); if (!name) { presetName.focus(); throw new Error('请先给这套规则起个名字。'); }
      const meta = await controller.savePreset(name, clone(draft), selectedPresetId || undefined); selectedPresetId = meta.id; baseline = clone(draft); updateDirty(); refreshPresets(); notice('规则已保存。保存不会自动修改当前战局。');
    }), 'ztps-primary');
    const saveNew = button('另存为', () => { selectedPresetId = ''; presetSelect.value = ''; presetName.value = ''; presetName.focus(); deleteButton.disabled = true; notice('输入新名称后点击“保存规则”。'); });
    const deleteButton = button('删除', () => action(async () => {
      if (!selectedPresetId || !win.confirm('删除这套已保存的规则？当前编辑内容和存档不受影响。')) return;
      await controller.deletePreset(selectedPresetId); selectedPresetId = ''; refreshPresets(); notice('已删除已保存的规则；编辑中的内容仍保留。');
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
    const content = node('div', 'ztps-content'); content.id = 'ztps-content'; content.setAttribute('role', 'tabpanel'); content.tabIndex = -1; modal.appendChild(content);
    const message = node('p', 'ztps-message'); message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite'); modal.appendChild(message);
    const footer = node('footer', 'ztps-footer'), tools = node('div', 'ztps-tools'), actions = node('div', 'ztps-apply');
    const dirtyLabel = node('span', 'ztps-dirty');
    const undoButton = button('撤销修改', () => { if (!undo.length) return; draft = undo.pop(); invalid.clear(); updateDirty(); render(); notice('已撤销上一项修改。'); });
    const resetButton = button('恢复原版默认', () => {
      if (!win.confirm('将编辑中的全部参数恢复为原版默认值？已保存的规则不删除，也不会自动应用本局。')) return;
      snapshot(); draft = clone(defaults()); invalid.clear(); updateDirty(); render(); notice('已恢复原版默认值，尚未保存或应用本局。');
    });
    const importInput = node('input', 'ztps-file'); importInput.type = 'file'; importInput.accept = '.json,application/json'; importInput.tabIndex = -1; importInput.setAttribute('aria-hidden', 'true');
    importInput.addEventListener('change', () => action(async () => {
      const file = importInput.files && importInput.files[0]; if (!file) return;
      try {
        if (file.size > 2 * 1024 * 1024) throw new Error('规则文件超过 2 MB，请选择较小的 JSON 文件。');
        const parsed = await controller.importPreset(await file.text());
        if (dirty() && !win.confirm('导入规则将替换尚未保存的修改，继续吗？')) return;
        selectedPresetId = ''; presetName.value = parsed.name || ''; resetDraft({config: parsed.config, rules: parsed.rules}); refreshPresets(); notice('导入校验通过。请保存规则，或选择应用本局 / 开始自定义战局。');
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
    hpPolicy.setAttribute('aria-label', '已有单位生命值应用策略'); actions.appendChild(hpPolicy);
    const applyButton = button('应用本局', () => action(async () => {
      const s = state(); if (!s.isBattle) throw new Error('请先开始一局战斗，或从“沙盒 / 刷怪”开始自定义战局。');
      if (!s.isCustom && !win.confirm('应用后，本局将转为自定义战局，不计入原版成绩。继续吗？')) return;
      // The controller validates config AND rules before promotion or mutation.
      // Sequential applyLive/applyRules would leave a half-applied battle when
      // the second document contains an invalid value.
      const report = await controller.applyDraft(clone(draft), {healthPolicy: hpPolicy.value});
      notice(summarizeReport(report) + ' 未保存的规则不会因此保存。'); renderBattleState();
    }), 'ztps-primary'); actions.appendChild(applyButton);
    footer.appendChild(tools); footer.appendChild(actions); modal.appendChild(footer);
    doc.body.appendChild(entry); doc.body.appendChild(overlay);
    function makeInput(path, value, label) {
      let input;
      if (typeof value === 'boolean') { input = node('input'); input.type = 'checkbox'; input.checked = value; }
      else if (typeof value === 'number') { input = node('input'); input.type = 'number'; input.step = 'any'; input.value = String(value); input.inputMode = 'decimal'; }
      else { input = node(path.endsWith('description') ? 'textarea' : 'input'); if (input.tagName === 'INPUT') input.type = 'text'; input.value = value; input.maxLength = path.endsWith('description') ? 2000 : 120; }
      input.dataset.path = path; input.setAttribute('aria-label', label); input.addEventListener('change', () => {
        try {
          const next = typeof value === 'boolean' ? input.checked : typeof value === 'number' ? numericValue(input.value) : input.value;
          change(path, next); invalid.delete(path); input.classList.remove('ztps-invalid'); input.removeAttribute('aria-invalid'); notice('参数已修改，尚未保存或应用。');
        } catch (error) { invalid.set(path, label + '：' + error.message); input.classList.add('ztps-invalid'); input.setAttribute('aria-invalid', 'true'); notice(label + '：' + error.message, true); }
      });
      return input;
    }
    function parameterTable(entity, original, prefix) {
      const wrap = node('div', 'ztps-table-scroll'), table = node('table', 'ztps-table');
      const head = node('thead'), hrow = node('tr'); for (const text of ['属性', '原版默认', '修改值', '单位 / 范围', '生效时机']) hrow.appendChild(node('th', '', text)); head.appendChild(hrow); table.appendChild(head);
      const body = node('tbody');
      for (const field of flattenFields(entity)) {
        const info = fieldInfo(field.key), row = node('tr'), titleCell = node('th'), code = node('code', '', field.path);
        titleCell.scope = 'row'; titleCell.appendChild(node('span', '', info[0])); titleCell.appendChild(code); row.appendChild(titleCell);
        const originalValue = getAt(original, field.path), def = typeof originalValue === 'boolean' ? originalValue ? '开启' : '关闭' : originalValue;
        row.appendChild(node('td', 'ztps-default', def === undefined ? '—' : def)); const cell = node('td'); cell.appendChild(makeInput(prefix + '.' + field.path, field.value, info[0])); row.appendChild(cell);
        row.appendChild(node('td', 'ztps-unit', info[1])); row.appendChild(node('td', 'ztps-timing', info[2])); body.appendChild(row);
      }
      table.appendChild(body); wrap.appendChild(table); return wrap;
    }
    function render() {
      if (!draft) return;
      // Non-numeric text never entered the draft. A re-render restores the last
      // valid field value, so it must not leave an invisible validation blocker.
      invalid.clear();
      while (content.firstChild) content.removeChild(content.firstChild);
      for (const [key, b] of tabButtons) { b.setAttribute('aria-selected', String(key === activeTab)); b.tabIndex = key === activeTab ? 0 : -1; }
      content.setAttribute('aria-labelledby', 'ztps-tab-' + activeTab);
      if (activeTab === 'sandbox') renderSandbox(); else renderEntities(activeTab);
      renderBattleState(); updateDirty();
    }
    function renderBattleState() {
      if (!draft) return; const s = state(); applyButton.disabled = !s.isBattle;
      const status = content.querySelector('[data-battle-status]');
      if (status) status.textContent = s.isCustom && s.isBattle ? '自定义战局 · 第 ' + s.stage + ' 关 · 编辑中暂停' : s.isBattle ? '原版战局：应用本局后转为自定义，不计入原版成绩。' : '先选择关卡，开始自定义战局。';
      for (const b of content.querySelectorAll('[data-spawn]')) b.disabled = !(s.isCustom && s.isBattle);
    }
    function renderEntities(kind) {
      const toolbar = node('div', 'ztps-section-heading'), picker = node('select'); picker.setAttribute('aria-label', '选择' + TABS.find(t => t[0] === kind)[1]);
      draft.config[kind].forEach((item, i) => option(picker, i, NAMES[kind][item.id - (kind === 'levels' ? 1 : 0)] + ' · ' + item.name)); picker.value = String(selection[kind]);
      picker.addEventListener('change', () => { selection[kind] = Number(picker.value); wavePage = reinforcementPage = reinforcementIndex = 0; render(); });
      toolbar.appendChild(labeled('编辑对象', picker)); toolbar.appendChild(node('span', 'ztps-help', '只修改配置，不覆盖生成代码。')); content.appendChild(toolbar);
      const index = selection[kind], entity = draft.config[kind][index], original = defaults().config[kind].find(item => item.id === entity.id);
      content.appendChild(parameterTable(entity, original, 'config.' + kind + '.' + index));
      if (kind === 'units' || kind === 'zombies') content.appendChild(node('p', 'ztps-help', '伤害与射程 / 动画命中规则不同；攻击频率由原状态机决定。投射物改值只影响修改后发出的投射物。'));
      if (kind === 'levels') {
        content.appendChild(node('p', 'ztps-help', '生命倍率先取整（1.75 与 1 相同）；近战伤害最终取整，尸弹不受伤害倍率影响。开局现金 / XP 下局生效。'));
        renderWaves(entity, index); renderReinforcements(entity, index);
      }
    }
    function waveTable(list, prefix, page, setPage, allowWait) {
      const area = node('div', 'ztps-wave-area'), top = node('div', 'ztps-section-heading'), pageSize = 12, pages = Math.max(1, Math.ceil(list.length / pageSize));
      page = Math.min(Math.max(0, page), pages - 1); setPage(page);
      top.appendChild(node('span', 'ztps-help', list.length + ' 组 · 第 ' + (page + 1) + ' / ' + pages + ' 页'));
      const prev = button('上一页', () => { setPage(page - 1); render(); }); prev.disabled = page === 0;
      const next = button('下一页', () => { setPage(page + 1); render(); }); next.disabled = page === pages - 1;
      top.appendChild(prev); top.appendChild(next);
      const add = button('＋ 添加一组', () => { snapshot(); list.push({type: 1, count: 1, delay: 1, enabled: true}); setPage(Math.floor((list.length - 1) / pageSize)); updateDirty(); render(); });
      add.disabled = list.length >= (allowWait ? 10000 : 1000); top.appendChild(add); area.appendChild(top);
      const scroll = node('div', 'ztps-table-scroll'), table = node('table', 'ztps-table ztps-wave-table'), head = node('tr');
      for (const title of ['序号', '启用', '类型', '数量 / 次数', '调度延迟', '顺序']) head.appendChild(node('th', '', title));
      const thead = node('thead'); thead.appendChild(head); table.appendChild(thead); const body = node('tbody');
      list.slice(page * pageSize, (page + 1) * pageSize).forEach((wave, offset) => {
        const i = page * pageSize + offset, row = node('tr'); if (wave.enabled === false) row.classList.add('ztps-disabled-row'); row.appendChild(node('td', '', i + 1));
        const enabledCell = node('td'), enabled = node('input'); enabled.type = 'checkbox'; enabled.checked = wave.enabled !== false; enabled.dataset.path = prefix + '.' + i + '.enabled'; enabled.setAttribute('aria-label', '第 ' + (i + 1) + ' 组启用');
        enabled.addEventListener('change', () => { snapshot(); wave.enabled = enabled.checked; updateDirty(); row.classList.toggle('ztps-disabled-row', !enabled.checked); }); enabledCell.appendChild(enabled); row.appendChild(enabledCell);
        const typeCell = node('td'), typeSelect = node('select'); for (let t = allowWait ? 0 : 1; t <= 5; t++) option(typeSelect, t, waveLabel(t)); typeSelect.value = String(wave.type); typeSelect.dataset.path = prefix + '.' + i + '.type'; typeSelect.setAttribute('aria-label', '第 ' + (i + 1) + ' 组类型');
        typeSelect.addEventListener('change', () => change(prefix + '.' + i + '.type', Number(typeSelect.value))); typeCell.appendChild(typeSelect); row.appendChild(typeCell);
        for (const key of ['count', 'delay']) { const cell = node('td'); cell.appendChild(makeInput(prefix + '.' + i + '.' + key, wave[key], '第 ' + (i + 1) + ' 组' + (key === 'count' ? '数量' : '调度延迟'))); row.appendChild(cell); }
        const commands = node('td', 'ztps-row-actions');
        const up = button('↑', () => { snapshot(); [list[i - 1], list[i]] = [list[i], list[i - 1]]; if (i % pageSize === 0) setPage(page - 1); updateDirty(); render(); }); up.disabled = i === 0; up.setAttribute('aria-label', '第 ' + (i + 1) + ' 组上移');
        const down = button('↓', () => { snapshot(); [list[i + 1], list[i]] = [list[i], list[i + 1]]; if (i % pageSize === pageSize - 1) setPage(page + 1); updateDirty(); render(); }); down.disabled = i === list.length - 1; down.setAttribute('aria-label', '第 ' + (i + 1) + ' 组下移');
        const remove = button('删除', () => { snapshot(); list.splice(i, 1); updateDirty(); render(); }); remove.disabled = list.length === 1; remove.setAttribute('aria-label', '删除第 ' + (i + 1) + ' 组');
        commands.appendChild(up); commands.appendChild(down); commands.appendChild(remove); row.appendChild(commands); body.appendChild(row);
      });
      table.appendChild(body); scroll.appendChild(table); area.appendChild(scroll); return area;
    }
    function renderWaves(level, index) {
      const section = node('section', 'ztps-section'); section.appendChild(node('h2', '', '关卡波次顺序'));
      section.appendChild(node('p', 'ztps-help', '从上到下执行；0 为等待。数量是此组调度次数，delay 是原始调度值而不是秒，先向零取整（0.3 → 0）。关闭“启用”跳过整组。'));
      section.appendChild(waveTable(level.waves, 'config.levels.' + index + '.waves', wavePage, value => { wavePage = value; }, true));
      const applyWaves = button('替换本局后续队列…', () => action(async () => {
        const s = state(); if (!s.isCustom || !s.isBattle) throw new Error('仅可修改正在进行的自定义战局。');
        if (s.stage !== level.id) throw new Error('当前战局为第 ' + s.stage + ' 关，请先选择对应关卡再替换后续队列。');
        if (!win.confirm('保留当前正在出怪的这一组；之后的全部队列将替换为此关编辑表的所有启用组（不会自动扣除已出现过的组）。继续吗？')) return;
        const report = await controller.applyUpcomingWaves(clone(draft.config)); notice('已替换后续队列：保留当前组，后续 ' + report.upcomingGroups + ' 组。不会修改已经生成的僵尸。');
      })); applyWaves.disabled = !(state().isCustom && state().isBattle); section.appendChild(applyWaves); content.appendChild(section);
    }
    function renderReinforcements(level, index) {
      const section = node('section', 'ztps-section'); section.appendChild(node('h2', '', '基地生命阈值增援'));
      section.appendChild(node('p', 'ztps-help', '敌方基地生命由上往下跨过阈值时触发。每组 calls 按表顺序插入队首，所以最后一条先出；多个阈值同帧跨过时，按组顺序处理。编辑内容下局生效。'));
      const toolbar = node('div', 'ztps-section-heading'), choose = node('select'); choose.setAttribute('aria-label', '选择增援阈值组');
      level.reinforcements.forEach((r, i) => option(choose, i, '增援 ' + (i + 1) + ' · 基地 HP ≤ ' + r.threshold));
      reinforcementIndex = Math.min(reinforcementIndex, Math.max(0, level.reinforcements.length - 1)); choose.value = String(reinforcementIndex);
      choose.addEventListener('change', () => { reinforcementIndex = Number(choose.value); reinforcementPage = 0; render(); }); toolbar.appendChild(choose);
      const add = button('＋ 增援阈值', () => { snapshot(); const max = draft.config.zombies.find(z => z.id === 5).health - 1, used = new Set(level.reinforcements.map(r => r.threshold)); let threshold = Math.max(0, max); while (used.has(threshold) && threshold > 0) threshold--; level.reinforcements.push({threshold, calls: [{type: 1, count: 1, delay: 1}]}); reinforcementIndex = level.reinforcements.length - 1; reinforcementPage = 0; updateDirty(); render(); }); add.disabled = level.reinforcements.length >= 1000; toolbar.appendChild(add); section.appendChild(toolbar);
      if (level.reinforcements.length) {
        const r = level.reinforcements[reinforcementIndex], p = 'config.levels.' + index + '.reinforcements.' + reinforcementIndex;
        const controls = node('div', 'ztps-section-heading'); controls.appendChild(labeled('触发阈值（敌方基地 HP）', makeInput(p + '.threshold', r.threshold, '增援触发阈值')));
        const up = button('组上移', () => { snapshot(); [level.reinforcements[reinforcementIndex - 1], level.reinforcements[reinforcementIndex]] = [r, level.reinforcements[reinforcementIndex - 1]]; reinforcementIndex--; updateDirty(); render(); }); up.disabled = reinforcementIndex === 0;
        const down = button('组下移', () => { snapshot(); [level.reinforcements[reinforcementIndex + 1], level.reinforcements[reinforcementIndex]] = [r, level.reinforcements[reinforcementIndex + 1]]; reinforcementIndex++; updateDirty(); render(); }); down.disabled = reinforcementIndex === level.reinforcements.length - 1;
        controls.appendChild(up); controls.appendChild(down); controls.appendChild(button('删除这组增援', () => { snapshot(); level.reinforcements.splice(reinforcementIndex, 1); updateDirty(); render(); })); section.appendChild(controls);
        section.appendChild(waveTable(r.calls, p + '.calls', reinforcementPage, value => { reinforcementPage = value; }, false));
      } else section.appendChild(node('p', 'ztps-help', '此关没有生命阈值增援。'));
      content.appendChild(section);
    }
    function ruleCheckbox(path, text, hint) {
      const label = node('label', 'ztps-rule'), input = makeInput('rules.' + path, getAt(draft.rules, path), text), copy = node('span');
      copy.appendChild(node('strong', '', text)); if (hint) copy.appendChild(node('small', '', hint)); label.appendChild(input); label.appendChild(copy); return label;
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
      start.appendChild(node('p', 'ztps-help', '自定义战局与原版进度分开；面板内修改不会自动覆盖磁盘 JSON。')); content.appendChild(start);
      const spawn = node('section', 'ztps-section'); spawn.appendChild(node('h2', '', '一键刷怪'));
      spawn.appendChild(node('p', 'ztps-help', '每点一次，在敌方入口生成一只。面板打开时战斗暂停，关闭面板后继续行动。手动刷怪不受“自动波次 / 允许类型”限制。'));
      const cards = node('div', 'ztps-spawn-grid');
      ZOMBIES.forEach((name, type) => {
        const b = button('', () => action(async () => { await controller.spawnZombie(type, 1); notice('已生成 1 只' + name + '。关闭面板（Esc）继续战斗。'); }), 'ztps-spawn'); b.dataset.spawn = String(type);
        const icon = node('span', 'ztps-zombie-icon ztps-zombie-' + type); icon.setAttribute('aria-hidden', 'true'); b.appendChild(icon); b.appendChild(node('strong', '', name)); b.appendChild(node('small', '', '＋ 1 只')); cards.appendChild(b);
      }); spawn.appendChild(cards); content.appendChild(spawn);
      const rules = node('section', 'ztps-section'); rules.appendChild(node('h2', '', '出怪与能力规则'));
      rules.appendChild(node('p', 'ztps-help', '开关先改草稿；点击底部“应用本局”生效，或保存供下次使用。关闭自动波次也暂停基地受伤增援；尸弹额外生成受独立开关控制。'));
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
        rules.appendChild(node('p', 'ztps-help', '能力关闭后保留移动和动作，只禁用对应命中 / 投掷效果，不自动替换为另一种攻击。'));
      }
      if (draft.rules.economy) {
        rules.appendChild(node('h3', '', '经济与人口'));
        rules.appendChild(parameterTable(draft.rules.economy, defaults().rules.economy, 'rules.economy'));
      }
      content.appendChild(rules);
      const s = state(); if (s.storageAvailable === false) content.appendChild(node('p', 'ztps-warning', '当前环境不能写入本机存储，请导出 JSON 保存规则。'));
      for (const text of s.warnings || []) content.appendChild(node('p', 'ztps-warning', String(text)));
    }
    function alignEntry() {
      if (!canvas || !canvas.getBoundingClientRect) return; const rect = canvas.getBoundingClientRect();
      // Main-menu links occupy the whole right side. Battle MENU/sound/speed
      // occupy y=6..31, recruitment y=64..180, health bars y=560..596.
      // The left sky/title decoration at logical y=240 has no game control.
      entry.style.left = Math.max(8, rect.left + 8) + 'px'; entry.style.top = Math.max(8, rect.top + rect.height * 0.4) + 'px';
    }
    function open() {
      if (opened || disposed) return;
      try { pauseToken = controller.pauseForEditor(); } catch (error) { notice(error.message, true); return; }
      previousFocus = doc.activeElement; opened = true; overlay.hidden = false; entry.hidden = true;
      if (!draft) { const next = controller.getDraft(); draft = clone(next); baseline = clone(next); selectedPresetId = state().selectedPresetId || ''; }
      refreshPresets(); if (selectedPresetId) presetName.value = (controller.listPresets().find(p => p.id === selectedPresetId) || {}).name || '';
      render(); notice(''); closeButton.focus();
    }
    function close() {
      if (!opened) return; opened = false; overlay.hidden = true; entry.hidden = false;
      controller.resumeFromEditor(pauseToken); pauseToken = undefined;
      if (previousFocus && typeof previousFocus.focus === 'function' && previousFocus.isConnected !== false) previousFocus.focus(); else if (canvas) canvas.focus();
      alignEntry();
    }
    function keys(event) {
      if (event.key === 'F2') { consumedKeys.add(event.key); event.preventDefault(); event.stopImmediatePropagation(); if (opened) close(); else open(); return; }
      if (!opened) return;
      if (event.key === 'Escape') { consumedKeys.add(event.key); event.preventDefault(); event.stopImmediatePropagation(); close(); return; }
      if (event.key === 'Tab') {
        const focusable = Array.from(modal.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')).filter(el => !el.disabled && !el.hidden && el.tabIndex !== -1);
        if (!focusable.length) { event.preventDefault(); modal.focus(); return; }
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && (doc.activeElement === first || !modal.contains(doc.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (doc.activeElement === last || !modal.contains(doc.activeElement))) { event.preventDefault(); first.focus(); }
      }
    }
    // Stop bubbling events before the game's global input listeners. Capture the
    // close key so it cannot also toggle the game's own pause/menu state.
    for (const event of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'click', 'wheel', 'contextmenu']) overlay.addEventListener(event, e => e.stopPropagation());
    on(win, 'keydown', keys, true);
    on(win, 'keyup', event => { const consumed = consumedKeys.delete(event.key); if (opened || consumed) event.stopImmediatePropagation(); }, true);
    on(win, 'resize', alignEntry);
    if (typeof win.ResizeObserver === 'function' && canvas) { const ro = new win.ResizeObserver(alignEntry); ro.observe(canvas); cleanups.push(() => ro.disconnect()); }
    if (typeof controller.subscribe === 'function') { const unsubscribe = controller.subscribe(() => { if (opened) { renderBattleState(); refreshPresets(); } }); if (typeof unsubscribe === 'function') cleanups.push(unsubscribe); }
    alignEntry();
    const handle = {open, close, isOpen: () => opened, getDraft: () => draft && clone(draft), destroy() { if (disposed) return; close(); disposed = true; for (const cleanup of cleanups) cleanup(); entry.remove(); overlay.remove(); if (instance === handle) instance = null; }};
    if (!options.document) instance = handle; return handle;
  }
  return {mount, flattenFields, getAt, setAt, fieldInfo, presetFilename, waveLabel, numericValue, summarizeReport, ZOMBIES, TABS};
});
