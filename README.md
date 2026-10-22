# 建筑工大战僵尸 / Zombie Trailer Park

[简体中文](README.zh-CN.md) · [Download](https://github.com/learner20230724/zombie-builders-rebuild/releases/latest)

A desktop and browser version of **Zombie Trailer Park (建筑工大战僵尸)** built with **JavaScript, Canvas 2D, and Web Audio**. Build your trailer park, grow your income, recruit survivors, and push back the zombie horde. No Flash or Ruffle is required.

## Features

- Four levels with unit production, base building, resource management, and combat.
- Windows desktop edition: double-click `ZombieBuilders.exe` to play offline in its own window.
- Game-only view that scales with the window and browser fullscreen.
- Survivor units, zombie types, and special powers with distinct roles.
- Bundled graphics and audio, plus local progress and records.
- Editable JSON configuration for units, zombies, buildings, powers, and levels.
- In-game custom presets, live balance changes, wave editing, and one-click zombie spawning.

## Default game parameters

These are the defaults in [config/](config/). Durations below use **battle ticks**: speed **2** is the default, at about **120 ticks/second**. Movement is in pixels per tick while walking. Attacks follow each character's animation and state machine; the attack values are **not DPS or a shared attack-rate constant**.

### Recruitable units

| Unit | Cash | Population | HP | Effective attack value | Move speed | Train (ticks) |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| Shovel Man | 50 | 1 | 50 | 10 melee damage budget | 0.5 | 50 |
| Angry Farmer | 200 | 2 | 100 | 15, nearest forward target | 0.328125 | 300 |
| Survivalist | 900 | 5 | 400 | 5 per machine-gun shot event | 1.2 | 500 |
| Moonshine Bomber | 350 | 2 | 80 | 100 per bottle explosion | 0.25 | 300 |
| Preacher Man | 1,500 | 3 | 100 | Converts enemies; no direct damage | 0.4 | 1,500 |

Shovel, machine-gun, and explosion damage can pass leftover damage to later eligible targets; the listed value is not full damage to every target. Preachers convert the first four zombie types, not Corpse Throwers or bases. Recruitment prerequisites follow the building unlocks below.

### Zombies

| Type | Base HP | Base attack | Move speed | Kill XP | Behavior |
| --- | ---: | --- | ---: | ---: | --- |
| Zombie | 25 | 10 melee | 0.25 | 25 | Slow, close-range attacks |
| Jumping Ghoul | 60 | 16 melee | 0.5 | 60 | Leaping approach and close-range jump attacks |
| Fast Zombie | 150 | 20 melee | 1.5 | 150 | Fast movement and close-range scratches |
| Big Fat Zombie | 1,000 | 60 melee damage budget | 0.4 | 1,000 | Heavy strikes share damage among nearby targets |
| Corpse Thrower | 1,500 | 500 per corpse impact | 0.0625 | 1,500 | Ranged corpses; each impact also spawns a Zombie |

Corpse impacts share their damage budget among eligible player targets; this damage is not scaled by the stage's melee multiplier. Kill XP uses the configured base HP. Conversion gives no XP, nor does the later death of a converted ally. Player/enemy bases have **4,000 / 16,000 HP**.

### Buildings

| Building | Cash | Maximum | Build (ticks) | Requires | Effect |
| --- | ---: | ---: | ---: | --- | --- |
| Trailer | 250 | 15 | 300 | — | +5 population capacity each |
| Salvage Yard | 500 | 5 | 300 | — | Average $50 per 600 ticks per yard; income is pooled |
| Farm House | 1,000 | 1 | 500 | — | Unlocks Angry Farmers |
| Garage | 1,500 | 1 | 500 | Farm House | Unlocks Survivalists |
| Still | 1,200 | 1 | 1,000 | Farm House | Unlocks Moonshine Bombers |
| Chapel | 1,500 | 1 | 2,000 | Garage | Unlocks Preachers |

You begin with one Trailer and one Salvage Yard; maximum counts include them. Each completed yard adds one income coin per tick to a shared pool, which pays $50 whenever it reaches 600 coins.

### Special powers

| Power | XP | Charge (ticks) | Cooldown (ticks) | Effect | Unlock |
| --- | ---: | ---: | ---: | --- | --- |
| Angry Mob | 3,000 | 150 | 5,000 | 12 Shovel Men + 4 Farmers; movement ×1.5, no recruitment population cost | Available immediately |
| Harvester | 4,000 | 150 | 10,000 | Speed 0.6; 100 damage per tick to each zombie within its forward range of 220, excluding the base | Saved Stage 1 win |
| Air Strike | 5,000 | 150 | 10,000 | 3 jets at speed 6; each bomb has a 500-damage explosion budget | Saved Stage 2 win |

Cooldown starts when the effect is deployed, after charging. Unlocks use local completion records.

### Stage differences and waves

| Stage | Melee damage × | Zombie / Fast hit | HP multiplier → effective factor | Starting cash | Fixed entries (waits) | Queued zombies |
| --- | ---: | --- | --- | ---: | ---: | ---: |
| 1 | 1 | 10 / 20 | 1 → 1 | 100 | 66 (10) | 764 |
| 2 | 1.25 | 12 / 25 | 1.25 → 1 | 100 | 68 (10) | 794 |
| 3 | 1.5 | 15 / 30 | 1.5 → 1 | 100 | 68 (10) | 816 |
| 4 | 1.75 | 17 / 35 | 1.75 → 1 | 100 | 68 (10) | 835 |

All stages start with **0 XP**. Melee damage is `truncate(base damage × stage multiplier)`. The HP multiplier is itself truncated **before** multiplication, so the five zombie types keep the HP shown above in all four default stages.

Extra reinforcements trigger when the enemy base crosses from above a threshold to that HP or lower:

| Stage | At 13,000 base HP | At 9,000 base HP | At 5,000 base HP | Extra / combined queued count |
| --- | --- | --- | --- | --- |
| 1 | 20 Zombies | 30 Zombies + 1 Fat | 40 Zombies + 3 Fast + 1 Fat | 95 / 859 |
| 2 | 30 Zombies | 40 Zombies + 1 Fat | 50 Zombies + 5 Fast + 2 Fat | 128 / 922 |
| 3 | 40 Zombies | 50 Zombies + 2 Fat | 60 Zombies + 6 Fast + 3 Fat | 161 / 977 |
| 4 | 40 Zombies + 10 Ghouls | 50 Zombies + 3 Fat | 60 Zombies + 7 Fast + 3 Fat + 1 Corpse Thrower | 174 / 1,009 |

Counts describe the configured queues, excluding waits, bases, and Zombies created by corpse impacts; combined counts assume all three reinforcements trigger. Reinforcement calls are inserted at the queue front, so their listed call order runs in reverse. Wave `delay` is an integer-truncated **scheduler value**, not a direct battle-tick duration or wall-clock seconds. See the [configuration reference](config/README.md) for wave timing and ordering.

The default queue is **finite and time-scheduled**: it does not wait for the battlefield to be cleared before advancing. All four stages end their fixed queue with **20 Fat → 100 Zombies → 3 Corpse Throwers → 20 Fast → 50 Fat**. Ending that queue does not disable base-health reinforcements or Zombies created by corpse impacts.

## Download and play

Get the latest package from [Releases](https://github.com/learner20230724/zombie-builders-rebuild/releases/latest).

- **Windows desktop (`desktop-win-x64`)**: extract the **entire** ZIP, then double-click **ZombieBuilders.exe**. No browser, separate Node.js installation, terminal, or local HTTP service is needed. Keep its DLLs, `locales`, and `resources` beside the EXE; it is not a single-file executable.
- **Portable web package**: extract it, install **Node.js 20 or newer**, and run `npm start` from the extracted folder.

For the **web package only**, open **http://127.0.0.1:8318/** and keep the server running while playing.

Desktop configuration and progress live in **`%APPDATA%\ZombieBuilders`**, outside the installation directory. The five JSON files in its `config` subfolder are copied on first use without overwriting existing files. Press **F1** to locate them or **F11** to toggle fullscreen. Desktop data and an existing browser's data are separate; old web progress is not automatically imported.

## Run from source

With **Node.js 20 or newer** installed:

```sh
git clone https://github.com/learner20230724/zombie-builders-rebuild.git
cd zombie-builders-rebuild
npm start
```

Then open **http://127.0.0.1:8318/**. On Windows, you can also double-click **Start-Game.cmd**. Startup does not require `npm install`. Use the local server rather than opening `index.html` directly.

## Customize the game

Click **⚙ 自定义** along the left edge of the game or press **F2** to open the customization panel; **Esc** closes it. Opening it pauses the battle. The six tabs cover sandbox/spawning, survivors, zombies, buildings, powers, and stages/waves. Each field shows its default, edited value, unit, and application timing.

| Action | Result |
| --- | --- |
| Save rules (`保存规则`) | Saves a named rule set; does not change the battle |
| Load / import preset | Loads an editable draft; does not apply it or overwrite another preset |
| Apply to battle (`应用本局`) | Applies supported values now and marks the run as custom |
| Start custom battle (`开始自定义战局`) | Starts a fresh stage with the complete draft |
| Reset draft (`恢复原版默认`) | Resets edited values only; does not apply them or delete presets |
| Return to original mode (`回到原版模式`) | Ends the current battle and returns to original mode; keeps presets |
| Export JSON (`导出 JSON`) | Downloads a JSON file for backup or sharing |

**Try one-click spawning:** open **沙盒 / 刷怪**, select a stage and **开始自定义战局**. Open F2 again and click **肥胖僵尸** once to add one, then close the panel with Esc to let it move. Spawning requires an active custom battle.

### What changes immediately?

| Setting | Current battle |
| --- | --- |
| Health | Choose **keep health percentage** (default) or **new units only**; dead units are never revived |
| Damage, speed, hitboxes, costs | Subsequent actions use the new values; projectiles already in flight keep their original damage |
| Training, charging, cooldown | Preserve the remaining percentage, rather than restarting completed work |
| Salvage payout / interval, population per Trailer | Live rule settings; existing cash/units are kept and the income pool retains its progress |
| Harvester damage / range, listed ability switches | Subsequent battle ticks/actions, including active Harvesters |
| Population, prerequisites, building limits, power unlocks | Next battle; previously paid orders are not refunded or recharged |
| Starting cash / XP, waves, base reinforcements | Next battle by default |
| Replace upcoming waves | Keep the current group/timer; replace everything after it, including queued reinforcements, with the edited stage's enabled entries |

Wave entries can be enabled/disabled, reordered, and edited by type, count, and scheduler `delay`. The sandbox also controls automatic queues, the five queued zombie types, base reinforcements, corpse-impact spawns, Ghoul long leaps, preacher conversion, Fat Zombie area attacks, and corpse throwing. Economy and Harvester damage/range are editable rule values. **Manual spawn is independent of automatic-spawn switches**: the **Big Fat Zombie** button creates one immediately, without changing wave order.

Original and custom runs have separate completion records and scores. Applying custom rules or sandbox changes must not improve original-mode records. Presets survive restoring original rules; they are local to the current desktop profile or browser.

The battlefield has a safety limit of **1,000 combat units including bases**. The editor covers the existing configurable values and listed behavior switches. Adding new character types, animation-driven attack rates, or entirely new abilities still requires game code; it is not an unrestricted mod engine.

### JSON configuration

For source development, edit **[config/](config/)**. In the desktop release, use **`%APPDATA%\ZombieBuilders\config`** instead of files inside the installation:

| File | Settings |
| --- | --- |
| `units.json` | Survivor stats, recruitment, and requirements |
| `zombies.json` | Zombie stats and combat settings |
| `buildings.json` | Building costs, limits, and requirements |
| `powers.json` | Special-power costs and cooldowns |
| `levels.json` | Level settings and zombie waves |

For source edits, run `npm run config:check`, then refresh the web page or restart the desktop app. These files are read at startup and are kept separate from generated game code. In-game presets are stored separately; saving a preset does not rewrite those five JSON files.

Applied custom rules are remembered when the external JSON is unchanged. Editing the external JSON takes precedence at the next startup; restoring original mode does not erase those files or your presets.

See the [development guide](docs/DEVELOPMENT.md) for field examples, timing, and the runtime structure.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the local game server |
| `npm run desktop` | Start the Electron desktop app after `npm install` |
| `npm run config:check` | Validate the game configuration |
| `npm run build` | Check the distributable files |
| `npm test` | Run automated game and runtime checks |
| `npm run test:desktop` | Run real Electron/UI checks in a new isolated QA profile |
| `npm run package` | Create the portable web package (default) |
| `npm run package:desktop` | Build the Windows x64 desktop EXE folder and ZIP |

Desktop EXE/relocation checks and optional browser checks are covered in the [development guide](docs/DEVELOPMENT.md#desktop-checks).

Web startup needs no dependency installation. Desktop development and packaging require `npm install` and **Node.js 22.12 or newer**.

## Project structure

```text
config/          Editable game configuration
config/defaults/ Original-mode defaults, separate from user edits
desktop/         Electron window, fixed local protocol, and desktop startup
src/             Browser runtime, game logic, and configuration adapter
public/assets/   Graphics, fonts, audio, and asset manifests
public/vendor/   Bundled third-party runtime components
scripts/         Local server, validation, and packaging tools
tests/           Automated checks
docs/            Development documentation
```

[Third-party notices](THIRD_PARTY_NOTICES.md)
