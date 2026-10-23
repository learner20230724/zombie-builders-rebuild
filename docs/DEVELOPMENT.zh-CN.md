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

`config/defaults/` 是独立的原版基准，不是用户修改数值的目录。界面中的**“回到原版模式”**重载该基准，不删除命名预设；**“恢复原版默认”**仅重置编辑器草稿。

单位、僵尸和建筑的 ID 为 **0–5**；单位与僵尸的 ID **5** 是各自的基地。技能 ID 为 **0–2**，关卡 ID 为 **1–4**。

### 生命数值与校验提示

`units[].health` 和 `zombies[].health` 接受整数 **1–2,147,483,647**。此前的 100,000,000 是配置保护，不是玩法规则；新版上限对应当前战斗数值使用的有符号 32 位整数边界。未替换相关整数运算前，不应直接移除这个边界。生命 `0` 表示死亡，不是无敌开关。

`$.units[5].health` 指向 JSON 的第六项，即己方基地；`$.zombies[5].health` 是敌方基地。报错保留可定位的 JSON 路径，同时提供中文字段上下文。每关非基地僵尸的 `health × truncate(zombieHealthMultiplier)` 也不得超过 **2,147,483,647**，敌方基地不乘该倍率。先校验再应用，非法草稿不会把本局修改一半。击杀高生命敌人时，累计 XP 达到同一 32 位上限后保顶，不绕回负数；之后使用技能仍正常扣除 XP。

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

运行时目标是**每秒 60 次基础更新**。每次更新推进 `bbgamespeed` 个战斗 tick；默认速度为 **2**，正常运行时约为**每秒 120 个战斗 tick**。速度按钮在 **1、2、3、4** 之间循环。

- `buildTicks`、`cooldownTicks` 统计战斗 tick。
- 更新速率稳定时，现实秒数约为 `ticks / (60 × bbgamespeed)`。
- 游戏内显示时间始终按 `battleTicks / 120` 换算，不因当前速度改变分母。
- 后台标签页限速和补帧上限可能影响现实时间。

波次 `delay` 使用前述独立调度方式，不适用战斗 tick 的换算公式。

## 运行结构与扩展入口

| 文件 | 职责 |
| --- | --- |
| `src/boot.js` | 加载素材与配置，启动游戏 |
| `src/game-config.js` | 校验 JSON，并适配到游戏数值表与行为 |
| `src/custom-rules.js` | 在生成代码之外校验和应用出怪、能力开关 |
| `src/customization.js` | 命名预设、明确的实时操作与自定义成绩隔离 |
| `src/settings-ui.js` / `.css` | 非模态并列设置、字段编辑、波次控制与沙盒按钮 |
| `src/generated-game.js` | 游戏状态、生产、战斗、界面与关卡逻辑 |
| `src/runtime.js` | Canvas 绘制、Web Audio、输入与浏览器存储 |
| `src/physics.js` | 物理集成 |
| `scripts/server.mjs` | 本地 HTTP 服务器与资源路由白名单 |
| `desktop/main.cjs` / `protocol.cjs` | 沙盒化桌面窗口、固定本地资源协议与用户配置 |

浏览器适配器通过 `GameConfig` 暴露；Node 工具可通过 `require` 加载同一模块。主要接口：

- `fromDocuments(documents)`：合并并校验五份 JSON 文档。
- `validate(config)`：校验合并后的配置，返回规范化副本。
- `compile(config)`：生成运行时数值表与技能参数。
- `install(target, config)`：在 `bb_Init()` 前调用，包装初始化函数，使配置在初始化后、`bb_Main()` 前重新应用。
- `apply(target, config)`：在 `bb_Init()` 后、`bb_Main()` 前直接应用。
- `getCurrent(target)`：返回最新完整配置的深拷贝，包括延期到下一局的数值。
- `updateLive(target, config, options)`：更新已初始化游戏，返回含变化 JSON 路径的 `{applied, deferred}`。传入完整配置，不是局部补丁。
- `getWaveProgress(target)`：读取当前／后续组、已调度／已出数量、已完成 ID 与可信组身份。
- `applyLiveWaves(target, config)`：按身份合并当前关尚未出场队列，返回 `{applied, deferred, notes, requiresNewBattle, reason, progress}`。

### 实时生效约定

`updateLive` 与只供启动阶段使用的 `install`、`apply` 分开：

```js
const next = GameConfig.getCurrent(globalThis);
next.zombies[3].health = 1500;
const result = GameConfig.updateLive(globalThis, next, {
  healthPolicy: 'ratio',       // 也可选 'new-only'
  preserveTimerProgress: true
});
```

- `ratio` 按各活体原剩余比例映射到新上限，四舍五入并保底 1 生命，含基地与已转化友军；不会复活死者。`new-only` 保留已有单位各自的真实上限，新生成单位使用新值。
- 移速更新保留方向、临时停步或减速。共用费用、伤害和命中几何在后续行为使用新值；飞行中的投射物保留发射时伤害。
- 正在训练、蓄力或冷却的计时器保留剩余进度，非整数剩余 tick 向上取整，至少 1 tick。已支付资源和人口不重新结算。
- 建筑 `maximum` 在本局更新，降低上限保留建筑及已付订单。单位 `people`／`dependency`、建筑 `dependency`、技能 `unlockAfterStage`、开局资源和增援定义仍延期到下次重置。底层 `updateLive` 也暂缓波次数组，但玩家使用的 `Customization.applyDraft` 会紧接着对当前关调用 `applyLiveWaves`，本局同步；其他关卡波次留待开始对应关时生效。菜单更新没有活动战局需要保留。
- 实时更新先完整校验、准备修改计划，再提交；不是任意修改生成代码内部字段的接口。

面向玩家的操作应通过 **`Customization`**，不要只调用底层适配器：前者负责模式切换、预设、成绩隔离及编辑器暂停。

### 非模态编辑

视口大于 **850 CSS 像素**时，设置在右侧占独立区域；**850 及以下**为游戏在上、设置在下。画布逻辑坐标仍为 800×600，实际显示区域随布局缩放。打开设置取得编辑器暂停令牌；**“继续战斗”**释放令牌但不关面板，**“暂停战斗”**重新取得令牌，不强制清除游戏自身的暂停。关闭时按编辑器暂停前的运行状态恢复，不补跑编辑期间的时间。

F2 全局开关面板，焦点在设置内时 Esc 关闭；表单输入与游戏控制分开。继续战斗、保存命名预设都不隐式应用，草稿必须明确提交。

### 预设、规则与沙盒

启动完成后可使用 `Customization` 控制器；`getDraft()` 返回 `{config, rules}`。主要方法：

| 方法 | 含义 |
| --- | --- |
| `savePreset(name, spec, id?)`、`loadPreset(id)`、`deletePreset(id)`、`listPresets()` | 管理本机命名预设；载入只返回草稿 |
| `exportPreset(spec, name)`、`importPreset(jsonText)` | 导出／校验版本化 JSON；导入不自动保存或应用 |
| `startCustomBattle(stage, spec)` | 保存会话选择、重载后开始第 1–4 关 |
| `validateDraft(spec)` | 不修改状态，完整校验并规范化配置与规则 |
| `applyDraft(spec, {healthPolicy})` | 推荐：先校验两份内容，再切换模式并一起应用 |
| `applyLive(config, {healthPolicy})` | 将活动原版局转为自定义，再应用支持的字段 |
| `applyRules(rules)` | 在自定义局应用行为开关 |
| `spawnZombie(type, count = 1)` | 自定义局立即生成类型 0–4 的僵尸；单次 1–20 只 |
| `clearFriendlyTroops()`、`clearEnemyTroops()` | 活动自定义局立即清除一方当前在场的非基地小兵；保留暂停与队列 |
| `applyUpcomingWaves(config)` | 兼容用波次接口：按本局进度安全同步当前关，不套用其他草稿属性 |
| `getBattleStatus()` | 读取运行／编辑／游戏暂停、建筑数量、角色数量和实际波次进度 |
| `restoreOriginal()` | 重载回原版，不删除预设 |
| `pauseForEditor()`、`resumeFromEditor(token)` | 安全暂停编辑器，关闭后不补跑暂停期间的战斗 |

完整玩家草稿应使用 `applyDraft`，不要把 `applyLive` 与 `applyRules` 串联：规则有误时，不应把正确的配置先应用一半。校验失败不改变模式、存储或当前配置。

清场方法可在运行或暂停时调用，不推进模拟。己方包含普通幸存者、愤怒暴民召唤兵与转化僵尸；选中对象生命设为 `0`、死亡模式设为 `15`，立即从交战链表移除，排除基地。返回 `{side, count, people, converted, zombies}`，仅为普通招募幸存者释放人口，每个对象只释放一次；重复清空同一阵营返回数量 `0`。不增加 XP、击杀、损失或现金，不制造死亡特效，不删除已有尸体、投射物或技能效果，不取消已付订单、改变计时或波次／增援队列。自动出怪须另行关闭。这是即时沙盒操作，不保存为预设开关。

### 本局波次合并

普通 `applyDraft` 就更新当前关波次，不再需要独立“替换／重播”按钮。返回值中的 `waveReport` 含 `{applied, deferred, notes, requiresNewBattle, reason, progress, stage, otherStages}`；应用不会重开战局，也不等待清场。

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

| 数值规则 | 允许范围 | 实时行为 |
| --- | --- | --- |
| `economy.salvagePayout` | 整数 0–1,000,000 | 后续收入发放使用新值，不改已有现金 |
| `economy.salvageIntervalTicks` | 整数 1–1,000,000 | 当前计币池按比例映射，向下取整 |
| `economy.populationPerTrailer` | 整数 1–1,000 | 立即更新人口上限，不移除已超上限单位 |
| `abilities.harvesterDamagePerTick` | 整数 0–100,000,000 | 下个 tick 生效，含已有收割机；每目标伤害，不是 DPS |
| `abilities.harvesterRange` | 整数 0–3,200 | 下个 tick 生效；沿原前沿边界计算 `0 <= 距离 < 范围`，不攻击基地 |

手动生成有意绕过自动出怪筛选，不改变自动波次及顺序。`CustomRules.ENTITY_LIMIT` 为战场合计 **1,000** 个交战单位，含基地、我方、敌方与转化友军，不含投射物、技能特效和粒子。已付费训练订单在满员时保留为剩余 1 tick，等待空位，保留已付资金与预留人口，不吞订单、不重复扣款；愤怒暴民超额召兵截断，已释放技能不退款。`automaticSpawning: false` 冻结队列调度和数量，不停止战斗；关闭增援生成期间跨过的基地生命阈值会被消费，重新开启不补发。类型开关筛选队列出怪，`corpseSpawnOnImpact` 单独控制尸弹落地额外生成的普通僵尸。

`ghoulLongLeap: false` 关闭食尸鬼远距长跃，保留近距离跳咬；半空关闭时，下个战斗 tick 将该次长跃还原到地面高度并继续行走。其他三个能力布尔开关关闭对应命中／转化／投射物，不取消动作耗时，也不替换成别的攻击。本版没有数值化调整攻击频率、通用攻击距离、长跃距离／速度、肥胖范围半径、牧师转化预算／距离或空袭炸弹伤害／半径。新增实体与机制仍需代码实现。

较早的版本 1 预设若省略后来新增的经济、收割机与食尸鬼长跃字段，会补齐默认值；未知字段和原有必填字段仍被严格校验，不接受任意 JSON。

持久化键不随发行版本号变化：`zombie-builders-presets-v1` 保存至多 25 套预设、全库 2 MiB；`zombie-builders-session-v1` 保存已选规则；`zombie-trailer-park-0.33` 是原版记录；`zombie-builders-custom-v1` 是自定义记录。预设 JSON 导入／导出上限 2 MiB。保存预设不改写五份外置 JSON，原版与自定义记录也不合并。

用户存储不可用或已满时，普通实时修改可带警告在本窗口内存继续使用，不承诺重启后保留。需要重载的“开始自定义战局”“回到原版模式”必须先成功保存会话，否则明确报错并保留当前局，不能重载后丢失规则。

手写的配置行为放在 `src/game-config.js` 中。重新生成 `src/generated-game.js` 不会覆盖 `config/`。`data/raw.json` 是检查使用的基准数据，不是面向使用者的数值配置入口。新增实体类型或机制还需要修改游戏行为、动画与界面代码。

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
