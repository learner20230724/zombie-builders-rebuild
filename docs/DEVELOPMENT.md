# Development guide

[简体中文](DEVELOPMENT.zh-CN.md) · [Project README](../README.md)

## Quick development loop

Use **Node.js 20 or newer**. Normal startup needs no npm dependencies.

```sh
npm start
```

Open **http://127.0.0.1:8318/**. Edit the JSON files in `config/`, run the configuration check, then refresh the page and start a level:

```sh
npm run config:check
```

The browser reads configuration at page startup. No transpilation or code generation is needed for configuration changes. Invalid configuration stops startup and reports the affected JSON field instead of silently using defaults.

## Configuration files

Each file has `schemaVersion: 1` and an array named after the file:

```json
{
  "schemaVersion": 1,
  "units": [
    { "id": 0, "key": "shovel-man" }
  ]
}
```

The example above shows the container shape only. Keep the complete entries in the supplied files. For balance changes, retain existing IDs, types, keys, and required fields; the configuration describes the existing game entities rather than adding new character types.

| File | Main settings |
| --- | --- |
| `config/units.json` | Recruitment cost, training time, population, health, attacks, and movement |
| `config/zombies.json` | Zombie health, attacks, movement, and hit geometry |
| `config/buildings.json` | Construction cost, time, prerequisites, and maximum count |
| `config/powers.json` | XP cost, preparation time, cooldown, unlocks, and effect settings |
| `config/levels.json` | Starting resources, enemy multipliers, waves, and reinforcements |

The [configuration reference](../config/README.md) covers all fields and reinforcement ordering.

Units, zombies, and buildings use IDs **0–5**; unit and zombie ID **5** is the corresponding base. Powers use IDs **0–2**, and levels use IDs **1–4**.

### Example: stronger Shovel Men

In `units.json`, find `shovel-man` and change these values within its existing entry:

```json
{
  "id": 0,
  "key": "shovel-man",
  "cost": 40,
  "buildTicks": 45,
  "health": 70,
  "damage": 12
}
```

`cost` is cash, `buildTicks` is training time, and `people` controls population usage. `dependency` names a required building ID; `0` refers to the starting Trailer. Where present, `moveSpeed` is movement per battle tick. Attack fields vary by unit type; keep the fields supplied for that type.

### Example: adjust normal zombies

In `zombies.json`, find `zombie`:

```json
{
  "id": 0,
  "key": "zombie",
  "health": 30,
  "damage": 8,
  "hitRadius": 16,
  "hitOffset": 16
}
```

`health` and melee `damage` are base stats; level multipliers are applied by the combat logic. Corpse Thrower (ID `4`) uses `projectileDamage` instead of `damage`; its thrown-corpse damage is used directly and is not scaled by `zombieDamageMultiplier`. `hitRadius` and `hitOffset` affect contact geometry. To change the number of zombies, edit the level's waves rather than adding zombie entries.

### Example: cheaper Salvage Yards

In `buildings.json`, find `salvage-yard`:

```json
{
  "id": 1,
  "key": "salvage-yard",
  "cost": 400,
  "buildTicks": 250,
  "maximum": 5
}
```

`maximum` caps the number of that building. `dependency: 0` means no prerequisite; other values name the required building ID. Income and population rules are implemented in the game logic; changing a description does not change those rules.

### Example: tune the Harvester

In `powers.json`, find `harvester`:

```json
{
  "id": 1,
  "key": "harvester",
  "xp": 3500,
  "buildTicks": 150,
  "cooldownTicks": 9000,
  "unlockAfterStage": 1,
  "effect": {
    "moveSpeed": 0.75
  }
}
```

Powers spend `xp`, not cash. `unlockAfterStage: 0` makes a power available from the start; `1`–`4` require a stored completion record for the corresponding stage. Each power has its own `effect` fields.

### Example: change a level's opening

In `levels.json`, edit the existing `stage-1` entry. This fragment changes its starting resources and opening waves:

```json
{
  "id": 1,
  "key": "stage-1",
  "startingCash": 150,
  "startingXp": 0,
  "zombieDamageMultiplier": 1,
  "zombieHealthMultiplier": 1,
  "waves": [
    { "type": 1, "count": 5, "delay": 3 },
    { "type": 0, "count": 1, "delay": 4 },
    { "type": 2, "count": 2, "delay": 3 }
  ]
}
```

Wave `type: 0` is a wait entry. Types **1–5** select zombie IDs **0–4**, respectively. `count` sets the entry's count. `delay` is a wave-scheduler parameter, not a battle-tick field or a precise wall-clock duration. The game truncates it to an integer before scheduling; use whole numbers when tuning it.

The existing health calculation also converts `zombieHealthMultiplier` to an integer: for example, `1.75` uses a health factor of `1`. For the four melee zombie types, damage is multiplied first, then the result is truncated to an integer. This multiplier does not scale Corpse Thrower projectiles.

All snippets above show selected fields only: merge the values into the matching entry instead of replacing the entire file with a snippet. JSON does not support comments or trailing commas.

## Timing and game speed

The runtime targets **60 base updates per second**. Each update advances `bbgamespeed` battle ticks; the default speed is **2**, so normal play advances about **120 battle ticks per second**. The speed button cycles through **1, 2, 3, and 4**.

- `buildTicks` and `cooldownTicks` count battle ticks.
- At a steady update rate, a duration is approximately `ticks / (60 × bbgamespeed)` real seconds.
- The game's displayed time uses `battleTicks / 120`, independently of the selected speed.
- Background-tab throttling and catch-up limits can affect wall-clock timing.

Wave `delay` uses its own scheduler, as described above; do not convert it with the battle-tick formula.

## Runtime and extension points

| File | Responsibility |
| --- | --- |
| `src/boot.js` | Load assets and configuration, then start the game |
| `src/game-config.js` | Validate JSON and adapt it to the game's tables and behavior |
| `src/generated-game.js` | Game state, production, combat, UI, and level logic |
| `src/runtime.js` | Canvas rendering, Web Audio, input, and browser storage |
| `src/physics.js` | Physics integration |
| `scripts/server.mjs` | Local HTTP server and allowed resource routes |

The browser adapter is exposed as `GameConfig`; Node tools can load the same module with `require`. Its main functions are:

- `fromDocuments(documents)`: combine and validate the five JSON documents.
- `validate(config)`: validate a combined configuration and return a normalized copy.
- `compile(config)`: produce the runtime tables and effect settings.
- `install(target, config)`: call before `bb_Init()` to wrap initialization and reapply configuration before `bb_Main()` runs.
- `apply(target, config)`: apply directly after `bb_Init()` and before `bb_Main()`.

Keep handwritten configuration behavior in `src/game-config.js`. Regenerating `src/generated-game.js` does not overwrite `config/`. `data/raw.json` is baseline data used by checks, not the user-facing balance configuration. New entity types or new mechanics also require changes to game behavior, animation, and UI code.

## Checks and packaging

```sh
npm run config:check
npm run build
npm test
npm run package
```

`build` validates distribution files; it does not regenerate game code. `npm run package` produces the portable web package by default. To also create a Windows x64 package with a bundled runtime, supply a Windows x64 `node.exe` and its complete license:

```powershell
npm run package -- --node-binary "C:\Program Files\nodejs\node.exe" --node-license licenses/Node.js-LICENSE.txt
```

The included Node.js license corresponds to 24.14.1. Supply the matching complete license if you select another runtime version. ZIP files and `checksums.txt` are written to `output/releases/`.

The server binds to `127.0.0.1` and defaults to port **8318**. To use another port in PowerShell:

```powershell
$env:PORT = '8319'
npm start
```

### Browser checks

Browser checks are optional development tools. Install Playwright, have Microsoft Edge available, and keep the local server running in another terminal:

```sh
npm install --no-save playwright
npm run test:browser
npm run test:journey
```

The scripts default to the `msedge` browser channel and **http://127.0.0.1:8318/**. Set `PLAYWRIGHT_CHANNEL` or `GAME_URL` when using another installed browser channel or server address.

## Local progress

Completed stages, unlock progress, and records are stored in the current browser's local storage. They are not shared between browsers or machines. This is progress tracking, not an in-battle save system.

