/* Hand-written configuration boundary. Keep this separate from generated-game.js. */
(function (root, factory) {
  'use strict';
  const api = factory(typeof module === 'object' && module.exports ?
    {factions:require('./factions.js'),rules:require('./custom-rules.js')} : null);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GameConfig = api;
})(typeof globalThis === 'object' ? globalThis : this, function (imports) {
  'use strict';
  const KINDS = ['units', 'zombies', 'buildings', 'powers', 'levels'];
  // A zero maximum removes the gameplay cap, not the engine's numeric guard.
  const BUILDING_SAFETY_LIMIT = 100000;
  // Recovered health fields are signed ActionScript int values. Unlike the
  // generic configuration default, this is the actual storage boundary.
  const HEALTH_SAFETY_LIMIT = 2147483647;
  // Counts are stored as pending work, not a synchronous object-allocation
  // loop. The numeric boundary is the original signed-int32 storage range;
  // the per-frame budget is deliberately independent of the requested count.
  const POWER_COUNT_LIMIT = 2147483647;
  const POWER_DISPATCH_BUDGET = 32;
  const ENTITY_SAFETY_LIMIT = 1000;
  // Cosmetic base debris only. Each base owns its slots so concentrated fire
  // on one side cannot suppress the other base's hit feedback or actor deaths.
  const BASE_DEBRIS_LIMIT_PER_SIDE = 256;
  const HEALTH_LABELS = {
    units:['铲兵','霰弹枪兵','机枪皮卡','燃烧瓶兵','牧师','己方基地'],
    zombies:['普通僵尸','跳跃僵尸','快速僵尸','肥胖僵尸','投尸僵尸','敌方基地']
  };
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
  // Enumerable symbol provenance survives Object.assign-based faction copies,
  // while ordinary trained/manual people never acquire a skill source tag.
  const powerProvenance = Symbol('GameConfig.powerProvenance');
  const sandboxPowerSide = Symbol('GameConfig.sandboxPowerSide');
  const maximumHealth = Symbol('GameConfig.maximumHealth');
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
  function health(value, path, label) {
    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value))
      fail(path, 'expected a finite integer（' + label + '生命值须为有限整数；0 表示死亡，不是无敌）');
    if (value < 1 || value > HEALTH_SAFETY_LIMIT)
      fail(path, 'must be between 1 and ' + HEALTH_SAFETY_LIMIT + '（' + label + '生命值：1～2,147,483,647；这是 32 位整数安全上限，避免溢出变成负数；0 表示死亡，不是无敌）');
  }
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
    object(item, path, ['type', 'count', 'delay'], allowWait ? ['enabled','id'] : ['enabled']);
    if ('enabled' in item && typeof item.enabled !== 'boolean') fail(path + '.enabled', 'expected a boolean');
    if ('id' in item && (typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(item.id)))
      fail(path + '.id', 'expected 1..80 ASCII letters, digits, underscores or hyphens');
    integer(item.type, path + '.type', allowWait ? 0 : 1, 5);
    integer(item.count, path + '.count', 1, 100000);
    // The original bbInit/bbSpawn convert this to int, intentionally including
    // fractional delays such as 0.3 -> 0. Do not silently change game timing.
    number(item.delay, path + '.delay', 0, 86400, false);
  }
  function validate(input,options) {
    if (options !== undefined) object(options,'$options',[],['multipliers']);
    const composition = options === undefined ? null : validateMultipliers(options.multipliers);
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
      health(item.health, path + '.health', HEALTH_LABELS[kind][item.id]);
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
      integer(item.maximum, path + '.maximum', 0, BUILDING_SAFETY_LIMIT);
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
        object(item.effect, path + '.effect', ['shovelCount','shotgunCount','angerSpeedMultiplier'],
          ['survivalistCount','bomberCount','preacherCount']);
        for (const key of ['shovelCount','shotgunCount','survivalistCount','bomberCount','preacherCount'])
          if (key in item.effect) integer(item.effect[key], path + '.effect.' + key, 0, POWER_COUNT_LIMIT);
        number(item.effect.angerSpeedMultiplier, path + '.effect.angerSpeedMultiplier', 0, 100, false);
      } else {
        object(item.effect, path + '.effect', item.id === 2 ? ['jetCount','moveSpeed'] : ['moveSpeed']);
        number(item.effect.moveSpeed, path + '.effect.moveSpeed', 0.000001, 100, false);
        if (item.id === 2) integer(item.effect.jetCount, path + '.effect.jetCount', 0, POWER_COUNT_LIMIT);
      }
    });
    fixedItems(input.levels, 'levels', 1, 4, (item, path) => {
      object(item, path, ['id','key','title','name','zombieDamageMultiplier','zombieHealthMultiplier','startingCash','startingXp','waves','reinforcements']);
      identity(item, path); string(item.title, path + '.title', 120);
      number(item.zombieDamageMultiplier, path + '.zombieDamageMultiplier', 0, 100, false);
      number(item.zombieHealthMultiplier, path + '.zombieHealthMultiplier', 1, 100, false);
      integer(item.startingCash, path + '.startingCash'); integer(item.startingXp, path + '.startingXp');
      array(item.waves, path + '.waves', 0, 10000);
      item.waves.forEach((w,i) => wave(w, path + '.waves[' + i + ']', true));
      const waveIds = new Set();
      item.waves.forEach((w,i) => {
        if ('id' in w && waveIds.has(w.id)) fail(path+'.waves['+i+'].id','duplicate wave id');
        if ('id' in w) waveIds.add(w.id);
      });
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
        if (!composition && zombie.health * Math.trunc(item.zombieHealthMultiplier) > HEALTH_SAFETY_LIMIT)
          fail(path + '.zombieHealthMultiplier', 'effective health overflows signed int32 for zombie id ' + zombie.id +
            '（第 ' + item.id + ' 关：' + HEALTH_LABELS.zombies[zombie.id] + '生命值 × 关卡倍率的整数部分须 ≤ 2,147,483,647；请降低生命值或关卡倍率）');
        if (!composition && 'damage' in zombie && zombie.damage * item.zombieDamageMultiplier > 2147483647)
          fail(path + '.zombieDamageMultiplier', 'effective damage overflows signed int32 for zombie id ' + zombie.id);
      }
    });
    const result = JSON.parse(JSON.stringify(input));
    for (const kind of KINDS) result[kind].sort((a,b) => a.id-b.id);
    for (const level of result.levels) {
      const ids = new Set(level.waves.filter(w => 'id' in w).map(w => w.id));
      level.waves.forEach((w,i) => {
        if ('id' in w) return;
        const base = 'stage-'+level.id+'-wave-'+(i+1); let id = base, suffix = 0;
        while (ids.has(id)) id = base+'-auto'+(++suffix);
        w.id = id; ids.add(id);
      });
    }
    if (composition) validateEffective(result,composition);
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
  function validateMultipliers(input) {
    if (input === undefined) return {units:{health:1,moveSpeed:1,damage:1},zombies:{health:1,moveSpeed:1,damage:1}};
    object(input,'$multipliers',['units','zombies']);
    const result = {};
    for (const kind of ['units','zombies']) {
      object(input[kind],'$multipliers.'+kind,['health','moveSpeed','damage']);
      result[kind] = {};
      for (const field of ['health','moveSpeed','damage']) {
        const value = input[kind][field], path = '$multipliers.'+kind+'.'+field;
        number(value,path,0,HEALTH_SAFETY_LIMIT,false);
        if (field === 'health' && value === 0) fail(path,'must be greater than zero');
        result[kind][field] = value;
      }
    }
    return result;
  }
  function effectiveMaximum(config,multipliers,human,id,levelMultiplier = 1) {
    const item = config[human ? 'units' : 'zombies'][id];
    return Math.trunc(item.health * (id === 5 ? 1 : multipliers[human ? 'units':'zombies'].health) *
      (human || id === 5 ? 1 : Math.trunc(levelMultiplier)));
  }
  function validateEffective(config,multipliers) {
    for (const kind of ['units','zombies']) for (const item of config[kind].slice(0,5)) {
      const scale = multipliers[kind], path = '$multipliers.'+kind;
      const levels = kind === 'zombies' ? config.levels : [{zombieHealthMultiplier:1,zombieDamageMultiplier:1}];
      for (const level of levels) {
        const maximum = effectiveMaximum(config,multipliers,kind === 'units',item.id,level.zombieHealthMultiplier);
        if (maximum < 1 || maximum > HEALTH_SAFETY_LIMIT)
          fail(path+'.health','effective health must be between 1 and '+HEALTH_SAFETY_LIMIT+' for '+item.key);
        if ('damage' in item && item.damage*scale.damage*level.zombieDamageMultiplier > HEALTH_SAFETY_LIMIT)
          fail(path+'.damage','effective damage overflows signed int32 for '+item.key);
      }
      if ('projectileDamage' in item && item.projectileDamage*scale.damage > HEALTH_SAFETY_LIMIT)
        fail(path+'.damage','effective projectile damage overflows signed int32 for '+item.key);
      const speed = item.moveSpeed*scale.moveSpeed;
      if (speed > 1000000 || (kind === 'units' && speed*config.powers[0].effect.angerSpeedMultiplier > 1000000))
        fail(path+'.moveSpeed','effective movement speed exceeds the numeric safety boundary of 1000000 for '+item.key);
    }
    return multipliers;
  }
  function compile(input,options) {
    if (options !== undefined) object(options,'$options',[],['multipliers']);
    const multipliers = validateMultipliers(options && options.multipliers);
    const config = validate(input,{multipliers});
    return compileValidated(config,multipliers);
  }
  function compileValidated(config,multipliers = validateMultipliers()) {
    const raw = {};
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
    for (const level of config.levels) raw['bb_leveldata_level' + level.id] = level.waves.filter(w => w.enabled !== false).flatMap(w => [w.type,w.count,w.delay]);
    return freeze({config, raw, multipliers, reinforcements: config.levels.map(level => level.reinforcements.map(entry =>
      ({threshold:entry.threshold,calls:entry.calls.filter(w => w.enabled !== false)})))});
  }
  function portFor(target) {
    if (!target || !target.ZTPGamePort) throw new Error('GameConfig: generated-game.js must be loaded before installing configuration');
    return target.ZTPGamePort;
  }
  function wrap(owner, name, replacement) {
    if (!owner || typeof owner[name] !== 'function') throw new Error('GameConfig: missing runtime method ' + name);
    const original = owner[name]; owner[name] = replacement(original);
  }
  function entityCapacity(port,game) {
    if (typeof port.getEntityCapacity === 'function') return port.getEntityCapacity();
    let count = 0;
    for (const list of [game.bbpeople,game.bbzombies,game.bbpombies]) {
      const iterator = list.bbObjectEnumerator();
      while (iterator.bbHasNext()) { iterator.bbNextObject(); if (++count >= ENTITY_SAFETY_LIMIT) return 0; }
    }
    return ENTITY_SAFETY_LIMIT-count;
  }
  function effectCapacity(game) {
    let count = 0, iterator = game.bbpowerups.bbObjectEnumerator();
    while (iterator.bbHasNext()) { iterator.bbNextObject(); if (++count >= ENTITY_SAFETY_LIMIT) return 0; }
    return ENTITY_SAFETY_LIMIT-count;
  }
  function dispatchPowerSpawns(target,state,game) {
    const port = portFor(target), frame = state.powerDispatchFrame;
    let budget = POWER_DISPATCH_BUDGET-(frame && frame.game === game ? frame.used : 0);
    if (budget <= 0 || !state.powerSpawns.length) return;
    let capacity, effects, cursor = 0;
    while (budget > 0 && cursor < state.powerSpawns.length) {
      const group = state.powerSpawns[cursor];
      if (group.game !== game) { state.powerSpawns.splice(cursor,1); continue; }
      const angry = group.source === 'angry-mob';
      // Actor and power-up ceilings are independent. A full battlefield must
      // not make a queued mob block an otherwise available air strike (or the
      // reverse). FIFO order within each class of work remains unchanged.
      if (angry ? (capacity ??= entityCapacity(port,game)) <= 0 : (effects ??= effectCapacity(game)) <= 0) { cursor++; continue; }
      // Reuse a compact formation on later batches: a two-billion-unit order
      // must not place its last unit billions of pixels away from the battle.
      const position = group.index % POWER_DISPATCH_BUDGET + 1;
      let body, admitted;
      if (angry) {
        if (group.side) {
          const factions = target.Factions || imports?.factions, rules = target.CustomRules || imports?.rules;
          const spawn = () => factions.spawn(target,group.side,{kind:'unit',type:group.type},1)[0];
          body = rules ? rules.withManualSpawn(target,spawn) : spawn();
          admitted = !!body;
        } else {
          const sheet = [game.bbshovelman,game.bbshotgunman,game.bbtrucksheet,game.bbbombersheet,game.bbpreachersheet][group.type];
          body = game.bbunits[group.type].bbInstance(target.bb_Rand(8),port.bb_Cell.bbcells(sheet));
          admitted = game.bbpeople.bbAddLast(body);
        }
        if (body) {
          body[powerProvenance] = 0;
          const offset = -position*group.spacing + target.bb_reversebits(position,4);
          body.bbxpos = group.side === 'enemy' ? 1600-offset : offset;
          port.bb_Person.prototype.bbAnger.call(body);
        }
      } else {
        const harvester = group.source === 'harvester', type = harvester ? 1 : 2;
        body = new port.bb_PowerUp().bbPowerUp_new(harvester ? 0 : target.bb_Rand(8),type,
          harvester ? game.bbharvestsheet : game.bbjetsheet,harvester ? game.bbharvestbloodsheet : null);
        if (!harvester) { body.bbxpos -= position*128; body.bbypos += target.bb_reversebits(position,4)*10; }
        if (group.side) {
          body[sandboxPowerSide] = group.side;
          if (group.side === 'enemy') { body.bbxpos = 1600-body.bbxpos;body.bbwalkspeed = -body.bbwalkspeed; }
        }
        admitted = game.bbpowerups.bbAddLast(body);
      }
      budget--;
      if (frame && frame.game === game) frame.used++;
      if (!admitted) break;
      if (angry) capacity--; else effects--;
      group.index++; group.count--;
      if (group.count === 0) state.powerSpawns.splice(cursor,1);
    }
  }
  function releaseSandboxPower(target,powerId,options) {
    const port = portFor(target), state = states.get(target), game = port.state.bb_Game;
    if (!state) throw new Error('GameConfig: install or apply configuration first');
    integer(powerId,'$powerId',0,2);
    object(options,'$options',['side'],['validateOnly']);
    if (!['friendly','enemy'].includes(options.side)) fail('$options.side','expected friendly or enemy');
    if ('validateOnly' in options && typeof options.validateOnly !== 'boolean') fail('$options.validateOnly','expected a boolean');
    if (!game || ![2,6].includes(game.bbmainState)) throw new Error('GameConfig: sandbox skill release requires an active battle');
    const rules = target.CustomRules || imports?.rules;
    if (!rules || typeof rules.snapshot !== 'function') throw new Error('GameConfig: sandbox skills require CustomRules.install');
    rules.snapshot(target);
    const effect = (state.activeCompiled || state.compiled).config.powers[powerId].effect;
    const groups = [], side = options.side;
    if (powerId === 0) {
      const factions = target.Factions || imports?.factions;
      if (!factions || typeof factions.validateSpawn !== 'function') throw new Error('GameConfig: sandbox skills require Factions.install');
      for (const [type,key,spacing] of [[0,'shovelCount',20],[1,'shotgunCount',50],
        [2,'survivalistCount',100],[3,'bomberCount',50],[4,'preacherCount',50]]) {
        if (effect[key]) {
          factions.validateSpawn(target,side,{kind:'unit',type},effect[key]);
          groups.push({game,powerId,side,source:'angry-mob',type,count:effect[key],index:0,spacing});
        }
      }
    } else if (powerId === 1 || effect.jetCount) {
      groups.push({game,powerId,side,source:powerId === 1 ? 'harvester' : 'airstrike',type:powerId,count:powerId === 1 ? 1 : effect.jetCount,index:0});
    }
    // Validate every ordinary write and linked-list insertion before allocating,
    // drawing RNG or publishing the compact request. validateOnly is pure.
    const writable = (owner,key) => {
      const d = Object.getOwnPropertyDescriptor(owner,key);
      if (d ? !('value' in d) || !d.writable : !Object.isExtensible(owner))
        throw new Error('GameConfig: sandbox skill target is not writable: '+String(key));
    };
    if (!Array.isArray(state.powerSpawns) || !Object.isExtensible(state.powerSpawns)) throw new Error('GameConfig: sandbox skill queue is not writable');
    writable(state.powerSpawns,'length');
    // Dispatch may service older actor/effect requests before this new one.
    // Preflight both classes, not just the lists used by the selected skill.
    for (const key of ['bbpeople','bbpombies','bbzombies','bbpowerups']) {
      const collection = cancellationNodes(game,key);
      for (const node of [collection.head,...collection.nodes]) {writable(node,'bb_pred');writable(node,'bb_succ');}
    }
    const requested = groups.reduce((sum,group) => sum+group.count,0);
    for (const group of state.powerSpawns) if (group.game === game && group.side && group.source === 'angry-mob')
      (target.Factions || imports?.factions).validateSpawn(target,group.side,{kind:'unit',type:group.type},group.count);
    if (!Number.isSafeInteger(requested+state.powerSpawns.reduce((sum,group) => sum+group.count,0)))
      throw new Error('GameConfig: pending skill count exceeds safe integer storage');
    const result = {powerId,side,requested,spawned:0,pending:requested};
    if (options.validateOnly) return result;
    state.powerSpawns.push(...groups);
    dispatchPowerSpawns(target,state,game);
    result.pending = groups.reduce((sum,group) => sum+group.count,0);result.spawned = requested-result.pending;
    const audio = port.state.bb_Audio;
    if (powerId === 0) audio.bbPlay(audio.bbangrymob);
    if (powerId === 2) audio.bbPlay(audio.bbairstrike);
    return result;
  }
  function cancellationPowerId(value) {
    if (value === undefined || value === 'all') return null;
    if (!Number.isInteger(value) || value < 0 || value > 2)
      fail('$powerId','expected 0, 1, 2 or all');
    return value;
  }
  function cancellationNodes(game,key) {
    const list = game[key], head = list && list.bb_head;
    if (!head || typeof head !== 'object') throw new Error('GameConfig: skill effect list is unavailable: '+key);
    const nodes = [], seen = new Set(); let node = head;
    do {
      if (!node || typeof node !== 'object' || seen.has(node) || seen.size > 100000 ||
          !node.bb_succ || !node.bb_pred || node.bb_succ.bb_pred !== node || node.bb_pred.bb_succ !== node)
        throw new Error('GameConfig: skill effect list is corrupt: '+key);
      seen.add(node); if (node !== head) nodes.push(node); node = node.bb_succ;
    } while (node !== head);
    return {key,list,head,nodes};
  }
  function powerEffectSnapshot(state,game) {
    const byPower = [0,1,2].map(id => ({id,pending:0,actors:0,powerups:0,projectiles:0,explosions:0,charging:0}));
    const collections = [], counted = new Map(), pending = [];
    for (const group of state.powerSpawns) {
      if (group.game !== game) continue;
      const id = group.powerId === undefined ? group.source === 'angry-mob' ? 0 : 2 : group.powerId;
      if (!byPower[id] || !Number.isInteger(group.count) || group.count < 0)
        throw new Error('GameConfig: invalid pending skill request');
      byPower[id].pending += group.count;pending.push({group,id});
      if (!Number.isSafeInteger(byPower[id].pending)) throw new Error('GameConfig: pending skill count exceeds safe integer storage');
    }
    if (game) for (const [key,category] of [['bbpeople','actors'],['bbzombies','actors'],['bbpombies','actors'],
      ['bbpowerups','powerups'],['bbbottles','projectiles'],['bbexplosions','explosions']]) {
      const collection = cancellationNodes(game,key);collection.category = category;collection.matches = [];
      for (const node of collection.nodes) {
        const body = node.bb_data;
        let id = body && body[powerProvenance];
        // The recovered power-up type identifies the two vehicle skills even
        // for a pre-existing instance. Bottle kinds, unlike numeric damage,
        // distinguish an air bomb from a bomber's equal-damage projectile.
        if (category === 'powerups' && (body?.bbtype === 1 || body?.bbtype === 2)) id = body.bbtype;
        if (category === 'projectiles') id = body && body[projectileKind] === 1 ? 2 : undefined;
        if (![0,1,2].includes(id) || (category === 'actors' && id !== 0) ||
            (category === 'powerups' && id === 0) || (category === 'explosions' && id !== 2)) continue;
        if (category === 'actors' && (body === game.bbpeoplebase || body === game.bbzombiebase ||
            body?.bbunit?.bbtype === 5 || body?.bbunit?.bbtype === 37)) continue;
        collection.matches.push({node,body,id});
        const identity = category+':'+id;
        if (!counted.has(identity)) counted.set(identity,new Set());
        if (!counted.get(identity).has(body)) {counted.get(identity).add(body);byPower[id][category]++;}
      }
      collections.push(collection);
    }
    if (game) for (const item of byPower) {
      const power = game.bbpowers && game.bbpowers[item.id];
      if (!power || !Number.isFinite(power.bbbusy)) throw new Error('GameConfig: invalid skill charging state');
      item.charging = power.bbbusy > 0 ? 1 : 0;
    }
    return {byPower,collections,pending};
  }
  function cancelPowerEffects(target,powerId,options) {
    const port = portFor(target), state = states.get(target);
    if (!state) throw new Error('GameConfig: install or apply configuration first');
    const id = cancellationPowerId(powerId), game = port.state.bb_Game;
    if (!game) throw new Error('GameConfig: skill cancellation requires an initialized game');
    if (options !== undefined) {
      object(options,'$options',[],['validateOnly']);
      if ('validateOnly' in options && typeof options.validateOnly !== 'boolean') fail('$options.validateOnly','expected a boolean');
    }
    const selected = value => id === null || value === id;
    const snapshot = powerEffectSnapshot(state,game), report = {pending:0,actors:0,powerups:0,projectiles:0,explosions:0,charging:0};
    for (const item of snapshot.byPower) if (selected(item.id)) for (const key of Object.keys(report)) report[key] += item[key];
    const plan = [], actorStates = new Set();
    const writable = (owner,key) => {
      const descriptor = Object.getOwnPropertyDescriptor(owner,key);
      if (descriptor ? !('value' in descriptor) || !descriptor.writable : !Object.isExtensible(owner))
        throw new Error('GameConfig: skill cancellation target is not writable: '+String(key));
    };
    for (const collection of snapshot.collections) {
      const matches = collection.matches.filter(match => selected(match.id));
      if (!matches.length) continue;
      writable(game,collection.key);writable(collection.list,'bb_head');
      for (const node of [collection.head,...collection.nodes]) {writable(node,'bb_pred');writable(node,'bb_succ');}
      const removing = new Set(matches.map(match => match.node));
      const retained = [collection.head,...collection.nodes.filter(node => !removing.has(node))];
      for (let i=0;i<retained.length;i++) {
        plan.push([retained[i],'bb_pred',retained[(i+retained.length-1)%retained.length]],
          [retained[i],'bb_succ',retained[(i+1)%retained.length]]);
      }
      for (const {node,body} of matches) {
        plan.push([node,'bb_pred',node],[node,'bb_succ',node]);
        if (collection.category === 'actors' && !actorStates.has(body)) {
          const type = body?.bbunit?.bbtype, human = Number.isInteger(type) && type >= 0 && type < 5;
          if ((!human && !(Number.isInteger(type) && type >= 32 && type < 37)) || !Number.isFinite(body.bbhealth))
            throw new Error('GameConfig: invalid summoned actor state');
          writable(body,'bbhealth');writable(body,'bbmode');actorStates.add(body);
          plan.push([body,'bbhealth',0],[body,'bbmode',human ? 14 : 15]);
        }
      }
    }
    for (const item of snapshot.byPower) if (selected(item.id) && item.charging) {
      const power = game.bbpowers[item.id];writable(power,'bbbusy');plan.push([power,'bbbusy',0]);
    }
    writable(state,'powerSpawns');
    if (options && options.validateOnly) return report;
    // No virtual list removers, damage functions, tick, RNG, refunds or death
    // rewards run here. Every ordinary data write was checked before this point.
    const removingPending = new Set(snapshot.pending.filter(item => selected(item.id)).map(item => item.group));
    const retainedPending = state.powerSpawns.filter(group => !removingPending.has(group));
    commitPlan(plan);
    state.powerSpawns = retainedPending;
    return report;
  }
  function getPowerProgress(target,options) {
    portFor(target);
    const state = states.get(target);
    if (!state) throw new Error('GameConfig: install or apply configuration first');
    if (options !== undefined) {
      object(options,'$options',[],['includeActive']);
      if ('includeActive' in options && typeof options.includeActive !== 'boolean') fail('$options.includeActive','expected a boolean');
    }
    const game = target.ZTPGamePort.state.bb_Game;
    const groups = state.powerSpawns.filter(group => group.game === game)
      .map(group => Object.assign({type:group.type,count:group.count,source:group.source},group.side ? {side:group.side} : {}));
    const result = {pendingTotal:groups.reduce((total,group) => total+group.count,0),groups};
    if (options && options.includeActive) {
      result.byPower = powerEffectSnapshot(state,game).byPower;
      result.activeTotal = result.byPower.reduce((total,item) => total+item.actors+item.powerups+item.projectiles+item.explosions,0);
    }
    return result;
  }
  function hooks(target, state) {
    const port = portFor(target), config = () => (state.activeCompiled || state.compiled).config;
    const multipliers = () => (state.activeCompiled || state.compiled).multipliers;
    wrap(port.bb_Unit.prototype, 'bbUnit_new', original => function (type, name, data, offset) {
      const result = original.apply(this, arguments);
      if (type >= 0 && type < 5) this.bbbuildtime = config().units[type].buildTicks;
      const human = type >= 0 && type < 5, zombie = type >= 32 && type < 37;
      if (human || zombie) {
        const kind = human ? 'units':'zombies', item = config()[kind][human ? type : type-32];
        this.bbhealth = item.health*multipliers()[kind].health;
        if ('damage' in item) this.bbdamage = item.damage*multipliers()[kind].damage;
      }
      return result;
    });
    wrap(port.bb_Building.prototype, 'bbBuilding_new', original => function (type) {
      const result = original.apply(this, arguments); this.bbbuildtime = config().buildings[type].buildTicks; return result;
    });
    wrap(port.bb_Building.prototype, 'bbUpdate', original => function (economy) {
      const configured = this.bbmaximum, limit = configured || BUILDING_SAFETY_LIMIT;
      // Let the original handle affordability, prerequisites and normal hints.
      // Its == 0 checks must not interpret an unlimited unbuilt building as full.
      this.bbmaximum = limit;
      let result;
      try { result = original.apply(this,arguments); }
      finally { this.bbmaximum = configured; }
      const built = economy.bbbuildingcount[this.bbtype];
      if (built + this.bborders >= limit) {
        this.bbenabled = 0;
        this.bbcapacity = built >= limit ? 1 : 0;
        const suffix = built >= limit ? 's' : 's under construction';
        this.bbhint = target.bb_data_buildingabout[this.bbtype] + '[You already have the maximum number of ' +
          target.bb_data_buildingname[this.bbtype] + suffix + ']';
      }
      return result;
    });
    wrap(port.bb_Zomba.prototype, 'bbBuyBuilding', original => function (building) {
      const limit = building.bbmaximum || BUILDING_SAFETY_LIMIT;
      if (this.bbztp.bbbuildingcount[building.bbtype] + building.bborders >= limit) return 0;
      return original.apply(this,arguments);
    });
    wrap(port.bb_Zomba.prototype, 'bbDrawPark', original => function () {
      const counts = this.bbztp.bbbuildingcount, trailer = counts[0], junk = counts[1];
      // Extra copies remain part of the real economy/population. Only this
      // decorative draw leaf is limited to finite original placement slots.
      // No NaN transforms, unbounded draw loops, or out-of-range array reads.
      const trailerSlots = Math.min(15,Math.floor(target.bb_data_trailerpos.length/3)+1);
      const junkSlots = Math.min(5,Math.floor(target.bb_data_junkpos.length/3));
      counts[0] = Math.min(trailer,trailerSlots); counts[1] = Math.min(junk,junkSlots);
      try { return original.apply(this,arguments); }
      finally { counts[0] = trailer; counts[1] = junk; }
    });
    wrap(port.bb_Power.prototype, 'bbPower_new', original => function (type) {
      const result = original.apply(this, arguments), p = config().powers[type];
      this.bbbuildtime = p.buildTicks; this.bbxp = p.xp; this.bbcooltime = p.cooldownTicks; return result;
    });
    wrap(port.bb_Person.prototype, 'bbPerson_new', original => function (layer, unit) {
      const result = original.apply(this, arguments);
      if (unit.bbtype >= 0 && unit.bbtype < 5) {
        this.bbwalkspeed = config().units[unit.bbtype].moveSpeed*multipliers().units.moveSpeed;
        this.bbhealth = Math.trunc(unit.bbhealth);
      }
      this[maximumHealth] = this.bbhealth;
      return result;
    });
    wrap(port.bb_Zombie.prototype, 'bbZombie_new', original => function (layer, unit) {
      const result = original.apply(this, arguments);
      if (unit.bbtype >= 32 && unit.bbtype < 37) {
        this.bbwalkspeed = config().zombies[unit.bbtype-32].moveSpeed*multipliers().zombies.moveSpeed;
        // The recovered constructor casts its template health before applying
        // the level multiplier. Army modifiers require one final cast instead,
        // e.g. 25 * 1.5 * 2 = 75, not trunc(37.5) * 2 = 74.
        const game = port.state.bb_Game;
        const level = config().levels[game && Number.isInteger(game.bbdifficulty) ? game.bbdifficulty : 0];
        const stageHealth = game && game.bbZombieHealthMultiplier >= 1 ? game.bbZombieHealthMultiplier : level.zombieHealthMultiplier;
        this.bbhealth = Math.trunc(unit.bbhealth*Math.trunc(stageHealth));
      }
      this[maximumHealth] = this.bbhealth;
      return result;
    });
    wrap(port.bb_Person.prototype, 'bbAnger', original => function () {
      const before = this.bbwalkspeed, result = original.apply(this, arguments);
      this.bbwalkspeed = before * config().powers[0].effect.angerSpeedMultiplier;
      return result;
    });
    wrap(port.bb_PowerUp.prototype, 'bbPowerUp_new', original => function (layer, type) {
      const result = original.apply(this, arguments);
      if (type === 1 || type === 2) {
        this.bbwalkspeed = config().powers[type].effect.moveSpeed;
        this[powerProvenance] = type;
      }
      return result;
    });
    wrap(port.bb_PowerUp.prototype,'bbUpdate',original => function () {
      const side = this[sandboxPowerSide];
      if (!side) return original.apply(this,arguments);
      const game = port.state.bb_Game, enemy = side === 'enemy', previous = state.powerSource;
      state.powerSource = this;
      if (enemy) { this.bbxpos = 1600-this.bbxpos;this.bbwalkspeed = Math.abs(this.bbwalkspeed); }
      let result;
      try { result = original.apply(this,arguments); }
      finally {
        if (enemy) { this.bbxpos = 1600-this.bbxpos;this.bbwalkspeed = -Math.abs(this.bbwalkspeed); }
        state.powerSource = previous;
      }
      if (this[powerProvenance] === 1) {
        const rules = target.CustomRules || imports?.rules;
        const frame = state.powerDispatchFrame;
        const abilities = frame?.sandboxAbilities || (rules ? rules.snapshot(target).abilities : {harvesterRange:220,harvesterDamagePerTick:100});
        if (frame) frame.sandboxAbilities = abilities;
        const direction = enemy ? -1 : 1;
        const victims = enemy ? [...listItems(game.bbpeople),...listItems(game.bbpombies)] : listItems(game.bbzombies);
        for (const body of new Set(victims)) {
          const type = body?.bbunit?.bbtype;
          if (!Number.isInteger(type) || type === 5 || type === 37 || body === game.bbpeoplebase || body === game.bbzombiebase ||
              body.bbhealth <= 0 || body.bbmode === 14 || body.bbmode === 15) continue;
          const human = type < 32;
          const center = body.bbxpos+(human || !enemy ? body.bbunit.bbhitoffset : -body.bbunit.bbhitoffset);
          const edge = center-direction*body.bbunit.bbhitradius;
          const distance = Math.trunc(direction*(edge-Math.trunc(this.bbxpos)));
          if (distance >= 0 && distance < abilities.harvesterRange) {
            if (human && typeof body.bbInfect === 'function') body.bbInfect(abilities.harvesterDamagePerTick);
            else body.bbSmack(abilities.harvesterDamagePerTick,1);
            this.bbHarvest(body);
          }
        }
        // Both the recovered tick and the outer CustomRules hook otherwise
        // target the original enemy-only list. Hide this one branch until the
        // synchronous enclosing update has completed, exactly as CustomRules
        // does for a non-default native harvester range/damage.
        if (state.bottleLoopDepth) {
          (state.sandboxHarvesters ||= new Set()).add(this);this.bbtype = -1;
        }
      }
      return result;
    });
    wrap(port.bb_PowerUp.prototype,'bbDraw',original => function (dx) {
      if (this[sandboxPowerSide] !== 'enemy') return original.apply(this,arguments);
      const previous = state.powerDrawSource;state.powerDrawSource = this;
      const x = this.bbxpos+(dx|0);
      port.bb_mojo_graphics_PushMatrix();port.bb_mojo_graphics_Translate(2*x,0);port.bb_mojo_graphics_Scale(-1,1);
      try { return original.apply(this,arguments); }
      finally {port.bb_mojo_graphics_PopMatrix();state.powerDrawSource = previous;}
    });
    wrap(port.bb_Zomba.prototype,'bbAddBlood',original => function (x,y,vx,vy) {
      const source = state.powerDrawSource;
      if (source) { x = 2*source.bbxpos-x;vx = -vx; }
      return original.call(this,x,y,vx,vy);
    });
    wrap(port.bb_Zomba.prototype,'bbAddSmoke',original => function (layer,x,y) {
      if (state.powerSource?.[sandboxPowerSide] === 'enemy') x = 1600-x;
      return original.call(this,layer,x,y);
    });
    wrap(port.bb_Zomba.prototype,'bbAddBottle',original => function (layer,x,y,vx,vy,kind) {
      const source = state.powerSource;
      if (source?.[sandboxPowerSide] === 'enemy') { x = 1600-x;vx = -vx; }
      const result = original.call(this,layer,x,y,vx,vy,kind);
      if (source && kind === 1) {
        const bottle = this.bbbottles.bbLast();
        if (bottle) bottle[sandboxPowerSide] = source[sandboxPowerSide];
      }
      return result;
    });
    wrap(port.bb_Bottle.prototype, 'bbBottle_new', original => function (layer, image, x, y, vx, vy, kind) {
      const result = original.apply(this, arguments);
      // kind 0 is the bomber bottle; kind 1 is the air-strike bomb. Do not
      // alter the latter's 500 damage / zombie-base immunity convention.
      this[projectileKind] = kind | 0;
      if ((kind | 0) === 1) this[powerProvenance] = 2;
      if ((kind | 0) === 0) this.bbdamage = Math.trunc(config().units[3].projectileDamage*multipliers().units.damage);
      return result;
    });
    wrap(port.bb_Fling.prototype, 'bbFling_new', original => function () {
      const result = original.apply(this, arguments);
      this.bbdamage = Math.trunc(config().zombies[4].projectileDamage*multipliers().zombies.damage);
      return result;
    });
    // Scope provenance to the two original synchronous bottle loops. Calls to
    // Bottle.Update outside them cannot leave a tag for an unrelated explosion.
    for (const method of ['bbGameTick','bbUpdateAttract']) wrap(port.bb_Zomba.prototype, method, original => function () {
      state.bottleLoopDepth = (state.bottleLoopDepth || 0) + 1;
      const previousXpFrame = state.xpAwardFrame;
      const previousPowerFrame = state.powerDispatchFrame;
      if (method === 'bbGameTick') state.powerDispatchFrame = {game:this,used:0};
      if (method === 'bbGameTick') state.xpAwardFrame = {game:this,
        eligible:Number.isInteger(this.bbztp.bbxp) && this.bbztp.bbxp >= 0 && this.bbztp.bbxp <= HEALTH_SAFETY_LIMIT};
      try {
        const result = original.apply(this,arguments);
        if (method === 'bbGameTick' && this.bbmainState === 2) dispatchPowerSpawns(target,state,this);
        return result;
      }
      finally {
        if (state.sandboxHarvesters) {
          for (const harvester of state.sandboxHarvesters) harvester.bbtype = 1;
          state.sandboxHarvesters.clear();
        }
        state.bottleLoopDepth--; state.explodingBottle = null;
        state.xpAwardFrame = previousXpFrame;
        state.powerDispatchFrame = previousPowerFrame;
      }
    });
    // The recovered tick adds a dead enemy's BASE health to XP, casts to int,
    // and immediately calls this leaf before processing the next enemy. With
    // two nonnegative int32 operands an overflowing sum is always negative.
    // Repair only that scoped award (not manual effects or converted allies),
    // preserving normal rewards and later spending while avoiding wrapped XP.
    wrap(port.bb_Zomba.prototype, 'bbBlowZombie', original => function (zombie) {
      const frame = state.xpAwardFrame;
      if (frame && frame.game === this && frame.eligible && this.bbztp.bbxp < 0 &&
          zombie && zombie.bbmode === 15 && zombie.bbunit && zombie.bbunit.bbtype !== 37 &&
          zombie.bbunit.bbhealth > 0 && listItems(this.bbzombies).includes(zombie))
        this.bbztp.bbxp = HEALTH_SAFETY_LIMIT;
      return original.apply(this,arguments);
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
      const explosion = new port.bb_Explosion().bbExplosion_new(layer,port.bb_Cell.bbcells(this.bbexplosionsheet),x,y,1);
      if (hasSource && source[powerProvenance] === 2) explosion[powerProvenance] = 2;
      this.bbexplosions.bbAddLast(explosion);
      const side = hasSource && source[sandboxPowerSide];
      const victims = side === 'enemy' ? [...listItems(this.bbpeople),...listItems(this.bbpombies)] : listItems(this.bbzombies);
      for (const zombie of new Set(victims)) {
        const distance = Math.abs(zombie.bbxpos-x)|0;
        // Retain the original check of REMAINING damage for air-strikes/direct
        // calls (even after a preceding target consumes some of the pool).
        const base = side === 'enemy' ? zombie.bbunit.bbtype === 5 : zombie.bbunit.bbtype === 37;
        if (!(base && damage === 500 && !bomber) && distance < 100) {
          damage = zombie.bbunit.bbtype < 32 && typeof zombie.bbInfect === 'function' ? zombie.bbInfect(damage)|0 : zombie.bbSmack(damage,3)|0;
          if (damage <= 0) break;
        }
      }
      return 0;
    });
    // Preserve the original default draw sequence/positions while storing big
    // requests as compact work. A full actor list delays, never discards, a
    // skill reinforcement. Every tick shares one bounded dispatch budget.
    wrap(port.bb_Zomba.prototype, 'bbAddPower', () => function (power) {
      const c = config();
      if (power.bbtype === 0) {
        const effect = c.powers[0].effect;
        for (const [id,key,spacing] of [[0,'shovelCount',20],[1,'shotgunCount',50],
          [2,'survivalistCount',100],[3,'bomberCount',50],[4,'preacherCount',50]])
          if (effect[key]) state.powerSpawns.push({game:this,powerId:0,source:'angry-mob',type:id,count:effect[key],index:0,spacing});
        dispatchPowerSpawns(target,state,this);
        const audio = port.state.bb_Audio; audio.bbPlay(audio.bbangrymob);
      } else if (power.bbtype === 1) {
        this.bbpowerups.bbAddLast(new port.bb_PowerUp().bbPowerUp_new(0,1,this.bbharvestsheet,this.bbharvestbloodsheet));
      } else if (power.bbtype === 2) {
        if (c.powers[2].effect.jetCount)
          state.powerSpawns.push({game:this,powerId:2,source:'airstrike',type:2,count:c.powers[2].effect.jetCount,index:0});
        dispatchPowerSpawns(target,state,this);
        const audio = port.state.bb_Audio; audio.bbPlay(audio.bbairstrike);
      }
      power.bbcooldown = power.bbcooltime; return 0;
    });
    wrap(port.bb_Zomba.prototype, 'bbResetGame', original => function () {
      state.explodingBottle = null;
      state.powerSpawns = [];
      state.firedReinforcements = new Set();
      // Promote next-match structural settings before the original reset reads
      // the wave arrays and creates its bases. Existing template objects must
      // be updated as well: the original reset does not reconstruct them.
      state.activeCompiled = state.compiled;
      writeRaw(target,state.compiled);
      commitPlan(templatePlan(this,state.compiled.config,false,state.compiled.multipliers));
      const previousStage = state.initializingWaveStage;
      state.initializingWaveStage = arguments[0] ? (arguments[0]|0)-1 : this.bbdifficulty;
      let result;
      try { result = original.apply(this, arguments); }
      finally { state.initializingWaveStage = previousStage; }
      const c = config(), level = c.levels[this.bbdifficulty];
      this.bbztp.bbcash = level.startingCash; this.bbztp.bbxp = level.startingXp;
      this.bbZombieDamageMultiplier = level.zombieDamageMultiplier;
      this.bbZombieHealthMultiplier = level.zombieHealthMultiplier;
      for (const power of this.bbpowers) {
        const stage = c.powers[power.bbtype].unlockAfterStage;
        power.bblocked = stage === 0 || this.bbrecords[stage-1] !== 0 ? 0 : 1;
      }
      return result;
    });
    // The original leaf creates debris BEFORE the caller clamps actual HP
    // damage. Its existing 1024 cosmetic-damage guard still creates ~160
    // particles per hit; crowded continuous attacks would retain thousands.
    // Track only admitted base debris, by node, not every death/body part.
    // Weak ownership and head replacement make clear/reset O(1), without a
    // per-hit scan. Calling the current Node.bbRemove also works with indexed
    // effect-list removal installed by a later adapter.
    const baseDebrisLedgers = new WeakMap(), baseDebrisNodes = new WeakMap();
    const debrisLedger = list => {
      let ledger = baseDebrisLedgers.get(list);
      if (!ledger || ledger.head !== list.bb_head) {
        ledger = {head:list.bb_head,counts:[0,0]};
        baseDebrisLedgers.set(list,ledger);
      }
      return ledger;
    };
    wrap(port.bb_std_list_Node.prototype, 'bbRemove', original => function () {
      const record = baseDebrisNodes.get(this), result = original.apply(this,arguments);
      if (record) {
        record.ledger.counts[record.side]--;
        baseDebrisNodes.delete(this);
      }
      return result;
    });
    wrap(port.bb_std_list_List.prototype, 'bbClear', original => function () {
      const result = original.apply(this,arguments);
      if (baseDebrisLedgers.has(this))
        baseDebrisLedgers.set(this,{head:this.bb_head,counts:[0,0]});
      return result;
    });
    wrap(port.bb_Zomba.prototype, 'bbDamageBase', () => function (damage,x) {
      damage = Math.min(damage|0,1024); x = Number(x);
      const list = this.bbbodyparts, ledger = debrisLedger(list), side = x < 800 ? 0 : 1;
      while (damage > 0) {
        // Consume the SAME six original random calls, in the SAME order, even
        // when full. Skipping visual allocation must never perturb later
        // combat/waves. At most 256 iterations remain after the 1024 guard.
        const vx = port.bb_std_random_Rnd2(4)-2;
        const vy = (-4-port.bb_std_random_Rnd2(4))|0;
        const layer = port.bb_Rand(8)|0, frame = (1+port.bb_Rand(4))|0;
        x += port.bb_std_random_Rnd2(80);
        if (ledger.counts[side] < BASE_DEBRIS_LIMIT_PER_SIDE) {
          const part = new port.bb_BodyPart().bbBodyPart_new(layer,this.bbbitsheet,frame,x,-20,vx,vy);
          const node = list.bbAddLast(part);
          baseDebrisNodes.set(node,{ledger,side}); ledger.counts[side]++;
        }
        damage = (damage-((4+port.bb_std_random_Rnd2(6))|0))|0;
      }
      return 0;
    });
    wrap(port.bb_ZombieMob, 'bbInit', original => function () {
      const result = original.apply(this,arguments);
      bindWaveQueue(target,state,state.initializingWaveStage);
      return result;
    });
    wrap(port.bb_ZombieMob, 'bbSpawn', original => function (type,count,delay) {
      const before = port.bb_ZombieMob.bbqueue.bbFirst(), result = original.apply(this,arguments);
      const node = port.bb_ZombieMob.bbqueue.bbFirst();
      if (node && node !== before && state.waveSchedule) state.waveSchedule.nodes.set(node,
        {id:null,index:null,type:type|0,total:count|0,consumed:0,spawned:0,delay:Number(delay),enabled:true,source:'reinforcement',node});
      return result;
    });
    wrap(port.bb_Zomba.prototype, 'bbAddZombie', original => function () {
      const result = original.apply(this,arguments);
      const track = state.waveSchedule && state.waveSchedule.nodes.get(state.consumingWaveNode);
      if (result && track) track.spawned++;
      return result;
    });
    // bbGameTick calls this immediately BEFORE its hardcoded reinforcement
    // block. Insert the configurable calls at exactly that original point, then
    // synchronize its previous-health cell to suppress the obsolete block.
    wrap(port.bb_ZombieMob, 'bbUpdate', original => function () {
      // The original removes its consumed head before returning and may then
      // be interrupted by newly inserted reinforcements. Track that exact
      // object, never the new queue index or a repeated type/count signature.
      const head = port.bb_ZombieMob.bbqueue.bbFirst(), count = head && head.bbcount;
      const previousNode = state.consumingWaveNode; state.consumingWaveNode = head;
      let result;
      try { result = original.apply(this, arguments); }
      finally { state.consumingWaveNode = previousNode; }
      const track = state.waveSchedule && state.waveSchedule.nodes.get(head);
      if (track) {
        track.consumed += Math.max(0,count-head.bbcount);
        if (track.source === 'wave' && head.bbcount <= 0) track.completed = true;
      }
      const game = port.state.bb_Game;
      if (game && game.bbmainState === 2) {
        const previous = game.bbzombiehealth, current = game.bbzombiebase.bbhealth;
        for (const entry of (state.activeCompiled || state.compiled).reinforcements[game.bbdifficulty]) {
          if (current <= entry.threshold && previous > entry.threshold && !state.firedReinforcements.has(entry.threshold)) {
            let inserted = false;
            for (const call of entry.calls) {
              const head = port.bb_ZombieMob.bbqueue.bbFirst();
              port.bb_ZombieMob.bbSpawn(call.type,call.count,call.delay);
              // CustomRules may suppress bbSpawn while base reinforcements
              // are disabled. A blocked/no-op call must not consume this
              // threshold for a future, genuinely new health crossing.
              inserted = port.bb_ZombieMob.bbqueue.bbFirst() !== head || inserted;
            }
            if (inserted) state.firedReinforcements.add(entry.threshold);
          }
        }
        game.bbzombiehealth = current;
      }
      return result;
    });
    // Use configured base maxima without temporarily mutating live health.
    wrap(port.bb_Zomba.prototype, 'bbDrawHealth', () => function () {
      for (const [base,configuredMax,x,label,align] of [[this.bbpeoplebase,config().units[5].health,8,'My Base',0],[this.bbzombiebase,config().zombies[5].health,586,'Zombie Base',2]]) {
        const max = base[maximumHealth] || configuredMax;
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
      state = {compiled,activeCompiled:compiled,firedReinforcements:new Set(),powerSpawns:[]}; states.set(target,state); hooks(target,state);
    } else state.activeCompiled = state.compiled = compiled;
    return state;
  }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function templatePlan(game, config, preserveTimerProgress,multipliers = validateMultipliers()) {
    const plan = [];
    function set(owner,key,value) {
      if (!owner || typeof owner !== 'object') throw new Error('GameConfig: incomplete runtime templates');
      plan.push([owner,key,value]);
    }
    function timer(owner,key,totalKey,nextTotal) {
      if (preserveTimerProgress && nextTotal !== owner[totalKey] && owner[key] > 0 && owner[totalKey] > 0)
        set(owner,key,Math.max(1,Math.ceil(Math.min(1,owner[key]/owner[totalKey])*nextTotal)));
      set(owner,totalKey,nextTotal);
    }
    for (const [items,templates,kind] of [[config.units,game.bbunits,'units'],[config.zombies,game.bbzunits,'zombies']]) {
      if (!Array.isArray(templates) || templates.length !== items.length) throw new Error('GameConfig: incomplete runtime unit templates');
      for (const item of items) {
        const unit = templates[item.id];
        for (const [field,key] of [['name','bbname'],['cost','bbcost'],['health','bbhealth'],['damage','bbdamage'],
          ['dependency','bbdependency'],['people','bbpeople'],['hitRadius','bbhitradius'],['hitOffset','bbhitoffset']])
          if (field in item) set(unit,key,item.id !== 5 && ['health','damage'].includes(field) ? item[field]*multipliers[kind][field] : item[field]);
        if ('buildTicks' in item) timer(unit,'bbbusy','bbbuildtime',item.buildTicks);
      }
    }
    if (!Array.isArray(game.bbbuildings) || game.bbbuildings.length !== config.buildings.length ||
        !Array.isArray(game.bbpowers) || game.bbpowers.length !== config.powers.length)
      throw new Error('GameConfig: incomplete runtime building or power templates');
    for (const item of config.buildings) {
      const building = game.bbbuildings[item.id];
      for (const [field,key] of [['name','bbname'],['cost','bbcost'],['dependency','bbdependency'],['maximum','bbmaximum']])
        set(building,key,item[field]);
      set(building,'bbnname',item.name.replace(/ /g,'__DemoStr_0A'));
      timer(building,'bbbusy','bbbuildtime',item.buildTicks);
    }
    for (const item of config.powers) {
      const power = game.bbpowers[item.id];
      set(power,'bbxp',item.xp);
      timer(power,'bbbusy','bbbuildtime',item.buildTicks);
      timer(power,'bbcooldown','bbcooltime',item.cooldownTicks);
    }
    return plan;
  }
  function commitPlan(plan) { for (const [owner,key,value] of plan) owner[key] = value; }
  function listItems(list) {
    if (!list || typeof list.bbObjectEnumerator !== 'function') throw new Error('GameConfig: incomplete runtime lists');
    const result = [], iterator = list.bbObjectEnumerator();
    while (iterator.bbHasNext()) result.push(iterator.bbNextObject());
    return result;
  }
  function bindWaveQueue(target,state,stage) {
    const port = portFor(target), game = port.state.bb_Game;
    const schedule = {stage:Number.isInteger(stage) ? stage+1 : game ? game.bbdifficulty+1 : null,
      trusted:Number.isInteger(stage) && stage >= 0 && stage < 4,tracks:new Map(),nodes:new WeakMap()};
    if (schedule.trusted) {
      const waves = (state.activeCompiled || state.compiled).config.levels[stage].waves;
      const queued = listItems(port.bb_ZombieMob.bbqueue); let index = 0;
      waves.forEach((wave,sourceIndex) => {
        const node = wave.enabled === false ? null : queued[index++];
        const track = {id:wave.id,index:sourceIndex,type:wave.type,total:wave.count,consumed:0,spawned:0,
          delay:wave.delay,enabled:wave.enabled !== false,source:'wave',completed:false,node};
        schedule.tracks.set(wave.id,track);
        if (node) schedule.nodes.set(node,track);
      });
      if (index !== queued.length) schedule.trusted = false;
    }
    state.waveSchedule = schedule;
  }
  function waveView(node,track) {
    if (!track) return {id:null,index:null,type:node.bbtype,total:node.bbcount,consumed:0,spawned:0,
      remaining:node.bbcount,delay:node.bbdelay,enabled:true,source:'reinforcement'};
    return {id:track.id,index:track.index,type:track.type,total:track.total,consumed:track.consumed,
      spawned:track.spawned,remaining:Math.max(0,node.bbcount),delay:track.delay,enabled:track.enabled,source:track.source};
  }
  function getWaveProgress(target) {
    const port = portFor(target), state = states.get(target);
    if (!state) throw new Error('GameConfig: install or apply configuration first');
    const schedule = state.waveSchedule;
    const queued = port.bb_ZombieMob.bbqueue ? listItems(port.bb_ZombieMob.bbqueue) : [];
    const groups = queued.map(node => waveView(node,schedule && schedule.nodes.get(node)));
    const completed = schedule ? [...schedule.tracks.values()].filter(track => track.completed).map(track => track.id) : [];
    return {stage:schedule ? schedule.stage : null,current:groups[0] || null,upcomingGroups:groups.slice(1),
      remainingTotal:groups.reduce((sum,group) => sum+group.remaining,0),completedGroups:completed.length,
      completed,knownIds:schedule ? [...schedule.tracks.keys()] : [],pending:[]};
  }
  function applyLiveWaves(target,input,options) {
    const port = portFor(target), state = states.get(target);
    if (!state) throw new Error('GameConfig: install or apply configuration before updating waves');
    // Validate the entire requested document first, even when reconciliation
    // will be refused. A valid legacy document may be saved for a new battle,
    // but its unbound row positions are never guessed as current identities.
    if (options !== undefined) {
      object(options,'$options',[],['validateOnly','multipliers']);
      if ('validateOnly' in options && typeof options.validateOnly !== 'boolean') fail('$options.validateOnly','expected a boolean');
      if ('multipliers' in options && options.validateOnly !== true)
        fail('$options.multipliers','wave-only updates cannot change army multipliers; use updateLive first');
    }
    const selectedMultipliers = options && options.multipliers !== undefined ? options.multipliers : state.compiled.multipliers;
    const requested = compile(input,{multipliers:selectedMultipliers}), game = port.state.bb_Game, schedule = state.waveSchedule;
    const stage = game && game.bbdifficulty, path = '$.levels['+stage+'].waves';
    function refused(reason) {
      return {applied:[],deferred:[path],notes:[reason],requiresNewBattle:true,reason,progress:getWaveProgress(target)};
    }
    if (!game || ![2,6].includes(game.bbmainState)) return refused('请在进行中或暂停的战局应用波次；当前修改将用于新局。');
    if (!schedule || !schedule.trusted || schedule.stage !== stage+1)
      return refused('当前队列没有可靠的波次身份；请开始新局后再修改出怪计划。');
    const incoming = input.levels.find(level => level.id === stage+1);
    if (incoming.waves.some(wave => !Object.prototype.hasOwnProperty.call(wave,'id')))
      return refused('旧格式波次缺少稳定 ID，不能按位置猜测进度；请用这套规则开始新局。');
    const waves = requested.config.levels[stage].waves;
    if (waves.some(wave => /^legacy-untracked-/.test(wave.id) && !schedule.tracks.has(wave.id)))
      return refused('导入的旧波次尚未绑定本局进度；请用这套规则开始新局。');
    const plan = [], tracks = new Map([...schedule.tracks].map(([id,track]) => [id,{...track,enabled:false}]));
    const main = [], deferred = [], notes = [];
    waves.forEach((wave,index) => {
      const previous = schedule.tracks.get(wave.id);
      const track = tracks.get(wave.id) || {id:wave.id,consumed:0,spawned:0,completed:false,node:null,source:'wave'};
      if (track.completed && previous && (previous.total !== wave.count || previous.type !== wave.type || previous.delay !== wave.delay)) {
        deferred.push(path+'['+index+']');notes.push('已完成波次 '+wave.id+' 的改动留给下一局，本局不会重播。');
      }
      // Keep a closed row's actually fulfilled definition separate from its
      // next-match preset. Otherwise a second identical Apply would silently
      // drop the deferred notice even though this row still cannot replay.
      Object.assign(track,track.completed ? {index,enabled:wave.enabled !== false} :
        {index,type:wave.type,total:wave.count,delay:wave.delay,enabled:wave.enabled !== false});
      if (!track.completed && wave.enabled !== false) {
        const remaining = Math.max(0,wave.count-track.consumed);
        if (remaining > 0) {
          const node = track.node || new port.bb_ZombieMob().bbZombieMob_new(wave.type,remaining,wave.delay|0);
          track.node = node;
          plan.push([node,'bbtype',wave.type],[node,'bbcount',remaining],[node,'bbdelay',wave.delay|0]);
          main.push(node);
        } else track.completed = true;
      }
      tracks.set(wave.id,track);
    });
    const oldQueue = listItems(port.bb_ZombieMob.bbqueue), nextQueue = [], nodes = new WeakMap(); let cursor = 0;
    // Keep non-wave entries in their original relative queue slots. These are
    // AddFirst reinforcements in ordinary play, but even an interleaved entry
    // is never mistaken for a main-plan row or accidentally removed.
    for (const node of oldQueue) {
      const track = schedule.nodes.get(node);
      if (track && track.source === 'wave') { if (cursor < main.length) nextQueue.push(main[cursor++]); }
      else { nextQueue.push(node); if (track) nodes.set(node,track); }
    }
    while (cursor < main.length) nextQueue.push(main[cursor++]);
    for (const track of tracks.values()) if (track.node) nodes.set(track.node,track);
    const queue = new port.bb_std_list_List().bbList_new();
    for (const node of nextQueue) queue.bbAddLast(node);
    const rawKey = 'bb_leveldata_level'+(stage+1);
    for (const [owner,key] of plan.concat([[port.bb_ZombieMob,'bbqueue',queue],[target,rawKey,null]])) {
      const descriptor = Object.getOwnPropertyDescriptor(owner,key);
      if (descriptor ? !('value' in descriptor) || !descriptor.writable : !Object.isExtensible(owner))
        throw new Error('GameConfig: wave update target is not writable');
    }
    const changed = !same((state.activeCompiled || state.compiled).config.levels[stage].waves,waves);
    if (options && options.validateOnly) return {applied:changed ? [path] : [],deferred,notes,requiresNewBattle:false,reason:null,progress:getWaveProgress(target)};
    const pendingConfig = copy(state.compiled.config);pendingConfig.levels[stage].waves = copy(waves);
    const pending = compile(pendingConfig,{multipliers:selectedMultipliers}), activeConfig = copy((state.activeCompiled || state.compiled).config);
    activeConfig.levels[stage].waves = copy(waves);
    const active = compileValidated(activeConfig,(state.activeCompiled || state.compiled).multipliers);
    commitPlan(plan);port.bb_ZombieMob.bbqueue = queue;target[rawKey] = active.raw[rawKey].slice();
    state.compiled = pending;state.activeCompiled = active;
    state.waveSchedule = {...schedule,tracks,nodes};
    return {applied:changed ? [path] : [],deferred,notes,requiresNewBattle:false,reason:null,progress:getWaveProgress(target)};
  }
  function getCurrent(target) {
    portFor(target);
    const state = states.get(target);
    if (!state) throw new Error('GameConfig: install or apply configuration first');
    return copy(state.compiled.config);
  }
  function getMaximumHealth(target,body) {
    const port = portFor(target), state = states.get(target);
    if (!state) throw new Error('GameConfig: install or apply configuration first');
    const type = body && body.bbunit && body.bbunit.bbtype;
    const human = Number.isInteger(type) && type >= 0 && type <= 5;
    const id = human ? type : type-32;
    if (!Number.isInteger(id) || id < 0 || id > 5) throw new Error('GameConfig: unknown body type');
    if (body[maximumHealth]) return body[maximumHealth];
    const active = state.activeCompiled || state.compiled, game = port.state.bb_Game;
    const level = active.config.levels[game && Number.isInteger(game.bbdifficulty) ? game.bbdifficulty : 0];
    return effectiveMaximum(active.config,active.multipliers,human,id,level.zombieHealthMultiplier);
  }
  // Structural values remain frozen for an ongoing battle. In particular,
  // changing bbpeople on a shared template would change the eventual death
  // refund without changing the population already charged for that unit.
  const deferredFields = {
    units:['people','dependency'], buildings:['dependency'],
    powers:['unlockAfterStage'], levels:['startingCash','startingXp','waves','reinforcements']
  };
  function same(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function changedPaths(before,after,path,result) {
    if (same(before,after)) return;
    if (after && typeof after === 'object' && !Array.isArray(after)) {
      for (const key of Object.keys(after)) changedPaths(before && before[key],after[key],path+'.'+key,result);
    } else result.push(path);
  }
  function updateLive(target, input, options) {
    const port = portFor(target), state = states.get(target);
    if (!state) throw new Error('GameConfig: install or apply configuration before a live update');
    const game = port.state.bb_Game;
    if (!game) throw new Error('GameConfig: updateLive requires an initialized game; use apply before bb_Main');
    options = options === undefined ? {} : options;
    object(options,'$options',[],['healthPolicy','preserveTimerProgress','multipliers','validateOnly','sandboxUnlocks']);
    const policy = options.healthPolicy === undefined ? 'ratio' : options.healthPolicy;
    if (!['ratio','new-only'].includes(policy)) fail('$options.healthPolicy','expected ratio or new-only');
    if ('preserveTimerProgress' in options && typeof options.preserveTimerProgress !== 'boolean')
      fail('$options.preserveTimerProgress','expected a boolean');
    if ('validateOnly' in options && typeof options.validateOnly !== 'boolean') fail('$options.validateOnly','expected a boolean');
    if ('sandboxUnlocks' in options && typeof options.sandboxUnlocks !== 'boolean') fail('$options.sandboxUnlocks','expected a boolean');
    const next = compile(input,{multipliers:options.multipliers === undefined ? state.compiled.multipliers : options.multipliers});
    if (options.sandboxUnlocks && (next.config.units.some(item => item.dependency !== undefined && item.dependency !== 0) ||
        next.config.buildings.some(item => item.dependency !== 0) || next.config.powers.some(item => item.unlockAfterStage !== 0)))
      fail('$options.sandboxUnlocks','requires every building/unit prerequisite and skill unlock stage to be zero');
    const previousCompiled = state.activeCompiled || state.compiled, previous = previousCompiled.config;
    const oldMultipliers = previousCompiled.multipliers;
    const effective = copy(next.config), deferred = [], applied = [];
    // The original quit/pause dialog is state 6 and resumes the same match.
    // Victory/defeat states 3/4 keep updating surviving units as well.
    const inBattle = [2,3,4,6].includes(game.bbmainState);
    for (const kind of KINDS) for (const item of effective[kind]) {
      const old = previous[kind][item.id-(kind === 'levels' ? 1 : 0)];
      for (const key of Object.keys(item)) {
        const path = '$.'+kind+'['+(kind === 'levels' ? item.id-1 : item.id)+'].'+key;
        const unlockNow = options.sandboxUnlocks && ((['units','buildings'].includes(kind) && key === 'dependency') ||
          (kind === 'powers' && key === 'unlockAfterStage'));
        if (inBattle && !unlockNow && (deferredFields[kind] || []).includes(key)) {
          if (!same(old[key],item[key])) deferred.push(path);
          item[key] = copy(old[key]);
        } else changedPaths(old[key],item[key],path,applied);
      }
    }
    // Both source configurations were strictly validated above. Deferred
    // reinforcement thresholds may exceed a newly reduced live base maximum;
    // that is safe for this existing queue, but not a valid next-match preset.
    // Do not reject the valid full preset merely because this transient hybrid
    // intentionally retains the previous match's absolute thresholds.
    const active = compileValidated(effective,next.multipliers), c = active.config, multipliers = active.multipliers;
    changedPaths(oldMultipliers,multipliers,'$multipliers',applied);
    const plan = templatePlan(game,c,options.preserveTimerProgress !== false,multipliers);
    if (options.sandboxUnlocks) for (const power of game.bbpowers) plan.push([power,'bblocked',0]);
    const oldLevel = previous.levels[game.bbdifficulty], level = c.levels[game.bbdifficulty];
    if (!level || !oldLevel) throw new Error('GameConfig: invalid runtime difficulty');
    plan.push([game,'bbZombieDamageMultiplier',level.zombieDamageMultiplier],
      [game,'bbZombieHealthMultiplier',level.zombieHealthMultiplier]);
    // Enumerate and calculate everything before writing any template, instance,
    // raw table or installed configuration. Validation/traversal errors leave
    // the entire running match and any previously pending settings intact.
    const bodies = new Set([...listItems(game.bbpeople),...listItems(game.bbzombies),...listItems(game.bbpombies)]);
    for (const body of bodies) {
      const type = body.bbunit && body.bbunit.bbtype, human = type >= 0 && type <= 5;
      const id = human ? type : type-32;
      if (!Number.isInteger(id) || id < 0 || id > 5) throw new Error('GameConfig: unknown live body type');
      const item = c[human ? 'units':'zombies'][id], old = previous[human ? 'units':'zombies'][id];
      const dead = body.bbhealth <= 0 || body.bbmode === 14 || body.bbmode === 15;
      if (!dead && id !== 5) {
        const oldAnger = human && body.bbisangry ? previous.powers[0].effect.angerSpeedMultiplier : 1;
        const newAnger = human && body.bbisangry ? c.powers[0].effect.angerSpeedMultiplier : 1;
        const group = human ? 'units':'zombies';
        const oldSpeed = old.moveSpeed*oldMultipliers[group].moveSpeed*oldAnger;
        const newSpeed = item.moveSpeed*multipliers[group].moveSpeed*newAnger;
        // Preserve transient stops/slows and direction rather than replacing
        // movement-state fields. A configured zero speed can be unfrozen.
        const speed = newSpeed === oldSpeed ? body.bbwalkspeed : oldSpeed === 0 ? newSpeed : (body.bbwalkspeed/oldSpeed)*newSpeed;
        if (!Number.isFinite(speed)) throw new Error('GameConfig: invalid live movement speed');
        plan.push([body,'bbwalkspeed',speed]);
      }
      if (policy === 'ratio' && !dead) {
        const newMaximum = effectiveMaximum(c,multipliers,human,id,level.zombieHealthMultiplier);
        const oldMaximum = body[maximumHealth] || effectiveMaximum(previous,oldMultipliers,human,id,game.bbZombieHealthMultiplier);
        if (!(oldMaximum > 0)) throw new Error('GameConfig: invalid live maximum health');
        if (newMaximum !== oldMaximum) {
          const health = Math.max(1,Math.min(newMaximum,Math.round(body.bbhealth*newMaximum/oldMaximum)));
          plan.push([body,'bbhealth',health],[body,maximumHealth,newMaximum]);
          if (body === game.bbzombiebase) plan.push([game,'bbzombiehealth',health]);
        }
      }
    }
    for (const effect of listItems(game.bbpowerups)) {
      const type = effect[powerProvenance] ?? effect.bbtype;
      if (type !== 1 && type !== 2) continue;
      const oldSpeed = previous.powers[type].effect.moveSpeed;
      const newSpeed = c.powers[type].effect.moveSpeed;
      plan.push([effect,'bbwalkspeed',newSpeed === oldSpeed ? effect.bbwalkspeed : (effect.bbwalkspeed/oldSpeed)*newSpeed]);
    }
    // These are our own class data properties, but check writability before
    // beginning the commit so a frozen/malformed host cannot half-apply a plan.
    for (const [owner,key] of plan) {
      const property = Object.getOwnPropertyDescriptor(owner,key);
      if (property ? !('value' in property) || !property.writable : !Object.isExtensible(owner))
        throw new Error('GameConfig: runtime update target is not writable');
    }
    for (const key of Object.keys(active.raw)) {
      const property = Object.getOwnPropertyDescriptor(target,key);
      if (property ? !('value' in property) || !property.writable : !Object.isExtensible(target))
        throw new Error('GameConfig: raw table update target is not writable');
    }
    if (options.validateOnly) return {applied,deferred};
    commitPlan(plan);
    writeRaw(target,active);
    state.compiled = next; state.activeCompiled = active;
    return {applied,deferred};
  }
  function writeRaw(target, compiled) {
    for (const [key,value] of Object.entries(compiled.raw)) target[key] = value.slice();
  }
  function apply(target, input,options) {
    portFor(target);
    const compiled = compile(input,options);
    if (!Array.isArray(target.bb_data_unitdata)) throw new Error('GameConfig: apply requires bb_Init first; use install before initialization');
    if (target.ZTPGamePort.state.bb_Game) throw new Error('GameConfig: apply must run after bb_Init and before bb_Main; restart the game to change configuration');
    stateFor(target,compiled); writeRaw(target,compiled); return compiled;
  }
  function install(target, input,options) {
    const port = portFor(target), compiled = compile(input,options);
    if (port.state.bb_Game) throw new Error('GameConfig: install must run before bb_Main; restart the game to change configuration');
    const state = stateFor(target,compiled);
    if (!state.initializer) {
      const original = target.bb_Init;
      if (typeof original !== 'function') throw new Error('GameConfig: missing runtime method bb_Init');
      state.initializer = function () {
        const result = original.apply(this,arguments);
        state.activeCompiled = state.compiled;
        state.firedReinforcements = new Set();
        state.waveSchedule = null;state.consumingWaveNode = null;
        state.explodingBottle = null; state.bottleLoopDepth = 0;
        state.powerSpawns = [];state.powerDispatchFrame = null;
        writeRaw(target,state.compiled); return result;
      };
    }
    target.bb_Init = port.bb_Init = state.initializer;
    return compiled;
  }
  return Object.freeze({fromDocuments,validate,compile,apply,install,getCurrent,updateLive,getWaveProgress,applyLiveWaves,
    validateMultipliers,getMaximumHealth,getPowerProgress,cancelPowerEffects,releaseSandboxPower,
    BUILDING_SAFETY_LIMIT,HEALTH_SAFETY_LIMIT,POWER_COUNT_LIMIT,POWER_DISPATCH_BUDGET,BASE_DEBRIS_LIMIT_PER_SIDE});
});
