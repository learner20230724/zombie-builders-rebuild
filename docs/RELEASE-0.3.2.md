# v0.3.2 verification / 验收记录

状态：**v0.3.2 已交付。** 源码、实际 EXE、本地发行包验收通过；[正式 Release](https://github.com/learner20230724/zombie-builders-rebuild/releases/tag/v0.3.2) 已公开并设为 latest。本记录只覆盖 v0.3.2，不修改旧版验收记录。

## Scope / 本次范围

| 功能 | 验收要求 | 状态 |
| --- | --- | --- |
| 生命参数 | 生命整数上限从一亿放宽至 2,147,483,647；说明 `$.units[5].health` 为己方基地，界面和运行时校验一致，非法值不半应用 | 配置／UI／实际 EXE 通过 |
| 有效生命与 XP | 僵尸基础生命乘关卡截整数后的生命倍率不溢出；高生命击杀累计 XP 保顶，不绕回负数，后续消费正常 | 真实恢复逻辑的边界／奖励／消费测试通过 |
| 一键杀死己方小兵 | 清除当前幸存者、愤怒暴民召唤兵与转化僵尸；保留基地，正确释放普通招募人口 | 自动测试与实际 EXE 通过 |
| 一键杀死敌方小兵 | 只清当前敌军，不伤敌方基地，不发 XP 或击杀奖励 | 自动测试与实际 EXE 通过 |
| 状态隔离 | 自定义局可用；暂停／继续状态不变；不取消已付订单，不修改未来波次和增援队列 | 暂停／实时操作、后续真实生产与出怪通过 |
| 重复操作 | 空场与连续点击无重复人口扣减或额外统计；已有投射物与技能效果保留 | 空场、连续操作与冻结链表原子性通过 |

## Acceptance / 验收结果

- **2026-10-23：完整自动回归 235/235 通过**，另有 56 组恢复数据、7,200 模拟帧、215 项经济断言与 83 项战斗用例。证据：`output/test-v032-release.log`。`npm run build` 的 105 项素材哈希、配置、默认值及源码解析通过：`output/build-v032.log`。
- **源码 Electron 22/22 通过**：`output/playwright/desktop-qa-miON8I/report.json`。
- **实际 v0.3.2 EXE 24/24 通过**：`output/playwright/desktop-qa-lNFkuf/report.json`。包含清理己方 3 个（真实招募兵＋标注的暴民／转化夹具）、敌方 1 个，重复操作 0；基地／订单／波次／XP／统计／存储不变，人口保留排队预占；恢复后真实完成招募和后续出怪；实时清场保持时钟运行。基地生命 200,000,000 本局和新局均生效，2,147,483,648 显示具名中文错误并保持原子性。单实例、重启与完整 ZIP 的中文空格目录搬移通过。全部观察的页面／控制台／资源／远程请求错误均为 0。
- **网页 smoke 和 13 项 journey 通过**：`output/browser-v032.log`、`output/journey-v032.log`。QA 使用自己的 8332 服务，结束后已关闭；未终止玩家窗口或修改玩家存档。
- **两份 ZIP 的 CRC、完整运行文件集合、331／332 份源文件哈希与 Electron 原许可证通过**：`output/releases/v0.3.2/verification.json`。
- 本地安装：`output/desktop-v0.3.2/ZombieBuilders.exe`，原生 ProductVersion 为 0.3.2；桌面「建筑工大战僵尸」快捷方式已指向新版，未关闭玩家现有窗口或覆盖个人配置。需要先退出旧游戏，再启动新版。

| 发行包 | 字节 | 文件数 | SHA-256 |
| --- | ---: | ---: | --- |
| `zombie-builders-desktop-win-x64-v0.3.2.zip` | 204,848,531 | 404 | `cad1189910cf3a9d6da83da7a1283a0858f9dd45995bbb2525354c56eb139b00` |
| `zombie-builders-web-v0.3.2.zip` | 43,426,285 | 333 | `1900aec0e4cb807bd8c84b60c260a602d1572a3c8eaed8adb864b2d3206dab12` |

## Publication / 公开发布

- Release：[v0.3.2](https://github.com/learner20230724/zombie-builders-rebuild/releases/tag/v0.3.2)，标签提交 `67846753105a8e9908e48196367ebada6acad3c2`，Release ID `421772865`；三项资产已上传。证据：`output/releases/v0.3.2/published.json`。
- 无认证读取 latest Release API，确认三项资产大小与 GitHub 服务端 SHA-256 匹配本地产物；公开下载完整 206 字节 `SHA256SUMS.txt`，逐字节与本地一致。证据：`output/releases/v0.3.2/public-metadata-verification.json`，`passed: true`、`authorizationUsed: false`。
- 完整 ZIP 的匿名分段回下载遇到慢流／截断，已停止自有下载助手；**未宣称两份公开 ZIP 均已完整回下载**。本地 ZIP 的 CRC、源文件和许可证检查及实际解压 EXE 24 项验收已完成，不以部分下载代替完整下载。
- 本验收文档不在发行运行文件集合内；发布后的状态记录不改 ZIP、标签或包内字节。

## Coverage / 覆盖范围

所有桌面检查使用独立 QA profile；暴民和转化角色为明确标注的夹具，普通小兵由真实画面招募。没有声称自然通关所有关卡、穷尽全部动画／战斗组合，或在干净机器验证安装器、代码签名与 SmartScreen。

English: v0.3.2 is publicly released with friendly/enemy troop-clearing actions, signed-int32 health bounds, and scoped XP overflow protection. The 235-test regression, build, 22 source/24 packaged Electron checks, browser smoke/13-check journey, local ZIP CRC/source hashes/licenses passed. The desktop shortcut targets v0.3.2. Anonymous latest-release metadata and the complete public checksum file match; full public archive downloads were stopped after network stalls/truncation and are not claimed as completed.
