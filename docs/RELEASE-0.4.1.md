# v0.4.1 verification / 验收记录

状态：**实现、自动回归、构建、网页及最终 Electron／EXE 验收通过；桌面快捷方式已更新，待完成仓库同步及 Release 发布。**

## Scope / 本次范围

| 功能 | 验收要求 | 结果 |
| --- | --- | --- |
| 双方清场 | 单按钮事务式清双方，保留基地、订单、后续波次和手动任务，不发奖励；单方／分类／双方清场都播放原生死亡动画 | 自动回归及最终 EXE 通过 |
| 并列出兵 | 己方／敌方表单并列常驻，独立保持类型、数量、速率；十种单位任一阵营生成，十个即时图标与并发队列均可用 | 自动回归及最终 EXE 通过 |
| 双方技能 | 两方各三个原生图标，免费立即释放；真实收割机／空袭按阵营攻击，正常 XP、锁定、蓄力和冷却保持 | 自动回归及最终 EXE 通过 |
| 一键解锁 | 关卡编辑右侧即时解锁建筑／兵种前置、技能及原菜单四关，不赠建筑／资源、不伪造任一成绩 | 自动回归及最终 EXE 通过 |
| 文档 | 中英 README、配置和开发接口说明同步，原版默认数值表不改 | 已更新 |

## Acceptance / 验收结果

以下为 **2026-10-25** 本版本实际记录，不使用旧版结果代替本次验收。

- **完整自动回归 477/477 通过**，失败／取消／跳过均为 0；另有 56 组恢复数据、7,200 模拟帧、215 项经济断言、83 项战斗用例通过。证据：`output/test-v041-release.log`。
- **构建通过**：105 项素材哈希、五份配置、独立默认基准及源码解析通过。证据：`output/build-v041-release.log`。
- **独立只读复核通过**：267/267 相关回归；四关共 9,600 个完整默认更新／绘制帧、160 个采样点与旧版无差异；另有 UI／菜单 101/101 检查。证据：`output/review-v041-final.log`、`output/review-v041-native-parity.json`、`output/review-unlock-ui-v041.log`，冻结哈希记录 `output/review-v041-freeze-before.json`／`after.json`。默认路径一致性检查不是自然通关或所有自定义组合的穷举。
- **网页 smoke 与 19/19 journey 通过**。真实 UI 双表单、双方清场／原生死亡视觉、六技能图标及一键解锁通过；页面异常、坏响应和远程请求均为空。证据：`output/browser-v041.log`、`output/journey-v041.log`、`output/playwright/journey/evidence.json`。
- **源码 Electron 39/39、最终发行 EXE 41/41 通过**：`output/playwright/desktop-qa-EXrO7h/report.json`、`output/playwright/desktop-qa-fUIqNy/report.json`。两份报告页面／控制台／请求错误及截图警告全部为空，保留真实原生窗口截图。EXE 还覆盖单实例和完整 408 文件 ZIP 解压至中文含空格目录、整体搬移后启动与存档复用，未把源码浏览器验收冒充 EXE 验收。
- **新增深验收**：己方 `unit-2 / 3 / 2` 与敌方 `zombie-3 / 4 / 0.1` 的种类／数量／速率分别保持，两任务并发；双方清场保留 16 个待出请求及一个已付订单，原生死亡动画恢复后自行回收，二十种阵营／物种分类清场均不伤基地、不发奖励；零 XP、正常冷却 9,996 tick 时六个免费图标全部成功，原技能状态不变；敌方收割机按每 tick 17 对己方两类单位造成实际伤害，敌方空袭真实投弹自然落地造成 500 伤害而不伤同阵营见证者；从原版战局点击解锁后，真实原菜单点击启动第 4 关，原版／自定义两套分数存储字节不变且第 3 关通关成绩仍为 0。见上述两份报告四个新增检查详情。
- **视觉检查**：根代理已目视源码原生 `10d-parallel-camp-spawn-panels.png`、`13b-dual-camp-power-icons.png`、`10e-both-armies-cleared.png`；验收代理另已目视实际打包 EXE 的同款并列出兵及双方技能图，确认双列字段和六图标清晰、无相互遮挡。根代理记录：`output/releases/v0.4.1/visual-verification.json`。
- **隔离与清理**：只使用自建 QA profile；原生缩放／全屏检查后，自有测试窗口透明且忽略鼠标，保留真实焦点元数据，不伪造窗口行为。三个精确 QA profile 标识的只读残留检查为空，源码／EXE／浏览器脚本正常退出；自有 8341 服务经其 exec handle 发送 Ctrl+C 停止。未关闭用户游戏或修改用户存档。证据：`output/acceptance-v041-process-cleanup.json`。未声称逐一核准所有系统 PID。
- **包校验通过**：两份完整 ZIP 的 CRC、335／336 份源文件哈希、许可证和文件集合核对通过；桌面包 Electron 许可证与缓存官方 Electron 45.0.0 ZIP 字节一致。证据：`output/releases/v0.4.1/verification.json`、`output/verify-v041.py`。原生成逻辑 `src/generated-game.js` SHA-256 仍为 `9ac747685871fa237dacb9a469cb78dbf7b635f21c3c593aa033da3d4cc5239b`。

| 本地发行包 | 字节 | 文件数 | 匹配源文件 | CRC | SHA-256 |
| --- | ---: | ---: | ---: | --- | --- |
| `zombie-builders-desktop-win-x64-v0.4.1.zip` | 204,894,547 | 408 | 335 | PASS | `4ab740ff01899dbb1a9bb9b13d4956c11e7a5ace32199c17e785460a5b093f80` |
| `zombie-builders-web-v0.4.1.zip` | 43,472,068 | 337 | 336 | PASS | `fac4c43e17668ba0d458d280ed44b15fda3dda4c2b09f8f9f627a1a48ee0f44c` |

## Delivery / 交付

本地最终程序：`output/desktop-v0.4.1/ZombieBuilders.exe`（ProductVersion 0.4.1）。现有桌面“建筑工大战僵尸”快捷方式已从 v0.4.0 更新到该 EXE，并复核目标和 ProductVersion 0.4.1；未启动或关闭用户游戏。Release 与公开资产验证待补充，尚不宣称公开发布。本文档不在发行运行文件集合内，补充交付记录不改变已验收程序。

## Coverage / 覆盖口径

脚本明确标记了非零存档夹具、暂停时直接 API 建场和仅调整位置的技能交战夹具；伤害、投弹／飞行／落地和动画回收均走实际运行时。没有宣称自然通关四关、穷尽所有动画组合、原生 Flash 等价、干净机器或 SmartScreen 验证。

English: v0.4.1 adds atomic both-army clearing with native death animations, persistent parallel camp spawn panels, six immediate camp-specific power icons, and score-isolated unlock-all including the original four-stage menu. Passed: 477 automated tests, build/105 asset hashes, browser smoke/19-step journey, source Electron 39/39, packaged EXE 41/41 including ZIP relocation, and complete local archive CRC/source/license verification. Independent review also passed 267 targeted tests and default-path parity over 9,600 full update/render frames. Both native reports retain genuine screenshots with no capture warnings or runtime/request errors. Isolated QA profiles show no residual processes; the owned local server was stopped. The existing desktop shortcut now targets the verified v0.4.1 EXE. Public publication remains pending final confirmation below.
