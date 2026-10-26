# v0.4.3 — 基地受击与密集战斗 / Base hits and dense battles

## Changes / 更新

- 出兵队列分别显示场上已满、游戏／战斗暂停、单批速率为 0、战斗结束；汇总展示场上占用与 1,000 实体上限（含两个基地，通常可容纳 998 个小兵）。满场只等待，不丢弃剩余请求。
- 跨阵营适配人类的索敌使用 128 px 一维空间桶：先保守缩减候选，再恢复原列表顺序并执行精确判断。小队伍、密集前线、极端几何和未知战斗回调使用原线性路径；原生战斗循环未被整体替换。
- 特效链表增加对象到节点的反向索引。首次 O(P) 建表，之后直接定位待移除节点，避免大量粒子同批回收时反复全表查找；保留原链表、重复值、枚举顺序及回收钩子。
- 两座基地各保留最多 256 个活跃装饰碎片。稀疏普通受击保持原视觉；饱和后只省略多余装饰分配，仍消耗原随机序列。实际扣血、余伤、攻击频率、胜败与小兵死亡动画不受此视觉预算限制。
- 设置轮询复用已有战局快照；队列快照一次扫描同时提供占用和阻塞状态。

The queue now distinguishes capacity from pauses and ended battles. Adapted cross-camp human queries use conservative one-dimensional buckets with stable target ordering and exact fallback checks. Reverse node lookup reduces effect-removal work. Base rubble is bounded independently per side without reducing combat damage or troop death animations.

## Algorithms / 算法范围

空间分区采用先粗筛、再精确判断的结构，而非改变攻击规则。参考 [NVIDIA GPU Gems 3 的 broad-phase 介绍](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-32-broad-phase-collision-detection-cuda)；亦比较了 [Box2D 动态 AABB 树](https://box2d.org/documentation/group__tree.html)。本作主要沿横轴战斗，采用简单一维桶，不新增物理引擎依赖。

几何缓存限于同步更新的安全查询阶段。成员增删、列表／表头替换、阵营查询阶段切换和嵌套 tick 返回均清理相关缓存；生命与模式仍实时判断。未知 `Update / Infect / Smack / Turn / HitKey` 回调整 tick 回退，防止二开回调移动其他单位后漏判。

特效索引只覆盖特效／投射物列表，不修改军队列表。被索引节点数据被赋新值时使索引失效；自定义比较器或未知节点数据描述符回退原删除逻辑。基地碎片预算按节点回收，不对每次命中重新计数，不与死亡碎块共享额度。

## Verification / 验证

- 完整自动回归 **532/532** 通过；另有 56 组恢复数据、7,200 模拟帧、215 项经济断言与 83 项战斗用例。
- 构建验证通过：105 项素材哈希、五份配置、独立默认值和全部运行源文件解析。双语 README 默认属性表未改。
- 独立审查通过：201 组几何、2,981 次查询、13,251 个精确候选；自定义伤害回调和原型回调的线性回退、嵌套正常／异常恢复均通过。
- 原生成游戏核心未修改：SHA-256 `9ac747685871fa237dacb9a469cb78dbf7b635f21c3c593aa033da3d4cc5239b`。

## Performance / 性能对照

基线为已发布 `v0.4.2`，候选为最终冻结源码。使用真实 headless Microsoft Edge Chromium 与 Canvas 2D；下表是完整游戏更新＋绘制的 **CPU 平均耗时**，不是实时 FPS 或 GPU 完成时延。两个试验均值等权汇总，不当作合并中位数。

| 场景 | 旧版 → 新版（ms／完整帧） | 采样 |
| --- | ---: | --- |
| 两基地各 60 次百万伤害后的碎片压力 | 34.41 → 1.21 | 每次 120 帧／240 tick，两次匹配试验 |
| 100 原阵营单位高伤害攻击两基地 | 30.27 → 1.64 | 每次 30 帧／60 tick，两次匹配试验 |
| 100 跨阵营单位高伤害攻击两基地 | 35.36 → 1.88 | 每次 30 帧／60 tick，两次匹配试验 |
| 400 跨阵营人类，设置关闭 | 4.98 → 3.66 | 每次 60 帧／120 tick，两次匹配试验 |
| 400 跨阵营人类，设置打开 | 4.92 → 3.86 | 每次 60 帧／120 tick，两次匹配试验 |

基地夹具为高血量、固定摆位的真实原生／跨阵营小兵，关闭自动波次与增援；直接命中场景调用真实 `bbInfect / bbSmack`。没有移除交战角色或减少攻击次数。基地碎片从高伤害直接命中后的 18,949 个降至最多 512 个，只减少纯装饰；小兵死亡效果独立保留。13 组基地 A/B 的逐帧血量、全体单位状态、经济、动画与 RNG 深比较及 SHA-256 全部一致；特效数量和绘图次数明确不要求相等，因为它们正是视觉预算变化。

400 单位矩阵完整保留 A/B/B/A，覆盖四个场景和 F2 开／关。原阵营、混编有接近持平或噪声级变慢的重复；密集场景某次旧版出现明显尖峰，不用该异常夸大普遍收益。该旧矩阵夹具存在独立启动至多两 tick 的相位容差，不借矩阵跑分宣称精确 RNG 等价；精确语义另用固定初始时钟的基地夹具和同步引擎回归证明。高密度、大范围攻击仍可能具有平方级最坏开销，不承诺任意配置恒定帧率。

证据：`output/performance-v043-summary.json`，包含每次原报告、源文件／夹具哈希、逐帧轨迹、p95 与清理状态。主性能窗口没有已知其他代理的测试、原生 QA 或打包并发。首轮 INTMAX 夹具配置错误已修复并完整重跑，失败报告保留但不计入结果；已计入的 A1 与最终夹具的差别仅在已记录的清理机制，计时与场景逻辑保持一致。基地夹具完整冻结核心源码；旧 400 单位矩阵的源快照未单独包含生成核心，另以运行前后未修改的核心哈希核对。

独立复算 `output/review-v043-performance.json` 通过：读取原报告、重新深比较 13 组逐帧语义对象和轨迹 SHA、复算原始帧均值及两次试验聚合、逐文件检查候选哈希，不只引用汇总的通过标记。

源码 Electron **43/43** 通过：`output/playwright/desktop-qa-y78Uqs/report.json`，48 张原生截图，无页面／控制台／资源／远程请求错误。新验收通过真实队列满员、暂停、单批 0 速率、清兵后恢复；两基地各 40 次百万伤害完整扣除 4,000 万生命，粒子各 256、共享 RNG 与旧叶子 oracle 一致，死亡效果保留。300 个完整更新／绘制帧推进约 600 tick（实测 602，原整数时钟容差 ±2），自然回收后再次命中可重新分配两侧碎片额度。

## Native acceptance and delivery / 原生验收与交付

- 最终 EXE＋完整 ZIP 搬移 **45/45** 通过：`output/playwright/desktop-qa-2L7Nky/report.json`，48 张原生截图；全部页面、控制台、资源、外部请求及截图警告为空。实际 `ztp://` 读取的六份运行源文件字节哈希与冻结源码一致，不以工作区页面替代 EXE。
- 完整 410 文件 ZIP 校验、解压至唯一中文含空格目录并整体搬移；验证全部文件与原 ZIP／canonical 安装一致。搬移后复用隔离 QA profile 的设置、预设和成绩均保留。证据：`output/v043-package-relocation.json`。
- 新原生截图完整展示 `1000 / 1000（含基地）` 占用、单批 0 速率与真实满员的不同提示。基地夹具截图前真实刷新暂停 Canvas，未推进模拟或伪造画面；原生死亡方向及完整更新／绘制检查继续通过。
- 浏览器完整启动 smoke 与 **20/20 journey** 通过；错误、失败资源和外部请求均为空。新证据：`output/playwright/v043-browser-final/`；前版证据另行备份保留。
- `output/acceptance-v043-process-cleanup.json` 确认两个精确 QA profile 无残留，所有自有应用／浏览器已关闭，自有 loopback 服务经自身 exec 句柄停止。未关闭玩家游戏或读写玩家正常存档。
- 本地 EXE：`output/desktop-v0.4.3/ZombieBuilders.exe`，ProductVersion 为 `0.4.3`。桌面既有“建筑工大战僵尸”快捷方式已指向此程序；升级后须关闭旧窗口，再重新启动。

完整本地 ZIP CRC、337／338 份发行源文件哈希以及缓存官方 Electron 45.0.0 许可证字节核对通过，见 `output/releases/v0.4.3/verification.json`。

| 产物 | 字节 | 文件数 | SHA-256 |
| --- | ---: | ---: | --- |
| `zombie-builders-desktop-win-x64-v0.4.3.zip` | 204,910,982 | 410 | `91fe27d5a49198e954c99aecd9afb27791e9511e589fbb5e0064d992cc3b12be` |
| `zombie-builders-web-v0.4.3.zip` | 43,488,448 | 339 | `59cd39f7430417f805509cec113a1063ea61b429e03b3f7c318f5f09b456351b` |

下载入口：[v0.4.3 Release](https://github.com/learner20230724/zombie-builders-rebuild/releases/tag/v0.4.3)。Windows 使用桌面 ZIP，完整解压后运行 `ZombieBuilders.exe`；不要只复制 EXE。

English: Full regression 532/532, source Electron 43/43, packaged EXE with complete archive relocation 45/45, browser startup and 20/20 journey passed. Repeated controlled real-Canvas comparisons retain full combat updates, actors, HP damage and RNG; only decorative base fragments are bounded. Specified 100-actor high-damage base cases fall from about 30–35 ms to 1.6–1.9 ms mean CPU time per full frame. These synthetic results are not universal FPS claims. Local full ZIP/source/license checks passed; the desktop shortcut targets the verified v0.4.3 installation.
