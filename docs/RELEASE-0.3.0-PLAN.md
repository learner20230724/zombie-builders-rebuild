# v0.3.0 release plan / 发布验收计划

Status / 状态：**源码回归、实际 EXE 桌面检查及本地 ZIP 验收已通过；公开发布／下载核验待完成。** 下表区分已实测范围与待执行范围，不能把单项通过解释为全部通过。

## Product scope / 交付范围

| Area / 范围 | Acceptance / 验收标准 | Status / 状态 |
| --- | --- | --- |
| Windows desktop / 桌面版 | 解压后双击 `ZombieBuilders.exe` 出现独立游戏窗口；内置 Electron；无需安装 Node.js、不另开浏览器、不依赖 HTTP 端口 | 实际 EXE 及 ZIP 验收通过 |
| Display / 显示 | 仅游戏与设置入口；窗口缩放、最大化、F11 全屏保持比例且点击坐标正确 | 源码与实际 EXE 实测通过 |
| Settings / 设置 | F2 与可见按钮打开设置；可以查看、修改单位、僵尸、建筑、技能及关卡已有配置字段 | 源码／实际 EXE 关键交互与自动回归通过 |
| Rule presets / 规则预设 | 保存预设与“应用到本局”分开；导入、导出、重启恢复及恢复原版不会意外覆盖用户预设 | 实际 EXE 中文预设导出／重启及自动回归通过 |
| Live changes / 本局生效 | 生效范围清晰；已有单位生命按比例更新或仅新单位生效；输入错误不得部分应用 | 实际 EXE 属性／无效输入及自动回归通过 |
| Waves / 出怪编辑 | 可编辑有限队列的启停、顺序、类型、数量与 delay；不默认增加无限波或“清完再出下一波”规则 | 实际 EXE 队列／筛选／空队列及自动回归通过 |
| Sandbox / 沙盒 | “肥胖僵尸”按钮点一次立即生成一只；其他可生成类型及手动操作不污染原版成绩 | 实际 EXE 肥胖按钮与自动回归通过 |
| Persistence / 数据持久化 | 桌面用户目录 `%APPDATA%\ZombieBuilders`；首次复制可编辑配置且不覆盖已有配置；F1 显示数据位置并可打开配置目录 | 包内隔离 profile 重启／外置 JSON／中文空格迁移／F1 位置显示通过；未实点 Explorer |
| Separation / 隔离 | 原版与自定义进度、成绩分开；旧网页存档不宣称会自动迁入桌面 | 实际 EXE 非零分数夹具隔离通过；非自然通关 |
| Distribution / 分发 | 源码、桌面 ZIP、网页包与校验值一致；压缩包带 Electron 及所含组件要求的完整许可 | 本地 CRC／字节／许可证通过；公开下载核验待执行 |

## Application rules / 生效规则

- **预设不是当前战局**：保存规则只保存规则；应用当前战局是单独、明确的操作。起始资源、正在运行的队列和现有实体不能悄悄重置。
- **已有单位生命**：默认按旧生命比例映射到新上限，另提供“仅新生成单位”选项；准确取整及基地处理以实现和测试为准。
- **出怪队列**：默认是有限时间调度队列，不会等待场上清空。四关尾段均为“20 肥胖 → 100 普通 → 3 投尸者 → 20 快速 → 50 肥胖”；固定队列结束后，基地生命触发的增援与尸弹产生的普通僵尸仍可出现。
- **替换后续队列**：保留当前队首组，其后整个队列（含未出场增援）按草稿重建；不影响已出场敌人，不重置已触发阈值历史。
- **数量保护**：角色合计上限 1,000，含双方基地、转化友军，不含粒子或投射物。满员训练保留订单与人口等待空位，召兵技能超额截断。
- **恢复原版**：恢复当前规则来源，不删除用户保存的预设；采用自定义或沙盒操作的战局保持自定义标记。
- **配置安全**：所有输入先完整校验再应用；保留固定实体 ID 与已有机制边界，不把任意新增角色类型伪装为纯数值配置。

## Test matrix / 测试矩阵

| Layer / 层次 | Required checks / 必测项目 | Status / 状态 |
| --- | --- | --- |
| Validation / 校验 | 完整默认配置；边界值、负数、NaN、溢出、错误 ID、错误 JSON；失败无半应用 | 源码／实际 EXE 原子失败与 Node 全量通过 |
| Runtime / 运行逻辑 | 近战、投射物、移速、训练/冷却、关卡倍率；比例生命与仅新单位；默认规则回归 | 源码／实际 EXE 核心属性与 Node 全量通过 |
| Queue / 队列 | 启停、重排、零数量、等待条目、多个阈值、队列结束、手动生成数量与类型 | 源码／实际 EXE 主要流程与 Node 全量通过 |
| Presets / 预设 | 保存/读取/删除/导入/导出；重启保持；恢复默认；损坏数据与磁盘错误 | 实际 EXE 中文导出／恢复与 Node 全量通过 |
| Records / 记录 | 原版／自定义命名空间、战中改规则、沙盒生成、返回主菜单、重启后的隔离 | 实际 EXE 非零分数夹具通过；未自然通关 |
| UI / 界面 | 键鼠、表单焦点、滚动、大量波次、小窗口、最大化、全屏、暂停与关闭恢复 | 源码 15 项、实际 EXE 18 项通过；非穷尽组合 |
| Desktop / 桌面 | 首次启动、第二次启动、正常退出；用户数据路径；协议边界、安装迁移 | 实际 EXE 初启／重启／单实例／中文空格安装迁移通过 |
| Browser / 浏览器 | 网页完整启动与基础实际玩法；较长旅程单独执行 | smoke 与 journey 13 项检查通过 |
| Release / 发布包 | ZIP 完整性、解压 EXE 启动、离线运行、素材无缺失、许可、SHA-256、发布后下载核验 | 本地 ZIP／EXE 验收通过；公开发布／下载待执行 |

## Release gate / 发布门槛

1. 需求、运行逻辑和桌面安全边界分别复核，解决阻断缺陷。
2. 运行配置检查、完整自动测试与实际桌面 UI 流程，记录真实结果与尚未覆盖的限制。
3. 从验收过的提交构建，校验实际压缩包，最后同步仓库并发布同版本 Release。

## Interim verification / 阶段性实测

- **2026-10-23：Electron 初启 smoke 通过**。使用此前不存在的隔离 QA profile；确认 `ztp://game/`、`gameReady`、无运行错误／404，渲染层 `require`／`process` 不可用，F2 设置对话框截图完成。
- **2026-10-23：源码 Electron 正式桌面检查 15/15 通过**。证据：`output/playwright/desktop-qa-jVX1a0/report.json`，`sourceMode: true`。覆盖真实缩放／全屏、画布点击招募、暂停、实时属性、肥胖按钮、自动出怪启停、无效输入原子性、波次表、导出、空队列、类型筛选、重启持久化与回原版；无运行／CSP／请求错误或 HTTP 依赖。
- **2026-10-23：实际解压 EXE 桌面检查 18/18 通过**。证据：`output/playwright/desktop-qa-gcLmJj/report.json`，`sourceMode: false`。在前述流程基础上，还验证 F1 中文配置路径、中文命名预设的真实导出、第二实例自然以 exit 0 退出且仅保留一个窗口、中文和空格目录迁移后的配置／预设／成绩保留。`pageErrors`、`consoleErrors`、`badResponses`、`failedRequests`、`remoteRequests` 均为 0。
- 记录隔离使用明确标记的分数夹具，不等于自然通关。未验证干净机器／安装器、未签名 EXE 的 SmartScreen 信誉、原生 Flash 视听完全一致性或所有战斗动画组合。
- 全量 Node 首轮 **159/160**，暴露 Windows 发行打包瞬时 `EPERM` rename；已加有限重试，并通过重试及目标防覆盖回归。最终发布前完整 **`npm test` 通过：166/166 Node 测试、56 组原始数据、7,200 模拟帧、215 项经济断言、83 个战斗用例**。证据：`output/test-v030-release.log`；新增测试覆盖真实打包器元数据配置。
- 首次实际 Electron 构建发现打包器要求公司元数据；已显式设置项目 `CompanyName` 并重建，不更改原游戏作者或权利归属。
- **`npm run build` 通过**：105 项素材哈希、五份配置及原版基准检查。最终证据：`output/build-v030-release.log`。
- **网页 smoke 与 journey 均通过**：smoke 验证完整启动和基础实际玩法，无运行错误、错误响应或 HTTP 远程依赖；journey 完成 13 项检查。证据：`output/browser-v030.log`、`output/journey-v030.log`、`output/playwright/journey/evidence.json`。

## Local release artifacts / 本地发行产物

已独立检查两份 ZIP 的 CRC、文件集合及源码逐字节哈希；桌面运行库与 Electron 45.0.0 对应，`LICENSE`／`LICENSES.chromium.html` 完整保留。证据：`output/releases/v0.3.0/verification.json`。

| Archive / 压缩包 | Bytes / 字节 | Files / 文件数 | Source files matched / 源码匹配数 | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| `zombie-builders-desktop-win-x64-v0.3.0.zip` | 204,827,284 | 404 | 331 | `427cbf8121b9100e31ec2b828a9f98f38e78bee2980a11b250aa46190e903943` |
| `zombie-builders-web-v0.3.0.zip` | 43,405,094 | 333 | 332 | `2ca92bce148fd7c18acdea71d66f8f1836955ecea91e542772e6049c588fd531` |

**公开发布及发布后的下载核验尚待执行**；本地压缩包通过不代表远程资产已上传或下载成功。

English summary: v0.3.0 provides an unpack-and-run Windows desktop app, editable presets, explicit live application, finite-wave editing, and one-click spawning. The 166-test Node regression, 18-check packaged-EXE workflow (including relocation), browser smoke/13-check journey, and local archive checks passed. Public release/download verification remains pending. Score isolation uses labeled fixtures, not a natural-win claim; clean-machine/SmartScreen and exhaustive combat combinations are not covered.
