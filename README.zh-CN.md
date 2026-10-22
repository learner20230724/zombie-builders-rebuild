# 建筑工大战僵尸 / Zombie Trailer Park — JavaScript 重建

[English](README.md)

这是 **Zombie Trailer Park 0.33（建筑工大战僵尸）**的可在浏览器运行的研究性重建快照，使用 **JavaScript、Canvas 2D 和 Web Audio**，不依赖 Flash、SWF 运行时或 Ruffle。

它不是官方再发行，也不是“完美复刻”声明；公开仓库不等于采用开源许可证。项目标记为 **UNLICENSED**，不是 MIT。复用前请阅读[第三方权利说明](THIRD_PARTY_NOTICES.md)。

## 已包含什么

快照包含开场、四关数据、经济、单位生产、战斗、本机记录，以及运行所需的图像和音频素材。浏览器执行的是 JavaScript 移植代码，不加载原游戏可执行文件。**存在四关数据，不代表当前版本的整条战役流程都已验证。**

原 Mochi 在线服务已经消失。本项目的记录和排行榜式展示**仅保存在本机**，不连接或恢复官方在线排行榜。

## 本地启动

安装 **Node.js 20 或更新版本**，然后运行：

~~~sh
git clone https://github.com/learner20230724/zombie-builders-rebuild.git
cd zombie-builders-rebuild
npm start
~~~

浏览器打开 **http://127.0.0.1:8318/**。Windows 用户也可以在安装 Node.js 后双击 **Start-Game.cmd**。游玩时请保持服务器运行。

**启动不需要 npm install。** 运行素材和 vendor 文件已经随快照提供。请通过本地服务器访问，不要直接双击 index.html。

## 检查命令

~~~sh
npm run build
npm test
~~~

- **npm run build**：检查发布所需文件，不会重新反编译 SWF，也不是从原始材料重做源码恢复。
- **npm test**：运行公开副本中的本地单元与游戏系统检查。2026-10-22 在 Node.js 24.14.1 下，公开快照已通过发布检查、26 项 Node 单测、56 组恢复数据检查、7,200 帧无界面模拟、215 项经济断言及 83 个受控战斗用例。它们不等于自然战役通关或像素、声音完全一致。

可选浏览器检查为 **npm run test:browser** 和 **npm run test:journey**。需要先手动运行 **npm install --no-save playwright**，已有 Microsoft Edge，并保持本地服务器运行。正常启动游戏不需要安装这些开发工具。本快照没有提供在线演示地址，也未启用 GitHub Pages。

## 复刻证据与边界

最近一次源工作区对照，将原始 ActionScript 字节码（ABC）放入 **项目自写的受限 JavaScript 字节码解释器**，与 JavaScript 移植版比较：**固定启动流程加 89 个受控战斗帧，354 个检查点通过**。这只是限定场景的差分证据，不是整局等价证明。夹具包含**预伤和授予收割机技能**，不能称为自然、无辅助的战役流程，也不是在这里重新执行公开副本测试得出的结果。

历史上前三关的自然 Canvas 胜利来自**较旧的生成版本**，不能直接算作当前版本的战役通关证据；**当前版本尚无第四关自然胜利的确认结果**。

仍未完成的保真工作包括 **与原生 Flash 参照仍存在的字体缩放差异**，以及**全部 31 项音频的完整 PCM／循环核验**。音频文件存在不代表波形和循环都已一致。**89 个受控帧不等于一整关、所有战斗情形或整个游戏。** 简表见[当前状态](docs/STATUS.md)。

## 仓库范围与复现

- **src/**：浏览器运行时、生成的游戏移植代码、数据与物理集成。
- **public/assets/**、**public/vendor/**：运行素材与第三方组件。
- **data/**：恢复的数据及精选来源、核验元数据。
- **scripts/**、**tests/**：精选本地检查和开发辅助工具。

可选的 **scripts/transpile-game.py**、**scripts/extract-data.py**、**scripts/verify-abc-data.py** 属于源码恢复开发工具，需要使用者自行准备匹配的原文件和反编译材料。直接运行公开快照不需要执行这条恢复流程。

公开版本不含原始 SWF／EXE、reference 转储、原 ActionScript 材料、工具二进制、原始运行日志、profiles、私人机器路径、研究材料或重复发布包。因此，它**不是完整的本机取证环境**，也不保证仅凭克隆仓库即可开箱重现历史验证证据。

## 权利说明

发布者表示已取得所含素材的公开发布授权。该确认不等于重新许可原游戏代码、美术、字体、音频或商标，也不自动授予下游复用权利。Box2D 保留自身的[原许可声明](public/vendor/BOX2D-LICENSE.txt)。详见[第三方权利说明](THIRD_PARTY_NOTICES.md)。
