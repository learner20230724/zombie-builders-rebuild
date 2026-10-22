# 建筑工大战僵尸 / Zombie Trailer Park — JavaScript Reconstruction

[简体中文说明](README.zh-CN.md)

A browser-playable research reconstruction of **Zombie Trailer Park 0.33**, known in Chinese as **建筑工大战僵尸**, using JavaScript, Canvas 2D, and Web Audio. It runs without Flash, a SWF runtime, or Ruffle.

This repository is a **public research reconstruction snapshot**, not an official re-release or a claim of a perfect replica. The included game code and assets are not offered under MIT or another repository-wide open-source license. See [Third-party notices](THIRD_PARTY_NOTICES.md) before reusing anything.

## What is included

The snapshot includes the opening sequence, four levels' data, the economy and unit-production systems, combat, bundled visual and audio assets, and local records. The browser uses the supplied JavaScript port rather than loading the original game executable. Four levels being represented in the data does **not** mean every complete campaign path has been validated on this version.

The former Mochi online services are no longer available. Records and leaderboard-style displays here are **local-only**; they do not connect to or restore an official online leaderboard.

## Run locally

Install **Node.js 20 or newer**, then clone the repository and start its local server:

~~~sh
git clone https://github.com/learner20230724/zombie-builders-rebuild.git
cd zombie-builders-rebuild
npm start
~~~

Open **http://127.0.0.1:8318/** in your browser. On Windows, you can instead double-click **Start-Game.cmd** after installing Node.js. Keep the server running while playing.

**No npm install is required for startup.** Runtime assets and vendor files are included in this snapshot. Serve the project through the supplied server rather than opening index.html directly from the filesystem.

## Checks and optional browser tooling

~~~sh
npm run build
npm test
~~~

- **npm run build** checks the files needed for distribution. It is not a source-recovery pipeline, a new decompilation, or a rebuild from the original SWF.
- **npm test** runs the public copy's local unit and game-system checks. On 2026-10-22, this public snapshot passed the distribution check, 26 Node unit tests, 56 recovered-data checks, 7,200 headless simulation frames, 215 economy assertions, and 83 controlled combat cases (Node.js 24.14.1). These checks do not establish natural campaign completion or pixel/audio equivalence.

Optional browser checks are available as **npm run test:browser** and **npm run test:journey**. They require Playwright to be installed manually with **npm install --no-save playwright**, an existing Microsoft Edge installation, and the local server already running. These are development checks, not prerequisites for normal play. No hosted demo is provided, and GitHub Pages is not enabled for this snapshot.

## Fidelity: evidence and limits

The latest reported source-workspace comparison ran the original ActionScript bytecode (ABC) in an **restricted JavaScript interpreter** against the JavaScript port. A fixed startup sequence plus **89 controlled combat frames** passed **354 checkpoints**. This is narrow differential evidence, not a full-game equivalence proof. The fixture includes pre-damage and a granted Harvester ability; it is not a natural, unassisted campaign playthrough. Those results have not been presented here as a fresh execution of the public-copy test suite.

Historical natural Canvas victories for the first three levels came from an older generated version. They must not be transferred to the current port as proof of campaign completion. A natural fourth-level victory has not yet been established for the current version.

Known unfinished fidelity work includes **font-scaling differences from the native Flash reference** and **complete PCM/loop verification for all 31 audio items**. The existence of the audio files is not evidence that every waveform and loop matches. In particular, 89 controlled frames must not be read as an entire level, every combat situation, or the whole game. See [Current status](docs/STATUS.md) for the concise bilingual summary.

## Repository scope

- **src/**: browser runtime, generated game port, data integration, and physics integration.
- **public/assets/** and **public/vendor/**: bundled runtime resources and third-party components.
- **data/**: recovered game data and selected provenance/verification metadata.
- **scripts/** and **tests/**: selected local checks and development helpers.

The optional **scripts/transpile-game.py**, **scripts/extract-data.py**, and **scripts/verify-abc-data.py** are source-recovery development tools. Using them requires your own matching original files and decompilation materials. The runnable snapshot does not require that recovery workflow.

This release excludes the original SWF/EXE, reference dumps, original ActionScript material, tool binaries, raw run logs, profiles, private machine paths, research artifacts, and duplicate releases. Consequently, it is not a complete local forensic environment, and historical verification evidence is not reproducible out of the box merely by cloning it.

## Rights

The publisher states that they have permission to publish the included material. That confirmation does not itself relicense the original game's code, art, fonts, audio, or trademarks, or grant downstream reuse rights. The package is marked **UNLICENSED**. Box2D retains its own notice in [public/vendor/BOX2D-LICENSE.txt](public/vendor/BOX2D-LICENSE.txt).
