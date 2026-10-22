# Third-party notices / 第三方权利说明

## Game material / 游戏内容

The publisher states that they have authorization to publish the included game material. Rights in Zombie Trailer Park's code, artwork, fonts, audio, names, and trademarks remain with their respective rights holders. The repository is marked **UNLICENSED**; it does not grant a blanket MIT license or new downstream rights to third-party game material.

发布者表示已取得所含游戏材料的公开发布授权。Zombie Trailer Park 的代码、美术、字体、音频、名称及商标仍归各自权利人所有。仓库标记为 **UNLICENSED**，不授予覆盖整个项目的 MIT 许可，也不另行授予第三方游戏内容的下游使用权。

## Box2D

The bundled Box2D component retains its applicable license and attribution in [public/vendor/BOX2D-LICENSE.txt](public/vendor/BOX2D-LICENSE.txt). Preserve that notice when distributing the component.

随附 Box2D 组件的适用许可与署名保留在 [public/vendor/BOX2D-LICENSE.txt](public/vendor/BOX2D-LICENSE.txt)，分发该组件时请保留声明。

## Electron desktop runtime / Electron 桌面运行时

The desktop edition uses **Electron 45.0.0**. Its Windows archive must retain the Electron distribution's complete `LICENSE` and `LICENSES.chromium.html` files beside `ZombieBuilders.exe`. These files contain the runtime's applicable license and third-party notices; the project's UNLICENSED metadata does not replace them. The desktop package does not require a separate Node.js installation.

桌面版使用 **Electron 45.0.0**。Windows 压缩包须完整保留 Electron 发行版中的 `LICENSE`、`LICENSES.chromium.html`，与 `ZombieBuilders.exe` 一起分发。运行时的适用许可及第三方声明以这些文件为准，不被本项目的 UNLICENSED 元数据替代。桌面包无需另行安装 Node.js。

Source / 来源：[Electron v45.0.0](https://github.com/electron/electron/tree/v45.0.0)

## Optional bundled Node.js / 可选的独立 Node.js 运行时

Legacy or optional Windows **web-server** packages may include Node.js **24.14.1**, separately from the Electron desktop package. Those archives include its complete license and third-party notices at `node/LICENSE`. The matching repository copy is [licenses/Node.js-LICENSE.txt](licenses/Node.js-LICENSE.txt). A different Node.js version must be distributed with its own matching complete license.

旧版或可选的 Windows **网页服务包**可单独包含 Node.js **24.14.1**，它与 Electron 桌面包不是同一发行形式。该类包在 `node/LICENSE` 中保留完整许可及第三方声明，仓库对应副本为 [licenses/Node.js-LICENSE.txt](licenses/Node.js-LICENSE.txt)。更换 Node.js 版本时，须同时提供匹配的完整许可证。

Source / 来源：[Node.js v24.14.1 license](https://github.com/nodejs/node/blob/v24.14.1/LICENSE)
