# 二次开发指南

[English](DEVELOPMENT.md) · [项目说明](../README.zh-CN.md)

## 快速开发流程

使用 **Node.js 20 或更新版本**。正常启动不需要安装 npm 依赖。

```sh
npm start
```

浏览器打开 **http://127.0.0.1:8318/**。修改 `config/` 下的 JSON，运行配置检查，再刷新网页、开始关卡：

```sh
npm run config:check
```

浏览器在页面启动时读取配置。调整配置不需要转译或重新生成代码。配置有误时会阻止启动并报告对应 JSON 字段，不会悄悄退回默认值。

外置玩法设置未变时恢复已应用的自定义会话；数值或波次顺序变更后，下次启动优先使用新文件，并在设置中提示。波次 ID 是身份元数据，不参与此比较或原版／自定义分类，单纯补 ID 不会重置 v0.3.0 的已选会话。只保存预设不会选择为启动规则。恢复原版选择基准，不改写外置文件。

### 桌面开发

桌面开发、打包需 **Node.js 22.12 或更新版本**，高于纯网页游戏的运行要求：

```sh
npm install
npm run desktop
```

桌面应用使用 Electron **45.0.0**，固定本地来源为 **`ztp://game/`**。不启动 `scripts/server.mjs`，不占 HTTP 端口，也不另开浏览器。渲染层不能访问 Node.js；主进程仅提供明确允许的游戏文件。F11 切换全屏，F2 打开自定义，F1 查看配置与存档位置。

Windows 可编辑配置位于 **`%APPDATA%\ZombieBuilders\config`**，进度与预设保存在同一用户数据目录中。启动仅以排他创建方式补齐缺失配置，不覆盖已有文件。源码树中的 `config/` 不会替换已复制到该目录的文件。需要隔离的开发环境时，启动 Electron 前把 `ZOMBIE_BUILDERS_DATA_DIR` 设为一个**绝对目录**；测试不要使用玩家真实存档目录。

旧浏览器数据不会自动迁入桌面版。升级或移动安装目录不会混入用户数据，仍建议自行备份。

## 配置文件

每个文件包含 `schemaVersion: 1`，以及与文件同名的数组：

```json
{
  "schemaVersion": 1,
  "units": [
    { "id": 0, "key": "shovel-man" }
  ]
}
```

上例只展示外层结构。请保留现有文件中的完整条目。调整数值时保留原有 ID、类型、key 和必填字段；配置描述的是现有游戏实体，不是任意新增角色类型的接口。

| 文件 | 主要配置 |
| --- | --- |
| `config/units.json` | 招募费用、训练时间、人口、生命、攻击与移动 |
| `config/zombies.json` | 僵尸生命、攻击、移动与命中几何 |
| `config/buildings.json` | 建造费用、时间、前置建筑与数量上限 |
| `config/powers.json` | XP 消耗、准备时间、冷却、解锁与技能效果 |
| `config/levels.json` | 初始资源、敌人倍率、波次与增援 |

完整字段与增援队列顺序见[配置参考](../config/README.md)。

`config/defaults/` 是独立的原版基准，不是用户修改数值的目录。界面中的**“回到原版模式”**重载该基准，不删除命名预设；**“恢复原版默认”**重置数值后，也通过与其他字段相同的完整校验路径自动生效。

单位、僵尸和建筑的 ID 为 **0–5**；单位与僵尸的 ID **5** 是各自的基地。技能 ID 为 **0–2**，关卡 ID 为 **1–4**。

### 生命数值与校验提示

`units[].health` 和 `zombies[].health` 接受整数 **1–2,147,483,647**。此前的 100,000,000 是配置保护，不是玩法规则；新版上限对应当前战斗数值使用的有符号 32 位整数边界。未替换相关整数运算前，不应直接移除这个边界。生命 `0` 表示死亡，不是无敌开关。

`$.units[5].health` 指向 JSON 的第六项，即己方基地；`$.zombies[5].health` 是敌方基地。报错保留可定位的 JSON 路径，同时提供中文字段上下文。每关非基地僵尸的 `truncate(health × rules.multipliers.zombies.health × truncate(zombieHealthMultiplier))` 也必须在 **1–2,147,483,647** 内；己方小兵生命乘 `rules.multipliers.units.health`，双方基地都不乘全体或关卡倍率。先校验再应用，非法草稿不会把本局修改一半。击杀高生命敌人时，累计 XP 达到同一 32 位上限后保顶，不绕回负数；之后使用技能仍正常扣除 XP。

### 示例：加强铲兵

在 `units.json` 找到 `shovel-man`，修改现有条目中的这些值：

```json
{
  "id": 0,
  "key": "shovel-man",
  "cost": 40,
  "buildTicks": 45,
  "health": 70,
  "damage": 12
}
```

`cost` 是现金费用，`buildTicks` 是训练时间，`people` 是占用人口。`dependency` 指向前置建筑 ID；`0` 指初始自带的 Trailer。条目中的 `moveSpeed` 表示每个战斗 tick 的移动量。不同单位使用不同攻击字段，请保留对应类型原有的字段。

### 示例：调整普通僵尸

在 `zombies.json` 找到 `zombie`：

```json
{
  "id": 0,
  "key": "zombie",
  "health": 30,
  "damage": 8,
  "hitRadius": 16,
  "hitOffset": 16
}
```

`health` 与近战 `damage` 是基础数值，关卡倍率由战斗逻辑另行应用。尸体投掷者（ID `4`）使用 `projectileDamage` 而不是 `damage`；其尸弹直接使用该伤害值，不受 `zombieDamageMultiplier` 影响。`hitRadius` 与 `hitOffset` 影响接触判定几何。要调整出兵数量，请修改关卡波次，不要增加僵尸类型条目。

### 示例：降低废料场费用

在 `buildings.json` 找到 `salvage-yard`：

```json
{
  "id": 1,
  "key": "salvage-yard",
  "cost": 400,
  "buildTicks": 250,
  "maximum": 5
}
```

`maximum` 为整数 **0–100,000**：**0 取消玩法数量上限**，正数设置上限；引擎另有每类 100,000 的新订单安全门槛。计数包含已完成建筑与排队订单。本局降低上限不拆建筑、不取消已付订单，只在数量已达／超过新上限时阻止继续下单。原版默认仍为房车 15、废料场 5、其余类型 1。

绘图仍使用原有有限位置，但额外已完成建筑真实计入收入和人口；重复建造解锁建筑不会凭空增加技能或新美术。`dependency: 0` 表示无前置，其他值指向所需建筑的 ID。废料场收入与房车人口通过预设中独立的 `rules.economy` 字段调整，不通过建筑说明文字调整。

### 示例：调整收割机技能

在 `powers.json` 找到 `harvester`：

```json
{
  "id": 1,
  "key": "harvester",
  "xp": 3500,
  "buildTicks": 150,
  "cooldownTicks": 9000,
  "unlockAfterStage": 1,
  "effect": {
    "moveSpeed": 0.75
  }
}
```

技能消耗 `xp`，不是现金。`unlockAfterStage: 0` 表示一开始即可使用；`1`–`4` 需要本地保存的对应关卡通关记录。每种技能有各自的 `effect` 字段。收割机伤害和范围另放在预设的 `rules.abilities` 中。

### 示例：修改关卡开局

在 `levels.json` 修改现有的 `stage-1` 条目。以下片段调整初始资源和开局波次：

```json
{
  "id": 1,
  "key": "stage-1",
  "startingCash": 150,
  "startingXp": 0,
  "zombieDamageMultiplier": 1,
  "zombieHealthMultiplier": 1,
  "waves": [
    { "id": "stage-1-wave-1", "type": 1, "count": 5, "delay": 3 },
    { "id": "stage-1-wave-2", "type": 0, "count": 1, "delay": 4 },
    { "id": "stage-1-wave-3", "type": 2, "count": 2, "delay": 3 }
  ]
}
```

波次的 `type: 0` 表示等待条目，**1–5** 分别对应僵尸 ID **0–4**。`count` 设置该条目的数量。`delay` 是波次调度参数，不是战斗 tick，也不是精确的现实秒数；游戏在调度前会将其截断为整数，调整时建议使用整数。

波次与增援调用可添加 **`"enabled": false`** 禁用，省略则启用；允许空波次列表。`count` 必须保持正整数，不要用 0 表示关闭，应禁用或删除条目。默认调度不等场上僵尸被杀完，有限队列结束后也不会自动循环。

主波次 **`id`** 在加载源配置时可省略；提供时须在该关唯一，为 1–80 位 ASCII 字母、数字、下划线或连字符。校验会为原配置缺失的 ID 补成 `stage-1-wave-1` 等，开始战局后与真实队列绑定。修改或移动同一组要保留 ID，编辑器新增行生成新的 `wave-...` ID。它标识一组波次，不是僵尸类型，也不是画面中的行号。

现有生命计算也会先将 `zombieHealthMultiplier` 转为整数，例如 `1.75` 实际使用的生命倍率为 `1`；四种近战僵尸的伤害先乘倍率，再把结果截断为整数；该倍率不影响尸体投掷者的尸弹。

上述示例都只展示部分字段：应把数值合并到对应条目，不要用片段替换整个文件。JSON 不支持注释和末尾多余的逗号。

## 时间单位与游戏倍速

运行时目标为**每秒 60 次基础更新**。原游戏 `bbgamespeed` 控制每次更新推进的 tick 数（默认 **2**，画面内速度按钮在 **1–4** 循环）。**嵌在 F2 设置面板顶部的时间控制区**再对时钟乘 **0–20 倍**，步长 **0.1**。**1 倍**保留原游戏当前速度，不等于每帧一个 tick；**0 倍**不推进模拟帧。倍速只对当前窗口会话生效，不写进预设，重启回默认。

自定义会话自动开局现在采用正常游戏调度：控制器先调用 `EndMovie()`，再调用原生 `bb_mojo_app_SetUpdateRate(60)`，最后 `bbPlayGame(stage)`，覆盖 F2 新开自定义战局和重载后恢复已保存的自定义局。此前该路径绕过片头到游戏的正常过渡，沿用了片头的 30 Hz 调度；默认战斗时间仍约为每秒 120 tick，但每帧集中推进 4 tick，而不是 60 Hz 下的 2 tick。修复的是更新／绘制调度粒度，不是更换伤害或攻击频率公式；目标调度 60 Hz 不代表每台设备都实测或保证 60 FPS。

- 稳定运行时，tick/秒约为 `60 × bbgamespeed × timeScale`，默认 120。
- `buildTicks`、`cooldownTicks` 统计战斗 tick；波次 `delay` 使用独立调度，不适用此换算。
- 游戏时间仍按 `battleTicks / 120` 显示。
- 小数速度累计后执行完整固定模拟帧，不额外抽随机数，也不补跑暂停编辑期间的时间；20 倍是目标值，不保证实测速率。缩放后的实时 RAF 每批采用约 **25 ms 软 CPU 预算**，另有 150 帧上限；有到期帧时至少执行一个完整更新＋绘制，预算耗尽即丢弃未执行整帧，不积压补跑。默认未改动的 1 倍路径及确定性的手动 step／advance 不变。
- `ZTPRuntime.setTimeScale(value)` 校验 `0..20`、步长 0.1，`getStatus().timeScale` 可读取。0 倍不推进帧但运行标记可以仍为 true；显式暂停则取得控制器令牌。继续按钮释放自身和编辑器暂停、从 0 恢复上次正倍速，不强制取消游戏自身或其他调用者的暂停。

## 运行结构与扩展入口

| 文件 | 职责 |
| --- | --- |
| `src/boot.js` | 加载素材与配置，启动游戏 |
| `src/game-config.js` | 校验 JSON，并适配到游戏数值表与行为 |
| `src/custom-rules.js` | 在生成代码之外校验和应用出怪、能力开关 |
| `src/factions.js` | 物种与阵营解耦，跨阵营索敌／战斗及绘制适配 |
| `src/death-effects.js` | 按当前阵营适配脱离战斗的死亡动画与碎块朝向 |
| `src/effect-lists.js` | 特效／投射物链表的反向节点索引，加速回收，不改变更新与绘制顺序 |
| `src/spawn-queue.js` | 紧凑的独立速率手动任务、公平分发与队列快照 |
| `src/customization.js` | 命名预设、完整校验的即时提交、沙盒动作与自定义成绩隔离 |
| `src/settings-ui.js` / `.css` | 非模态并列设置、字段编辑、波次控制与沙盒按钮 |
| `src/generated-game.js` | 游戏状态、生产、战斗、界面与关卡逻辑 |
| `src/runtime.js` | 固定帧倍速、Canvas、音频、输入与浏览器存储 |
| `src/time-controls.js` | 嵌入设置容器的暂停／倍速控制 |
| `src/physics.js` | 物理集成 |
| `scripts/server.mjs` | 本地 HTTP 服务器与资源路由白名单 |
| `desktop/main.cjs` / `protocol.cjs` | 沙盒化桌面窗口、固定本地资源协议与用户配置 |

浏览器适配器通过 `GameConfig` 暴露；Node 工具可通过 `require` 加载同一模块。主要接口：

- `fromDocuments(documents)`：合并并校验五份 JSON 文档。
- `validate(config)`：校验合并后的配置，返回规范化副本。
- `compile(config, {multipliers}?)`：生成运行时数值表与技能参数，可传全体倍率；`validateMultipliers` 校验倍率，编译时同时校验最终属性。
- `install(target, config)`：在 `bb_Init()` 前调用，包装初始化函数，使配置在初始化后、`bb_Main()` 前重新应用。
- `apply(target, config)`：在 `bb_Init()` 后、`bb_Main()` 前直接应用。
- `getCurrent(target)`：返回最新完整配置的深拷贝，包括延期到下一局的数值。
- `updateLive(target, config, options)`：更新已初始化游戏，返回含变化 JSON 路径的 `{applied, deferred}`。传入完整配置，不是局部补丁。
- `getWaveProgress(target)`：读取当前／后续组、已调度／已出数量、已完成 ID 与可信组身份。
- `getPowerProgress(target, {includeActive:true}?)`：读取技能待分发量，可选提供各技能在场计数 `byPower`、`activeTotal`；默认返回结构不变。
- `releaseSandboxPower(target, powerId, {side,validateOnly?})`：为 `friendly`／`enemy` 释放即时技能；先只读预检，再预算化分发，返回 `{powerId,side,requested,spawned,pending}`。
- `applyLiveWaves(target, config)`：按身份合并当前关尚未出场队列，返回 `{applied, deferred, notes, requiresNewBattle, reason, progress}`。

### 实时生效约定

`updateLive` 与只供启动阶段使用的 `install`、`apply` 分开：

```js
const next = GameConfig.getCurrent(globalThis);
next.zombies[3].health = 1500;
const result = GameConfig.updateLive(globalThis, next, {
  healthPolicy: 'ratio',       // 也可选 'new-only'
  preserveTimerProgress: true,
  multipliers: CustomRules.defaults().multipliers
});
```

- `ratio` 按各活体原剩余比例映射到新上限，四舍五入并保底 1 生命，含基地与已转化友军；不会复活死者。`new-only` 保留已有单位各自的真实上限，新生成单位使用新值。
- 移速更新保留方向、临时停步或减速。共用费用、伤害和命中几何在后续行为使用新值；飞行中的投射物保留发射时伤害。
- 正在训练、蓄力或冷却的计时器保留剩余进度，非整数剩余 tick 向上取整，至少 1 tick。已支付资源和人口不重新结算。
- 建筑 `maximum` 在本局更新，降低上限保留建筑及已付订单。单位 `people`／`dependency`、建筑 `dependency`、技能 `unlockAfterStage`、开局资源和增援定义仍延期到下次重置。底层 `updateLive` 也暂缓波次数组，但玩家使用的 `Customization.applyDraft` 会紧接着对当前关调用 `applyLiveWaves`，本局同步；其他关卡波次留待开始对应关时生效。菜单更新没有活动战局需要保留。
- 实时更新先完整校验、准备修改计划，再提交；不是任意修改生成代码内部字段的接口。

面向玩家的操作应通过 **`Customization`**，不要只调用底层适配器：前者负责模式切换、预设、成绩隔离及编辑器暂停。

### 非模态编辑

视口大于 **850 CSS 像素**时，设置在右侧占独立区域；**850 及以下**为游戏在上、设置在下。画布逻辑坐标仍为 800×600，实际显示区域随布局缩放。打开设置取得编辑器暂停令牌；设置内时间区的**“继续战斗”**释放编辑器令牌但不关面板，**“暂停战斗”**取得自己的令牌，不强制清除游戏自身的暂停。关闭时按编辑器暂停前的运行状态恢复，不补跑编辑期间的时间。

F2 是自定义入口，全局开关面板；关闭后游戏画面没有额外自定义按钮或悬浮时间框。时间模块挂载到设置标题下、预设区前的 `#ztps-time-host`，默认展开，不另占面板外区域；随 F2 面板一起隐藏。显式时间暂停在关闭后仍保留，可重开 F2 继续。焦点在设置内时 Esc 关闭；表单输入与游戏控制分开。编辑器在勾选／下拉变化、数值回车／change／失焦时自动调用 `commitSettings`，多行文本也支持 Ctrl+Enter；载入、导入、恢复默认和撤销同样自动提交，不再有“应用本局”按钮。保存命名预设仍是独立的规则库操作。已完成波次只读；新增组显示在最上方，但存储和执行顺序不变。

### 预设、规则与沙盒

启动完成后可使用 `Customization` 控制器；`getDraft()` 返回 `{config, rules}`。主要方法：

| 方法 | 含义 |
| --- | --- |
| `savePreset(name, spec, id?)`、`loadPreset(id)`、`deletePreset(id)`、`listPresets()` | 管理本机命名预设；载入只返回草稿 |
| `exportPreset(spec, name)`、`importPreset(jsonText)` | 导出／校验版本化 JSON；导入不自动保存或应用 |
| `startCustomBattle(stage, spec)` | 保存会话选择、重载后开始第 1–4 关 |
| `validateDraft(spec)` | 不修改状态，完整校验并规范化配置与规则 |
| `commitSettings(spec, {healthPolicy}?)` | 编辑器入口：战中自动提交；菜单时仅更新下局模板，不自动开局 |
| `applyDraft(spec, {healthPolicy})` | 底层完整实时操作，先校验两份内容，再切换模式并一起应用 |
| `applyLive(config, {healthPolicy})` | 将活动原版局转为自定义，再应用支持的字段 |
| `applyRules(rules)` | 在自定义局应用行为开关 |
| `enqueueSpawn(side, {kind,type}, count, {rate}?)` | 创建紧凑的手动出兵任务，数量 1–2,147,483,647，速率 0–1,000,000 只／游戏秒 |
| `setSpawnJobRate(id, rate)` | 立即仅修改该任务速率，返回任务快照 |
| `cancelSpawnJob(id = "all")`、`cancelAllSpawnJobs()` | 取消一项／全部待出请求，返回被取消任务快照数组，不清已经出兵 |
| `spawnFactionUnit(side, {kind,type}, count = 1)` | 底层即时生成：`friendly`／`enemy` 任一阵营，`kind` 为 `unit`／`zombie`，`type` 为 0–4，单次 1–998，先检查共用容量 |
| `spawnZombie(type, count = 1)` | 兼容快捷接口：敌方僵尸类型 0–4，单次 1–998 |
| `spawnFriendlyUnit(type, count = 1)` | 兼容快捷接口：己方人类类型 0–4，单次 1–998 |
| `clearFriendlyTroops(selection?)`、`clearEnemyTroops(selection?)` | 清单方全体或选定类型；保留基地、暂停、已付订单和后续队列 |
| `clearAllTroops()` | 事务式一键清双方；先预检三条阵营链表再修改，保留基地、后续队列与技能效果 |
| `releaseSandboxPower(powerId, side = "friendly")` | 自定义战局中为己方／敌方立即释放 0／1／2 技能，不扣 XP 或改正常技能冷却／蓄力 |
| `unlockAll()` | 即时解除自定义单位／建筑前置与技能锁定，提供四关选择，不改胜利记录或赠资源 |
| `setBaseHealth(side, currentHp)` | `friendly`／`enemy` 基地当前生命设为整数 `0..实际最大值`，0 触发正常胜负流程 |
| `cancelPowerEffects(powerId = "all")` | 活动自定义局中取消 0／1／2 对应技能或全部，暂停时可用，不推进战斗 |
| `applyUpcomingWaves(config)` | 兼容用波次接口：按本局进度安全同步当前关，不套用其他草稿属性 |
| `getBattleStatus()` | 读取运行／编辑／游戏暂停、建筑数量、角色数量和实际波次进度 |
| `restoreOriginal()` | 重载回原版，不删除预设 |
| `pauseForEditor()`、`resumeFromEditor(token)` | 安全暂停编辑器，关闭后不补跑暂停期间的战斗 |

上表载入／导入底层方法只返回数据，设置界面随后立即把有效结果交给 `commitSettings`。编辑器用 `commitSettings`，底层仅本局调用可用 `applyDraft`；不要把 `applyLive` 与 `applyRules` 串联：规则有误时，不应把正确的配置先应用一半。校验失败不改变模式、存储或当前配置。

`spawnFactionUnit` 返回 `{side,kind,type,count,positions}`，两个兼容快捷接口仍返回 `{type,count,positions}`。这些是底层即时接口；玩家批量区域采用下述队列；己方人类和敌方僵尸各五个一键按钮仍即时生成。双方出兵表单常驻并列、独立保持所选类型／数量／速率，切换其他区域不丢失输入。支持完整二十种阵营／类型组合，例如敌方牧师／机枪兵、己方肥胖僵尸。单位均从所属阵营自然入口（**己方 x = 0，敌方 x = 1600**）进入，采用来源物种配置／全体倍率，不加暴民愤怒加成。手动生成不消耗现金、XP，不改已付订单，也不预留招募人口；未预留人口标记保证死亡／清理不错误退还其他已付兵或订单的人口。双方共享场上 1,000 实体保护，超量整批在创建前拒绝。

`src/factions.js` 把来源物种与当前阵营分开，不是仅改一个外观标记。跨阵营单位朝向、行进和索敌面向敌对一方，按类型行为攻击该方角色／基地；转化改变阵营，按类型清场以当前阵营为准。全体倍率仍跟随物种，不是把敌方人类改用僵尸数值表或反过来。角色后来被转化，不改变此前已发射投射物的发射阵营。跨阵营牧师适配可转化敌对的可移动人类／僵尸（范围 320、基础生命预算 1,000、排除基地）；原生己方牧师保留原版僵尸可转化范围。

跨阵营**适配人类**索敌采用 **128 像素宽的一维空间桶**：根据实际索敌／命中范围保守筛出候选，恢复其原链表序号，再执行原精确距离判断、目标优先级和同距离平局规则。空闲索敌找最近候选，忙碌且非命中动画帧不查询目标；只在真实机枪／牧师命中事件中排序符合范围的子集，不按桶顺序改写攻击顺序。

空间桶仅在同一 tick 的安全查询阶段内复用，按原 `people → zombies → pombies` 更新次序使用已经完成／尚未开始移动的对手几何；不索引人类更新期间的临时镜像坐标。血量与模式仍读实时对象。链表成员变化、列表／表头替换、查询阵营阶段切换或嵌套 tick 使空间索引失效，tick 结束或异常时清除作用域。含未知战斗回调的 tick 整体回退线性查询：检查对象及 Person／Zombie 原型的 `bbUpdate`、`bbInfect`、`bbSmack`、`bbTurn`、`bbHitKey`，包含已知适配人类的更新／转向方法。普通数据设置不会触发该回退；二开 JavaScript 在自定义受伤回调中移动目标时，仍使用线性路径保证查询正确。

少于 **64** 个对手、候选达到对手的一半、命中半径大于 **4,096**、坐标绝对值大于 **10,000,000**、非有限几何值或查询桶序号跨度大于 **32** 时也回退原扫描，避免为密集前线或巨大自定义数值额外建表／排序。安全阶段首次建桶约 **O(E)**，局部查询约为访问桶数加 **O(k log k)** 的原序恢复及精确筛选；E 为对手总数，k 为局部候选数。原生 `bbGameTick` 的成对遍历仍保留，不能把此优化称为全引擎线性复杂度。目标顺序、余伤分配、转化、动画命中时机、固定更新频率和 RNG 保持不变。

**死亡视觉方向。**`DeathEffects.install(target)` 在 `Factions.install(target)` 后、游戏初始化前安装；适配原有脱离战斗的死亡特效，不改交战角色的受伤／死亡状态。`DeathEffects.tag(target, effect, body)` 让沙盒生成的死亡视觉采用与自然战斗死亡相同的方向处理。

方向取**死亡瞬间的当前阵营**，不是来源物种：敌方人类将原本向左倒的死亡素材镜像为向右倒；己方僵尸镜像原生碎块素材及其初始水平速度。被转化的角色以新阵营为准。原生己方人类、敌方僵尸保持原画面；相对来源角色的纯视觉爆炸偏移也随之镜像。死亡视觉不能攻击，仍随正常暂停／更新／回收，不改变 XP、人口、命中时机、伤害预算或随机数抽取。这不是平衡参数，也不是预设字段。

**基地受击碎片与特效回收。**`GameConfig.BASE_DEBRIS_LIMIT_PER_SIDE` 为 **256**，两座基地分别拥有活跃建筑装饰碎片预算，合计最多 **512**。这是纯视觉对象预算，不是伤害或在场小兵限制。稀疏普通命中保留原碎片序列；预算已满时仍按原顺序完成每轮六次随机调用，仅跳过新增装饰对象，因此实际基地扣血、余伤、胜败与后续游戏 RNG 不变。单位死亡动画、死亡碎块及爆炸不占此预算。碎片节点移除、清空与重开释放预算，无需每次受击遍历全部碎块。

`EffectLists.install(target)` 在 `DeathEffects` 后、`SpawnQueue` 前安装。它仅为当前游戏的 `bbbodyparts`、`bbdeathlist`、`bbexplosions`、`bbsmokelist`、`bbbottles`、`bbflinglist`、`bbpowerups` 建立对象到链表节点的反向索引：首次建表 **O(P)**，此后按对象删除为 **O(该对象节点数)**，避免同批 P 个效果过期时反复全表查找的平方成本。原链表、重复对象节点与活动枚举器顺序保留，增删和清空同步维护索引，未知对象／自定义比较等情况回退原实现。不缩短特效生命周期，不跳过投射物伤害；`diagnostics(target)` 只读返回索引统计。

`getBattleStatus().factions` 按当前阵营返回 `{friendly:{units,zombies},enemy:{units,zombies}}`；战斗状态和控制器状态中的 `powerProgress` 返回 `{pendingTotal,groups:[{type,count,source,side?}]}`，反映技能等待分发量；`side` 只出现在沙盒释放组，旧正常技能结构不变。

`getState().troopCounts`／`getBattleStatus().troopCounts` 为 `{friendly:{units:[n0,n1,n2,n3,n4],zombies:[n0,n1,n2,n3,n4],total},enemy:{units:[...],zombies:[...],total}}`。沙盒选关／开局行下方的只读**“在场兵力”**表列十种单位、双方数量及合计。按当前阵营去重，只计生命大于 0 且模式非 14／15 的角色，含转化人类／僵尸；排除基地、招募／手动／技能待出量、人口上限与效果车辆。菜单显示 0，结束战局保留实际幸存者直到重置。读取不推进 tick、不抽随机数，也不修改任何状态。

清场方法可在运行或暂停时调用，不推进模拟。己方包含普通幸存者、愤怒暴民召唤兵与转化僵尸；选中对象生命设为 `0`、死亡模式设为 `15`，立即从交战链表移除，排除基地。返回 `{side, count, people, converted, zombies}`，仅为普通招募幸存者释放人口，每个对象只释放一次；重复清空同一阵营返回数量 `0`。不增加 XP、击杀、损失或现金，按原生 `bbDeath`／`bbBodyPart`／纯视觉 `bbExplosion` 生成带 `bbSandboxDeath = 1` 的脱离战斗死亡动画，暂停时冻结、正常更新回收；特效构建后恢复随机种子。不删除已有尸体、投射物或技能效果，不取消已付订单、改变计时或波次／增援队列。自动出怪须另行关闭。这是即时沙盒操作，不保存为预设开关。省略参数、`null`、`all` 清全体。双方方法都接受 `{kind:"unit",type:0..4}` 或 `{kind:"zombie",type:0..4}`，匹配当前阵营中的对应物种，包含转化僵尸；旧整数含义不变（己方选人类、敌方选僵尸）；己方 `{kind:"converted",type}`／`converted-N` 保留为己方僵尸别名。返回计数中 `people` 表示任一阵营移除的人类，`converted` 表示己方僵尸（含手动和转化），`zombies` 表示敌方僵尸。先校验筛选条件，再清理，不误伤未选类型。

`getState().bases`／`getBattleStatus().bases` 提供 `{friendly:{current,maximum},enemy:{current,maximum}}`，非活动战斗为 `null`。最大生命仍是 `config.units[5].health`／`config.zombies[5].health`，即时提交遵循生命调整策略；直接设当前生命不作为下局初始血量保存，也不能复活已结束战局。

### 独立速率手动出兵队列

两方并列批量区域各自选择类型、数量和**“本批出兵速率（只/游戏秒）”**，点**“加入出兵队列”**。数量范围 **1–2,147,483,647**；速率是有限数 **0–1,000,000 只／游戏秒**，支持小数：`0.1` 为每 10 游戏秒出 1 只，`2` 为每游戏秒出 2 只，`0` 只暂停该任务。一游戏秒为 **120 战斗 tick**，原游戏速度和运行时倍速共同改变现实出兵速率。默认 **120** 仅用于新任务，不影响已排任务。

各任务独立并发，不是前一个没结束后一个就不出的单一 FIFO。公平轮转共用**每模拟 tick 最多 32 只**的预算，并遵守**含基地的场上 1,000 实体**保护。满场保留待出余量，不吞请求，也不攒成之后一口气补跑的大爆发；单批暂停、改速也不追补先前时间。极高速率受共用预算约束。第一只在经过间隔（`120/rate` 战斗 tick）后出现，不在加入时立即生成；高速任务最早下一 tick 开始。

队列汇总显示**场上占用 N / 1000（含基地）**，通常两个基地占两位，最多容纳 998 个小兵；脱离战斗的死亡视觉不占位。只有 `entity-limit` 显示“场上已满，等待单位退场”；`game-paused`、`runtime-paused`、`rate-paused`、`battle-ended`、`no-active-battle` 分别提示游戏暂停、战斗暂停、全部批次速率为 0、战斗结束或等待开局。单项任务速率为 0 时优先显示该批暂停。

`enqueueSpawn`、`setSpawnJobRate` 返回任务快照。`getState().spawnQueue`／`getBattleStatus().spawnQueue` 包含 `defaultRate`（`rate` 别名）、`jobs`、`recent`（最近 32 个完成／取消任务）、`pendingJobs`、`totalPending`（`pending` 别名）、`totalRequested`、`totalSpawned`、`totalCancelled`、`paused`、`blocked`、`entityCount`、`baseCount`、`entityLimit`、`capacity`、`maxPerTick`。`entityCount` 为交战链表当前占用，`baseCount` 为其中基地数，`entityLimit` 当前为 1,000，`capacity = max(0, entityLimit − entityCount)`；一次成员扫描同时提供容量与阻塞状态。此占用不同于 `troopCounts` 的存活非基地角色数。单项任务含 `id`、`side`、`descriptor:{kind,type}`、`kind`、`type`、`count`、`rate`、`spawned`、`remaining`、`status`、`createdTick`、`completedTick`、`cancelledCount`、`firstSpawn:{x,y,side,kind,type}|null`。

任务速率输入即时只改该任务，可不等前批结束就连续添加新批次。取消一项／全部只删除待出请求，与清场或取消技能不同，不清已经生成的单位。队列仅属当前战局，重置战场时清除，不作为预设规则保存。

启动在配置／规则、`Factions`、`DeathEffects`、`EffectLists` 后、游戏初始化前安装 `SpawnQueue`。模块接口为 `install(target)`、`enqueue(target,side,descriptor,count,{rate}?)`、`updateRate(target,id,rate)`、`setDefaultRate(target,rate)`（`setRate` 别名，仅新任务）、`cancel(target,id?)`（省略为全部）、`snapshot(target)`（`getState` 别名）。设置面板轮询复用 `getState().battleStatus`，不再次调用完整战局统计。

### 双方技能快捷释放与一键解锁

技能区双方各显示三个技能图标，调用 `releaseSandboxPower(powerId, side)`，`side` 为 `friendly`／`enemy`，返回 `{powerId,side,requested,spawned,pending}`。仅活动自定义局可用，暂停时也可释放；效果使用当前配置并归属指定阵营，愤怒暴民从该阵营自然入口出场，收割机、空袭只伤敌对小兵。此动作免费且无需正常解锁、蓄力、冷却，不修改原技能的 XP／忙碌／冷却状态；原画面技能按钮的正常流程保持不变。大量请求仍走受预算与场上容量约束的技能队列。

关卡编辑右侧的一键解锁调用 `unlockAll()`：有效配置中单位／建筑 `dependency` 与技能 `unlockAfterStage` 设为 `0`，即时解除本局前置／锁定；菜单只更新模板，不自动开局。控制器先验证再将原版局转为自定义，保留原版和自定义成绩；它不赠建筑、现金、XP 或胜利，可选 `rules.unlockAllStages: true` 同时开放原 Canvas 菜单四关和自定义选关；缺省／`false` 保留正常锁定，显示及持久化成绩不替换、不伪造。解锁后的规则可保存／导出为预设，恢复默认可恢复原限制。

### 取消技能效果

技能页的**“取消当前技能效果”／“取消全部技能效果”**调用 `Customization.cancelPowerEffects(0|1|2|"all")`，省略参数为全部。仅活动自定义局可用，暂停时也能操作并保留暂停状态。控制器先只读预检，再在冻结时间中取消，返回 `GameConfig.cancelPowerEffects` 的 `{pending,actors,powerups,projectiles,explosions,charging}` 计数。

清理双方所选技能的蓄力、待出队列及已放出的对应效果：暴民来源角色（含后来被转化者）、收割机或飞机／未落地空袭炸弹，以及有空袭来源标记的爆炸视觉效果。普通小兵、手动生成单位和燃烧瓶不是要清掉的技能效果。取消所选蓄力会清除忙碌／蓄力状态，但保留剩余冷却；再次释放仍遵守正常条件。不退 XP，不重置冷却，不回滚已经造成的伤害，不改现金／人口或未来波次、招募和建筑计划。这是即时动作，不是预设开关。

### 本局波次合并

波次表头的**“暂停波次／继续波次”**切换已有的实时 `rules.automaticSpawning`，与沙盒勾选状态同步。冻结脚本调度／数量进度，不重开或重播队列；场上战斗、技能及独立手动出兵任务继续运行。基地生命触发的新增援也被阻止（暂停时跨过的血量阈值被消费，不补发）；尸弹落地生怪仍受其独立开关控制。按钮只更新当前已生效规则，不被其他尚未有效提交的输入阻塞，也不覆盖那些编辑；不增加新暂停标记或配置字段。

编辑器自动 `commitSettings` 经 `applyDraft` 更新当前关波次，不需要应用、替换或重播按钮。返回值中的 `waveReport` 含 `{applied, deferred, notes, requiresNewBattle, reason, progress, stage, otherStages}`；应用不会重开战局，也不等待清场。

- 未完成 ID 的**剩余量 = `max(0, 目标总量 - 已调度量)`**。`consumed` 包含等待和被自动类型开关过滤的调度次数；`spawned` 才是实际生成数量。修改 `count` 是修改本局期望总量，不是在后面追加这么多。
- 类型变更只作用于未出余量；调整顺序保留各 ID 已调度数。禁用／删除未完成组会移除其剩余队列，重新启用尚未完成的同 ID 可恢复未消费余量。
- 把数量降到已调度量或以下，将该 ID 完成并取消剩余。本局已完成 ID 即使加大数量也不补刷，改动留给下一局；确需再出一组，请新增 ID。
- 保留已有各组计时和调度时钟。新 `delay` 供下次原有 `time > truncate(delay)` 判断使用，不重置时间、不按新间隔重算百分比；在场敌人不变。
- 已入队增援对象保留原相对插槽，不被主波次合并删除，也不重置增援触发历史。增援定义修改仍需下一局。
- 修改其他关卡会保存配置，不改当前关队列；报告通过 `otherStages`、延期路径提示下次对应关才生效。

缺少可靠 ID 的旧导入预设会取得保留的 `legacy-untracked-...` 标记，可保存并用于新开自定义局，但不能按行号猜它属于本局哪组。新局绑定之前，波次报告 `requiresNewBattle: true` 与原因，不改队列；草稿其他有效属性仍可应用。载入、保存、导出和普通深拷贝保留这些 ID，手写新组不要使用该保留前缀。

`getBattleStatus()` 分开提供 `runtimeRunning`、`editorPaused`、`editorPauseCount`、`gamePaused`、`battleRunning`，并包含 `buildings: [{id, built, queued, maximum}]`、`entities: {people, zombies, converted, total}`、`waveProgress`、`wavePending`、`waveNotes`。`getState()` 通过 `battleStatus` 和核心别名提供相同信息。进度含 `current`、`upcomingGroups`、`remainingTotal`、`completedGroups`、`completed`、`knownIds`；组信息含 `id`、`type`、`total`、`consumed`、`spawned`、`remaining`、`source`（`wave` 或 `reinforcement`）。这些是**实际运行状态**，不是编辑器尚未提交的草稿。

规则格式：

```json
{
  "schemaVersion": 1,
  "automaticSpawning": true,
  "zombieTypesEnabled": [true, true, true, true, true],
  "baseReinforcements": true,
  "corpseSpawnOnImpact": true,
  "multipliers": {
    "units": { "health": 1, "moveSpeed": 1, "damage": 1 },
    "zombies": { "health": 1, "moveSpeed": 1, "damage": 1 }
  },
  "economy": {
    "salvagePayout": 50,
    "salvageIntervalTicks": 600,
    "populationPerTrailer": 5
  },
  "abilities": {
    "ghoulLongLeap": true,
    "preacherConversion": true,
    "fatAreaAttack": true,
    "corpseThrowing": true,
    "harvesterDamagePerTick": 100,
    "harvesterRange": 220
  }
}
```

可选 `unlockAllStages` 为布尔值，缺省按 `false` 处理并保留旧预设原样；为 `true` 时即时解除原菜单四关锁定，不改通关记录。一键解锁会设置它，存入规则预设。

| 数值规则 | 允许范围 | 实时行为 |
| --- | --- | --- |
| `economy.salvagePayout` | 整数 0–1,000,000 | 后续收入发放使用新值，不改已有现金 |
| `economy.salvageIntervalTicks` | 整数 1–1,000,000 | 当前计币池按比例映射，向下取整 |
| `economy.populationPerTrailer` | 整数 1–1,000 | 立即更新人口上限，不移除已超上限单位 |
| `abilities.harvesterDamagePerTick` | 整数 0–100,000,000 | 下个 tick 生效，含已有收割机；每目标伤害，不是 DPS |
| `abilities.harvesterRange` | 整数 0–3,200 | 下个 tick 生效；沿原前沿边界计算 `0 <= 距离 < 范围`，不攻击基地 |

全体倍率放在 `rules.multipliers.units` 与 `.zombies`，各含 `health`、`moveSpeed`、`damage`，默认均 **1**。生命倍率须大于 0，移速／伤害可为 0；单倍率须有限且不超过 **2,147,483,647**，最终生命／伤害仍校验 32 位边界，最终移速不超过 **1,000,000**。不改原基础配置值，不影响双方基地；倍率跟随来源物种，而非当前阵营：敌方人类仍使用 `units`，己方／已转化僵尸仍使用 `zombies` 及关卡倍率。

- 己方生命：`truncate(基础生命 × units.health)`。
- 僵尸生命：`truncate(基础生命 × zombies.health × truncate(关卡生命倍率))`。
- 近战伤害组合基础／全体／关卡倍率后按原流程截整数；尸弹仍不乘关卡近战倍率。燃烧瓶和尸弹在发射时使用所属类型全体伤害倍率，已飞出的不变。牧师转化不是直接伤害值。
- 移速是类型移速乘全体倍率，愤怒暴民还乘自身愤怒移速；实时更新保留方向与临时状态，并遵循所选生命策略。

手动生成有意绕过自动出怪筛选，不改变自动波次及顺序。`CustomRules.ENTITY_LIMIT` 为战场合计 **1,000** 个交战单位，含基地、我方、敌方与转化友军，不含投射物、技能特效和粒子。已付费训练订单在满员时保留为剩余 1 tick，等待空位，保留已付资金与预留人口，不吞订单、不重复扣款；愤怒暴民和空袭使用紧凑计数队列，每个配置数量最高 **2,147,483,647**，每个模拟更新最多分发 **32 个角色／效果**，并遵守各自的在场容量保护；多余请求等待而非丢弃。修改数量只影响后续释放，不改已经在等待分发的技能；重置战局清除其旧等待请求。`automaticSpawning: false` 冻结脚本波次调度和数量，不停止战斗或手动出兵任务；关闭增援生成期间跨过的基地生命阈值会被消费，重新开启不补发。类型开关筛选队列出怪，`corpseSpawnOnImpact` 单独控制尸弹落地额外生成的普通僵尸。

`ghoulLongLeap: false` 关闭食尸鬼远距长跃，保留近距离跳咬；半空关闭时，下个战斗 tick 将该次长跃还原到地面高度并继续行走。其他三个能力布尔开关关闭对应命中／转化／投射物，不取消动作耗时，也不替换成别的攻击。本版没有数值化调整攻击频率、通用攻击距离、长跃距离／速度、肥胖范围半径、牧师转化预算／距离或空袭炸弹伤害／半径。新增实体与机制仍需代码实现。

较早的版本 1 预设若省略后来新增的经济、收割机、食尸鬼长跃或全体倍率字段，会补齐默认值；愤怒暴民新增的 `survivalistCount`、`bomberCount`、`preacherCount` 省略时为 0，`shovelCount`、`shotgunCount` 仍必填；未知字段和原有必填字段仍被严格校验，不接受任意 JSON。

持久化键不随发行版本号变化：`zombie-builders-presets-v1` 保存至多 25 套预设、全库 2 MiB；`zombie-builders-session-v1` 保存已选规则；`zombie-trailer-park-0.33` 是原版记录；`zombie-builders-custom-v1` 是自定义记录。预设 JSON 导入／导出上限 2 MiB。保存预设不改写五份外置 JSON，原版与自定义记录也不合并。

用户存储不可用或已满时，普通实时修改可带警告在本窗口内存继续使用，不承诺重启后保留。需要重载的“开始自定义战局”“回到原版模式”必须先成功保存会话，否则明确报错并保留当前局，不能重载后丢失规则。

手写的配置行为放在 `src/game-config.js` 中。重新生成 `src/generated-game.js` 不会覆盖 `config/`。`data/raw.json` 是检查使用的基准数据，不是面向使用者的数值配置入口。新增实体类型或机制还需要修改游戏行为、动画与界面代码。

## 密集战斗性能测量

用 `scripts/profile-performance.cjs` 做受控源码对照：默认基线取已保存的 `v0.4.1` 标签，`--current` 测量当前源码；可加 `--ref v0.4.2` 选择较新的已发布基线与当前版对照（`--ref current` 等同于 `--current`）。先启动本地游戏服务器，再指向该服务运行：

```powershell
$env:GAME_URL = 'http://127.0.0.1:8318'
node scripts/profile-performance.cjs --browser --quick
node scripts/profile-performance.cjs --browser --quick --current
```

`--quick` 使用 400 个角色；完整矩阵覆盖 250／400／800 个角色、原阵营行走／原阵营混合／跨阵营人类／跨阵营密集交战四种场景，以及关闭／打开设置。合成夹具提高生命来稳定单位数量；密集场景还固定位置与移速，但每个角色仍执行完整游戏更新与绘制。报告、冻结源码及 CPU profile 保留在唯一的 `output/perf-*` 目录。

浏览器报告分开记录更新／绘制／完整帧的 CPU 提交耗时分布，不能直接称为实际 RAF 帧率或 GPU 完成耗时；不加 `--browser` 的 Node VM 虽运行真实玩法，但绘制为空实现，不能冒充桌面绘制性能。对照应使用相同夹具、单位数、预热与帧数；保留目标顺序、余伤分配、命中时机、转化与 RNG，而不是丢单位或少跑模拟来换速度。具体前后数据与验收口径写进版本记录，不承诺所有机器或所有组合都能在某个兵数下保持固定帧率。

### 基地高伤害对照

`scripts/profile-base-damage.cjs` 自行启动隔离的随机端口本地服务与真实 Edge／Chromium Canvas，不需要另开游戏服务器。逐个运行相同夹具作对照，不要并行压测：

```powershell
node scripts/profile-base-damage.cjs --ref v0.4.2 --case direct-high --frames 120 --panel both
node scripts/profile-base-damage.cjs --ref current --case direct-high --frames 120 --panel both
```

`--case` 接受逗号分隔的 `direct-low`、`direct-high`、`native-base`、`cross-base`、`native-base-high`、`cross-base-high`、`kill-friendly`、`kill-enemy`，或 `all`。`--panel` 为 `closed`／`open`／`both`；`--hits` 是**每座基地**的直接命中次数，最高 60；`--count` 是自然攻击夹具的总兵数。默认非击杀用例预热 20 帧、测量 120 个完整更新＋绘制帧，高伤害自然攻击默认仅 **20** 个角色。若检查 100 个高伤害角色，明确缩短采样，例如：

```powershell
node scripts/profile-base-damage.cjs --ref current --case cross-base-high --count 100 --frames 30
```

同一 A/B 对照必须保持 `--count`、`--hits`、`--frames`、`--warmup` 和 `--panel` 一致。报告保留冻结源码哈希、实际基地扣血／余伤、随机种子、特效数和完整帧 CPU 耗时；关闭波次／增援、高血量与固定摆位均属合成压力夹具，不替代自然通关测试。`--snapshot-only` 仅冻结、解析源码，不启动浏览器或压测；`--help` 查看全部参数。

## 检查与打包

```sh
npm run config:check
npm run build
npm test
npm run package
npm run package:desktop
```

`build` 检查发布文件，不重新生成游戏代码。`npm run package` 默认生成网页便携包。**`npm run package:desktop`** 在 `output/desktop-v<version>/` 构建真正的 Electron Windows x64 应用目录，并在 `output/releases/` 生成 `zombie-builders-desktop-win-x64-v<version>.zip` 和 `desktop-checksums.txt`。解压后须保留 DLL、`locales`、`resources`、`LICENSE` 与 `LICENSES.chromium.html`；EXE 单独不是完整应用。打包器不会悄悄覆盖已存在的发行产物。

可选的 Windows **网页服务包**仍可附带 Windows x64 `node.exe` 与匹配的完整许可证。它不是 Electron 桌面包：

```powershell
npm run package -- --node-binary "C:\Program Files\nodejs\node.exe" --node-license licenses/Node.js-LICENSE.txt
```

仓库内的 Node.js 许可证对应 24.14.1；更换运行时版本时同时提供匹配的许可证。产物位于 `output/releases/`，包含 ZIP 和 `checksums.txt`。

服务器绑定 `127.0.0.1`，默认端口为 **8318**。在 PowerShell 中可这样更换端口：

```powershell
$env:PORT = '8319'
npm start
```

### 桌面检查

`npm install` 后，单独运行实际 Electron 流程；它不包含在快速 Node 单测中：

```sh
npm run test:desktop
```

默认通过项目锁定的 Electron 与 Playwright 启动源码应用。验证已打包 EXE 或另一个安装位置时：

```powershell
npm run test:desktop -- --executable "C:\QA\ZombieBuilders\ZombieBuilders.exe"
npm run test:desktop -- --executable "C:\QA\ZombieBuilders\ZombieBuilders.exe" --relocated-executable "C:\QA\Moved game\ZombieBuilders.exe"
```

两个位置都须包含**完整解压的应用**，不能只放 EXE。`--relocated-executable` 须与 `--executable` 一起使用，共用同一个隔离用户配置，检查移动安装位置后外置配置、预设与记录是否保留。

每次运行新建 **`output/playwright/desktop-qa-*/`**，保留专用 QA profile、截图、导出预设和 `report.json`，只关闭它自己启动的 Electron 实例，不读取、重置或删除玩家正常用户配置。`--output` 可指定严格位于本项目 `output/` 内的其他产物父目录；`npm run test:desktop -- --help` 仅显示参数，不启动窗口。

流程实际操作窗口缩放／全屏、画布点击、编辑器暂停／恢复、实时属性、一键刷怪、波次编辑／筛选、JSON 导出、重启及原版／自定义记录隔离。记录持久化检查使用明确标记的非零分数夹具，不冒充自然通关。通过该流程不表示所有战斗／动画组合、原生 Flash 一致性或干净机器／SmartScreen 均已验证；应查看报告的具体覆盖与 `notCovered`。

### 浏览器检查

浏览器检查是可选开发工具。安装项目锁定的依赖，确保已有 Microsoft Edge，并在另一个终端保持本地服务器运行：

```sh
npm install
npm run test:browser
npm run test:journey
```

脚本默认使用 `msedge` 通道与 **http://127.0.0.1:8318/**。使用其他已安装的浏览器通道或服务器地址时，可设置 `PLAYWRIGHT_CHANNEL` 或 `GAME_URL`。

## 本地进度

已完成关卡、解锁、预设与记录使用当前浏览器／桌面用户配置的本地存储，不在不同浏览器、用户配置或设备间共享。原版与自定义记录命名空间分开。所选规则和自定义关卡可在重启后保留，但会重新开始该关，不序列化当前战场：这不是战斗中途存档系统。换用户配置前可先导出预设。
