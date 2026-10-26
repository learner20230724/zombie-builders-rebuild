'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const GameConfig = require('../src/game-config.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const defaults = () => GameConfig.fromDocuments(Object.fromEntries(
  ['units', 'zombies', 'buildings', 'powers', 'levels'].map(kind => [kind, json('config/' + kind + '.json')])));
const INT_MAX = 2147483647;
const GENERATED_SHA256 = '9ac747685871fa237dacb9a469cb78dbf7b635f21c3c593aa033da3d4cc5239b';
function items(list) {
  const result = [], iterator = list.bbObjectEnumerator();
  while (iterator.bbHasNext()) result.push(iterator.bbNextObject());
  return result;
}
// Only host drawing/audio/input/storage are substituted. Damage, debris,
// random generation, actors and win/loss transitions are recovered classes.
function fixture(config = defaults(), options, installed = true) {
  const manifest = json('public/assets/manifest.json');
  const drawing = new Proxy({Width: () => 800, Height: () => 600, LoadSurface(name) {
    const image = manifest.images[name]; assert.ok(image, name);
    return {Width: () => image.width, Height: () => image.height};
  }}, {get: (target, key) => target[key] || (() => 0)});
  const input = new Proxy({}, {get: () => () => 0});
  const audio = {LoadSample: name => ({name}), PlaySample: sample => ({sample}), StopChannel: () => 0};
  let millis = 0;
  class App {
    GraphicsDevice() { return drawing; } InputDevice() { return input; } AudioDevice() { return audio; }
    SetUpdateRate() { return 0; } MilliSecs() { return millis; }
  }
  const target = vm.createContext({console, gxtkApp: App, gxtkSurfaceListener: class {},
    ReadInt: () => 0, WriteInt: () => 0, FlushInts: () => 0, PlayMovie: () => 0,
    MovieFinished: () => 1, EndMovie: () => 0, ShowMochi: () => 0, ShowMochiScores: () => 0,
    HideMochiScores: () => 0, MochiState: () => 0, Redirect: () => 0});
  vm.runInContext(read('src/generated-game.js'), target);
  if (installed) GameConfig.install(target, config, options);
  target.bb_Init(); target.bb_Main();
  const port = target.ZTPGamePort, device = port.state.bb_mojo_app_device;
  device.OnCreate(); device.OnUpdate();
  const game = port.state.bb_Game; game.bbPlayGame(1);
  return {target, game, port, advance() { millis += 20; device.OnUpdate(); }};
}
function debris(h) {
  return items(h.game.bbbodyparts).map(part => {
    assert.equal(part.bbsheet, h.game.bbbitsheet, 'base debris retains its original sprite sheet');
    return [part.bblayer, part.bbframe, part.bbxpos, part.bbypos,
      part.bbvelx, part.bbvely, part.bbbounce, part.bbrecycle];
  });
}

test('large-damage safety does not change the recovered generated source', () => {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'src/generated-game.js'))).digest('hex');
  assert.equal(actual, GENERATED_SHA256);
});

test('ordinary base-damage debris and RNG exactly match the uninstalled recovered leaf', () => {
  // Never call the uninstalled leaf with extreme damage: the regression is an
  // unbounded allocation loop, not merely a numeric-health discrepancy.
  const original = fixture(undefined, undefined, false), configured = fixture();
  for (const damage of [500, 1000, 60]) for (const x of [20, 1480]) {
    original.game.bbbodyparts.bbClear(); configured.game.bbbodyparts.bbClear();
    original.port.setRandomSeed(0x1234567); configured.port.setRandomSeed(0x1234567);
    original.game.bbDamageBase(damage, x); configured.game.bbDamageBase(damage, x);
    assert.deepEqual(debris(configured), debris(original), 'debris sequence for damage=' + damage + ', x=' + x);
    assert.equal(configured.port.state.bb_std_random_Seed, original.port.state.bb_std_random_Seed,
      'ordinary hits consume exactly the same random sequence');
    assert.equal(configured.game.bbpeoplebase.bbhealth, 4000, 'the cosmetic leaf does not itself change base HP');
    assert.equal(configured.game.bbzombiebase.bbhealth, 16000);
  }
});

test('an int32-maximum hit kills the player base at full damage with bounded cosmetic allocations and normal defeat', () => {
  const config = defaults(); config.units[5].health = INT_MAX;
  const h = fixture(config), g = h.game, before = items(g.bbbodyparts).length;
  assert.equal(g.bbpeoplebase.bbhealth, INT_MAX);
  const leftover = g.bbpeoplebase.bbInfect(INT_MAX);
  const added = items(g.bbbodyparts).length - before;
  assert.equal(leftover, 0); assert.equal(g.bbpeoplebase.bbhealth, 0); assert.equal(g.bbpeoplebase.bbmode, 14);
  assert.ok(added > 0 && added <= 256, '1024 cosmetic damage allocates at most 256 debris parts, not damage-proportional millions');
  assert.equal(g.bbzombiebase.bbhealth, config.zombies[5].health);
  assert.equal(g.bbmainState, 2);
  h.advance();
  assert.equal(g.bbmainState, 4, 'the next ordinary application update enters defeat');
  assert.ok(!items(g.bbpeople).includes(g.bbpeoplebase));
});

test('an int32-maximum hit kills the zombie base at full damage with bounded cosmetic allocations and normal victory', () => {
  const config = defaults(); config.zombies[5].health = INT_MAX;
  const h = fixture(config), g = h.game, before = items(g.bbbodyparts).length;
  assert.equal(g.bbzombiebase.bbhealth, INT_MAX);
  const leftover = g.bbzombiebase.bbSmack(INT_MAX, 1);
  const added = items(g.bbbodyparts).length - before;
  assert.equal(leftover, 0); assert.equal(g.bbzombiebase.bbhealth, 0); assert.equal(g.bbzombiebase.bbmode, 14);
  assert.ok(added > 0 && added <= 256, 'only base-hit visuals are capped; actual damage remains int32 maximum');
  assert.equal(g.bbpeoplebase.bbhealth, config.units[5].health);
  assert.equal(g.bbmainState, 2);
  h.advance();
  assert.equal(g.bbmainState, 3, 'the next ordinary application update enters victory');
  assert.ok(!items(g.bbzombies).includes(g.bbzombiebase));
});

test('a composed maximum-damage shovel attack goes through the real combat tick without an allocation explosion', () => {
  const config = defaults(); config.units[0].damage = 1000000; config.zombies[5].health = INT_MAX;
  const groups = {units: {health: 1, moveSpeed: 1, damage: INT_MAX / 1000000},
    zombies: {health: 1, moveSpeed: 1, damage: 1}};
  assert.equal(config.units[0].damage * groups.units.damage, INT_MAX, 'the fixture reaches the actual integer limit exactly');
  const h = fixture(config, {multipliers: groups}), g = h.game;
  const attacker = g.bbAddPerson(g.bbunits[0]);
  attacker.bbxpos = 1410; attacker.bbmode = 1; attacker.bbHitKey = () => 1; attacker.bbUpdate = () => 0;
  const before = items(g.bbbodyparts).length;
  g.bbGameTick(0);
  assert.equal(g.bbunits[0].bbdamage, INT_MAX);
  assert.equal(g.bbzombiebase.bbhealth, 0, 'combat must not accidentally clamp real HP damage to the cosmetic budget');
  assert.equal(g.bbzombiebase.bbmode, 14);
  const added = items(g.bbbodyparts).length - before;
  assert.ok(added > 0 && added <= 256, 'one maximum combat hit remains within the debris budget');
  attacker.bbHitKey = () => 0;
  h.advance();
  assert.equal(g.bbmainState, 3);
});

test('crowded base hits keep independent 256-part budgets while consuming the exact previous RNG stream', () => {
  const original = fixture(undefined, undefined, false), configured = fixture();
  assert.equal(GameConfig.BASE_DEBRIS_LIMIT_PER_SIDE,256);
  original.port.setRandomSeed(0x1234567); configured.port.setRandomSeed(0x1234567);
  for (const x of [20,1480]) {
    const referenceStart = debris(original).length, actualStart = debris(configured).length;
    for (let hit=0;hit<20;hit++) {
      // v0.4.2 already capped the cosmetic leaf at 1024, but not its total
      // live particles. Never send the uncapped recovered leaf huge damage.
      original.game.bbDamageBase(1024,x); configured.game.bbDamageBase(INT_MAX,x);
      assert.equal(configured.port.state.bb_std_random_Seed,original.port.state.bb_std_random_Seed,
        'a full visual budget still consumes every original random draw');
    }
    const reference = debris(original).slice(referenceStart);
    const actual = debris(configured).slice(actualStart);
    assert.equal(actual.length,256,'the other base retains its own independent slots');
    assert.deepEqual(actual,reference.slice(0,256),'admitted particles retain their original sequence and physical values');
  }
  assert.equal(items(configured.game.bbbodyparts).length,512);
  assert.equal(configured.game.bbpeoplebase.bbhealth,4000);
  assert.equal(configured.game.bbzombiebase.bbhealth,16000);
});

test('base-debris slots are released by list removals, direct node unlink, clear and head replacement', () => {
  const h=fixture(),g=h.game,list=g.bbbodyparts;
  const fill=()=>{for(let hit=0;hit<4;hit++)g.bbDamageBase(1024,20);assert.equal(items(list).length,256);};
  fill();
  for(const remove of [
    ()=>list.bbRemove(items(list)[100]),
    ()=>list.bbRemoveFirst(),
    ()=>list.bbRemoveLast(),
    ()=>list.bb_head.bb_succ.bbRemove()
  ]){
    remove();assert.equal(items(list).length,255);
    g.bbDamageBase(1,20);assert.equal(items(list).length,256,'one unlink frees exactly one slot');
    g.bbDamageBase(1,20);assert.equal(items(list).length,256,'no phantom slot remains');
  }
  list.bbClear();assert.equal(items(list).length,0);
  g.bbDamageBase(1,20);assert.equal(items(list).length,1,'clear releases every slot without a particle scan');
  fill();
  // Reset/adapter head replacement must not leave counts from the old ring.
  list.bb_head = new h.port.bb_std_list_Node().bbNode_new();
  g.bbDamageBase(1,20);assert.equal(items(list).length,1);
});

test('cleared or removed old nodes cannot free slots owned by a new ring', () => {
  const h=fixture(),g=h.game,list=g.bbbodyparts;
  g.bbDamageBase(1024,20);
  const oldNode=list.bb_head.bb_succ;
  list.bbClear();
  for(let hit=0;hit<4;hit++)g.bbDamageBase(1024,20);
  assert.equal(items(list).length,256);
  oldNode.bbRemove(); // Only the disconnected old ring changes.
  g.bbDamageBase(1,20);
  assert.equal(items(list).length,256,'old ownership never changes the current ledger');
});

test('base-debris recycling and a fresh stage restore cosmetic capacity', () => {
  const h=fixture(),g=h.game;
  for(let hit=0;hit<4;hit++)g.bbDamageBase(1024,20);
  assert.equal(items(g.bbbodyparts).length,256);
  // Real recovered particle updates and list unlinking, without substituting
  // the physics or imposing a shorter cosmetic lifetime.
  for(let tick=0;tick<600&&items(g.bbbodyparts).length;tick++){
    for(const part of items(g.bbbodyparts)){
      part.bbUpdate();if(part.bbrecycle)g.bbbodyparts.bbRemove(part);
    }
  }
  assert.equal(items(g.bbbodyparts).length,0);
  g.bbDamageBase(1,20);assert.equal(items(g.bbbodyparts).length,1);
  g.bbPlayGame(2);assert.equal(items(g.bbbodyparts).length,0);
  g.bbDamageBase(1,20);assert.equal(items(g.bbbodyparts).length,1);
});

test('the cosmetic budget never suppresses actor death pieces or explosions', () => {
  const h=fixture(),g=h.game;
  const ordinaryPiece=new h.port.bb_BodyPart().bbBodyPart_new(0,g.bbghoulpartsheet,1,500,0,1,-2);
  const death=new h.port.bb_Death().bbDeath_new(g.bbshoveldeathsheet,0,500,0);
  g.bbbodyparts.bbAddLast(ordinaryPiece);g.bbdeathlist.bbAddLast(death);g.bbAddExplosion(0,600,0,1);
  for(const x of [20,1480])for(let hit=0;hit<4;hit++)g.bbDamageBase(1024,x);
  assert.equal(items(g.bbbodyparts).length,513,'actor debris has no base-debris slot cost');
  assert.ok(items(g.bbbodyparts).includes(ordinaryPiece));
  assert.deepEqual(items(g.bbdeathlist),[death]);assert.equal(items(g.bbexplosions).length,1);
  g.bbbodyparts.bbRemove(ordinaryPiece);
  g.bbDamageBase(1,20);
  assert.equal(items(g.bbbodyparts).length,512,'removing unrelated debris does not free a base slot');
});

test('saturated base visuals never clamp real damage, overkill return or base death', () => {
  const h=fixture(),g=h.game;
  for(const x of [20,1480])for(let hit=0;hit<4;hit++)g.bbDamageBase(1024,x);
  assert.equal(items(g.bbbodyparts).length,512);
  g.bbpeoplebase.bbhealth=1000;g.bbzombiebase.bbhealth=1000;
  assert.equal(g.bbpeoplebase.bbInfect(INT_MAX),INT_MAX-1000);
  assert.equal(g.bbzombiebase.bbSmack(INT_MAX,2),INT_MAX-1000);
  assert.equal(g.bbpeoplebase.bbhealth,0);assert.equal(g.bbzombiebase.bbhealth,0);
  assert.equal(g.bbpeoplebase.bbmode,14);assert.equal(g.bbzombiebase.bbmode,14);
  assert.equal(items(g.bbbodyparts).length,512,'full visual queues allocate nothing further');
});

test('high-damage machinegun attacks preserve full HP and overkill semantics without a damage-proportional loop', () => {
  for(const health of [4000,INT_MAX])for(const damage of [100,1000000,INT_MAX]){
    const h=fixture(),g=h.game,attacker=g.bbAddPerson(g.bbunits[2]);
    attacker.bbxpos=1410;attacker.bbmode=5;attacker.bbHitKey=()=>1;attacker.bbUpdate=()=>0;
    attacker.bbunit.bbdamage=damage;g.bbzombiebase.bbhealth=health;
    let hits=0;const smack=g.bbzombiebase.bbSmack;
    g.bbzombiebase.bbSmack=function(){assert.ok(++hits<=2,'a dead base must not be hit repeatedly');return smack.apply(this,arguments);};
    g.bbGameTick(0);
    assert.equal(hits,1);assert.equal(g.bbzombiebase.bbhealth,Math.max(0,health-damage));
    assert.ok(items(g.bbbodyparts).length<=256);
    if(damage>=health)assert.equal(g.bbzombiebase.bbmode,14);
  }
});
