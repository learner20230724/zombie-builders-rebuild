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

`config/defaults/` contains the separate original-mode baseline. Treat it as the baseline, not as the user's editable balance directory. **Return to original mode (`回到原版模式`)** reloads that baseline without deleting named presets; **Reset defaults (`恢复原版默认`)** resets the values and automatically commits them through the same validated path as other editor changes.

Units, zombies, and buildings use IDs **0–5**; unit and zombie ID **5** is the corresponding base. Powers use IDs **0–2**, and levels use IDs **1–4**.

### Health values and validation messages

`units[].health` and `zombies[].health` accept integers **1–2,147,483,647**. The earlier 100,000,000 ceiling was a configuration guard, not a gameplay rule. The new ceiling matches the existing signed 32-bit combat representation; do not remove it without replacing the relevant integer arithmetic. Health `0` is death, not an invincibility flag.

An error path such as `$.units[5].health` points to the sixth JSON entry: the player base. `$.zombies[5].health` is the enemy base. Errors retain this machine-readable path and include readable Chinese field context. For every stage and non-base zombie, `truncate(health × rules.multipliers.zombies.health × truncate(zombieHealthMultiplier))` must also remain within **1–2,147,483,647**. Survivor HP includes `rules.multipliers.units.health`; neither base uses group or stage multipliers. Validation occurs before applying changes, and an invalid draft does not partially mutate a battle. High-health enemy kill rewards saturate accumulated XP at the same signed 32-bit ceiling rather than wrapping negative; later power spending still deducts XP normally.

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

The runtime targets **60 base updates per second**. The original `bbgamespeed` selects battle ticks per game update (default **2**, its in-game button cycles **1–4**). The **time controls embedded at the top of the F2 settings panel** multiplies the update clock with **0–20×** speed in **0.1** steps. **1×** preserves the original game's current speed, not one battle tick per frame; **0** stops simulation frames. Speed is session-only, not stored in presets or across restarts.

- At a steady update rate, ticks/second ≈ `60 × bbgamespeed × timeScale`; default is 120.
- `buildTicks` and `cooldownTicks` count battle ticks. Wave `delay` uses its own scheduler, not this tick formula.
- Displayed game time remains `battleTicks / 120`.
- Fractional time accumulates whole fixed simulation frames; changing speed does not inject extra RNG draws or replay time spent editing. 20× is a target, not a guaranteed measured rate. Scaled realtime RAF batches have an approximately **25 ms soft CPU budget** and a secondary 150-frame cap; after at least one due complete update/render frame, unserved whole-frame debt is discarded instead of accumulating catch-up. Default untouched 1× and deterministic manual step/advance paths are unchanged.
- `ZTPRuntime.setTimeScale(value)` validates `0..20` in 0.1 steps; `getStatus().timeScale` reports it. Explicit pause uses controller pause tokens, while zero speed can leave the runtime marked running with no simulation frames. Resume releases this panel's and the editor's pause token, restores a positive speed after 0, and never overrides the game's own pause or unrelated pause owners.

## Runtime and extension points

| File | Responsibility |
| --- | --- |
| `src/boot.js` | Load assets and configuration, then start the game |
| `src/game-config.js` | Validate JSON and adapt it to the game's tables and behavior |
| `src/custom-rules.js` | Validated spawning and ability switches outside generated code |
| `src/factions.js` | Species-independent allegiance, cross-camp targeting/combat, and rendering adapter |
| `src/spawn-queue.js` | Compact independent-rate manual jobs, fair dispatch, and job snapshots |
| `src/customization.js` | Named presets, validated immediate commits, sandbox actions, and separate custom records |
| `src/settings-ui.js` / `.css` | Non-modal settings dock, field editors, wave controls, and sandbox buttons |
| `src/generated-game.js` | Game state, production, combat, UI, and level logic |
| `src/runtime.js` | Fixed-frame time scaling, Canvas, audio, input, and browser storage |
| `src/time-controls.js` | Pause/speed controls embedded in the settings host |
| `src/physics.js` | Physics integration |
| `scripts/server.mjs` | Local HTTP server and allowed resource routes |
| `desktop/main.cjs` / `protocol.cjs` | Sandboxed desktop window, fixed local resource protocol, and user configuration |

The browser adapter is exposed as `GameConfig`; Node tools can load the same module with `require`. Its main functions are:

- `fromDocuments(documents)`: combine and validate the five JSON documents.
- `validate(config)`: validate a combined configuration and return a normalized copy.
- `compile(config, {multipliers}?)`: produce runtime tables/effects with optional validated group multipliers. `validateMultipliers` validates factors; compilation also checks effective stats.
- `install(target, config)`: call before `bb_Init()` to wrap initialization and reapply configuration before `bb_Main()` runs.
- `apply(target, config)`: apply directly after `bb_Init()` and before `bb_Main()`.
- `getCurrent(target)`: return a deep copy of the latest complete configuration, including values deferred to the next battle.
- `updateLive(target, config, options)`: update an initialized game, returning `{applied, deferred}` arrays of changed JSON paths. Supply the complete validated configuration, not a partial patch.
- `getWaveProgress(target)`: snapshot tracked current/upcoming groups, consumed/spawned counts, completed IDs, and known group identities.
- `getPowerProgress(target, {includeActive:true}?)`: read pending compact skill-dispatch groups; opt in to per-power active counts (`byPower`, `activeTotal`) without changing the default snapshot shape.
- `releaseSandboxPower(target, powerId, {side,validateOnly?})`: release an immediate skill for `friendly` / `enemy`; read-only preflight precedes budgeted dispatch, returning `{powerId,side,requested,spawned,pending}`.
- `applyLiveWaves(target, config)`: reconcile the current stage's unspawned schedule by identity, returning `{applied, deferred, notes, requiresNewBattle, reason, progress}`.

### Live-apply contract

`updateLive` is separate from startup-only `install` and `apply`:

```js
const next = GameConfig.getCurrent(globalThis);
next.zombies[3].health = 1500;
const result = GameConfig.updateLive(globalThis, next, {
  healthPolicy: 'ratio',       // or 'new-only'
  preserveTimerProgress: true,
  multipliers: CustomRules.defaults().multipliers
});
```

- `ratio` maps each living body's remaining percentage to its new maximum, rounds to the nearest integer, and keeps at least 1 HP. This includes bases and converted allies; dead bodies are not revived. `new-only` retains existing bodies' individual maxima and affects newly created bodies.
- Movement updates retain direction and temporary stops/slows. Shared cost, damage, and hit geometry change for subsequent actions. Existing projectiles retain the damage they were launched with.
- Active training, power charging, and cooldown timers preserve remaining progress; fractional remaining ticks round up, with a minimum of one. Already paid resource/population costs are not recalculated.
- Building `maximum` updates during the current battle; lowering it preserves buildings and paid orders. Unit `people`/`dependency`, building `dependency`, power `unlockAfterStage`, and starting resources/reinforcement definitions remain deferred to the next reset. This low-level `updateLive` also defers wave arrays; the player-facing `Customization.applyDraft` immediately follows it with `applyLiveWaves` for the current stage. Other stages' waves stay deferred until that stage starts. Menu-time updates have no active battle to preserve.
- Live changes use complete validation and a prepared update plan before committing; this is not an API for mutating arbitrary generated-game fields.

Use **`Customization`**, not the low-level adapter alone, for player-facing operations: it handles mode promotion, preset storage, records, and UI pause behavior.

### Non-modal editing

Settings reserve a right-hand dock when the viewport is wider than **850 CSS pixels**; at **850 or below**, the game is above the settings. The canvas retains its 800×600 logical coordinate system while its visible area resizes. Opening settings takes an editor pause token; the settings time section’s **继续战斗** releases that token without closing the dock, and **暂停战斗** takes its own pause token. These operations do not forcibly clear the game's own pause state. Closing settings restores the runtime state associated with its editor pause rather than replaying elapsed edit time.

F2 is the customization entry and toggles the dock globally; there is no extra customization button or floating time widget over the closed game. The time module mounts into `#ztps-time-host` below the settings header and before presets, expanded by default, instead of reserving space outside it. It hides with F2; an explicit time-panel pause remains in effect until resumed after reopening. Esc closes the dock when focus is inside settings; form typing stays separate from game controls. The editor calls `commitSettings` automatically on checkbox/select changes and committed field edits (Enter/change/blur; multiline text also accepts Ctrl+Enter). Loading/importing/resetting/undoing follows the same path. There is no Apply button. Saving a named preset remains a separate reusable-library action. Completed wave rows are read-only; newest rows display first while stored execution order remains unchanged.

### Presets, rules, and sandbox

`Customization` exposes the active controller after boot. `getDraft()` returns `{config, rules}`. Important operations are:

| Method | Meaning |
| --- | --- |
| `savePreset(name, spec, id?)`, `loadPreset(id)`, `deletePreset(id)`, `listPresets()` | Manage named local presets; loading only returns a draft |
| `exportPreset(spec, name)`, `importPreset(jsonText)` | Round-trip a versioned JSON preset; import validates but does not save/apply |
| `startCustomBattle(stage, spec)` | Save the session selection, reload, and start stage 1–4 |
| `validateDraft(spec)` | Validate and normalize both configuration and rules without changing state |
| `commitSettings(spec, {healthPolicy}?)` | Editor entry: validate both documents and auto-apply during a battle, or update the next-battle template without starting in menus |
| `applyDraft(spec, {healthPolicy})` | Lower-level complete live draft operation; validates both documents before mode promotion or mutation |
| `applyLive(config, {healthPolicy})` | Promote an active original run to custom and apply supported values |
| `applyRules(rules)` | Apply behavior switches in a custom battle |
| `enqueueSpawn(side, {kind,type}, count, {rate}?)` | Create a compact manual spawn job, count 1–2,147,483,647; rate 0–1,000,000 actors/game-second |
| `setSpawnJobRate(id, rate)` | Immediately update only that job’s rate; return its snapshot |
| `cancelSpawnJob(id = "all")`, `cancelAllSpawnJobs()` | Cancel pending requests for one/all jobs; return an array of cancelled-job snapshots; retain spawned actors |
| `spawnFactionUnit(side, {kind,type}, count = 1)` | Immediate low-level generation in `friendly` / `enemy`; `kind` is `unit` / `zombie`, `type` is 0–4, count is 1–998; shared live-capacity preflight |
| `spawnZombie(type, count = 1)` | Compatibility shortcut for enemy zombie type 0–4; count 1–998 |
| `spawnFriendlyUnit(type, count = 1)` | Compatibility shortcut for friendly human type 0–4; count 1–998 |
| `clearFriendlyTroops(selection?)`, `clearEnemyTroops(selection?)` | Clear one side or actor type; preserve bases, pause, paid orders, and future queues |
| `clearAllTroops()` | Atomically clear both camps after preflighting all three combat lists; retain bases, future queues, and power effects |
| `releaseSandboxPower(powerId, side = "friendly")` | Immediately release power 0/1/2 for either camp in a custom battle, without spending XP or changing normal power timers |
| `unlockAll()` | Immediately remove custom unit/building prerequisites and power locks, with four-stage access; no wins or resources granted |
| `setBaseHealth(side, currentHp)` | Set `friendly` / `enemy` base current HP to an integer `0..actual maximum`; 0 triggers normal game-over handling |
| `cancelPowerEffects(powerId = "all")` | In an active custom battle, cancel power 0/1/2 or all; works paused without advancing the battle |
| `applyUpcomingWaves(config)` | Compatibility wave-only alias for safe tracked-current-stage synchronization; does not apply other draft attributes |
| `getBattleStatus()` | Read running/editor/game pause states, building counts, entity counts, and actual wave progress |
| `restoreOriginal()` | Reload original mode; does not delete saved presets |
| `pauseForEditor()`, `resumeFromEditor(token)` | Pause the editor safely without catch-up simulation on close |

Preset load/import methods above return data only; the settings UI immediately feeds their valid result to `commitSettings`. Use `commitSettings` for editor events (`applyDraft` for low-level live-only callers), rather than chaining `applyLive` and `applyRules`: an invalid rule must not leave a valid configuration half-applied. Validation failures leave the mode, stored data, and live configuration unchanged.

`spawnFactionUnit` returns `{side,kind,type,count,positions}`; the two compatibility shortcuts retain `{type,count,positions}`. These are immediate low-level calls; the player-facing batch form uses the queued path below, while five human cards and five zombie cards spawn immediately for their respective camp. Both camp forms remain visible and retain independent type/count/rate drafts. All twenty camp/species combinations are supported: e.g. enemy Preachers/Survivalists and friendly Fat Zombies. Each enters from its selected side's natural origin (**friendly x = 0, enemy x = 1600**) and uses source-species configured/group stats without an Angry Mob bonus. Manual generation costs no cash/XP, changes no paid order, and reserves no recruitment population. Non-reserved population bookkeeping prevents death or clearing from refunding another paid unit/order's population. Both camps share the 1,000-active-entity guard; oversized batches are rejected before creation.

`src/factions.js` separates source species from current allegiance rather than treating a camp switch as a cosmetic flag. Cross-camp units face/move toward the opposing side and target its actors/base with their type's combat behavior. Conversion changes allegiance, and typed clearing uses current camp. Numeric group modifiers still follow species, not allegiance; this is not a way to make enemy humans use zombie tables or vice versa. Projectiles retain their launch allegiance if their shooter is later converted. The cross-camp Preacher adapter can convert opposing mobile humans/zombies (range 320, base-HP budget 1,000, bases excluded); the native friendly Preacher retains its original zombie eligibility.

`getBattleStatus().factions` reports `{friendly:{units,zombies},enemy:{units,zombies}}` from current allegiance. `powerProgress` in both battle status and controller state reports `{pendingTotal,groups:[{type,count,source,side?}]}` for queued skill dispatch. `side` appears only on sandbox groups; normal skill snapshots retain their previous shape.

`getState().troopCounts` / `getBattleStatus().troopCounts` is `{friendly:{units:[n0,n1,n2,n3,n4],zombies:[n0,n1,n2,n3,n4],total},enemy:{units:[...],zombies:[...],total}}`. The read-only **在场兵力** table appears below the sandbox stage/start row, with ten species rows and friendly/enemy totals. It counts unique living actors (`health > 0`, modes not 14/15) by current camp, including converted humans/zombies; bases, queued recruitment/manual/power requests, population capacity, and effect vehicles are excluded. Menus show zero; ended battles retain their actual survivors until reset. Reading counts advances no ticks or RNG and changes no state.

The troop-clearing methods work while running or paused and do not advance simulation. Friendly clearing includes normal survivors, Angry Mob summons, and converted zombies. Selected actors are removed from their combat lists immediately, with health `0` and death mode `15`; bases are excluded. They return `{side, count, people, converted, zombies}` and release population only for ordinary recruited survivors, once per removal. Clearing an empty side again returns count `0`. They do not award XP, kills, losses, or cash, remove existing corpses/projectiles/power effects, cancel paid orders, alter timers, or change wave/reinforcement queues. Original detached `bbDeath` / `bbBodyPart` / cosmetic `bbExplosion` visuals are added transactionally with `bbSandboxDeath = 1`; they freeze while paused and recycle through ordinary updates. Combat actors are removed immediately, so these visuals cannot attack, convert, or grant rewards. Effect construction restores the random seed. Automatic spawning remains enabled unless separately switched off. These are immediate sandbox actions, not saved preset flags. Omitted/null/`all` selections clear the side. Both methods accept `{kind:"unit",type:0..4}` or `{kind:"zombie",type:0..4}` and match that species in its current camp, including converted zombies. Legacy integers keep their native meaning (friendly humans, enemy zombies); friendly `{kind:"converted",type}` / `converted-N` remains an alias for friendly zombies. In returned counts, `people` is removed human species in either camp, `converted` is removed friendly zombies (manual or converted), and `zombies` is removed enemy zombies. Selection validation precedes removal, and a selected type never clears unrelated actors.

Both bases are exposed by `getState().bases` / `getBattleStatus().bases` as `{friendly:{current,maximum}, enemy:{current,maximum}}`, or `null` outside an active battle. Maximum HP remains `config.units[5].health` / `config.zombies[5].health`, committed with the selected health policy; direct current-HP edits are not starting-health preset values and cannot revive an ended battle.

### Independent manual spawn queues

Each persistent camp form selects species, count, and **本批出兵速率（只/游戏秒）**, then calls **加入出兵队列**. Counts accept **1–2,147,483,647**. Rates accept finite **0–1,000,000 actors per game-second**, including fractional values: `0.1` produces one actor per 10 game-seconds, `2` produces two per game-second, and `0` pauses only that job. A game-second is **120 battle ticks**; original game speed and runtime time scale change wall-clock delivery speed together. The default rate **120** applies only when creating a job, not to existing jobs.

Jobs are independent concurrent streams, not a single blocking FIFO. Shared fair round-robin dispatch admits at most **32 actors per simulation tick**, respecting the **1,000 active entities including bases** capacity guard. Full capacity retains pending counts; it does not discard requests or accumulate an eventual giant catch-up burst. Rate changes and per-job pauses also do not backfill paused time. Very high requested rates are limited by this shared budget. The first actor is due after its interval (`120/rate` battle ticks), not at enqueue time; high-rate work starts no earlier than the next tick.

`enqueueSpawn` and `setSpawnJobRate` return job snapshots. `getState().spawnQueue` / `getBattleStatus().spawnQueue` contains `defaultRate` (`rate` alias), `jobs`, `recent` (last 32 completed/cancelled jobs), `pendingJobs`, `totalPending` (`pending` alias), `totalRequested`, `totalSpawned`, `totalCancelled`, `paused`, `blocked`, `capacity`, and `maxPerTick`. Each job includes `id`, `side`, `descriptor:{kind,type}`, `kind`, `type`, `count`, `rate`, `spawned`, `remaining`, `status`, `createdTick`, `completedTick`, `cancelledCount`, and `firstSpawn:{x,y,side,kind,type}|null`.

A job's live rate input changes only that job; users can add another batch without waiting for previous jobs. Cancelling one/all jobs removes only outstanding requests, unlike troop clearing or power-effect cancellation. Already spawned actors remain. Jobs are session-only and are cleared when the battlefield resets; they are not saved preset rule fields.

Boot installs `SpawnQueue` **after `Factions`** (and configuration/rules) before game initialization. The module API is `install(target)`, `enqueue(target,side,descriptor,count,{rate}?)`, `updateRate(target,id,rate)`, `setDefaultRate(target,rate)` (`setRate` alias; new jobs only), `cancel(target,id?)` (omitted means all), and `snapshot(target)` (`getState` alias).

### Dual-camp power releases and unlock all

Each camp has three power icons calling `releaseSandboxPower(powerId, side)` (`friendly` / `enemy`), returning `{powerId,side,requested,spawned,pending}`. An active custom battle is required; paused release is supported. Configured effects belong to the selected camp: Angry Mob enters at that side’s natural origin, and Harvesters / Air Strikes attack hostile troops only. This free sandbox path bypasses normal unlock, charge, and cooldown requirements without changing the original power’s XP, busy, or cooldown state. Original canvas power buttons retain their normal behavior. Large effects still use budgeted/capacity-limited power queues.

The stage editor’s unlock action calls `unlockAll()`: it sets unit/building `dependency` and power `unlockAfterStage` to `0` in the valid custom configuration and immediately removes current prerequisites/locks. At menus it updates the template without starting a battle. The controller validates before promoting an original run to custom, preserving both score namespaces. It grants no completed buildings, cash, XP, or wins; optional `rules.unlockAllStages: true` opens all four original canvas-menu stages, as well as the custom-stage selector. Missing/false preserves normal menu locks; displayed and persisted win records are never replaced or fabricated. Save/export the unlocked rules as a preset, or reset defaults to restore original restrictions.

### Cancel power effects

The power tab's **取消当前技能效果** / **取消全部技能效果** call `Customization.cancelPowerEffects(0|1|2|"all")` (omitted means all). This action requires an active custom battle, works while paused, and preserves pause state. The controller performs a dry preflight before a frozen-time cancellation and returns `{pending,actors,powerups,projectiles,explosions,charging}` counts from `GameConfig.cancelPowerEffects`.

Cancellation covers both camps’ selected charging power, pending summon queues, and surviving deployed effects: Angry Mob source actors (including later-converted actors), Harvesters, or aircraft/unlanded Air Strike bombs and tagged Air Strike explosion visuals. Ordinary troops, manually generated units, and Bomber bottles are not skill effects to be cleared. Cancelling a selected charge clears its busy/charge state but leaves remaining cooldown unchanged; recasting still follows normal requirements. It does not refund XP, reset cooldowns, undo damage, or alter cash/population or future wave/recruitment/building plans. This is an action, not a saved preset switch.

### Current-battle wave reconciliation

The wave header's **暂停波次 / 继续波次** toggles the existing live `rules.automaticSpawning` value, mirroring the sandbox checkbox. It freezes scripted scheduling/count progress without restarting/replaying the queue; combat, skills, and independent manual spawn jobs keep running. New base-health reinforcements are also gated (health crossings while paused are consumed, not replayed); corpse-impact spawning still has its own switch. This direct action updates the current rules only, so an invalid/uncommitted field elsewhere does not block it or get overwritten. It adds no separate pause flag or schema field.

The editor's automatic `commitSettings` path (via `applyDraft`) updates the current stage's waves; there is no apply, replace, or replay button. Its `waveReport` contains `{applied, deferred, notes, requiresNewBattle, reason, progress, stage, otherStages}`. A live application does not restart the battle or wait for enemies to be killed.

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
  "multipliers": {
    "units": { "health": 1, "moveSpeed": 1, "damage": 1 },
    "zombies": { "health": 1, "moveSpeed": 1, "damage": 1 }
  },
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

Optional boolean `unlockAllStages` defaults to false without injecting a new field into older presets. True immediately unlocks all four original menu stages without modifying win records. Unlock-all sets it in the saved rules template.

| Numeric rule | Allowed range | Live behavior |
| --- | --- | --- |
| `economy.salvagePayout` | Integer 0–1,000,000 | Future income payments; does not change existing cash |
| `economy.salvageIntervalTicks` | Integer 1–1,000,000 | Remaps the current coin pool proportionally, rounding down |
| `economy.populationPerTrailer` | Integer 1–1,000 | Updates population capacity; does not remove existing over-cap units |
| `abilities.harvesterDamagePerTick` | Integer 0–100,000,000 | Next tick, including existing Harvesters; per target, not DPS |
| `abilities.harvesterRange` | Integer 0–3,200 | Next tick; original forward leading-edge test `0 <= distance < range`, excluding bases |

Shared modifiers live in `rules.multipliers.units` and `.zombies`, each with `health`, `moveSpeed`, and `damage` (defaults **1**). Health factors must be positive; movement/damage allow zero. Each finite factor is at most **2,147,483,647**, with effective HP/damage checked against signed-int32 bounds and effective movement at most **1,000,000**. They do not change the stored base config values and never affect either base. Modifiers follow source species, not allegiance: enemy humans still use `units`; friendly/converted zombies still use `zombies` and stage factors.

- Survivor HP: `truncate(base HP × units.health)`.
- Zombie HP: `truncate(base HP × zombies.health × truncate(stage HP factor))`.
- Melee damage combines base/group/stage factors before its normal final integer cast; zombie stage damage does not apply to corpse projectiles. Unit bottles and corpse projectiles use the appropriate group damage factor at launch; projectiles already in flight are unchanged. Preacher conversion behavior is not a direct-damage value.
- Movement combines type speed and group speed; Angry Mob's own anger factor also applies. Live updates preserve direction and transient states, and honor the HP policy.

Manual spawning deliberately bypasses automatic-spawn filters; automatic waves and their ordering are not edited by the spawn buttons. `CustomRules.ENTITY_LIMIT` is **1,000 combined combat units**, including bases, survivors, enemies, and converted allies, but not projectiles, power effects, or particles. A paid training order waits at one remaining tick until a slot opens, retaining its payment and reserved population; it is not discarded or charged twice. Angry Mob and Air Strike requests are stored as compact pending counts, up to **2,147,483,647 per configured count**, and dispatch at most **32 actors/effects per simulation update** within their separate live-capacity guards. Excess requests wait rather than being dropped; changing counts affects later activations, not an already queued activation. Battle reset discards its old pending requests. `automaticSpawning: false` freezes the scripted wave queue's scheduling/counts, not the battle or manual spawn jobs. Base-health crossings during disabled reinforcement spawning are consumed rather than replayed later. Type switches filter queued spawns; `corpseSpawnOnImpact` separately controls the extra Zombie at corpse impact.

`ghoulLongLeap: false` disables the Ghoul's long-distance leap but keeps its nearby jump-bite; disabling it in the air returns the current leap to its ground height and walking behavior on the next battle tick. The other three ability booleans suppress the listed hit/conversion/projectile without cancelling the action's elapsed time or inventing an alternate attack. Attack frequency, general attack ranges, leap distance/speed, Fat attack radius, Preacher conversion budget/range, and Air Strike bomb damage/radius are not numeric controls in this version. New entity types and mechanics still require code.

Version-1 presets made before the economy/Harvester/Ghoul/multiplier additions may omit those added fields and receive their defaults. Angry Mob's added `survivalistCount`, `bomberCount`, and `preacherCount` default to 0; `shovelCount` and `shotgunCount` remain required. Unknown fields and the original required fields remain validated; backward compatibility is not permission to supply arbitrary JSON.

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
