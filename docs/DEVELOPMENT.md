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

An applied custom session is restored while external gameplay settings are unchanged. A gameplay-value or wave-order change takes precedence on the next startup and is reported in settings. Wave IDs are identity metadata, excluded from this comparison and from original/custom-mode classification; adding IDs alone does not reset a v0.3.0 selected session. Saving a preset alone does not select it for startup. Restoring original mode selects the baseline without rewriting external files.

### Desktop development

Desktop development and packaging require **Node.js 22.12 or newer** (the Electron tooling has a higher requirement than the web game):

```sh
npm install
npm run desktop
```

The desktop app uses Electron **45.0.0** and the fixed local origin **`ztp://game/`**. It does not start `scripts/server.mjs`, bind an HTTP port, or launch an external browser. The renderer has no Node.js access; the main process serves only explicitly allowed game files. F11 toggles fullscreen, F2 opens customization, and F1 locates configuration and saves.

On Windows, editable files live in **`%APPDATA%\ZombieBuilders\config`** and progress/presets in the same user-data profile. Startup copies missing configuration files with exclusive creation; it does not overwrite an existing file. Editing `config/` in the source tree does not replace files already copied into this profile. For an isolated development profile, set `ZOMBIE_BUILDERS_DATA_DIR` to an **absolute** directory before starting Electron. Do not point tests at a player's real profile.

Original browser data is not automatically migrated into the desktop profile. Moving or updating the installation keeps user data separate, but keeping backups is still recommended.

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

`config/defaults/` contains the separate original-mode baseline. Treat it as the baseline, not as the user's editable balance directory. **Return to original mode (`回到原版模式`)** reloads that baseline without deleting named presets; **Reset draft (`恢复原版默认`)** only resets the editor's unsaved values.

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

`maximum` is an integer **0–100,000**: **0 removes the gameplay cap**, while positive values set the cap. The engine independently stops new orders at a safety ceiling of 100,000 per type. Counts include completed buildings and queued orders. A live decrease does not dismantle buildings or cancel already paid orders; it only prevents additional orders while at/above the new cap. Original defaults remain Trailer 15, Salvage Yard 5, and the other types 1.

Rendering retains the original finite building slots, but extra completed buildings still count for income and population. Repeated unlock buildings do not invent extra abilities or new artwork. `dependency: 0` means no prerequisite; other values name the required building ID. Salvage income and Trailer capacity are editable through the preset's separate `rules.economy` fields, not building descriptions.

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

Powers spend `xp`, not cash. `unlockAfterStage: 0` makes a power available from the start; `1`–`4` require a stored completion record for the corresponding stage. Each power has its own `effect` fields. Harvester damage and range are separate preset fields in `rules.abilities`.

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
    { "id": "stage-1-wave-1", "type": 1, "count": 5, "delay": 3 },
    { "id": "stage-1-wave-2", "type": 0, "count": 1, "delay": 4 },
    { "id": "stage-1-wave-3", "type": 2, "count": 2, "delay": 3 }
  ]
}
```

Wave `type: 0` is a wait entry. Types **1–5** select zombie IDs **0–4**, respectively. `count` sets the entry's count. `delay` is a wave-scheduler parameter, not a battle-tick field or a precise wall-clock duration. The game truncates it to an integer before scheduling; use whole numbers when tuning it.

Wave and reinforcement-call entries may include **`"enabled": false`** to skip them; omitting the field means enabled. An empty wave list is allowed. `count` must remain a positive integer: disable or delete an entry instead of using zero. The default scheduler does not wait until enemies are killed, and its finite queue does not loop automatically.

Main-wave **`id`** is optional when loading a source configuration, and must be unique within its stage if supplied: 1–80 ASCII letters, digits, underscores, or hyphens. Validation fills original missing IDs such as `stage-1-wave-1`; starting a battle binds those identities to the real queue. Keep an ID when editing or moving a group. New editor rows receive a new `wave-...` ID. IDs identify groups, not zombie types or their screen row positions.

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
| `src/custom-rules.js` | Validated spawning and ability switches outside generated code |
| `src/customization.js` | Named presets, explicit live operations, and separate custom records |
| `src/settings-ui.js` / `.css` | Non-modal settings dock, field editors, wave controls, and sandbox buttons |
| `src/generated-game.js` | Game state, production, combat, UI, and level logic |
| `src/runtime.js` | Canvas rendering, Web Audio, input, and browser storage |
| `src/physics.js` | Physics integration |
| `scripts/server.mjs` | Local HTTP server and allowed resource routes |
| `desktop/main.cjs` / `protocol.cjs` | Sandboxed desktop window, fixed local resource protocol, and user configuration |

The browser adapter is exposed as `GameConfig`; Node tools can load the same module with `require`. Its main functions are:

- `fromDocuments(documents)`: combine and validate the five JSON documents.
- `validate(config)`: validate a combined configuration and return a normalized copy.
- `compile(config)`: produce the runtime tables and effect settings.
- `install(target, config)`: call before `bb_Init()` to wrap initialization and reapply configuration before `bb_Main()` runs.
- `apply(target, config)`: apply directly after `bb_Init()` and before `bb_Main()`.
- `getCurrent(target)`: return a deep copy of the latest complete configuration, including values deferred to the next battle.
- `updateLive(target, config, options)`: update an initialized game, returning `{applied, deferred}` arrays of changed JSON paths. Supply the complete validated configuration, not a partial patch.
- `getWaveProgress(target)`: snapshot tracked current/upcoming groups, consumed/spawned counts, completed IDs, and known group identities.
- `applyLiveWaves(target, config)`: reconcile the current stage's unspawned schedule by identity, returning `{applied, deferred, notes, requiresNewBattle, reason, progress}`.

### Live-apply contract

`updateLive` is separate from startup-only `install` and `apply`:

```js
const next = GameConfig.getCurrent(globalThis);
next.zombies[3].health = 1500;
const result = GameConfig.updateLive(globalThis, next, {
  healthPolicy: 'ratio',       // or 'new-only'
  preserveTimerProgress: true
});
```

- `ratio` maps each living body's remaining percentage to its new maximum, rounds to the nearest integer, and keeps at least 1 HP. This includes bases and converted allies; dead bodies are not revived. `new-only` retains existing bodies' individual maxima and affects newly created bodies.
- Movement updates retain direction and temporary stops/slows. Shared cost, damage, and hit geometry change for subsequent actions. Existing projectiles retain the damage they were launched with.
- Active training, power charging, and cooldown timers preserve remaining progress; fractional remaining ticks round up, with a minimum of one. Already paid resource/population costs are not recalculated.
- Building `maximum` updates during the current battle; lowering it preserves buildings and paid orders. Unit `people`/`dependency`, building `dependency`, power `unlockAfterStage`, and starting resources/reinforcement definitions remain deferred to the next reset. This low-level `updateLive` also defers wave arrays; the player-facing `Customization.applyDraft` immediately follows it with `applyLiveWaves` for the current stage. Other stages' waves stay deferred until that stage starts. Menu-time updates have no active battle to preserve.
- Live changes use complete validation and a prepared update plan before committing; this is not an API for mutating arbitrary generated-game fields.

Use **`Customization`**, not the low-level adapter alone, for player-facing operations: it handles mode promotion, preset storage, records, and UI pause behavior.

### Non-modal editing

Settings reserve a right-hand dock when the viewport is wider than **850 CSS pixels**; at **850 or below**, the game is above the settings. The canvas retains its 800×600 logical coordinate system while its visible area resizes. Opening settings takes an editor pause token; **继续战斗** releases that token without closing the dock, and **暂停战斗** takes a new token. These operations do not forcibly clear the game's own pause state. Closing settings restores the runtime state associated with its editor pause rather than replaying elapsed edit time.

F2 toggles the dock globally. Esc closes it when focus is inside settings; form typing stays separate from game controls. Values remain a draft until explicit application: continuing the battle or saving a named preset is not an implicit apply.

### Presets, rules, and sandbox

`Customization` exposes the active controller after boot. `getDraft()` returns `{config, rules}`. Important operations are:

| Method | Meaning |
| --- | --- |
| `savePreset(name, spec, id?)`, `loadPreset(id)`, `deletePreset(id)`, `listPresets()` | Manage named local presets; loading only returns a draft |
| `exportPreset(spec, name)`, `importPreset(jsonText)` | Round-trip a versioned JSON preset; import validates but does not save/apply |
| `startCustomBattle(stage, spec)` | Save the session selection, reload, and start stage 1–4 |
| `validateDraft(spec)` | Validate and normalize both configuration and rules without changing state |
| `applyDraft(spec, {healthPolicy})` | Recommended: validate both documents before mode promotion or live changes, then apply together |
| `applyLive(config, {healthPolicy})` | Promote an active original run to custom and apply supported values |
| `applyRules(rules)` | Apply behavior switches in a custom battle |
| `spawnZombie(type, count = 1)` | Immediately create zombie type 0–4 in a custom battle; count 1–20 |
| `applyUpcomingWaves(config)` | Compatibility wave-only alias for safe tracked-current-stage synchronization; does not apply other draft attributes |
| `getBattleStatus()` | Read running/editor/game pause states, building counts, entity counts, and actual wave progress |
| `restoreOriginal()` | Reload original mode; does not delete saved presets |
| `pauseForEditor()`, `resumeFromEditor(token)` | Pause the editor safely without catch-up simulation on close |

Use `applyDraft` for a complete player-edited draft rather than chaining `applyLive` and `applyRules`: an invalid rule must not leave a valid configuration half-applied. Validation failures leave the mode, stored data, and live configuration unchanged.

### Current-battle wave reconciliation

The normal `applyDraft` operation updates the current stage's waves; there is no separate replace/replay button. Its `waveReport` contains `{applied, deferred, notes, requiresNewBattle, reason, progress, stage, otherStages}`. A live application does not restart the battle or wait for enemies to be killed.

- For an unfinished ID, **remaining = `max(0, requested count - consumed)`**. `consumed` counts scheduler events, including waits or types filtered out by automatic-spawn rules; `spawned` counts actual generated enemies. Editing a count changes the intended battle total, not an additional number to append.
- Changing type affects only the unspawned remainder. Reordering moves IDs without losing their consumed counts. Disabled/deleted unfinished groups have their remaining queue entries removed; re-enabling a still-unfinished ID can restore its unconsumed remainder.
- Reducing count to the consumed amount or below completes that ID and cancels its remainder. A completed ID never replays in the current battle, even if its count is raised later; its edits are reported for the next battle. Add a fresh ID to request a genuinely new group.
- Existing group timers and the scheduler clock are preserved. A changed `delay` is used by the next original `time > truncate(delay)` check; elapsed time is not reset or rescaled. Existing enemies are untouched.
- Already queued reinforcement objects keep their relative slots; main-wave synchronization does not delete them or reset reinforcement-trigger history. Changing reinforcement definitions still requires the next battle.
- Editing another stage records the configuration, but does not change the active stage's queue. The report names those `otherStages` and their deferred paths.

Legacy imported presets without reliable IDs receive reserved `legacy-untracked-...` markers. They are valid for saving and starting a new custom battle, but are not guessed to match the current queue by row number. Until bound in a new battle, waves return `requiresNewBattle: true` with a reason and no queue mutation; other valid draft attributes still apply. IDs survive load/save/export and ordinary cloning. Do not use the reserved prefix for hand-authored new groups.

`getBattleStatus()` distinguishes runtime and gameplay state: `runtimeRunning`, `editorPaused`, `editorPauseCount`, `gamePaused`, and `battleRunning` are separate. It includes `buildings: [{id, built, queued, maximum}]`, `entities: {people, zombies, converted, total}`, `waveProgress`, `wavePending`, and `waveNotes`. `getState()` includes this as `battleStatus` plus core aliases. Progress exposes `current`, `upcomingGroups`, `remainingTotal`, `completedGroups`, `completed`, and `knownIds`; a group includes `id`, `type`, `total`, `consumed`, `spawned`, `remaining`, and `source` (`wave` or `reinforcement`). These are **actual running-state values**, not the editor's uncommitted draft.

Rule format:

```json
{
  "schemaVersion": 1,
  "automaticSpawning": true,
  "zombieTypesEnabled": [true, true, true, true, true],
  "baseReinforcements": true,
  "corpseSpawnOnImpact": true,
  "economy": {
    "salvagePayout": 50,
    "salvageIntervalTicks": 600,
    "populationPerTrailer": 5
  },
  "abilities": {
    "ghoulLongLeap": true,
    "preacherConversion": true,
    "fatAreaAttack": true,
    "corpseThrowing": true,
    "harvesterDamagePerTick": 100,
    "harvesterRange": 220
  }
}
```

| Numeric rule | Allowed range | Live behavior |
| --- | --- | --- |
| `economy.salvagePayout` | Integer 0–1,000,000 | Future income payments; does not change existing cash |
| `economy.salvageIntervalTicks` | Integer 1–1,000,000 | Remaps the current coin pool proportionally, rounding down |
| `economy.populationPerTrailer` | Integer 1–1,000 | Updates population capacity; does not remove existing over-cap units |
| `abilities.harvesterDamagePerTick` | Integer 0–100,000,000 | Next tick, including existing Harvesters; per target, not DPS |
| `abilities.harvesterRange` | Integer 0–3,200 | Next tick; original forward leading-edge test `0 <= distance < range`, excluding bases |

Manual spawning deliberately bypasses automatic-spawn filters; automatic waves and their ordering are not edited by the spawn buttons. `CustomRules.ENTITY_LIMIT` is **1,000 combined combat units**, including bases, survivors, enemies, and converted allies, but not projectiles, power effects, or particles. A paid training order waits at one remaining tick until a slot opens, retaining its payment and reserved population; it is not discarded or charged twice. Excess Angry Mob summons are truncated without refunding the deployed power. `automaticSpawning: false` freezes the queue's scheduling/counts, not the battle. Base-health crossings during disabled reinforcement spawning are consumed rather than replayed later. Type switches filter queued spawns; `corpseSpawnOnImpact` separately controls the extra Zombie at corpse impact.

`ghoulLongLeap: false` disables the Ghoul's long-distance leap but keeps its nearby jump-bite; disabling it in the air returns the current leap to its ground height and walking behavior on the next battle tick. The other three ability booleans suppress the listed hit/conversion/projectile without cancelling the action's elapsed time or inventing an alternate attack. Attack frequency, general attack ranges, leap distance/speed, Fat attack radius, Preacher conversion budget/range, and Air Strike bomb damage/radius are not numeric controls in this version. New entity types and mechanics still require code.

Version-1 presets made before the economy/Harvester/Ghoul additions may omit those added rule fields and receive their defaults. Unknown fields and the original required fields remain validated; backward compatibility is not permission to supply arbitrary JSON.

Storage keys are stable across release versions: `zombie-builders-presets-v1` (up to 25 named presets, 2 MiB total), `zombie-builders-session-v1` (selected rules), `zombie-trailer-park-0.33` (original records), and `zombie-builders-custom-v1` (custom records). Preset JSON import/export is limited to 2 MiB. Saving a preset does not rewrite the five external JSON files; original and custom records are not merged.

If profile storage is unavailable or full, ordinary live changes may continue in memory with a warning and will not be promised across restarts. Operations that require reloading—starting a custom battle or returning to original mode—must successfully save their session first; otherwise they report the error and keep the current battle instead of reloading with lost rules.

Keep handwritten configuration behavior in `src/game-config.js`. Regenerating `src/generated-game.js` does not overwrite `config/`. `data/raw.json` is baseline data used by checks, not the user-facing balance configuration. New entity types or new mechanics also require changes to game behavior, animation, and UI code.

## Checks and packaging

```sh
npm run config:check
npm run build
npm test
npm run package
npm run package:desktop
```

`build` validates distribution files; it does not regenerate game code. `npm run package` produces the portable web package by default. **`npm run package:desktop`** builds a real Electron Windows x64 application directory at `output/desktop-v<version>/` and the `zombie-builders-desktop-win-x64-v<version>.zip` archive plus `desktop-checksums.txt` under `output/releases/`. Keep the entire extracted directory, including DLLs, `locales`, `resources`, `LICENSE`, and `LICENSES.chromium.html`; the EXE alone is not a complete app. The packager refuses to silently overwrite an existing release output.

An optional **web-server** Windows package can still bundle a Windows x64 `node.exe` and its complete matching license. This is not the Electron desktop package:

```powershell
npm run package -- --node-binary "C:\Program Files\nodejs\node.exe" --node-license licenses/Node.js-LICENSE.txt
```

The included Node.js license corresponds to 24.14.1. Supply the matching complete license if you select another runtime version. ZIP files and `checksums.txt` are written to `output/releases/`.

The server binds to `127.0.0.1` and defaults to port **8318**. To use another port in PowerShell:

```powershell
$env:PORT = '8319'
npm start
```

### Desktop checks

After `npm install`, run the real Electron workflow separately from the fast Node test suite:

```sh
npm run test:desktop
```

By default it launches the source app with the pinned Electron and Playwright dependencies. To check a packaged application or a second installation location:

```powershell
npm run test:desktop -- --executable "C:\QA\ZombieBuilders\ZombieBuilders.exe"
npm run test:desktop -- --executable "C:\QA\ZombieBuilders\ZombieBuilders.exe" --relocated-executable "C:\QA\Moved game\ZombieBuilders.exe"
```

Both locations must contain the **complete extracted application**, not just its EXE. `--relocated-executable` requires `--executable` and uses the same isolated profile to verify that moving the installation preserves external configuration, presets, and records.

Each invocation creates a new **`output/playwright/desktop-qa-*/`** directory, retains its private QA profile, screenshots, exported preset, and `report.json`, and closes only the Electron app instances it launched. It does not read, reset, or delete a player's normal profile. `--output` can select a different artifact parent strictly inside this project's `output/`; `npm run test:desktop -- --help` shows options without launching a window.

The suite exercises real window scaling/fullscreen, canvas input, editor pause/resume, live changes, one-click spawning, wave editing/filtering, JSON export, restarts, and original/custom record separation. Record-persistence checks use labeled nonzero score fixtures, not a claim of a natural victory. Passing this suite does not prove every combat/animation combination, native-Flash equivalence, or clean-machine/SmartScreen behavior; inspect the report's explicit coverage and `notCovered` fields.

### Browser checks

Browser checks are optional development tools. Install the pinned project dependencies, have Microsoft Edge available, and keep the local server running in another terminal:

```sh
npm install
npm run test:browser
npm run test:journey
```

The scripts default to the `msedge` browser channel and **http://127.0.0.1:8318/**. Set `PLAYWRIGHT_CHANNEL` or `GAME_URL` when using another installed browser channel or server address.

## Local progress

Completed stages, unlock progress, presets, and records use the current browser/desktop profile's local storage. They are not shared between browsers, profiles, or machines. Original and custom records use different namespaces. Selected rules and the selected custom stage can survive a restart, but that stage starts fresh; the current battlefield is not serialized. This is not an in-battle save system. Export presets before moving to a different profile.
