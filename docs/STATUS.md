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
| Group stats / 全体倍率 | Separate human/zombie HP, movement, and damage multipliers by species, not allegiance; bases excluded. / 人类与僵尸按物种独立生命、移速、伤害倍率，不随阵营改变，不影响基地。 |
| Powers / 技能 | All five Angry Mob survivor types; queued large summons; selected/all power-effect cancellation. / 愤怒暴民可设五种己方兵，大数量排队分批出兵，可取消当前／全部技能效果。 |
| Troop counts / 在场兵力 | Live friendly/enemy counts for all ten species and totals, by current allegiance; living non-base actors only. / 十种单位双方数量及合计实时统计，按当前阵营，只计存活非基地角色。 |
| Building limits / 建筑上限 | Live caps; zero removes the gameplay cap, with a separate engine safety guard. / 上限本局更新，0 取消玩法上限，另有引擎安全保护。 |
| Sandbox / 沙盒 | Immediate one-click zombies; independent per-job spawn rates for all ten species in either camp, with current-allegiance typed clearing, both-base max/current HP, and tracked live waves with newest-first display and independent wave pause. / 即时一键僵尸、双方各十种类型的独立速率队列、按当前阵营和类型清兵、双方基地最大／当前生命及按身份更新波次（新增组置顶显示，可独立暂停）。 |
| Packaging / 打包 | Windows x64 Electron desktop and portable web packaging tools. / Windows x64 Electron 桌面包与网页便携包的构建工具。 |

[English README](../README.md) · [中文说明](../README.zh-CN.md) · [Development](DEVELOPMENT.md) · [二次开发](DEVELOPMENT.zh-CN.md)
