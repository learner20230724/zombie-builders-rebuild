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

## Health bounds and errors

`units[].health` and `zombies[].health` accept integers **1–2,147,483,647**, including both bases. The old 100,000,000 limit was a configuration guard, not an original gameplay rule. The ceiling now follows signed 32-bit combat arithmetic; **0 is death, not invincibility**. Every stage must also satisfy `zombies[0..4].health × truncate(zombieHealthMultiplier) <= 2,147,483,647`. Enemy-base health is not multiplied. Large kill rewards saturate accumulated XP at 2,147,483,647 instead of wrapping negative; power spending still works normally.

`GameConfig $.units[5].health` identifies the **player base's health** (zero-based index 5, the sixth entry); `$.zombies[5].health` identifies the enemy base. Messages retain the JSON path and add Chinese field context. A validation failure leaves the current battle unchanged.

中文：生命为整数 **1–2,147,483,647**；旧的一亿上限是配置校验，不是原版规则。新边界用于防止 32 位溢出，0 不是无敌。每关普通僵尸基础生命乘截整数后的生命倍率也要满足此范围。`$.units[5].health` 是己方基地，`$.zombies[5].health` 是敌方基地。累计 XP 到边界后保顶，不会溢出负数，之后仍可正常消费。

## Building limits

`buildings[].maximum` accepts integers **0–100,000**. **0 removes the gameplay cap**; a positive value sets the cap. There is still a separate engine safety ceiling of 100,000 per type. Original defaults are unchanged: Trailer 15, Salvage Yard 5, and each other type 1.

Changes apply to the current battle. New-order checks count completed buildings plus queued orders; lowering a cap does not delete buildings or cancel paid orders. Beyond the original artwork's finite placement slots, real completed buildings still contribute income and population. Extra copies of an unlock building do not add new abilities or graphics.

中文：`maximum: 0` 为不设玩法上限，正整数 1–100,000 为数量上限，本局生效；仍有每类 100,000 的引擎安全保护。已完成＋已排队计入新订单限制，降低不拆建筑、不吞已付订单。原图位置有限，但额外建筑真实计收入与人口。

## Unit attacks

Shovel Man, Angry Farmer, Survivalist and the four melee zombie types use `damage`. Moonshine Bomber uses `projectileDamage` for his explosive bottles (default `100`); Corpse Thrower uses it for his corpse projectiles (default `500`). Corpse-projectile damage is not scaled by the stage's `zombieDamageMultiplier`. Preacher Man converts enemies instead of dealing a configurable direct attack. Unused legacy table fields are deliberately absent: editing a field in these files should affect the game.

## Powers

`buildTicks` is the charge countdown and `xp` is the activation cost. `unlockAfterStage: 0` means available immediately; `1..4` requires a saved win for that stage, not merely selecting a later stage.

- Angry Mob: `effect.shovelCount`, `effect.shotgunCount`, `effect.survivalistCount`, `effect.bomberCount`, `effect.preacherCount`, and `effect.angerSpeedMultiplier`. Missing added counts default to `0`, so older JSON keeps its original summons. Each count, and Air Strike’s `jetCount`, accepts integers **0–2,147,483,647**. Counts no longer stop at the old 1,000 requested-summon limit; large activations dispatch gradually as battlefield slots become available (up to 32 actors/effects per simulation update).
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

Open **F2** to edit beside the game. Checkboxes and menus commit immediately; numeric fields commit on Enter/change/blur. There is **no Apply button**. A complete configuration/rules pair is validated before committing, so invalid input does not partially change the battle. Loading/importing a preset, resetting defaults, and undoing the last edit also use this automatic commit path; saving a named preset remains separate.

In menus, edits update the selected template without starting a battle. Editing an original battle promotes it to custom. Recruitment population/prerequisites, unlocks, starting resources, reinforcement definitions, and other stages' queues remain next-battle settings. The panel labels these instead of asking for another apply step.

Current-stage waves reconcile by stable identity: remaining = `max(0, count - consumed)`, retaining existing enemies, clocks, and queued reinforcements. Completed groups do not replay and are read-only in the editor; add a new group for additional enemies. **The editor displays newest rows first, but execution still follows ascending sequence number / the stored array order.** Old imported waves without a trusted identity bind when a new custom battle starts.

### Shared troop multipliers

The preset's separate `rules.multipliers` object provides independent survivor and zombie HP, movement, and damage factors:

```json
{
  "units": { "health": 1.5, "moveSpeed": 1, "damage": 1 },
  "zombies": { "health": 1.5, "moveSpeed": 1, "damage": 1 }
}
```

These are not extra fields in `units.json` or `zombies.json`. The group follows source species, independent of allegiance: enemy humans use `units`, and friendly/converted zombies use `zombies` plus stage factors. Both bases are excluded. Effective survivor HP is `truncate(base HP × units.health)`; enemy HP is `truncate(base HP × zombies.health × truncate(stage HP multiplier))`. Melee damage also combines the group and stage damage factors; thrown-corpse damage uses the zombie group factor but still not the stage melee factor. Effective values must remain within the supported combat-number bounds. Existing presets without multipliers default all six values to `1`.

Spawning/ability switches, income rules, Trailer capacity, Harvester damage/range, and multipliers belong to the preset's `rules` document, not these five entity documents. See the [development guide](../docs/DEVELOPMENT.md#presets-rules-and-sandbox) / [二次开发指南](../docs/DEVELOPMENT.zh-CN.md#预设规则与沙盒) for the complete schema.

### Sandbox actions

- Friendly and enemy spawn panels remain visible side by side, each retaining its own type/count/rate. Spawn one human or zombie immediately with its camp’s quick card, or **加入出兵队列** for either panel. Both camps can select all ten species (five humans and five zombies), not only their original species. Units enter from their selected camp’s side with normal configured stats. Manual generation consumes no cash, XP, or reserved recruitment population, and does not change paid orders or automatic-wave order.
- Each manual spawn job has an independent rate **0–1,000,000 units/game-second** (default 120); 0 pauses just that job and 0.1 means one per 10 game-seconds. Counts accept **1–2,147,483,647** and are compact pending requests, not a promise to allocate them in one tick. Jobs run concurrently within fair per-tick/live-capacity guards; edit a job’s rate or cancel its remainder without removing born actors. New battles clear this session-only queue. The five friendly human cards and five enemy zombie cards bypass the queue and spawn immediately.
- Clear both armies atomically with one button, clear one side, or select one human/zombie type by current allegiance; converted units belong to their new camp. Bases, paid orders, future waves, and existing projectiles/power effects remain; original death animations play without dealing damage or granting XP/kill credit.
- Both bases have quick **maximum HP** configuration and a separate **current HP** action. Current HP is an integer `0..actual maximum`; setting it to `0` ends the battle normally rather than enabling invincibility. It is not saved as a starting-health preset value.
- The power tab has friendly/enemy columns with three immediate-release icons each. These sandbox actions use configured effects without spending XP or changing normal charge/cooldown/unlock state; the original game buttons keep their normal requirements. Cancellation removes the selected or all current power effects from both camps, including pending dispatch, without clearing ordinary troops or refunding XP; it does not rewrite power JSON.
- **Unlock all buildings, powers, and stages** removes custom unit/building prerequisites and power locks immediately. It does not grant completed buildings, cash, XP, or wins; `rules.unlockAllStages: true` enables stages 1–4 in the original canvas menu as well as the custom-battle selector. Missing/false preserves normal stage locks. These unlocked rules can be saved/exported as a preset, and original records stay separate.
- The time controls at the top of the F2 settings panel change runtime speed **0–20× in 0.1 steps**; `0` pauses. It does not change JSON or persist after restart, and multiplies the original in-game speed selection.

Large summon requests are queued, not created in a single unbounded loop. The battlefield retains its separate active-entity safety limit; requested quantity and simultaneous actors are different controls.

中文：F2 内勾选、下拉立即生效，数值回车或失焦生效，不再点“应用本局”；载入／导入、恢复默认和撤销也自动提交。当前关未完成波次按 ID 更新，已完成组只读，新增组显示在最上方但仍按执行序号出怪。全体生命／移速／伤害倍率放在预设 `rules.multipliers`，不乘基地，并与关卡倍率相乘。沙盒两方出兵区常驻并列、独立保持类型／数量／速率；支持双方一键清兵、按类型清兵、双方阵营各十类单位（共二十种组合）的独立速率队列生成、双方基地最大／当前生命；当前生命 0 正常结束战斗。技能页可对任一阵营免费立即释放三技能，原技能按钮仍遵守正常条件；一键解锁修改自定义前置／技能锁定，不伪造通关。F2 面板内时间控制为 0–20 倍（步长 0.1），不写入预设；大量技能召兵排队分发，不再按旧的 1,000 请求上限截断。
