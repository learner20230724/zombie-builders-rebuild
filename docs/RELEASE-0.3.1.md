# v0.3.1 verification / 验收记录

状态：**v0.3.1 已交付。** 源码回归、实际 EXE 22 项检查、发布包及无认证公开回下载核验通过；[正式 Release](https://github.com/learner20230724/zombie-builders-rebuild/releases/tag/v0.3.1) 已公开并设为 latest。本记录仅覆盖 v0.3.1，不修改 v0.3.0 的历史验收结果。

## Changes / 本次范围

| 变化 | 验收要求 | 状态 |
| --- | --- | --- |
| 并列设置 | 宽屏游戏与右侧设置并列，≤850 CSS 像素上下排列；不是遮挡游戏的模态窗口 | 源码／实际 EXE、边界框与截图通过 |
| 边玩边调 | 打开默认暂停，可明确恢复游戏并保持设置打开；输入与游戏操作不互相误触 | 实际 EXE 与自动回归通过 |
| 建筑上限 | `maximum: 0` 不设玩法数量上限；正整数 1–100,000 为上限，另有每类 100,000 安全门槛；原版默认 15／5／1 不变 | 实际 EXE 与自动回归通过 |
| 本局建筑 | 上限修改本局生效，不删除已建建筑、不取消已付订单；超出原图位的实际建筑仍计收入与人口 | 实际 EXE 验证超过 5 座及 0 上限的实际收入；自动回归通过 |
| 本局波次 | 普通“应用本局”即更新当前关尚未出场波次，按稳定身份和已调度数量合并，不重播已完成组 | 实际 EXE 已消耗进度与自动回归通过 |
| 状态与兼容 | 实际进度与草稿分开；旧无 ID 预设需新局绑定，开关／重排／删除、空队列及入队增援保留 | 实际 EXE 主要流程与自动回归通过 |

## Test checklist / 测试清单

- 数值／配置：0、正整数上限、负数、非整数、溢出；默认配置兼容；失败不半应用。
- 建筑：在产订单保留；降低上限；超过原图位置无绘制异常；多余废料场／房车真实收入和人口。
- 波次：首次应用、重复应用、已出部分、已过组、重排／增删／禁用、暂停出怪、空队列、关卡切换及增援。
- 界面：宽屏并列、窄屏上下、最大化／全屏；边玩边调；表单焦点、滚动、点击坐标及关闭后的暂停策略。
- 回归／交付：全量 Node、真实 Electron、网页流程、发布包字节／CRC／许可、公开下载及 SHA-256。

## Verified / 已实测

- **2026-10-23：完整 `npm test` 最终复跑通过**：213/213 Node 测试、56 组原始数据、7,200 模拟帧、215 项经济断言、83 个战斗用例。最终证据：`output/test-v031-release.log`；源码阶段证据：`output/test-v031.log`。
- **`npm run build` 通过**：105 项素材哈希、五份配置、原版基准及源码解析检查。证据：`output/build-v031.log`。
- **源码真实 Electron 20/20 检查通过**：`output/playwright/desktop-qa-nwqoud/report.json`，`sourceMode: true`。覆盖并列／上下布局、保持设置打开继续游玩、按已消耗量应用波次、超过原上限及 `maximum: 0` 的建筑／真实收入，以及既有启动、缩放、刷怪、导出、原子校验、重启与记录隔离流程。页面／控制台／错误响应／失败请求／远程 HTTP 请求均为 0。
- **实际解压 EXE 22/22 检查通过**：`output/playwright/desktop-qa-KWEi9t/report.json`，`sourceMode: false`。复验上述四项新增功能及既有流程，并覆盖中文预设真实导出、单实例、重启、中文空格目录搬移；页面／控制台／错误响应／失败请求／远程 HTTP 请求均为 0。
- **网页 smoke 与 journey 通过**：`output/browser-v031.log`、`output/journey-v031.log`，后者 13 项检查；结构化证据：`output/playwright/journey/evidence.json`。
- 宽窄布局另经截图与边界框核对，游戏与设置不重叠，窄屏“应用本局”可滚动触达。证据目录：`output/playwright/dock-v031-1TVheN/`。
- 文档对照三模块冻结 API 复核，修正主波次与增援调用的不同字段要求；未改 v0.3.0 历史。

## Local release artifacts / 本地发行产物

两份 ZIP 的 CRC、文件集合与源文件逐字节哈希验证通过；桌面运行库所需许可证与 Electron 原始字节一致。证据：`output/releases/v0.3.1/verification.json`，`passed: true`。

| 压缩包 | 字节 | 文件数 | 源文件匹配数 | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| `zombie-builders-desktop-win-x64-v0.3.1.zip` | 204,841,991 | 404 | 331 | `83727927d4208ee96521e178aba8ba7c3dea5495cea8159ec51bb3f1ba060a28` |
| `zombie-builders-web-v0.3.1.zip` | 43,419,762 | 333 | 332 | `ba1c623ceb381438e9bf82b64a8908dc4d3d9621df5b9285a13383a559f44687` |

## Published release / 正式发布

- Release：[v0.3.1](https://github.com/learner20230724/zombie-builders-rebuild/releases/tag/v0.3.1)，标签提交 `629060df15d1de7bcbe1918fc7f9d21fa062d28c`。发布证据：`output/releases/v0.3.1/published.json`。
- **三项资产均经独立公开 HTTP 回下载，未使用 Authorization**；完整字节数与 SHA-256 均匹配本地文件及 GitHub digest，两份 ZIP 的 CRC 再次通过。证据：`output/releases/v0.3.1/public-download-verification.json`，`passed: true`、`authorizationUsed: false`。
- 长流及部分分段曾提前结束；经最多 8 路、每段 8 MiB 的 HTTP Range 请求与续传补齐后，才验证最终完整文件。桌面包首段也来自独立公开 Range 请求，不以本地包内容代替下载。

| 公开资产 | 完整字节 | SHA-256 |
| --- | ---: | --- |
| [桌面 ZIP](https://github.com/learner20230724/zombie-builders-rebuild/releases/download/v0.3.1/zombie-builders-desktop-win-x64-v0.3.1.zip) | 204,841,991 | `83727927d4208ee96521e178aba8ba7c3dea5495cea8159ec51bb3f1ba060a28` |
| [网页 ZIP](https://github.com/learner20230724/zombie-builders-rebuild/releases/download/v0.3.1/zombie-builders-web-v0.3.1.zip) | 43,419,762 | `ba1c623ceb381438e9bf82b64a8908dc4d3d9621df5b9285a13383a559f44687` |
| [SHA256SUMS.txt](https://github.com/learner20230724/zombie-builders-rebuild/releases/download/v0.3.1/SHA256SUMS.txt) | 208 | `1c52859d15145fce2b2ce99ab15dbbfd82e5e513b580b8302286624ce0d32b28` |

本验收文档的完成状态更新不重打标签、不修改 ZIP 或包内文档。

## Coverage boundary / 覆盖边界

- 未声称自然通关全部关卡、穷尽能力／动画组合、干净机器安装、签名信誉或 SmartScreen。
- 记录持久化使用明确标记的非零分数夹具；GUI 检查使用独立 QA profile，不读取或重置玩家正常存档。

English: v0.3.1 is publicly released with a non-modal dock, play-while-editing controls, live building limits, and identity-aware wave updates. The 213-test Node regression, build, 20-check source/22-check packaged Electron workflows, browser smoke/13-check journey, archive checks, and unauthenticated downloads of all three public assets passed. Network truncation required Range retries before final verification. No natural-win, exhaustive-combat, or clean-machine/SmartScreen claim is made.
