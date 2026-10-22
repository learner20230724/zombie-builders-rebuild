# 建筑工大战僵尸 / Zombie Trailer Park

[简体中文](README.zh-CN.md) · [Download](https://github.com/learner20230724/zombie-builders-rebuild/releases/latest)

A browser version of **Zombie Trailer Park (建筑工大战僵尸)** built with **JavaScript, Canvas 2D, and Web Audio**. Build your trailer park, grow your income, recruit survivors, and push back the zombie horde. No Flash or Ruffle is required.

## Features

- Four levels with unit production, base building, resource management, and combat.
- Survivor units, zombie types, and special powers with distinct roles.
- Bundled graphics and audio, plus local progress and records.
- Editable JSON configuration for units, zombies, buildings, powers, and levels.

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
| Harvester | 4,000 | 150 | 10,000 | Speed 0.6; 100 damage per tick to each zombie in its forward harvesting range, excluding the base | Saved Stage 1 win |
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

## Download and play

Get the latest package from [Releases](https://github.com/learner20230724/zombie-builders-rebuild/releases/latest).

- **Windows (`windows-x64`)**: extract the package and double-click **Start-Game.cmd**. Node.js is included; no separate installation is needed.
- **Portable web package**: extract it, install **Node.js 20 or newer**, and run `npm start` from the extracted folder.

Open **http://127.0.0.1:8318/** and keep the server running while playing. Progress and records are stored in your browser.

## Run from source

With **Node.js 20 or newer** installed:

```sh
git clone https://github.com/learner20230724/zombie-builders-rebuild.git
cd zombie-builders-rebuild
npm start
```

Then open **http://127.0.0.1:8318/**. On Windows, you can also double-click **Start-Game.cmd**. Startup does not require `npm install`. Use the local server rather than opening `index.html` directly.

## Customize the game

Edit the files in **[config/](config/)** to change game balance and level settings:

| File | Settings |
| --- | --- |
| `units.json` | Survivor stats, recruitment, and requirements |
| `zombies.json` | Zombie stats and combat settings |
| `buildings.json` | Building costs, limits, and requirements |
| `powers.json` | Special-power costs and cooldowns |
| `levels.json` | Level settings and zombie waves |

Run `npm run config:check`, then refresh the browser to load your changes. These files are read at startup and are kept separate from the generated game code.

See the [development guide](docs/DEVELOPMENT.md) for field examples, timing, and the runtime structure.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the local game server |
| `npm run config:check` | Validate the game configuration |
| `npm run build` | Check the distributable files |
| `npm test` | Run automated game and runtime checks |
| `npm run package` | Create the portable web package (default) |

Optional browser checks are covered in the [development guide](docs/DEVELOPMENT.md#browser-checks).

## Project structure

```text
config/          Editable game configuration
src/             Browser runtime, game logic, and configuration adapter
public/assets/   Graphics, fonts, audio, and asset manifests
public/vendor/   Bundled third-party runtime components
scripts/         Local server, validation, and packaging tools
tests/           Automated checks
docs/            Development documentation
```

[Third-party notices](THIRD_PARTY_NOTICES.md)
