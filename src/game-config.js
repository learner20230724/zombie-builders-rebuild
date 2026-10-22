/* Hand-written configuration boundary. Keep this separate from generated-game.js. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GameConfig = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const KINDS = ['units', 'zombies', 'buildings', 'powers', 'levels'];
  // These original table cells have no gameplay consumer. They are deliberately
  // not JSON options. Keeping them here makes the default raw tables lossless.
  const UNIT_ROWS = [
    [50,1,5,50,10,3,0,1,10,0], [200,6,4,100,15,4,2,2,20,12],
    [900,10,15,400,5,2,3,5,90,-65], [350,6,4,80,60,10,4,2,10,0],
    [1500,30,5,100,0,1,5,3,12,4], [0,0,0,4000,0,0,0,0,80,0]
  ];
  const ZOMBIE_ROWS = [
    [20,1,3,25,10,1,0,0,16,16], [100,2,6,60,16,1,0,0,16,-20],
    [400,2,15,150,20,1,0,0,14,0], [500,4,3,1000,60,2,0,0,50,10],
    [1000,5,2,1500,100,1,0,0,120,0], [0,0,0,16000,0,0,0,0,80,20]
  ];
  const states = new WeakMap();
  const projectileKind = Symbol('GameConfig.projectileKind');
  function fail(path, message) { throw new Error('GameConfig ' + path + ': ' + message); }
  function object(value, path, required, optional) {
    if (value === null || typeof value !== 'object' || Array.isArray(value) ||
        Object.prototype.toString.call(value) !== '[object Object]') fail(path, 'expected a JSON object');
    const allowed = required.concat(optional || []);
    for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(path + '.' + key, 'unknown field');
    for (const key of required) if (!Object.prototype.hasOwnProperty.call(value, key)) fail(path + '.' + key, 'required field is missing');
  }
  function number(value, path, min, max, integer) {
    if (typeof value !== 'number' || !Number.isFinite(value) || (integer && !Number.isInteger(value)))
      fail(path, integer ? 'expected a finite integer' : 'expected a finite number');
    if (value < min || value > max) fail(path, 'must be between ' + min + ' and ' + max);
  }
  function integer(value, path, min = 0, max = 100000000) { number(value, path, min, max, true); }
  function string(value, path, max = 2000) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) fail(path, 'expected a nonempty string of at most ' + max + ' characters');
  }
  function array(value, path, min, max) {
    if (!Array.isArray(value) || value.length < min || value.length > max) fail(path, 'expected an array of ' + min + '..' + max + ' entries');
  }
  function fixedItems(value, kind, first, count, inspect) {
    const p = '$.' + kind;
    array(value, p, count, count);
    const ids = new Set(), keys = new Set();
    value.forEach((item, i) => {
      const path = p + '[' + i + ']';
      if (!item || typeof item !== 'object' || Array.isArray(item)) fail(path, 'expected a JSON object');
      integer(item.id, path + '.id', first, first + count - 1);
      if (ids.has(item.id)) fail(path + '.id', 'duplicate id ' + item.id);
      ids.add(item.id);
      string(item.key, path + '.key', 80);
      if (!/^[a-z][a-z0-9-]*$/.test(item.key)) fail(path + '.key', 'expected a lowercase kebab-case key');
      if (keys.has(item.key)) fail(path + '.key', 'duplicate key ' + item.key);
      keys.add(item.key);
      inspect(item, path);
    });
  }
  function identity(item, path, type) {
    string(item.name, path + '.name', 120);
    if (type !== undefined && item.type !== type) fail(path + '.type', 'fixed runtime type must be ' + type);
  }
  function wave(item, path, allowWait) {
    object(item, path, ['type', 'count', 'delay']);
    integer(item.type, path + '.type', allowWait ? 0 : 1, 5);
    integer(item.count, path + '.count', 1, 100000);
    // The original bbInit/bbSpawn convert this to int, intentionally including
    // fractional delays such as 0.3 -> 0. Do not silently change game timing.
    number(item.delay, path + '.delay', 0, 86400, false);
  }
  function validate(input) {
    object(input, '$', ['schemaVersion'].concat(KINDS));
    if (input.schemaVersion !== 1) fail('$.schemaVersion', 'supported version is 1');
    for (const kind of ['units', 'zombies']) fixedItems(input[kind], kind, 0, 6, (item, path) => {
      const base = item.id === 5, human = kind === 'units';
      const required = ['id', 'key', 'type', 'name', 'health', 'hitRadius', 'hitOffset'];
      if (!base) required.push('moveSpeed');
      if (!base && human) required.push('cost', 'buildTicks', 'dependency', 'people', 'description');
      if (!base && (human ? item.id < 3 : item.id < 4)) required.push('damage');
      if ((human && item.id === 3) || (!human && item.id === 4)) required.push('projectileDamage');
      object(item, path, required);
      identity(item, path, item.id + (human ? 0 : 32));
      integer(item.health, path + '.health', 1);
      integer(item.hitRadius, path + '.hitRadius', 0, 10000);
      integer(item.hitOffset, path + '.hitOffset', -10000, 10000);
      if (!base) number(item.moveSpeed, path + '.moveSpeed', 0, 100, false);
      if ('damage' in item) integer(item.damage, path + '.damage');
      if ('projectileDamage' in item) integer(item.projectileDamage, path + '.projectileDamage');
      if (!base && human) {
        integer(item.cost, path + '.cost');
        integer(item.buildTicks, path + '.buildTicks', 1);
        integer(item.dependency, path + '.dependency', 0, 5);
        integer(item.people, path + '.people', 1, 1000);
        string(item.description, path + '.description');
      }
    });
    fixedItems(input.buildings, 'buildings', 0, 6, (item, path) => {
      object(item, path, ['id','key','type','name','cost','buildTicks','dependency','maximum','description']);
      identity(item, path, item.id);
      integer(item.cost, path + '.cost');
      integer(item.buildTicks, path + '.buildTicks', 1);
      integer(item.dependency, path + '.dependency', 0, 5);
      if (item.dependency !== 0 && item.dependency === item.id) fail(path + '.dependency', 'a building cannot require itself');
      integer(item.maximum, path + '.maximum', 1, item.id === 0 ? 15 : item.id === 1 ? 5 : 1);
      string(item.description, path + '.description');
    });
    // Existing initial buildings are trailer 0 and yard 1; dependency 0 is the
    // original sentinel. Reject unreachable prerequisite cycles, not just IDs.
    const buildings = input.buildings.slice().sort((a,b) => a.id-b.id);
    for (const item of buildings) {
      const visited = new Set(); let current = item;
      while (current.dependency !== 0) {
        if (visited.has(current.id)) fail('$.buildings[' + input.buildings.indexOf(item) + '].dependency', 'cyclic building prerequisites');
        visited.add(current.id); current = buildings[current.dependency];
      }
    }
    fixedItems(input.powers, 'powers', 0, 3, (item, path) => {
      object(item, path, ['id','key','name','xp','buildTicks','cooldownTicks','unlockAfterStage','effect','description']);
      identity(item, path);
      integer(item.xp, path + '.xp');
      integer(item.buildTicks, path + '.buildTicks', 1);
      integer(item.cooldownTicks, path + '.cooldownTicks', 1);
      integer(item.unlockAfterStage, path + '.unlockAfterStage', 0, 4);
      string(item.description, path + '.description');
      if (item.id === 0) {
        object(item.effect, path + '.effect', ['shovelCount','shotgunCount','angerSpeedMultiplier']);
        integer(item.effect.shovelCount, path + '.effect.shovelCount', 0, 1000);
        integer(item.effect.shotgunCount, path + '.effect.shotgunCount', 0, 1000);
        number(item.effect.angerSpeedMultiplier, path + '.effect.angerSpeedMultiplier', 0, 100, false);
      } else {
        object(item.effect, path + '.effect', item.id === 2 ? ['jetCount','moveSpeed'] : ['moveSpeed']);
        number(item.effect.moveSpeed, path + '.effect.moveSpeed', 0.000001, 100, false);
        if (item.id === 2) integer(item.effect.jetCount, path + '.effect.jetCount', 0, 1000);
      }
    });
    fixedItems(input.levels, 'levels', 1, 4, (item, path) => {
      object(item, path, ['id','key','title','name','zombieDamageMultiplier','zombieHealthMultiplier','startingCash','startingXp','waves','reinforcements']);
      identity(item, path); string(item.title, path + '.title', 120);
      number(item.zombieDamageMultiplier, path + '.zombieDamageMultiplier', 0, 100, false);
      number(item.zombieHealthMultiplier, path + '.zombieHealthMultiplier', 1, 100, false);
      integer(item.startingCash, path + '.startingCash'); integer(item.startingXp, path + '.startingXp');
      array(item.waves, path + '.waves', 1, 10000);
      item.waves.forEach((w,i) => wave(w, path + '.waves[' + i + ']', true));
      array(item.reinforcements, path + '.reinforcements', 0, 1000);
      const thresholds = new Set();
      item.reinforcements.forEach((entry,i) => {
        const p = path + '.reinforcements[' + i + ']';
        object(entry, p, ['threshold','calls']);
        integer(entry.threshold, p + '.threshold', 0, input.zombies.find(z => z.id === 5).health - 1);
        if (thresholds.has(entry.threshold)) fail(p + '.threshold', 'duplicate health threshold');
        thresholds.add(entry.threshold);
        array(entry.calls, p + '.calls', 1, 1000);
        entry.calls.forEach((w,j) => wave(w, p + '.calls[' + j + ']', false));
      });
      for (const zombie of input.zombies.filter(z => z.id < 5)) {
        if (zombie.health * Math.trunc(item.zombieHealthMultiplier) > 2147483647)
          fail(path + '.zombieHealthMultiplier', 'effective health overflows signed int32 for zombie id ' + zombie.id);
        if ('damage' in zombie && zombie.damage * item.zombieDamageMultiplier > 2147483647)
          fail(path + '.zombieDamageMultiplier', 'effective damage overflows signed int32 for zombie id ' + zombie.id);
      }
    });
    const result = JSON.parse(JSON.stringify(input));
    for (const kind of KINDS) result[kind].sort((a,b) => a.id-b.id);
    return result;
  }
  function fromDocuments(documents) {
    object(documents, '$documents', KINDS);
    const result = {schemaVersion: 1};
    for (const kind of KINDS) {
      const document = documents[kind];
      object(document, '$documents.' + kind, ['schemaVersion', kind]);
      if (document.schemaVersion !== 1) fail('$documents.' + kind + '.schemaVersion', 'supported version is 1');
      result[kind] = document[kind];
    }
    return validate(result);
  }
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
    return value;
  }
  function compile(input) {
    const config = validate(input), raw = {};
    for (const [kind, prefix, baseline] of [['units','unit',UNIT_ROWS], ['zombies','zombie',ZOMBIE_ROWS]]) {
      raw['bb_data_' + prefix + 'name'] = config[kind].map(item => item.name);
      raw['bb_data_' + prefix + 'data'] = config[kind].flatMap(item => {
        const row = baseline[item.id].slice();
        for (const [key,index] of [['cost',0],['health',3],['damage',4],['dependency',6],['people',7],['hitRadius',8],['hitOffset',9]])
          if (key in item) row[index] = item[key];
        if ('buildTicks' in item) row[1] = item.buildTicks / 50;
        return row;
      });
    }
    raw.bb_data_unitabout = config.units.slice(0,5).map(item => item.description);
    raw.bb_data_buildingname = config.buildings.map(item => item.name);
    raw.bb_data_buildingabout = config.buildings.map(item => item.description);
    raw.bb_data_buildingdata = config.buildings.flatMap(item => [item.cost,item.buildTicks/100,item.dependency,item.maximum]);
    raw.bb_data_wmdname = config.powers.map(item => item.name);
    raw.bb_data_wmdabout = config.powers.map(item => item.description);
    raw.bb_data_wmdxp = config.powers.map(item => item.xp);
    raw.bb_data_wmdcooldown = config.powers.map(item => item.cooldownTicks);
    raw.bb_data_difficultyname = config.levels.map(item => item.name);
    raw.bb_data_difficultytitle = config.levels.map(item => item.title);
    for (const level of config.levels) raw['bb_leveldata_level' + level.id] = level.waves.flatMap(w => [w.type,w.count,w.delay]);
    return freeze({config, raw, reinforcements: config.levels.map(level => level.reinforcements)});
  }
  function portFor(target) {
    if (!target || !target.ZTPGamePort) throw new Error('GameConfig: generated-game.js must be loaded before installing configuration');
    return target.ZTPGamePort;
  }
  function wrap(owner, name, replacement) {
    if (!owner || typeof owner[name] !== 'function') throw new Error('GameConfig: missing runtime method ' + name);
    const original = owner[name]; owner[name] = replacement(original);
  }
  function hooks(target, state) {
    const port = portFor(target), config = () => state.compiled.config;
    wrap(port.bb_Unit.prototype, 'bbUnit_new', original => function (type, name, data, offset) {
      const result = original.apply(this, arguments);
      if (type >= 0 && type < 5) this.bbbuildtime = config().units[type].buildTicks;
      return result;
    });
    wrap(port.bb_Building.prototype, 'bbBuilding_new', original => function (type) {
      const result = original.apply(this, arguments); this.bbbuildtime = config().buildings[type].buildTicks; return result;
    });
    wrap(port.bb_Power.prototype, 'bbPower_new', original => function (type) {
      const result = original.apply(this, arguments), p = config().powers[type];
      this.bbbuildtime = p.buildTicks; this.bbxp = p.xp; this.bbcooltime = p.cooldownTicks; return result;
    });
    wrap(port.bb_Person.prototype, 'bbPerson_new', original => function (layer, unit) {
      const result = original.apply(this, arguments);
      if (unit.bbtype >= 0 && unit.bbtype < 5) this.bbwalkspeed = config().units[unit.bbtype].moveSpeed;
      return result;
    });
    wrap(port.bb_Zombie.prototype, 'bbZombie_new', original => function (layer, unit) {
      const result = original.apply(this, arguments);
      if (unit.bbtype >= 32 && unit.bbtype < 37) this.bbwalkspeed = config().zombies[unit.bbtype-32].moveSpeed;
      return result;
    });
    wrap(port.bb_Person.prototype, 'bbAnger', original => function () {
      const before = this.bbwalkspeed, result = original.apply(this, arguments);
      this.bbwalkspeed = before * config().powers[0].effect.angerSpeedMultiplier;
      return result;
    });
    wrap(port.bb_PowerUp.prototype, 'bbPowerUp_new', original => function (layer, type) {
      const result = original.apply(this, arguments);
      if (type === 1 || type === 2) this.bbwalkspeed = config().powers[type].effect.moveSpeed;
      return result;
    });
    wrap(port.bb_Bottle.prototype, 'bbBottle_new', original => function (layer, image, x, y, vx, vy, kind) {
      const result = original.apply(this, arguments);
      // kind 0 is the bomber bottle; kind 1 is the air-strike bomb. Do not
      // alter the latter's 500 damage / zombie-base immunity convention.
      this[projectileKind] = kind | 0;
      if ((kind | 0) === 0) this.bbdamage = config().units[3].projectileDamage;
      return result;
    });
    wrap(port.bb_Fling.prototype, 'bbFling_new', original => function () {
      const result = original.apply(this, arguments);
      this.bbdamage = config().zombies[4].projectileDamage;
      return result;
    });
    // Scope provenance to the two original synchronous bottle loops. Calls to
    // Bottle.Update outside them cannot leave a tag for an unrelated explosion.
    for (const method of ['bbGameTick','bbUpdateAttract']) wrap(port.bb_Zomba.prototype, method, original => function () {
      state.bottleLoopDepth = (state.bottleLoopDepth || 0) + 1;
      try { return original.apply(this,arguments); }
      finally { state.bottleLoopDepth--; state.explodingBottle = null; }
    });
    // Both loops call bbUpdate then immediately bbExplodeBottle on bbexplode.
    // Carry that explicit leaf source across the existing synchronous boundary.
    wrap(port.bb_Bottle.prototype, 'bbUpdate', original => function () {
      const result = original.apply(this, arguments);
      state.explodingBottle = state.bottleLoopDepth && this.bbexplode ? this : null;
      return result;
    });
    wrap(port.bb_Zomba.prototype, 'bbExplodeBottle', () => function (layer, x, y, damage) {
      layer |= 0; x = Number(x); y = Number(y); damage |= 0;
      const source = state.explodingBottle; state.explodingBottle = null;
      const hasSource = source && source.bbxpos === x && source.bbypos === y && source.bbdamage === damage;
      // Direct legacy calls have no projectile source, so retain their original
      // damage==500 convention. Actual bottle explosions use their stored kind.
      const bomber = hasSource && source[projectileKind] === 0;
      const audio = port.state.bb_Audio;
      audio.bbPlay(target.bb_std_random_Rnd() <= 0.5 ? audio.bbexplosion2 : audio.bbexplosion1);
      this.bbexplosions.bbAddLast(new port.bb_Explosion().bbExplosion_new(layer,port.bb_Cell.bbcells(this.bbexplosionsheet),x,y,1));
      const iterator = this.bbzombies.bbObjectEnumerator();
      while (iterator.bbHasNext()) {
        const zombie = iterator.bbNextObject();
        const distance = Math.abs(zombie.bbxpos-x)|0;
        // Retain the original check of REMAINING damage for air-strikes/direct
        // calls (even after a preceding target consumes some of the pool).
        if (!(zombie.bbunit.bbtype === 37 && damage === 500 && !bomber) && distance < 100) {
          damage = zombie.bbSmack(damage,3)|0;
          if (damage <= 0) break;
        }
      }
      return 0;
    });
    // This is the small original dispatch, with loop limits supplied by JSON.
    // Preserve random draws, positions, anger, audio, and cooldown placement.
    wrap(port.bb_Zomba.prototype, 'bbAddPower', () => function (power) {
      const c = config();
      if (power.bbtype === 0) {
        for (const [id,count,spacing,sheet] of [[0,c.powers[0].effect.shovelCount,20,this.bbshovelman],[1,c.powers[0].effect.shotgunCount,50,this.bbshotgunman]]) {
          for (let i=1;i<=count;i++) {
            const person = this.bbunits[id].bbInstance(target.bb_Rand(8), port.bb_Cell.bbcells(sheet));
            person.bbxpos = -i*spacing + target.bb_reversebits(i,4);
            person.bbAnger(); this.bbpeople.bbAddLast(person);
          }
        }
        const audio = port.state.bb_Audio; audio.bbPlay(audio.bbangrymob);
      } else if (power.bbtype === 1) {
        this.bbpowerups.bbAddLast(new port.bb_PowerUp().bbPowerUp_new(0,1,this.bbharvestsheet,this.bbharvestbloodsheet));
      } else if (power.bbtype === 2) {
        for (let i=1;i<=c.powers[2].effect.jetCount;i++) {
          const jet = new port.bb_PowerUp().bbPowerUp_new(target.bb_Rand(8),2,this.bbjetsheet,null);
          jet.bbxpos -= i*128; jet.bbypos += target.bb_reversebits(i,4)*10;
          this.bbpowerups.bbAddLast(jet);
        }
        const audio = port.state.bb_Audio; audio.bbPlay(audio.bbairstrike);
      }
      power.bbcooldown = power.bbcooltime; return 0;
    });
    wrap(port.bb_Zomba.prototype, 'bbResetGame', original => function () {
      state.explodingBottle = null;
      const result = original.apply(this, arguments), c = config(), level = c.levels[this.bbdifficulty];
      this.bbztp.bbcash = level.startingCash; this.bbztp.bbxp = level.startingXp;
      this.bbZombieDamageMultiplier = level.zombieDamageMultiplier;
      this.bbZombieHealthMultiplier = level.zombieHealthMultiplier;
      for (const power of this.bbpowers) {
        const stage = c.powers[power.bbtype].unlockAfterStage;
        power.bblocked = stage === 0 || this.bbrecords[stage-1] !== 0 ? 0 : 1;
      }
      return result;
    });
    // bbGameTick calls this immediately BEFORE its hardcoded reinforcement
    // block. Insert the configurable calls at exactly that original point, then
    // synchronize its previous-health cell to suppress the obsolete block.
    wrap(port.bb_ZombieMob, 'bbUpdate', original => function () {
      const result = original.apply(this, arguments), game = port.state.bb_Game;
      if (game && game.bbmainState === 2) {
        const previous = game.bbzombiehealth, current = game.bbzombiebase.bbhealth;
        for (const entry of config().levels[game.bbdifficulty].reinforcements)
          if (current <= entry.threshold && previous > entry.threshold)
            for (const call of entry.calls) port.bb_ZombieMob.bbSpawn(call.type,call.count,call.delay);
        game.bbzombiehealth = current;
      }
      return result;
    });
    // Use configured base maxima without temporarily mutating live health.
    wrap(port.bb_Zomba.prototype, 'bbDrawHealth', () => function () {
      for (const [base,max,x,label,align] of [[this.bbpeoplebase,config().units[5].health,8,'My Base',0],[this.bbzombiebase,config().zombies[5].health,586,'Zombie Base',2]]) {
        const lost = (200 - ((base.bbhealth*200/max)|0))|0;
        this.bbblitrect4(this.bbprogress1,x,580,210,16);
        if (lost < 180 || (this.bbgameticks & 0x10) === 16)
          this.bbblitrect4(this.bbprogress2,align ? 800-(214-lost) : 8,580,210-lost,16);
        this.bbfont4.bbdrawtext(label,align ? 790 : 10,560,0.4,align);
        this.bbfont3.bbdrawtext(label,align ? 790 : 10,560,0.4,align);
      }
      return 0;
    });
  }
  function stateFor(target, compiled) {
    let state = states.get(target);
    if (!state) {
      state = {compiled}; states.set(target,state); hooks(target,state);
    } else state.compiled = compiled;
    return state;
  }
  function writeRaw(target, compiled) {
    for (const [key,value] of Object.entries(compiled.raw)) target[key] = value.slice();
  }
  function apply(target, input) {
    portFor(target);
    const compiled = compile(input);
    if (!Array.isArray(target.bb_data_unitdata)) throw new Error('GameConfig: apply requires bb_Init first; use install before initialization');
    if (target.ZTPGamePort.state.bb_Game) throw new Error('GameConfig: apply must run after bb_Init and before bb_Main; restart the game to change configuration');
    stateFor(target,compiled); writeRaw(target,compiled); return compiled;
  }
  function install(target, input) {
    const port = portFor(target), compiled = compile(input);
    if (port.state.bb_Game) throw new Error('GameConfig: install must run before bb_Main; restart the game to change configuration');
    const state = stateFor(target,compiled);
    if (!state.initializer) {
      const original = target.bb_Init;
      if (typeof original !== 'function') throw new Error('GameConfig: missing runtime method bb_Init');
      state.initializer = function () {
        const result = original.apply(this,arguments);
        state.explodingBottle = null; state.bottleLoopDepth = 0;
        writeRaw(target,state.compiled); return result;
      };
    }
    target.bb_Init = port.bb_Init = state.initializer;
    return compiled;
  }
  return Object.freeze({fromDocuments,validate,compile,apply,install});
});
