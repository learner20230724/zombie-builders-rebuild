# v0.4.4 — 一万在场容量 / 10,000 live-entity capacity

状态：**源码已同步，桌面快捷方式已更新，v0.4.4 已公开发布并匿名验证为 latest。验收范围区分源码完整套件与实际 EXE 容量专项，见下文。**

## Scope / 更新范围

- 双方共享的战场在场实体上限由 **1,000** 提高到 **10,000**，包含双方基地和转化单位；通常两个基地占两位，可容纳 **9,998** 个小兵。
- 即时出兵接口、出兵队列和其他角色生成路径统一使用新容量。满员后仍保留待生成请求，出现空位后继续出兵。
- 队列显示的占用与上限同步为 `N / 10000（含基地）`。单批请求数量、独立出兵速率和每 tick 分发预算不是同一限制，不因此改动。
- 不修改兵种默认属性、伤害规则、死亡动画或基地装饰碎片预算。
- 空袭飞机的独立效果容量仍为 1,000，每 tick 分发预算仍为 32，基地装饰碎片仍为每侧 256；这些不是在场小兵容量。

Both camps share a **10,000 active-entity capacity including bases**, normally leaving **9,998 troop slots**. Immediate spawning and queued generation use the same boundary; pending requests wait rather than disappear when capacity is full. Raising capacity does not promise smooth simultaneous combat with 10,000 actors.

## Verification and delivery / 验收与交付

- 完整自动回归 **535/535** 通过；另有 56 组恢复数据、7,200 模拟帧、215 项经济断言及 83 项战斗用例。
- 构建验证通过：105 项素材哈希、五份配置和独立默认基准；两份 README 的默认参数区及五份数值 JSON 与 v0.4.3 保持一致。
- 源码 Electron **43/43** 通过：`output/playwright/v044-native/desktop-qa-KRVXGl/report.json`，48 张原生截图，页面／控制台／资源／外部请求及截图警告均为空。实际 `ztp://` 读取的八份源码字节哈希匹配冻结文件。
- 真实暂停 API 生成 9,998 个小兵加两基地，队列显示占用 `10000 / 10000（含基地）`，5 个待生成请求保留；清兵后 3 个活动请求完成、2 个零速率请求仍等待。1,001 个技能召唤可以越过旧容量完整生成，取消技能仍覆盖真实活动对象和待分发请求。
- 上述大容量用例用于功能边界，不是帧率测试；没有将一万个单位两军对战描述为流畅运行。

窗口验收前两轮未观察到有效恢复后的客户区，失败报告保留在 `output/playwright/v044-native/desktop-qa-gskvzv/` 与 `desktop-qa-OyvSDJ/`。独立自有窗口探针证明 restore／showInactive 后可正常缩放，随后仅改进 QA 的恢复／等待前置；所有实际最大化增大、4:3、800×600 坐标与 F11 断言保留，第三轮完整通过。没有更改产品窗口代码或用户显示设置。

最终 EXE 的完整窗口套件在恢复客户区前置检查处仍失败，报告保留：`output/playwright/v044-native/desktop-qa-Wd8LMS/report.json`。未跳过或降低其断言，也不宣称该轮 45 项通过。

另用可复现的 `scripts/test-capacity-desktop.cjs` 对**实际 canonical EXE 与完整 ZIP 搬移副本**做本次容量范围的 **8/8** 专项验收，最终报告为 `output/playwright/v044-targeted/desktop-qa-nzkh5T/report.json`。包括实际 ztp／隔离档案／八份运行源码哈希、各路径容量一致、真实 10,000 满员与队列恢复、基地高伤害逻辑保持、实际剩余空间不足时原子拒绝、保存规则及命名预设、搬移后重启保留和无运行错误。专项验收不覆盖 OS 缩放、F11 或第二实例焦点，不代替完整窗口套件。

完整 ZIP CRC、410 文件与 canonical 安装逐文件核对、中文含空格目录整体搬移通过，见 `output/v044-package-relocation.json`。本地发行文件与 337／338 份运行源码哈希及官方 Electron 许可证核对通过，见 `output/releases/v0.4.4/verification.json`。

| 产物 | 字节 | SHA-256 |
| --- | ---: | --- |
| `zombie-builders-desktop-win-x64-v0.4.4.zip` | 204,911,477 | `7795344c097bf8e0fd677aef30716606c6adc511599433f875dd74fa8ae8a818` |
| `zombie-builders-web-v0.4.4.zip` | 43,488,943 | `7f03d1132d184783018ad2cc0de2842389caa24e2174a71ef132326f59ee0f72` |

本地程序：`output/desktop-v0.4.4/ZombieBuilders.exe`。既有桌面快捷方式已指向此 ProductVersion 为 `0.4.4` 的程序；没有关闭玩家旧窗口或修改玩家存档。关闭旧窗口再重新启动即可使用新容量。

完整浏览器启动 smoke 与 **20/20 journey** 通过，错误／失败资源／外部请求均为空；新证据在 `output/playwright/v044-browser-final/`，前版证据另行保留。`output/acceptance-v044-process-cleanup.json` 确认七个精确自有 QA profile 无残留，自有应用、浏览器与 loopback 服务均已关闭；未操作玩家正在运行的游戏。

下载入口：[v0.4.4 Release](https://github.com/learner20230724/zombie-builders-rebuild/releases/tag/v0.4.4)。使用桌面 ZIP 时完整解压，再运行 `ZombieBuilders.exe`，不要仅复制 EXE。

版本标签对应 `8ebff75`。三个公开资产的字节数及 GitHub 服务端 SHA-256 与本地一致，公开校验清单完整下载后逐字节相同；未再次全量下载大型公开 ZIP，其本地完整 CRC／源码哈希及完整 ZIP 搬移测试另已完成。公开交付证据：`output/releases/v0.4.4/published.json`、`public-download-verification.json`。本记录不在运行包集合中，补记不改变已冻结程序或标签。

English: Full regression 535/535 and source Electron 43/43 passed. The packaged full window suite encountered unstable native client-area restoration before its resize assertion, so no full 45-check pass is claimed. A separate actual-EXE capacity/restart/full-ZIP-relocation suite passed 8/8 with real 9,998 troops plus two bases, retained queues and recovery, unchanged independent visual budgets, atomic capacity rejection, persisted rules, and matching runtime hashes. No 10,000-actor FPS guarantee is made.
