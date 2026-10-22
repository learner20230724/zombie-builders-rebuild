# Game configuration

Edit these JSON files, then reload the web page or restart the desktop app to load the new values. They are kept separate from generated game code. Every file has `schemaVersion: 1` and an array named after the file.

Source/web development uses this `config/` directory. The desktop release reads the five editable files from **`%APPDATA%\ZombieBuilders\config`**, not from its installation. Press **F1** to locate them. Defaults are copied only when a user file is missing, so an update does not overwrite an existing file.

**`config/defaults/` is the original-mode baseline.** Do not edit it to customize play; the application exposes it as a separate read-only default source. Restoring original mode selects that baseline without deleting user JSON or named presets. It is not a security boundary against someone changing the installed source files.

Applied in-game rules can be remembered between runs. The saved session's `sourceFingerprint` detects changes to the normalized external configuration: changed JSON takes precedence on the next startup; an unchanged source allows the selected session to resume. This field belongs to session storage, **not** to these five JSON documents, and is not a cryptographic security check. Saving a named preset alone neither applies it nor rewrites the JSON files.

中文：源码／网页使用本目录，桌面版使用 `%APPDATA%\ZombieBuilders\config`，F1 可查看位置。`defaults/` 是恢复原版用的独立基准，不是用户编辑入口。已有配置不会被升级覆盖；外置 JSON 内容改变后，下次启动优先加载新文件，未改变时才恢复已应用的会话。游戏内保存预设与应用当前局分开，也不改写这五份文件。

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

## Unit attacks

Shovel Man, Angry Farmer, Survivalist and the four melee zombie types use `damage`. Moonshine Bomber uses `projectileDamage` for his explosive bottles (default `100`); Corpse Thrower uses it for his corpse projectiles (default `500`). Corpse-projectile damage is not scaled by the stage's `zombieDamageMultiplier`. Preacher Man converts enemies instead of dealing a configurable direct attack. Unused legacy table fields are deliberately absent: editing a field in these files should affect the game.

## Powers

`buildTicks` is the charge countdown and `xp` is the activation cost. `unlockAfterStage: 0` means available immediately; `1..4` requires a saved win for that stage, not merely selecting a later stage.

- Angry Mob: `effect.shovelCount`, `effect.shotgunCount` and `effect.angerSpeedMultiplier`.
- Harvester: `effect.moveSpeed`.
- Air Strike: `effect.jetCount` and `effect.moveSpeed`.

## Waves and reinforcements

Each stage has ordered `waves` and a separate `reinforcements` array. A wave or reinforcement call has this shape:

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

Each reinforcement contains a base-health `threshold` and ordered `calls`. It triggers when the enemy base crosses from above the threshold to at or below it. Calls are inserted at the front of the queue **in the listed order**, so the last call in a trigger runs first. If several thresholds are crossed in one update, triggers are processed in their listed order. Preserve or intentionally edit both orders when designing a stage.

`zombieDamageMultiplier` scales enemy melee attack damage before the result is truncated to an integer; it does not scale Corpse Thrower's projectiles. `zombieHealthMultiplier` is itself truncated to an integer before it scales a new enemy's health: `1.75` acts as `1`, while `2` doubles health. This preserves the existing simulation rules. Enemy-base health comes directly from `zombies[5].health` and is not scaled by the stage multiplier.

## Live editing and presets

Use **F2** for the in-game editor. Saving a preset only saves its draft. Applying to the current battle is a separate action, with proportional-health or new-units-only policies and clearly reported next-battle fields. The independent “replace upcoming waves” action retains the current group and replaces the entire following queue—including queued, unspawned reinforcements—with the edited stage's complete enabled list. Already spawned enemies remain, and reinforcement trigger history is not reset; it does not infer which draft rows have already run.

Spawning/ability switches, income rules, Trailer population capacity, Harvester damage/range, and the named-preset wrapper are separate from these five entity documents. Their schema, live-apply boundaries, and storage keys are documented in the [development guide](../docs/DEVELOPMENT.md#presets-rules-and-sandbox) / [二次开发指南](../docs/DEVELOPMENT.zh-CN.md#预设规则与沙盒). New character types and entirely new mechanics require code rather than extra arbitrary JSON fields.
