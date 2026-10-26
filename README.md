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
- Instant in-game editing, shared troop multipliers, custom power summons, independent spawn queues, and type-specific clearing.
- Side-by-side settings: keep the game visible and choose whether to pause or play while editing.
- Scoped cross-camp targeting and bounded base-hit debris preserve combat rules in large sandbox battles.

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

The table shows the original defaults. In custom rules, a building's **`maximum: 0` removes its gameplay cap**; positive values **1–100,000** set a cap. Changes apply to the current battle without removing existing buildings or paid orders. Extra buildings still contribute income/population even when the artwork has no additional drawing slots. A separate engine safety ceiling of 100,000 per building type remains.

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

Press **F2** to open settings beside the game (below it in narrow windows). Opening pauses by default; the **time controls at the top of the settings panel** provide pause/resume and **0–20× speed** (0.1 steps). The closed game view has no extra customization widgets.

**Changes apply automatically:** checkboxes and menus act when selected; numbers act on **Enter or leaving the field**. There is no separate “Apply to battle” step. Invalid values stay marked without changing the battle. Only settings that require a fresh battle are labelled accordingly.

| Area | Controls |
| --- | --- |
| Sandbox / spawning | **Friendly and enemy spawn panels stay visible together**, each with its own type, quantity, and rate. Both select any of **ten types** (five humans + five zombies); five immediate human cards and five zombie cards provide quick single-unit spawns. Each camp enters from its own side with normal configured stats. A live troop table shows both camps’ counts for all ten types and totals. |
| Spawn queues | Click **加入出兵队列** to start an independent stream at its own **units/game-second** rate; 0 pauses that job, 0.1 means one every 10 game-seconds. Add batches, edit rates live, or cancel pending jobs without removing spawned troops. Status distinguishes a full battlefield, game/runtime pause, each job’s zero rate, and an ended or missing battle. Occupancy shows **entityCount / 1,000 including bases**: normally 998 troop slots; excess requests remain pending. |
| Clear current troops | Clear **both armies in one click**, an entire side, or a selected human/zombie type by its **current camp**, including converted units. Original death animations follow that camp's direction; bases and future production/waves remain. |
| Both bases | Quick access directly below clearing: edit maximum HP and **current HP** separately. Current HP can be set to 0 to end the battle normally. |
| Survivors / zombies | Edit each type; shared **HP, movement, and damage multipliers** sit above the type selector. They follow species (not camp), exclude bases, and combine multiplicatively with stage settings for zombies. |
| Buildings | Edit price, time, and limits. **Maximum 0** removes the original gameplay cap; extra Salvage Yards contribute real income. |
| Powers | Angry Mob can summon all five survivor types: Shovel Men, Farmers, Survivalists, Bombers, and Preachers. Larger requests are queued instead of discarded at the old 1,000-request limit. **Friendly/enemy columns each have three one-click power icons** for free immediate sandbox releases; normal game buttons still require XP, charge, unlocks, and cooldowns. Cancel the selected power’s effects or all power effects with one button. |
| Stages / waves | Edit type, count, delay, and enabled state. **Newest rows display first**, so added groups are immediately accessible; display order does not reverse execution order. Pause/resume scripted waves independently of battle and manual spawn jobs. **Unlock all buildings, powers, and stages** beside the stage editor; this changes custom rules and enables all four menu stages without granting buildings, resources, or win records. |

**Start custom battle** starts a fresh stage with all edited rules. **Custom-battle startup and reload restore the normal 60 Hz game scheduler**; this is a scheduling target, not a guarantee of 60 FPS. **Save rules** names a reusable preset; load/import/reset/undo also commit their valid values automatically. Export JSON backs up a preset. Original and custom completion records remain separate. Returning to original mode keeps your presets.

### Live behavior

- HP changes can keep each living unit's health percentage (default) or affect new units only; current-base HP has its own direct control. Maximum HP accepts **1–2,147,483,647**.
- Damage/speed/switches affect subsequent actions; active production and cooldowns keep their progress. Projectiles already in flight keep their launch damage.
- High-damage base hits limit only decorative debris to **256 live fragments per base (512 combined)**, not units or damage. Ordinary sparse hits and separate unit-death visuals remain intact; actual HP loss and victory handling are unchanged.
- An unfinished wave's remaining count is `max(0, new total − already scheduled)`. Finished groups never replay; add a new group for another batch. Live status shows actual spawned/remaining counts.
- Ordinary recruitment population/prerequisite and unlock edits, opening resources, reinforcements, and other stages' queues take effect when starting the corresponding new battle. The dedicated **unlock-all action** removes prerequisites and power locks immediately in custom mode.

More field details and technical limits are in the [configuration reference](config/README.md) and [development guide](docs/DEVELOPMENT.md).

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
