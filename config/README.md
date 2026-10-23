# Game configuration

Edit these JSON files, then reload the web page or restart the desktop app to load the new values. They are kept separate from generated game code. Every file has `schemaVersion: 1` and an array named after the file.

Source/web development uses this `config/` directory. The desktop release reads the five editable files from **`%APPDATA%\ZombieBuilders\config`**, not from its installation. Press **F1** to locate them. Defaults are copied only when a user file is missing, so an update does not overwrite an existing file.

**`config/defaults/` is the original-mode baseline.** Do not edit it to customize play; the application exposes it as a separate read-only default source. Restoring original mode selects that baseline without deleting user JSON or named presets. It is not a security boundary against someone changing the installed source files.

Applied in-game rules can be remembered between runs. The saved session's `sourceFingerprint` detects external gameplay-value or wave-order changes: these take precedence on the next startup; an unchanged source allows the selected session to resume. Wave IDs are identity metadata excluded from that comparison and from original/custom classification, so adding IDs alone does not reset an existing v0.3.0 session. This fingerprint belongs to session storage, **not** to these five JSON documents, and is not a cryptographic security check. Saving a named preset alone neither applies it nor rewrites the JSON files.

中文：源码／网页使用本目录，桌面版使用 `%APPDATA%\ZombieBuilders\config`，F1 可查看位置。`defaults/` 是恢复原版用的独立基准，不是用户编辑入口。已有配置不会被升级覆盖；外置玩法数值或波序改变后，下次启动优先加载新文件，未改变时才恢复已应用会话。单纯补波次 ID 不影响会话与成绩模式。保存预设与应用当前局分开，也不改写这五份文件。

| File | Editable values |
| --- | --- |
| `units.json` | Recruitment cost, production time, actual movement speed, health, attacks, required building, population, hitbox, names and descriptions. |
| `zombies.json` | Actual movement speed, health, attack damage, hitbox and names. |
| `buildings.json` | Cost, production time, required building, maximum count, names and descriptions. |
| `powers.json` | XP cost, charge time, cooldown, unlock requirement, effect settings, names and descriptions. |
| `levels.json` | Stage text, starting cash/XP, enemy multipliers, wave sequence and base-health reinforcements. |

## IDs and shared fields

- Keep array order, `id`, `type` and the number of entries unchanged. Unit, zombie and building IDs are `0..5`; power IDs are `0..2`; stage IDs are `1..4`. Each `key` is a unique, readable identifier.
- Unit and zombie entry `5` defines its side's base. Only its health and hitbox are configurable; it is not a recruitable or moving unit.
- `cost` is cash. `people` is the population consumed by recruiting a unit.
- `buildTicks` and `cooldownTicks` are simulation countdowns, not milliseconds. Game speed affects their wall-clock duration.
- `moveSpeed` is the actual horizontal distance moved per simulation update, not an animation frame rate.
- `hitRadius` and `hitOffset` control the horizontal hitbox.
- A unit's `dependency` is its required building ID. For buildings, `dependency: 0` means no prerequisite; other values are building IDs.
- `name`, stage `title` and `description` are display text. Keep descriptions on the five recruitable units and six buildings; bases do not have recruitment descriptions.

## Building limits

`buildings[].maximum` accepts integers **0–100,000**. **0 removes the gameplay cap**; a positive value sets the cap. There is still a separate engine safety ceiling of 100,000 per type. Original defaults are unchanged: Trailer 15, Salvage Yard 5, and each other type 1.

Changes apply to the current battle. New-order checks count completed buildings plus queued orders; lowering a cap does not delete buildings or cancel paid orders. Beyond the original artwork's finite placement slots, real completed buildings still contribute income and population. Extra copies of an unlock building do not add new abilities or graphics.

中文：`maximum: 0` 为不设玩法上限，正整数 1–100,000 为数量上限，本局生效；仍有每类 100,000 的引擎安全保护。已完成＋已排队计入新订单限制，降低不拆建筑、不吞已付订单。原图位置有限，但额外建筑真实计收入与人口。

## Unit attacks

Shovel Man, Angry Farmer, Survivalist and the four melee zombie types use `damage`. Moonshine Bomber uses `projectileDamage` for his explosive bottles (default `100`); Corpse Thrower uses it for his corpse projectiles (default `500`). Corpse-projectile damage is not scaled by the stage's `zombieDamageMultiplier`. Preacher Man converts enemies instead of dealing a configurable direct attack. Unused legacy table fields are deliberately absent: editing a field in these files should affect the game.

## Powers

`buildTicks` is the charge countdown and `xp` is the activation cost. `unlockAfterStage: 0` means available immediately; `1..4` requires a saved win for that stage, not merely selecting a later stage.

- Angry Mob: `effect.shovelCount`, `effect.shotgunCount` and `effect.angerSpeedMultiplier`.
- Harvester: `effect.moveSpeed`.
- Air Strike: `effect.jetCount` and `effect.moveSpeed`.

## Waves and reinforcements

Each stage has ordered `waves` and a separate `reinforcements` array. A **main-wave entry** has this shape:

```json
{ "id": "stage-1-wave-1", "type": 1, "count": 5, "delay": 3, "enabled": true }
```

A reinforcement call uses the same `type`, `count`, `delay`, and optional `enabled` fields, but **must omit `id`**:

```json
{ "type": 1, "count": 5, "delay": 3, "enabled": true }
```

Wave `type` is **not** a zombie entry ID:

| Wave type | Meaning |
| --- | --- |
| `0` | Wait; no zombie is created. `count` still controls the number of scheduler events. |
| `1` | Zombie (`zombies[0]`) |
| `2` | Jumping Ghoul (`zombies[1]`) |
| `3` | Fast Zombie (`zombies[2]`) |
| `4` | Big Fat Zombie (`zombies[3]`) |
| `5` | Corpse Thrower (`zombies[4]`) |

The scheduler truncates `delay` toward zero before using it. For example, `0.3` becomes `0` and `2.5` becomes `2`. A zero delay still waits for a scheduler event; it does not create the whole group in one update. Decimal defaults are retained without changing that behavior.

`enabled` is optional and defaults to `true`. Set it to **`false`** to omit that wave or reinforcement call without deleting its values; reordering the `waves` array changes queue order. Empty wave lists and stages with all entries disabled are allowed. `count` remains a positive integer, so do not use zero as an on/off switch. The default queue is finite and advances on its own schedule, not after all enemies are killed. Ending the fixed queue does not disable independent base reinforcements or corpse-impact spawns.

Main-wave `id` is optional for startup compatibility; if supplied, it is 1–80 ASCII letters, digits, `_` or `-`, unique within its stage. Missing source IDs are normalized to `stage-N-wave-M` and bound when a battle starts. Keep IDs when editing/moving groups; new editor groups get a fresh `wave-...` ID. Do not use the reserved `legacy-untracked-` prefix. Reinforcement calls do not accept a group ID.

Each reinforcement contains a base-health `threshold` and ordered `calls`. It triggers when the enemy base crosses from above the threshold to at or below it. Calls are inserted at the front of the queue **in the listed order**, so the last call in a trigger runs first. If several thresholds are crossed in one update, triggers are processed in their listed order. Preserve or intentionally edit both orders when designing a stage.

`zombieDamageMultiplier` scales enemy melee attack damage before the result is truncated to an integer; it does not scale Corpse Thrower's projectiles. `zombieHealthMultiplier` is itself truncated to an integer before it scales a new enemy's health: `1.75` acts as `1`, while `2` doubles health. This preserves the existing simulation rules. Enemy-base health comes directly from `zombies[5].health` and is not scaled by the stage multiplier.

## Live editing and presets

Use **F2** for the non-modal editor. It pauses by default, but **继续战斗** lets the game run beside settings; this does not apply unsaved edits. Saving a preset only saves its draft. **应用本局** applies validated values and reconciles the current stage's waves by stable identity: remaining = `max(0, count - consumed)`, without replaying finished IDs. Existing enemies, elapsed timers, and queued reinforcements are retained. Other stages, completed-group edits, starting resources, and reinforcement definitions have clearly reported next-battle behavior.

Old imported waves without a trusted identity require starting a new custom battle before live wave editing; other valid attributes can still apply now. The panel reports actual queued/spawned/consumed counts separately from draft rows. See the development guide for count reduction, disabled/deleted groups, delay changes, and compatibility-API details.

Spawning/ability switches, income rules, Trailer population capacity, Harvester damage/range, and the named-preset wrapper are separate from these five entity documents. Their schema, live-apply boundaries, and storage keys are documented in the [development guide](../docs/DEVELOPMENT.md#presets-rules-and-sandbox) / [二次开发指南](../docs/DEVELOPMENT.zh-CN.md#预设规则与沙盒). New character types and entirely new mechanics require code rather than extra arbitrary JSON fields.
