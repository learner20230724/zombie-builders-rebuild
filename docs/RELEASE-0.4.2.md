# v0.4.2 verification / 验收记录

状态：**实现、完整自动回归、构建、浏览器及源码／最终发行 EXE（含完整 ZIP 搬移）验收通过；桌面快捷方式已更新，已同步仓库并公开发布 v0.4.2。**

## Scope / 本次范围

| 功能 | 验收要求 | 状态 |
| --- | --- | --- |
| 死亡朝向 | 按死亡瞬间当前阵营镜像原生死亡动画／碎块；涵盖伤害死亡、单方／双方／分类清场及转化单位，原阵营画面保持 | 自动回归、源码及最终 EXE 通过 |
| 密集战斗性能 | 减少跨阵营索敌的重复分配、无命中帧排序与全列表成员扫描；不改目标优先级、伤害池、攻击频率或随机序列 | 真实浏览器 ABBA、独立等价性检查通过；不承诺全组合恒定 FPS |
| 自定义开局调度 | 真实 F2 开局／保存会话重载补回正常片头到游戏的 60 Hz 切换，不强改游戏倍速或减少游戏 tick | 实际 UI 前后验证与自动回归通过；源码 120 帧／240 tick 验收通过 |
| 文档 | 中英文介绍和运行时接口同步，默认数值表不改，调度频率不混同实际 FPS | 已复核并冻结 |

## Performance / 性能记录

证据：`output/performance-v042-summary.json`，并保留其中列出的 A1／B1／B2／A2 原始报告与源码哈希。实际 Microsoft Edge Chromium + Canvas 2D；基线取冻结 `v0.4.1`，不切换工作区。顺序为 A1 全矩阵 → B1 全矩阵 → B2 的 400 单位重复 → A2 的反序重复。主 ABBA 期间无已知其他代理压力测试并发。

每行保持全部单位、相同类型／阵营与合成摆位条件：双方均分，生命 1,000,000；原阵营行进／五类混编、跨阵营四种人类、密集静止交火分别记录，自动波次、增援和转换在压力夹具中关闭以保持数量。20 个完整热身帧后测量 60 个完整更新＋绘制帧，**每段确实执行 120 个游戏 tick 和 60 次完整绘制**，每五帧让出事件循环供设置轮询，最终计时不启用 CPU sampling。不是空绘制，也没有减兵、少算伤害或降低攻击频率。

下表为**完整帧 CPU 平均耗时（毫秒）**，不是实时 RAF FPS 或 GPU 完成时延；`/` 为两次独立对照，不能当成合并中位数。

| 场景 | 优化前 → 优化后（ms／完整帧） | 对应耗时比 |
| --- | --- | --- |
| 400 原阵营行进 | 2.54 → 2.22 / 1.95 → 1.83 | 1.15× / 1.07× |
| 400 原阵营混编 | 3.56 → 2.96 / 2.47 → 2.49 | 1.20× / 0.99× |
| 400 跨阵营人类，设置关闭 | 19.50 → 5.21 / 16.06 → 5.22 | 3.74× / 3.07× |
| 400 跨阵营人类，F2 打开 | 18.95 → 5.24 / 15.13 → 5.48 | 3.62× / 2.76× |
| 400 密集跨阵营 | 14.59 → 3.44 / 14.80 → 4.17 | 4.24× / 3.55× |
| 800 跨阵营人类 | 64.10 → 17.69 | 3.62× |

400 跨阵营、关闭设置的两次对照约减少到原耗时的 1/3.1–1/3.7；原阵营路径没有相同量级收益，混编重复中也有接近持平的结果。800 跨阵营的优化后 p95 仍达 37.6 ms，不能据此承诺全部单位组合、设备或实时负载恒定 60 FPS。

CPU profile 将主要额外负担定位于 `Factions.humanUpdate` 的对手快照、`map/filter/sort` 临时对象与列表分配；原 `bbGameTick` 仍有两军成对遍历成本。Node VM 中的全局 `__as3_is` 代理成本并非真实浏览器主要热点，本版没有为该合成指标增加全局 fastcast。早期诊断 profile 和第一次计时夹具曾保留 30 Hz 片头调度（每帧四 tick），仅用于定性定位，不混入上表正常 60 Hz 的最终结果。

独立浏览器启动的整数毫秒累加相位可令热身开始差至多两 tick，密集场景的随机／绘制细节因此不宣称逐帧相同；每个采样段仍是同样 120 tick／60 绘制、全部单位保留。伤害／目标顺序／RNG 等精确语义另由同步双引擎逐帧检查验证。

B1／B2 保留其启动调度修复前的原始源码哈希，不冒充最终发行字节；该压力夹具已统一 60 Hz，用于隔离索敌优化。最终 `fa1f9632…` 版本另有 B3 实际保存会话 API 重载验证：产品在任何夹具强设率前已经是 60 Hz，60 帧推进 120 tick。B3 与另一空阵营片头／开局观察探针可能短暂并发，只作为最终候选／调度复核，不混入主 ABBA 比率。

### 实际启动缺陷与修复

这不是只有测试跳片头的问题：真实完整片头后菜单为 60 Hz，但旧的真实 F2“开始自定义战局”重载路径在 `EndMovie()` 后直接 `bbPlayGame()`，绕过原 `30 → 60` 切换，自定义局仍是 30 Hz。修复按原流程先结束片头，再调用原 `SetUpdateRate(60)`，随后开局。游戏原倍速 2、每游戏秒 120 tick 不变；只恢复正常两 tick／渲染帧的调度，不把它描述成伤害公式变化或恒定 60 FPS。

实际 UI 证据：`output/custom-start-rate-v042-before-fix.json`（菜单 60 → 自定义 30）与 `output/custom-start-rate-v042-after-fix.json`（菜单 60 → 自定义 60）；两次都真实播放片头并点击 F2 开局，没有在 QA 中强制设率或跳片头。

## Acceptance / 验收结果

- **完整自动回归 497/497 通过**，失败／取消／跳过均为 0；另有 56 组恢复数据、7,200 模拟帧、215 项经济断言、83 项战斗用例。证据：`output/test-v042-release.log`。
- **构建通过**：105 项素材哈希、五份配置、独立默认基准与源码解析。证据：`output/build-v042-release.log`。
- **独立只读复核通过**：143/143 相关测试；1,560 个同步完整更新／绘制帧（原四关 1,200 帧＋400 跨阵营三场景 360 帧）对照的单位、效果、伤害、奖励、RNG 与 mock 绘图流符合原逻辑。死亡方向改动另有同帧全部 20 种阵营／物种、75 个视觉效果的方向与生命周期检查。证据：`output/review-v042-summary.json`、`output/review-v042-parity.json`、`output/review-v042-final.log`、`output/review-death-simultaneous-v042.json`。这些不是自然通关四关或原生 Flash 逐像素等价证明。
- **网页 smoke 与 20/20 journey 通过**，错误／坏响应／远程请求均为空。实际双方清场后，转发观察真实主 Canvas 的 `drawImage`：友方人类水平基底 `+0.5`，敌方人类 `-0.5`，原生动画帧 1 → 2 → 3；保存两张连续画面，不用镜像标签代替绘图。证据：`output/browser-v042.log`、`output/journey-v042.log`、`output/playwright/journey/evidence.json`。
- **源码 Electron 41/41 通过**：`output/playwright/desktop-qa-bRCTrC/report.json`，页面／控制台／请求错误与截图警告全部为空。六个固定位置见证者覆盖原阵营、跨阵营及双向人类转换；分别经原致死伤害 API＋真实 tick、实际双方清场按钮，真实 Canvas 基底的正负、动画帧推进、矩阵恢复与回收均通过，保存两阶段各三张真实原生序列图。
- **原生 400 单位功能压力通过**：200＋200 铲兵近距离高生命夹具，关闭／打开 F2 各推进 120 完整帧，实际为 240 tick、全部 400 单位保留、真实伤害 500／400、绘图调用 72,397／73,822，正常调度为 60 Hz、原倍速 2。该 smoke 不是上表四类人类 ABBA 场景，也没有同机基线；此原生功能 smoke 没有控制同机测试／构建并发，分别记录均值 24.46／15.38 ms（12 个十帧分段均值的 95 分位 46.72／37.19），不把它包装成所有 400 单位组合都已稳定 60 FPS。
- **最终发行 EXE 43/43 通过**：`output/playwright/desktop-qa-oEmfyD/report.json`；完整 409 项 ZIP 校验后解压至唯一中文含空格目录，再整体搬移，实际单实例、搬移启动及持久化通过，未用源码页面替代 EXE。页面／控制台／请求错误与截图警告均为空，原生截图 44 张；源码报告同样保留 44 张。已目视实际 EXE 的 `16-damage-death-frame-13.png`、`16-clear-death-frame-13.png`，左右人类倒向相反、碎块与转换方向相符，两个场景均有真实三帧序列和 Canvas 基底验证。
- **实际 EXE 的 400 铲兵功能压力**同样保留 400 个单位，关闭／打开 F2 各 120 完整帧、240 tick，实际伤害 500／400；均值 13.51／13.14 ms，十二个十帧分段均值的 95 分位为 29.26／24.84 ms。上述原生 smoke 的 median／p95 字段是分段平均值的分位数，不是 120 个单帧时延的分位数，也不与主 ABBA 的逐帧 p95 混用；它只提供功能与运行记录，不能据此承诺全部 400 单位组合恒定 60 FPS。
- **隔离与清理**：全程自有 QA profile、临时浏览器和原生窗口；原生布局检查后窗口透明且忽略鼠标，真实焦点字段如实保留。两次原生脚本、浏览器旅程与开局前后探针均正常退出，`app.close()`／自有 child finalizers 完成；两个精确 QA profile 的只读残留查询为空，自有 8343 服务经原 exec handle 发送 Ctrl+C 停止。证据：`output/acceptance-v042-process-cleanup.json`。未操作用户游戏或用户存档，也未宣称逐一核准所有系统 PID。

## Delivery / 交付

本地最终程序：`output/desktop-v0.4.2/ZombieBuilders.exe`。包的完整 CRC、文件集合、336／337 份运行源文件哈希及缓存官方 Electron 45.0.0 许可证字节比对通过：`output/releases/v0.4.2/verification.json`。原生成逻辑 `src/generated-game.js` SHA-256 仍为 `9ac747685871fa237dacb9a469cb78dbf7b635f21c3c593aa033da3d4cc5239b`。

| 本地包 | 字节 | 文件数 | 匹配源文件 | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| `zombie-builders-desktop-win-x64-v0.4.2.zip` | 204,900,725 | 409 | 336 | `1a32421a1dc55866654cde9e7fe5d805103b587cacd0ce283c59700ca264f390` |
| `zombie-builders-web-v0.4.2.zip` | 43,478,220 | 338 | 337 | `e5b73dea3cab084605f37f94a7d2adbcb77e424a66e15e1f4d87ead5c35e42c3` |

现有桌面“建筑工大战僵尸”快捷方式已由 v0.4.1 更新到上述 v0.4.2 EXE，已复核目标与 ProductVersion；没有启动／关闭用户游戏或修改用户存档。已同步仓库并公开发布 [v0.4.2 Release](https://github.com/learner20230724/zombie-builders-rebuild/releases/tag/v0.4.2)，标签对应 `82a77d18113d8ddc1f6af5b499e61b950bf48cb5`。桌面 ZIP、Web ZIP 与 `SHA256SUMS.txt` 三个资产全部上传；匿名访问确认 latest 为 v0.4.2，三个资产的字节数／GitHub 服务端 SHA-256 与本地一致，公开校验清单完整下载后逐字节一致。大型公开 ZIP 没有再次全量下载；其完整 CRC 和逐文件源码哈希已在本地验证，不混淆两种验证口径。证据：`output/releases/v0.4.2/published.json`、`output/releases/v0.4.2/public-download-verification.json`。本文档不在运行包文件集合中，后续补充验收不改变已冻结程序。

## Coverage / 覆盖口径

压力单位数／血量／摆位，以及死亡验证的直接 spawn／convert／原伤害 API 均明确作为合成夹具。攻击、伤害、投射物与动画更新仍走真实运行时；绘图观察器原样转发真实调用。没有宣称自然通关四关、穷尽所有自定义组合、原生 Flash 等价、干净机器、签名或 SmartScreen 验证。

English: v0.4.2 aligns detached death visuals with the current camp, reduces repeated cross-camp target allocation/sorting, and restores the original nominal 60 Hz cadence when loading a custom battle. Measured headless Edge ABBA tests retain full updates/rendering and all actors; 400-unit cross-human scenarios take about 3.1–3.7 times less mean frame CPU time in the specified closed-panel fixture, not a universal FPS guarantee. Source Electron 41/41, final packaged EXE 43/43 including complete ZIP relocation, browser journey 20/20, full regression 497/497 and local archive/source/license checks passed. Both native reports retain 44 genuine screenshots without capture/runtime/request errors; owned QA profiles show no residual processes and the local server was stopped. The desktop shortcut now points to the verified v0.4.2 EXE; v0.4.2 is published and anonymously verified as latest, with matching asset sizes/server SHA-256 and a full public checksum-manifest download. Large public ZIPs were not downloaded again; their complete local CRC/source verification is recorded separately.
