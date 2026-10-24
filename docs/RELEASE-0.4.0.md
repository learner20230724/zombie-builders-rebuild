# v0.4.0 verification / 验收记录

状态：**实现、自动回归、构建、网页及最终 Electron／EXE 验收通过；已同步仓库并发布 v0.4.0，本地发行包与桌面快捷方式已就绪。** 下表区分自动回归与最终交付验收，不提前宣称发布。旧版验收记录不改写。

## Scope / 本次范围

| 功能 | 验收要求 | 状态 |
| --- | --- | --- |
| 自动即时生效 | 勾选／下拉当即提交，数值回车／失焦提交；无应用按钮；载入／导入／恢复／撤销也即时提交；非法值不半应用 | 自动回归与最终 EXE 验收通过 |
| 菜单与成绩 | 菜单修改只更新模板，不自行开局；原版战中改值转为自定义，不污染原版成绩 | 自动回归与最终 EXE 验收通过 |
| 技能五类召兵 | 愤怒暴民支持铲兵、农夫、机枪皮卡、燃烧瓶投手、牧师；旧配置缺新增项时仍为 0 | 自动回归与最终 EXE 验收通过 |
| 取消技能效果 | 技能页取消当前／全部效果：清蓄力、待出暴民与对应暴民角色、收割机、飞机、未落空袭炸弹及已标记爆炸视觉；保留普通部队／燃烧瓶，不退 XP、不重置冷却、不回滚伤害，暂停状态保留 | 自动回归与最终 EXE 验收通过 |
| 大数量技能 | 不再卡在 1,000 请求；紧凑排队、每模拟更新预算及独立在场保护，满场等待而非吞请求 | 自动回归与最终 EXE 验收通过 |
| 全体倍率 | 人类／僵尸独立生命、移速、伤害倍率，按物种而非当前阵营；与类型／关卡倍率相乘，不影响基地；实时保留生命策略和临时状态 | 自动回归与最终 EXE 验收通过 |
| 批量队列与入口 | 保留即时僵尸一键按钮；批量选择阵营＋类型＋数量（各十类，共二十种组合）加入队列；两侧自然入口，普通属性且不改订单／预留人口 | 自动回归与最终 EXE 验收通过 |
| 独立出兵速率 | 每任务 0–1,000,000 只／游戏秒，支持 0 暂停与 0.1 小数；数量 1–2,147,483,647；多批并发公平分发，32／tick、场上 1,000 保护；满场不吞余量，单批改速／取消，取消不杀已出单位，新局清队列 | 自动回归与最终 EXE 验收通过 |
| 跨阵营战斗 | 敌方人类、己方僵尸真实按所属阵营行进、索敌、攻击与受击，牧师转化等效果遵循阵营；覆盖二十种生成组合 | 自动回归与最终 EXE 验收通过 |
| 在场兵力 | 沙盒开局行下实时表格列十种单位双方数量及合计；按当前阵营含转化，只计生命大于 0 且非死亡模式的非基地，不含排队／人口上限 | 自动回归与最终 EXE 验收通过 |
| 定向清场 | 按当前阵营下拉选择五种人类或五种僵尸，含已转化角色，只清选中类型，保护基地、人口、订单、波次和奖励 | 自动回归与最终 EXE 验收通过 |
| 基地快捷血量 | 清场区下方双方最大与当前生命；当前生命 0 正常结算，结束后不能复活 | 自动回归与最终 EXE 验收通过 |
| 波次易用性 | 新增行显示在最上方，执行序号和实际顺序不反转；已完成组只读，新组即时同步未出队列 | 自动回归与最终 EXE 验收通过 |
| 独立暂停波次 | 关卡页暂停／继续仅切换已生效 `automaticSpawning`，与沙盒同步；保留队列进度，场上战斗／技能／手动出兵不停，其他无效草稿不影响按钮 | 自动回归与最终 EXE 验收通过 |
| 时间控制 | 仅 F2 打开设置，时间区嵌于设置顶部，无游戏外浮动控件；暂停／继续及 0–20 倍、0.1 步长，保留固定模拟语义与暂停归属 | 自动回归与最终 EXE 验收通过 |
| 文档 | 中英 README 简化，保留默认参数表；配置／开发指南同步实际接口、时序与边界 | 已更新；默认参数表保持不变 |

## Acceptance / 验收结果

以下结果来自 **2026-10-25** 的最终回归记录；不以源码测试代替实际发行 EXE。

- **完整自动回归 430/430 通过**，失败／跳过／取消均为 0；另有 **56 组恢复数据、7,200 模拟帧、215 项经济断言、83 项战斗用例**通过。证据：`output/test-v040-release.log`。其中数据算术检查不是完整游戏验收，战斗用例中的胜负／记录检查也不是自然通关四关。
- **构建检查通过**：105 项素材哈希（74 图像、31 音频）、五份配置、独立默认基准与源码解析均通过。证据：`output/build-v040-release.log`。
- **网页 smoke 及 16 项 journey 通过**。真实菜单输入、即时属性、双方生成／清理、F2 内时间控制及原有生产／暂停／存储流程通过；两份报告的页面错误、异常响应与远程请求均为空。证据：`output/browser-v040-release.log`、`output/journey-v040-release.log`。成绩持久化使用明确标注的合成非零分数夹具，不冒充自然胜利。
- **源码 Chromium 视觉验收通过（1600×1100，非 EXE 截图）**：真实 UI 队列生成己方生存专家 2、敌方肥胖僵尸 2，十种单位表格的 20 个阵营计数格与合计 2／2 对应；时间区位于 F2 内，页面无自定义入口按钮，关闭 F2 后无可见 HTML 按钮。根代理已目视 `02-F2-time-and-troops.png`、`03-closed-no-widgets.png`。报告 `passed: true`、`errors: []`：`output/playwright/visual-v040-1792866503721/report.json`。
- **本地两份 ZIP 的 CRC 与源文件哈希校验通过**，最终 ZIP 的大小／SHA-256 已另行读取核对，见下表。证据：`output/releases/v0.4.0/verification.json`（`passed: true`）。该报告记录了 335／336 份匹配源文件，不能据此冒称公开回下载或最终原生窗口验收。
- **最终源码 Electron 35/35、实际发行 EXE 37/37 通过**。实际 EXE 覆盖完整 ZIP 解压至中文含空格目录后的搬移启动、单实例与持久化；全部二十种阵营／类型组合、真实排队与分类清理、策反后兵力统计、即时设置、技能来源取消、独立波次暂停及 F2 内时间区均通过。证据：`output/playwright/desktop-qa-TNisgb/report.json`、`output/playwright/desktop-qa-z9XtzG/report.json`；两份报告各 27 张真实原生截图、素材警告及页面／控制台／请求错误均为 0。已目视实际 EXE 的 `10a-all-twenty-faction-species.png`，每种单位双方各 2、双方合计各 20。
- **原生验收隔离**：仅使用自建 QA profile／进程；原生窗口缩放／全屏检查后，将自有窗口设为透明且忽略鼠标以避免遮挡，不将 Electron 的焦点元数据当作产品行为证据。全部行为与截图仍由实际发行 renderer 产生，未使用替身页面。14 个自有 PID 已退出、QA profile 无残留进程：`output/acceptance-v040-process-cleanup.json`。
- **许可证与最终文件复核通过**：完整 ZIP CRC、335／336 份发行源文件逐一 SHA-256 对照；桌面包 `LICENSE` 与 `LICENSES.chromium.html` 对照缓存官方 Electron 45.0.0 ZIP 字节一致。复核脚本：`output/verify-v040.py`。原生成逻辑 `src/generated-game.js` SHA-256 仍为 `9ac747685871fa237dacb9a469cb78dbf7b635f21c3c593aa033da3d4cc5239b`。
- **本地交付**：`output/desktop-v0.4.0/ZombieBuilders.exe` 的 ProductVersion 为 0.4.0；现有桌面“建筑工大战僵尸”快捷方式已由 0.3.2 更新指向它。未启动／关闭用户游戏，也未修改用户存档。请先关闭旧窗口再启动新版。
- **公开发布已完成**：[v0.4.0 Release](https://github.com/learner20230724/zombie-builders-rebuild/releases/tag/v0.4.0)，代码标签对应 `74277e43b15cfb98b552299d142586876f686094`；桌面 ZIP、Web ZIP 与 `SHA256SUMS.txt` 三个资产全部上传。匿名访问确认 Release 可见且为 latest；资产字节数与 GitHub 服务端 SHA-256 均匹配本地文件，公开校验清单完整下载后逐字节一致。证据：`output/releases/v0.4.0/published.json`、`output/releases/v0.4.0/public-download-verification.json`。未重复完整下载约 205 MB／43 MB 的公开 ZIP；ZIP 完整 CRC／源文件检查在本地完成，不将服务端摘要核对描述成全量公开 ZIP 回下载。本文档不在发行运行文件集合内，补充记录不改变已验收程序。

| 本地发行包 | 字节 | 文件数 | 匹配源文件 | CRC | SHA-256 |
| --- | ---: | ---: | ---: | --- | --- |
| `zombie-builders-desktop-win-x64-v0.4.0.zip` | 204,885,983 | 408 | 335 | PASS | `b2ec2c33549a809b47cac177e68bca4e699813c8835925e84199bcfbc6cdf51c` |
| `zombie-builders-web-v0.4.0.zip` | 43,463,559 | 337 | 336 | PASS | `ad3d727889fa7cda5e7fcf10f70d9e6e24faddc4a89bc7c01b34b7bb0723d48d` |

## Coverage / 覆盖口径

报告区分真实画面操作与合成夹具。网页视觉、真实 Electron 和实际发行 EXE 分别验收；本地 ZIP 校验不等于公开下载验证。没有宣称自然通关四关、穷尽全部战斗／动画组合、原生 Flash 等价，或验证干净机器、代码签名与 SmartScreen。

English: v0.4.0 covers immediate editing, five-type queued Angry Mob summons, power-effect cancellation, species-wide multipliers, independent-rate queues for all twenty camp/species combinations, faction-aware combat and clearing, live troop counts, direct base HP, newest-first wave display, independent scripted-wave pause, and F2-internal time controls. Verified: 430 tests, 56 recovered-data checks, 7,200 simulation frames, 215 economy assertions, 83 combat cases, build/105 asset hashes, browser smoke/16-step journey, source Chromium visual checks, and local archive CRC/source hashes. Final source Electron 35/35 and packaged EXE 37/37 passed, including ZIP relocation and native screenshots; the desktop shortcut now targets 0.4.0. v0.4.0 is published and anonymously verified as latest; asset sizes/server SHA-256 and a full public checksum-manifest download match local files. Large public ZIPs were not downloaded again; their complete local CRC/source-hash verification is recorded separately. No natural four-stage completion is claimed.
