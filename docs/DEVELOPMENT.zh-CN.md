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

单位、僵尸和建筑的 ID 为 **0–5**；单位与僵尸的 ID **5** 是各自的基地。技能 ID 为 **0–2**，关卡 ID 为 **1–4**。

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

`maximum` 是该建筑的数量上限。`dependency: 0` 表示无前置，其他值指向所需建筑的 ID。收入和人口规则由游戏逻辑实现，修改说明文字不会改变规则。

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

技能消耗 `xp`，不是现金。`unlockAfterStage: 0` 表示一开始即可使用；`1`–`4` 需要本地保存的对应关卡通关记录。每种技能有各自的 `effect` 字段。

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
    { "type": 1, "count": 5, "delay": 3 },
    { "type": 0, "count": 1, "delay": 4 },
    { "type": 2, "count": 2, "delay": 3 }
  ]
}
```

波次的 `type: 0` 表示等待条目，**1–5** 分别对应僵尸 ID **0–4**。`count` 设置该条目的数量。`delay` 是波次调度参数，不是战斗 tick，也不是精确的现实秒数；游戏在调度前会将其截断为整数，调整时建议使用整数。

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
| `src/generated-game.js` | 游戏状态、生产、战斗、界面与关卡逻辑 |
| `src/runtime.js` | Canvas 绘制、Web Audio、输入与浏览器存储 |
| `src/physics.js` | 物理集成 |
| `scripts/server.mjs` | 本地 HTTP 服务器与资源路由白名单 |

浏览器适配器通过 `GameConfig` 暴露；Node 工具可通过 `require` 加载同一模块。主要接口：

- `fromDocuments(documents)`：合并并校验五份 JSON 文档。
- `validate(config)`：校验合并后的配置，返回规范化副本。
- `compile(config)`：生成运行时数值表与技能参数。
- `install(target, config)`：在 `bb_Init()` 前调用，包装初始化函数，使配置在初始化后、`bb_Main()` 前重新应用。
- `apply(target, config)`：在 `bb_Init()` 后、`bb_Main()` 前直接应用。

手写的配置行为放在 `src/game-config.js` 中。重新生成 `src/generated-game.js` 不会覆盖 `config/`。`data/raw.json` 是检查使用的基准数据，不是面向使用者的数值配置入口。新增实体类型或机制还需要修改游戏行为、动画与界面代码。

## 检查与打包

```sh
npm run config:check
npm run build
npm test
npm run package
```

`build` 检查发布文件，不重新生成游戏代码。`npm run package` 默认生成网页便携包。制作内置 Node.js 的 Windows 包时，提供 Windows x64 的 `node.exe` 与该版本的完整许可证：

```powershell
npm run package -- --node-binary "C:\Program Files\nodejs\node.exe" --node-license licenses/Node.js-LICENSE.txt
```

仓库内的 Node.js 许可证对应 24.14.1；更换运行时版本时同时提供匹配的许可证。产物位于 `output/releases/`，包含 ZIP 和 `checksums.txt`。

服务器绑定 `127.0.0.1`，默认端口为 **8318**。在 PowerShell 中可这样更换端口：

```powershell
$env:PORT = '8319'
npm start
```

### 浏览器检查

浏览器检查是可选开发工具。安装 Playwright，确保已有 Microsoft Edge，并在另一个终端保持本地服务器运行：

```sh
npm install --no-save playwright
npm run test:browser
npm run test:journey
```

脚本默认使用 `msedge` 通道与 **http://127.0.0.1:8318/**。使用其他已安装的浏览器通道或服务器地址时，可设置 `PLAYWRIGHT_CHANNEL` 或 `GAME_URL`。

## 本地进度

已完成关卡、解锁进度和记录保存在当前浏览器的本地存储中，不会在不同浏览器或设备间共享。这是通关进度保存，不是战斗中途存档。




