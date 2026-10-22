# Current status / 当前状态

This is a public research reconstruction snapshot, not a perfect-replica or full-campaign certification. / 本项目是公开研究性重建快照，不是完美复刻或整条战役通过认证。

| Area / 项目 | Current evidence and limit / 当前证据与边界 |
| --- | --- |
| Runtime / 运行 | JavaScript + Canvas 2D + Web Audio; no Flash/SWF/Ruffle runtime. / 不依赖 Flash、SWF 运行时或 Ruffle。 |
| Included systems / 已包含 | Opening, four levels' data, economy, production, combat, local records, and runtime assets. Data coverage is not campaign validation. / 开场、四关数据、经济、生产、战斗、本机记录及运行素材；数据覆盖不等于战役验证。 |
| Differential evidence / 差分证据 | Reported original ABC restricted JavaScript interpreter vs. port: fixed startup + 89 controlled combat frames, 354 checkpoints PASS. Fixture uses pre-damage and a granted Harvester ability; not a natural campaign. / 已报告原 ABC 受限 VM 对照移植版：固定启动加 89 个受控战斗帧、354 检查点通过；含预伤和授予收割机技能，不是自然战役。 |
| Natural victories / 自然胜利 | Historical first-three-level Canvas victories belong to an older generated version. No current-version natural level-four victory is established. / 前三关历史 Canvas 自然胜利来自旧生成版本；当前版本尚无第四关自然胜利确认。 |
| Visual fidelity / 画面保真 | Font scaling still differs from the native Flash reference. / 与原生 Flash 参照的字体缩放差异尚未解决。 |
| Audio fidelity / 音频保真 | Complete PCM and loop verification for all 31 audio items is unfinished. / 全部 31 项音频的完整 PCM 与循环核验尚未完成。 |
| Online records / 在线记录 | Mochi services are gone; records/leaderboard-style displays are local-only. / Mochi 服务已消失；记录与排行榜式展示仅限本机。 |
| Public checks / 公开副本检查 | Passed on 2026-10-22 / Node 24.14.1: distribution check, 26 unit tests, 56 data checks, 7,200 headless frames, 215 economy assertions, 83 controlled combat cases. No new browser/native-Flash verification. / 公开副本已通过发布检查及上述本地测试；未据此宣称新增浏览器或原生 Flash 验收。 |
| Reproducibility / 可复现性 | Playable snapshot, not the complete forensic workspace. Recovery helpers require matching original/decompiled materials; historical evidence is not turnkey reproducible. / 可运行快照不是完整取证工作区；恢复工具需自行准备匹配原文件与反编译材料，历史证据不能开箱复现。 |

**89 controlled frames are not a whole game. / 89 个受控帧不等于整局游戏。**

See [English README](../README.md), [中文说明](../README.zh-CN.md), and [Third-party notices / 第三方权利说明](../THIRD_PARTY_NOTICES.md) for setup and rights boundaries.
