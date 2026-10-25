# Features / 功能概览

| Area / 模块 | Included / 内容 |
| --- | --- |
| Runtime / 运行 | JavaScript, Canvas 2D, and Web Audio; no Flash or Ruffle. / 使用 JavaScript、Canvas 2D 与 Web Audio，不依赖 Flash 或 Ruffle。 |
| Desktop / 桌面 | Electron window with `ZombieBuilders.exe`, offline local protocol, F11 fullscreen, and proportional scaling. / Electron 独立窗口与 EXE，离线本地协议，F11 全屏、等比例缩放。 |
| Gameplay / 玩法 | Four levels, economy, buildings, unit production, combat, and special powers. / 四个关卡、经济、建筑、单位生产、战斗与特殊技能。 |
| Resources / 素材 | Bundled graphics, fonts, and audio. / 自带图像、字体与音频。 |
| Local data / 本地数据 | Desktop user profile or browser storage; original/custom records are separate. / 桌面用户数据或浏览器本地存储，原版／自定义记录隔离。 |
| Customization / 二开 | Non-modal F2 dock; valid edits, preset loads/imports, reset, and undo commit automatically. / F2 并列设置；有效字段、载入／导入、恢复与撤销自动生效，无需应用按钮。 |
| Time / 时间 | Pause and 0–20× clock controls at the top of F2 settings (0.1 steps); no floating customization widgets. / F2 设置顶部暂停与 0–20 倍速控制（步长 0.1），游戏画面无额外悬浮自定义控件。 |
| Custom startup / 自定义开局 | New/restored custom battles restore the normal 60 Hz game scheduler, not a fixed-FPS guarantee. / 自定义新局与重载恢复正常 60 Hz 游戏调度，不承诺恒定帧率。 |
| Group stats / 全体倍率 | Separate human/zombie HP, movement, and damage multipliers by species, not allegiance; bases excluded. / 人类与僵尸按物种独立生命、移速、伤害倍率，不随阵营改变，不影响基地。 |
| Powers / 技能 | Friendly/enemy one-click releases for all three powers, all five Angry Mob survivor types, queued large summons, and selected/all effect cancellation. / 双方各三技能一键释放，愤怒暴民可设五种兵、大数量排队，可取消当前／全部效果。 |
| Troop counts / 在场兵力 | Live friendly/enemy counts for all ten species and totals, by current allegiance; living non-base actors only. / 十种单位双方数量及合计实时统计，按当前阵营，只计存活非基地角色。 |
| Building limits / 建筑上限 | Live caps; zero removes the gameplay cap, with a separate engine safety guard. / 上限本局更新，0 取消玩法上限，另有引擎安全保护。 |
| Sandbox / 沙盒 | Parallel persistent camp spawn panels and immediate cards; independent per-job rates for all ten species, atomic both-army or typed clearing, both-base HP, newest-first waves and independent wave pause. / 双方出兵区并列，各十种类型的独立速率队列与即时图标；双方一键／按类型清兵、基地血量、波次置顶显示与独立暂停。 |
| Dense battles / 密集战斗 | Stable target scans, hit-event sorting, and tick-scoped camp membership reuse without changing combat or RNG. / 稳定目标扫描、命中事件排序与 tick 内阵营成员复用，不改战斗语义或随机序列。 |
| Death direction / 死亡朝向 | Native death animation and fragments follow the unit's current camp, including converted troops. / 原生死亡动画及碎块按单位当前阵营朝向，包含转化部队。 |
| Unlock / 解锁 | One-click custom building/power/stage access without awarding resources or original wins. / 一键解锁自定义建筑、技能和关卡，不赠资源、不改原版成绩。 |
| Packaging / 打包 | Windows x64 Electron desktop and portable web packaging tools. / Windows x64 Electron 桌面包与网页便携包的构建工具。 |

[English README](../README.md) · [中文说明](../README.zh-CN.md) · [Development](DEVELOPMENT.md) · [二次开发](DEVELOPMENT.zh-CN.md)
