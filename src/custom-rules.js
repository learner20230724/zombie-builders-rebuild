/* Optional sandbox rules. Generated gameplay remains untouched. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CustomRules = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const states = new WeakMap();
  const ENTITY_LIMIT = 1000;
  const MULTIPLIER_LIMIT = 2147483647;
  const multiplierKeys = ['health','moveSpeed','damage'];
  const keys = ['schemaVersion','automaticSpawning','zombieTypesEnabled','baseReinforcements','corpseSpawnOnImpact','abilities','economy'];
  const abilityKeys = ['preacherConversion','fatAreaAttack','corpseThrowing'];
  const optionalBooleanAbilities = ['ghoulLongLeap'];
  const numericAbilities = ['harvesterDamagePerTick','harvesterRange'];
  const economyKeys = ['salvagePayout','salvageIntervalTicks','populationPerTrailer'];
  function fail(path, message) { throw new Error('CustomRules ' + path + ': ' + message); }
  function record(value, path, expected, optional) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
      fail(path, 'expected a JSON object');
    // Cross-realm ordinary JSON objects are accepted; inherited fields,
    // symbols, accessors and pollution keys are never accepted or copied.
    const proto = Object.getPrototypeOf(value);
    if (proto !== null) {
      const constructor = Object.getOwnPropertyDescriptor(proto,'constructor');
      if (Object.getPrototypeOf(proto) !== null || !constructor || typeof constructor.value !== 'function' ||
          constructor.value.prototype !== proto || constructor.value.name !== 'Object') fail(path, 'expected a plain JSON object');
    }
    const allowed = expected.concat(optional || []);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string' || !allowed.includes(key)) fail(path + '.' + String(key), 'unknown field');
      const descriptor = Object.getOwnPropertyDescriptor(value,key);
      if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor,'value')) fail(path + '.' + key, 'expected a JSON value');
    }
    for (const key of expected) if (!Object.prototype.hasOwnProperty.call(value,key)) fail(path + '.' + key, 'required field is missing');
  }
  function bool(value, path) { if (typeof value !== 'boolean') fail(path, 'expected a boolean'); return value; }
  function integer(value,path,min,max) {
    if (!Number.isInteger(value) || value < min || value > max) fail(path,'expected an integer between ' + min + ' and ' + max);
    return value;
  }
  function multiplier(value,path,positive) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value > MULTIPLIER_LIMIT || (positive ? value <= 0 : value < 0))
      fail(path,'expected a finite ' + (positive ? 'positive' : 'non-negative') + ' multiplier no greater than ' + MULTIPLIER_LIMIT);
    return value;
  }
  function validateMultipliers(input) {
    record(input,'$.multipliers',['units','zombies']);
    const result = {};
    for (const kind of ['units','zombies']) {
      record(input[kind],'$.multipliers.'+kind,multiplierKeys);
      result[kind] = {};
      for (const key of multiplierKeys) result[kind][key] = multiplier(input[kind][key],'$.multipliers.'+kind+'.'+key,key === 'health');
    }
    return result;
  }
  function defaults() {
    return {schemaVersion:1,automaticSpawning:true,zombieTypesEnabled:[true,true,true,true,true],
      baseReinforcements:true,corpseSpawnOnImpact:true,
      abilities:{preacherConversion:true,fatAreaAttack:true,corpseThrowing:true,ghoulLongLeap:true,harvesterDamagePerTick:100,harvesterRange:220},
      economy:{salvagePayout:50,salvageIntervalTicks:600,populationPerTrailer:5},
      multipliers:{units:{health:1,moveSpeed:1,damage:1},zombies:{health:1,moveSpeed:1,damage:1}}};
  }
  function validate(input) {
    record(input,'$',keys.filter(key=>key !== 'economy'),['economy','multipliers']);
    if (input.schemaVersion !== 1) fail('$.schemaVersion','supported version is 1');
    record(input.abilities,'$.abilities',abilityKeys,numericAbilities.concat(optionalBooleanAbilities));
    const baseline = defaults();
    const economy = Object.prototype.hasOwnProperty.call(input,'economy') ? input.economy : baseline.economy;
    record(economy,'$.economy',economyKeys);
    const ability = key => Object.prototype.hasOwnProperty.call(input.abilities,key) ? input.abilities[key] : baseline.abilities[key];
    const enabled = input.zombieTypesEnabled;
    if (!Array.isArray(enabled) || enabled.length !== 5) fail('$.zombieTypesEnabled','expected exactly 5 booleans');
    for (const key of Reflect.ownKeys(enabled)) {
      if (key !== 'length' && !['0','1','2','3','4'].includes(key)) fail('$.zombieTypesEnabled.' + String(key),'unknown field');
      if (key !== 'length') {
        const descriptor = Object.getOwnPropertyDescriptor(enabled,key);
        if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor,'value')) fail('$.zombieTypesEnabled.' + key,'expected a JSON value');
      }
    }
    const copy = {schemaVersion:1,automaticSpawning:bool(input.automaticSpawning,'$.automaticSpawning'),
      zombieTypesEnabled:Array.from({length:5},(_,i) => {
        if (!Object.prototype.hasOwnProperty.call(enabled,i)) fail('$.zombieTypesEnabled['+i+']','required field is missing');
        return bool(enabled[i],'$.zombieTypesEnabled['+i+']');
      }),
      baseReinforcements:bool(input.baseReinforcements,'$.baseReinforcements'),
      corpseSpawnOnImpact:bool(input.corpseSpawnOnImpact,'$.corpseSpawnOnImpact'),abilities:{},economy:{}};
    for (const key of abilityKeys) copy.abilities[key] = bool(input.abilities[key],'$.abilities.'+key);
    for (const key of optionalBooleanAbilities) copy.abilities[key] = bool(ability(key),'$.abilities.'+key);
    copy.abilities.harvesterDamagePerTick = integer(ability('harvesterDamagePerTick'),'$.abilities.harvesterDamagePerTick',0,100000000);
    copy.abilities.harvesterRange = integer(ability('harvesterRange'),'$.abilities.harvesterRange',0,3200);
    copy.economy.salvagePayout = integer(economy.salvagePayout,'$.economy.salvagePayout',0,1000000);
    copy.economy.salvageIntervalTicks = integer(economy.salvageIntervalTicks,'$.economy.salvageIntervalTicks',1,1000000);
    copy.economy.populationPerTrailer = integer(economy.populationPerTrailer,'$.economy.populationPerTrailer',1,1000);
    copy.multipliers = validateMultipliers(Object.prototype.hasOwnProperty.call(input,'multipliers') ? input.multipliers : baseline.multipliers);
    return copy;
  }
  function portFor(target) {
    if (!target || (typeof target !== 'object' && typeof target !== 'function') || !target.ZTPGamePort)
      throw new Error('CustomRules: generated-game.js must be loaded first');
    return target.ZTPGamePort;
  }
  function getState(target) {
    const state = states.get(target);
    if (!state) throw new Error('CustomRules: install must run first');
    return state;
  }
  function wrap(owner, key, factory) {
    if (!owner || typeof owner[key] !== 'function') throw new Error('CustomRules: missing runtime method ' + key);
    owner[key] = factory(owner[key]);
  }
  function syncHealthMarker(port) {
    const game = port.state.bb_Game;
    if (game && game.bbmainState === 2 && game.bbzombiebase) game.bbzombiehealth = game.bbzombiebase.bbhealth;
  }
  function availableEntitySlots(game) {
    if (!game) return ENTITY_LIMIT;
    let count = 0;
    for (const list of [game.bbpeople,game.bbzombies,game.bbpombies]) {
      if (!list) continue;
      const iterator = list.bbObjectEnumerator();
      while (iterator.bbHasNext()) { iterator.bbNextObject(); if (++count >= ENTITY_LIMIT) return 0; }
    }
    return ENTITY_LIMIT-count;
  }
  function atEntityLimit(game) { return availableEntitySlots(game) === 0; }
  function getEntityCapacity(target) { return availableEntitySlots(portFor(target).state.bb_Game); }
  function syncPopulation(port,state) {
    const game = port.state.bb_Game;
    if (game && game.bbztp) game.bbztp.bbmaxforce = game.bbztp.bbbuildingcount[0] * state.rules.economy.populationPerTrailer;
  }
  function hooks(target, state) {
    const port = portFor(target);
    // Configuration-driven skill spawning shares the same live-body budget.
    // A bounded pending dispatch can wait instead of silently dropping orders.
    port.getEntityCapacity = () => availableEntitySlots(port.state.bb_Game);
    // The mob skill inserts people directly, bypassing AddPerson/AddZombie.
    // Guard only the three current live-entity lists; wave queues, effects,
    // scores and all other list instances remain untouched. Conversion removes
    // its source first, so a transfer still has a slot at the ceiling.
    wrap(port.bb_std_list_List.prototype,'bbAddLast',original => function () {
      const game = port.state.bb_Game;
      if (game && (this === game.bbpeople || this === game.bbzombies || this === game.bbpombies) && atEntityLimit(game)) return null;
      return original.apply(this,arguments);
    });
    // Wrap the configuration adapter, not its original queue implementation:
    // pausing leaves ticks, elapsed wave time, counts and queue order unchanged.
    // Crossing base-health thresholds while disabled consumes those crossings,
    // so re-enabling does not release a deferred reinforcement flood.
    wrap(port.bb_ZombieMob,'bbUpdate',original => function () {
      if (!state.rules.automaticSpawning) { syncHealthMarker(port); return 0; }
      state.mobDepth++;
      try {
        const result = original.apply(this,arguments);
        if (!state.rules.baseReinforcements) syncHealthMarker(port);
        return result;
      }
      finally { state.mobDepth--; }
    });
    wrap(port.bb_ZombieMob,'bbSpawn',original => function () {
      if (!state.manualDepth && state.mobDepth && !state.rules.baseReinforcements) return 0;
      return original.apply(this,arguments);
    });
    wrap(port.bb_Zomba.prototype,'bbGameTick',original => function () {
      state.tickDepth++;
      state.harvestFrames.push([]);
      state.trainingFrames.push(new Set());
      try { return original.apply(this,arguments); }
      finally {
        for (const power of state.harvestFrames.pop()) power.bbtype = 1;
        for (const unit of state.trainingFrames.pop()) if (unit.bborders > 0) unit.bbbusy = 1;
        state.tickDepth--; state.impact = null;
        if (!state.rules.automaticSpawning || !state.rules.baseReinforcements) syncHealthMarker(port);
        syncPopulation(port,state);
      }
    });
    wrap(port.bb_Zomba.prototype,'bbResetGame',original => function () {
      const result = original.apply(this,arguments);syncPopulation(port,state);return result;
    });
    wrap(port.bb_Zomba.prototype,'bbBuyUnit',original => function () {
      syncPopulation(port,state);return original.apply(this,arguments);
    });
    wrap(port.bb_Zomba.prototype,'bbAddPerson',original => function (unit) {
      if (atEntityLimit(this)) {
        if (state.tickDepth && !state.manualDepth && unit && unit.bbbusy === 0 && unit.bborders > 0) {
          // The original production loop just decremented busy to zero and
          // will next consume one order. Counter that consumption, then retry
          // next tick rather than losing a paid order and reserved population.
          unit.bborders++;
          state.trainingFrames[state.trainingFrames.length-1].add(unit);
        }
        return null;
      }
      return original.apply(this,arguments);
    });
    wrap(port.bb_Zomba.prototype,'bbAddWealth',() => function (amount) {
      const economy = state.rules.economy;
      // Preserve the original integer input conversion, shared yard-tick pool,
      // payout count and remainder without looping once per payout. Unlimited
      // buildings can otherwise turn a short interval into a huge tight loop.
      // Keep the intermediate sum wide so signed-int32 overflow cannot turn a
      // large positive income into debt; stored cash saturates instead of wraps.
      const pending = (this.bbcoins|0) + (amount|0);
      const payments = pending >= economy.salvageIntervalTicks ? Math.floor(pending / economy.salvageIntervalTicks) : 0;
      this.bbcoins = Math.max(-2147483648,pending - payments * economy.salvageIntervalTicks);
      this.bbztp.bbcash = Math.min(2147483647,this.bbztp.bbcash + payments * economy.salvagePayout)|0;
      return 0;
    });
    wrap(port.bb_PowerUp.prototype,'bbUpdate',original => function () {
      const result = original.apply(this,arguments), abilities = state.rules.abilities;
      if (state.tickDepth && this.bbtype === 1 && (abilities.harvesterDamagePerTick !== 100 || abilities.harvesterRange !== 220)) {
        const game = port.state.bb_Game, iterator = game.bbzombies.bbObjectEnumerator(), x = this.bbxpos|0;
        while (iterator.bbHasNext()) {
          const zombie = iterator.bbNextObject();
          if (zombie.bbunit.bbtype === 37) continue;
          const leadingEdge = (zombie.bbxpos + zombie.bbunit.bbhitoffset - zombie.bbunit.bbhitradius)|0;
          const distance = (leadingEdge - x)|0;
          if (distance >= 0 && distance < abilities.harvesterRange) {
            zombie.bbSmack(abilities.harvesterDamagePerTick,1);this.bbHarvest(zombie);
          }
        }
        // The original next synchronous branch checks this value. Hide only
        // this harvester until the enclosing tick completes, not its targets.
        state.harvestFrames[state.harvestFrames.length-1].push(this);this.bbtype = -1;
      }
      return result;
    });
    wrap(port.bb_Fling.prototype,'bbUpdate',original => function () {
      const result = original.apply(this,arguments);
      // The original game tick synchronously bombs people and adds one basic
      // zombie immediately after a recycled Fling update. Tag only that leaf.
      state.impact = state.tickDepth && this.bbrecycle ? this : null;
      return result;
    });
    wrap(port.bb_Zombie.prototype,'bbUpdate',original => function () {
      if (this.bbunit && this.bbunit.bbtype === 33 && this.bbmode === 7) {
        // GameTick selects the far-distance mode BEFORE calling this method;
        // suppressing here prevents both airborne movement and the final large
        // displacement. Keep the origin to safely cancel an in-flight leap.
        if (!state.leapOrigins.has(this)) state.leapOrigins.set(this,this.bbypos);
        if (!state.rules.abilities.ghoulLongLeap) {
          this.bbypos = state.leapOrigins.get(this);this.bbmode = 0;this.bbjump = 0;
        }
      }
      const result = original.apply(this,arguments);
      if (this.bbmode !== 7) state.leapOrigins.delete(this);
      return result;
    });
    wrap(port.bb_Zomba.prototype,'bbAddZombie',original => function (unit) {
      const impact = state.tickDepth && state.impact && unit === this.bbzunits[0];
      if (impact) state.impact = null;
      if (!state.manualDepth) {
        const index = unit && unit.bbtype - 32;
        if (state.mobDepth && index >= 0 && index < 5 && !state.rules.zombieTypesEnabled[index]) return null;
        if (impact) {
          if (!state.rules.corpseSpawnOnImpact) {
            // Caller assigns x/y/layer to its result unconditionally. Supply an
            // unattached sink, not null, without RNG draws or a live entity.
            return {bbxpos:0,bbypos:0,bblayer:0};
          }
        }
      }
      // A defensive sandbox ceiling also covers huge imported wave counts and
      // corpse impacts. It never changes the original game's ordinary counts.
      if (atEntityLimit(this)) return impact ? {bbxpos:0,bbypos:0,bblayer:0} : null;
      const result = original.apply(this,arguments);
      // Winning stops normal AddZombie creation, but the original effect loop
      // still assigns coordinates to an impact's return value on the score
      // screen. Keep that harmless lingering effect from dereferencing null.
      return impact && !result ? {bbxpos:0,bbypos:0,bblayer:0} : result;
    });
    // Suppress the specific ability's consumed hit event. This retains original
    // movement/animation/state timers and does not disable unrelated attacks.
    for (const [type,modes,ability,Class] of [[4,[6],'preacherConversion',port.bb_Person],
      [35,[10],'fatAreaAttack',port.bb_Zombie],[36,[11],'corpseThrowing',port.bb_Zombie]]) {
      wrap(Class.prototype,'bbHitKey',original => function () {
        const hit = original.apply(this,arguments);
        return state.tickDepth && this.bbunit && this.bbunit.bbtype === type && modes.includes(this.bbmode) && !state.rules.abilities[ability] ? 0 : hit;
      });
    }
  }
  function install(target, input) {
    const port = portFor(target), rules = validate(input === undefined ? defaults() : input);
    let state = states.get(target);
    if (state) return update(target,rules);
    if (port.state.bb_Game) throw new Error('CustomRules: install must run before bb_Main');
    const original = target.bb_Init;
    if (typeof original !== 'function') throw new Error('CustomRules: missing runtime method bb_Init');
    state = {rules,mobDepth:0,tickDepth:0,manualDepth:0,impact:null,harvestFrames:[],trainingFrames:[],leapOrigins:new WeakMap()};
    hooks(target,state);
    state.initializer = function () {
      state.mobDepth = state.tickDepth = state.manualDepth = 0; state.impact = null;state.harvestFrames = [];state.trainingFrames = [];state.leapOrigins = new WeakMap();
      return original.apply(this,arguments);
    };
    target.bb_Init = port.bb_Init = state.initializer;
    states.set(target,state);
    return snapshot(target);
  }
  function update(target, input) {
    const state = getState(target), rules = validate(input);
    const game = target.ZTPGamePort.state.bb_Game;
    if (game && rules.economy.salvageIntervalTicks !== state.rules.economy.salvageIntervalTicks)
      game.bbcoins = Math.floor(game.bbcoins * rules.economy.salvageIntervalTicks / state.rules.economy.salvageIntervalTicks);
    state.rules = rules;
    syncPopulation(target.ZTPGamePort,state);
    return snapshot(target);
  }
  function snapshot(target) { return validate(getState(target).rules); }
  function beginManualSpawn(target, fn) {
    const state = getState(target);
    if (typeof fn !== 'function') throw new TypeError('CustomRules: manual spawn requires a synchronous function');
    state.manualDepth++;
    try { return fn(); } finally { state.manualDepth--; }
  }
  return Object.freeze({defaults,validate,validateMultipliers,install,update,snapshot,getEntityCapacity,beginManualSpawn,withManualSpawn:beginManualSpawn,ENTITY_LIMIT,MULTIPLIER_LIMIT});
});
