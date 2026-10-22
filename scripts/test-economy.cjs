'use strict';
const assert = require('node:assert/strict');
const {createHarness} = require('./game-test-harness.cjs');
let checks = 0;
function equal(actual, expected, message) {assert.equal(actual, expected, message); checks++;}
function deep(actual, expected, message) {assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, message); checks++;}

// Source oracle: bbResetGame (1883-1902), bbAddWealth (2048-2055),
// bbGameTick (2511-2514). At default speed 2, 600 simulation ticks = 5 s.
{
  const h = createHarness(); const g = h.game;
  g.bbPlayGame(1);
  equal(g.bbztp.bbcash, 100, 'Start with exactly $100');
  equal(g.bbztp.bbforce, 0, 'No population spent by the base');
  equal(g.bbztp.bbmaxforce, 5, 'Initial trailer supplies 5 population');
  equal(g.bbztp.bbxp, 0, 'Initial Yee-Haws');
  deep(g.bbztp.bbbuildingcount, [1, 1, 0, 0, 0, 0], 'Initial trailer + salvage yard only');
  equal(g.bbbuildings[2].bbnname, 'Farm__DemoStr_0AHouse', 'Preserve original ABC ASCII marker rather than inventing a newline');
  h.gameTick(599);
  equal(g.bbztp.bbcash, 100, 'No premature income on tick 599');
  equal(g.bbcoins, 599, 'Each salvage yard accumulates one coin per tick');
  h.gameTick();
  equal(g.bbztp.bbcash, 150, '$50 at exactly simulation tick 600');
  equal(g.bbcoins, 0, 'Income remainder after exactly 600 coins');
  h.gameTick(600);
  equal(g.bbztp.bbcash, 200, 'Second exact $50 payout at tick 1200');
  equal(g.bbgameticks, 1200, 'Every direct game tick advances the clock once');
}
{
  const h = createHarness(); const g = h.game; g.bbPlayGame(1);
  g.bbztp.bbbuildingcount[1] = 3;
  h.gameTick(199);
  equal(g.bbcoins, 597, 'Three yards accumulate three coins per tick');
  equal(g.bbztp.bbcash, 100, 'No premature three-yard payout');
  h.gameTick();
  equal(g.bbztp.bbcash, 150, 'Three yards pay $50 every 200 simulation ticks');
  equal(g.bbcoins, 0, 'Three-yard payout exact remainder');
  g.bbAddWealth(1250);
  equal(g.bbztp.bbcash, 250, 'Large wealth increments settle multiple payouts');
  equal(g.bbcoins, 50, 'Large wealth increments preserve remainder');
}

// Source oracle: bbBuyUnit (4508-4528), bb_Unit constructor (6032-6047),
// queue processing bbGameTick (2700-2718). Population is reserved at purchase.
{
  const h = createHarness(); const g = h.game; g.bbPlayGame(1);
  const shovel = g.bbunits[0];
  equal(shovel.bbcost, 50, 'Shovel price from recovered table');
  equal(shovel.bbbuildtime, 50, 'Shovel takes exactly 50 simulation ticks');
  g.bbBuyUnit(shovel); g.bbBuyUnit(shovel);
  equal(g.bbztp.bbcash, 0, 'Two purchases deduct $100 immediately');
  equal(g.bbztp.bbforce, 2, 'Two queued shovels reserve population immediately');
  equal(shovel.bborders, 2, 'Two pending orders');
  equal(shovel.bbbusy, 50, 'Second same-unit order does not restart the queue');
  g.bbBuyUnit(shovel);
  equal(shovel.bborders, 2, 'Insufficient cash rejects additional unit');
  h.gameTick(49);
  equal(h.count(g.bbpeople), 1, 'No unit created before its last build tick');
  equal(shovel.bbbusy, 1, 'First unit has one build tick remaining');
  h.gameTick();
  equal(h.count(g.bbpeople), 2, 'First unit appears exactly at tick 50');
  equal(shovel.bborders, 1, 'First completion consumes one order');
  equal(shovel.bbbusy, 50, 'Second order begins with full build time');
  equal(g.bbztp.bbforce, 2, 'Completion must not spend population twice');
  h.gameTick(49);
  equal(h.count(g.bbpeople), 2, 'Second unit not created at tick 99');
  h.gameTick();
  equal(h.count(g.bbpeople), 3, 'Second unit appears at tick 100');
  equal(shovel.bborders, 0, 'Queue drained after two completions');
  equal(shovel.bbbusy, 0, 'Idle queue has no timer');
}
{
  const h = createHarness(); const g = h.game; g.bbPlayGame(1);
  g.bbztp.bbcash = 1000;
  for (let i = 0; i < 6; i++) g.bbBuyUnit(g.bbunits[0]);
  equal(g.bbztp.bbforce, 5, 'Population cap includes all pending orders');
  equal(g.bbunits[0].bborders, 5, 'Sixth purchase rejected by population cap');
  equal(g.bbztp.bbcash, 750, 'Rejected population-capped purchase spends no money');
  g.bbunits[0].bbUpdate(g.bbztp);
  equal(g.bbunits[0].bbenabled, 0, 'Full-population unit button disabled');
  equal(g.bbunits[0].bbhint.includes('trailers'), true, 'Population failure explains trailer requirement');
}

// Source oracle: bbBuyBuilding (4555-4569), construction processing
// bbGameTick (2720-2740), maxforce update (2760); each type has its own queue.
{
  const h = createHarness(); const g = h.game; g.bbPlayGame(1); g.bbztp.bbcash = 1000;
  const trailer = g.bbbuildings[0];
  equal(trailer.bbbuildtime, 300, 'Trailer construction takes 300 simulation ticks');
  g.bbBuyBuilding(trailer); g.bbBuyBuilding(trailer);
  equal(g.bbztp.bbcash, 500, 'Two trailer orders charge $500 up front');
  equal(trailer.bborders, 2, 'Two queued trailers');
  h.gameTick(299);
  equal(g.bbztp.bbbuildingcount[0], 1, 'Trailer count unchanged before completion');
  equal(g.bbztp.bbmaxforce, 5, 'No early housing capacity');
  h.gameTick();
  equal(g.bbztp.bbbuildingcount[0], 2, 'First trailer completes at tick 300');
  equal(g.bbztp.bbmaxforce, 10, 'Completed trailer immediately grants 5 population');
  equal(trailer.bbbusy, 300, 'Second trailer begins its complete construction time');
  h.gameTick(300);
  equal(g.bbztp.bbbuildingcount[0], 3, 'Second trailer completes at tick 600');
  equal(g.bbztp.bbmaxforce, 15, 'Two new trailers supply ten additional population');
  equal(trailer.bborders, 0, 'Building queue drained');
  equal(trailer.bbbusy, 0, 'Building timer clears at final completion');
  equal(g.bbztp.bbcash, 550, 'Construction does not suppress the original yard income');
}
{
  const h = createHarness(); const g = h.game; g.bbPlayGame(1); g.bbztp.bbcash = 1200;
  const salvage = g.bbbuildings[1];
  g.bbBuyBuilding(salvage); g.bbBuyBuilding(salvage);
  equal(g.bbztp.bbcash, 200, 'Two salvage yards charge $1000');
  h.gameTick(300);
  equal(g.bbztp.bbbuildingcount[1], 2, 'Second salvage yard exists after tick 300');
  equal(g.bbcoins, 300, 'Construction completion tick still earned the OLD yard count');
  equal(g.bbztp.bbcash, 200, 'No income before accumulated 600 yard-coins');
  h.gameTick(150);
  equal(g.bbztp.bbcash, 250, 'New yard accelerates first payout to tick 450');
  equal(g.bbcoins, 0, 'Exact dynamic-income remainder at tick 450');
  h.gameTick(150);
  equal(g.bbztp.bbbuildingcount[1], 3, 'Third salvage yard completes at tick 600');
  equal(g.bbcoins, 300, 'Newly completed third yard earns starting next tick');
  h.gameTick(100);
  equal(g.bbztp.bbcash, 300, 'Three active yards settle remainder in exactly 100 ticks');
  equal(g.bbcoins, 0, 'Three-yard exact remainder');
}

// Source oracle: bb_Unit.bbUpdate and bb_Building.bbUpdate are UI availability
// gates. The low-level buy functions intentionally do not repeat every gate;
// these tests preserve that original division instead of inventing validation.
{
  const h = createHarness(); const g = h.game; g.bbPlayGame(1); g.bbztp.bbcash = 10000;
  const farmer = g.bbunits[1], truck = g.bbunits[2], bomber = g.bbunits[3], preacher = g.bbunits[4];
  g.bbztp.bbmaxforce = 100;
  for (const unit of [farmer, truck, bomber, preacher]) {
    unit.bbUpdate(g.bbztp);
    equal(unit.bbenabled, 0, 'Advanced unit disabled without prerequisite: ' + unit.bbname);
    g.bbztp.bbbuildingcount[unit.bbdependency] = 1;
    unit.bbUpdate(g.bbztp);
    equal(unit.bbenabled, 1, 'Advanced unit enabled by exact prerequisite: ' + unit.bbname);
  }
  g.bbztp.bbbuildingcount[2] = 0;
  g.bbztp.bbbuildingcount[3] = 0;
  const garage = g.bbbuildings[3]; garage.bbUpdate(g.bbztp);
  equal(garage.bbenabled, 0, 'Garage requires completed Farm House');
  g.bbztp.bbbuildingcount[2] = 1; garage.bbUpdate(g.bbztp);
  equal(garage.bbenabled, 1, 'Garage unlocked by completed Farm House');
  for (const building of g.bbbuildings) {
    g.bbztp.bbbuildingcount[building.bbtype] = building.bbmaximum - 1;
    building.bborders = 1; building.bbUpdate(g.bbztp);
    equal(building.bbenabled, 0, 'Construction queue counts against maximum: ' + building.bbname);
    equal(building.bbcapacity, 0, 'Queued but unfinished building is not completed capacity');
    g.bbztp.bbbuildingcount[building.bbtype] = building.bbmaximum;
    building.bborders = 0; building.bbUpdate(g.bbztp);
    equal(building.bbenabled, 0, 'Maximum completed buildings disable button: ' + building.bbname);
    equal(building.bbcapacity, 1, 'Maximum completed buildings show capacity state');
  }
}

// Every recovered unit/building constructor and real queue duration, not just
// the cheapest representative of each generic queue implementation.
for (const [type, cost, duration, population] of [
  [0, 50, 50, 1], [1, 200, 300, 2], [2, 900, 500, 5],
  [3, 350, 300, 2], [4, 1500, 1500, 3],
]) {
  const h = createHarness(); const g = h.game; g.bbPlayGame(1);
  const unit = g.bbunits[type];
  g.bbztp.bbbuildingcount[unit.bbdependency] = 1;
  g.bbztp.bbcash = cost - 1;
  g.bbBuyUnit(unit);
  equal(unit.bborders, 0, 'Every unit rejects price-minus-one: ' + unit.bbname);
  equal(g.bbztp.bbforce, 0, 'Rejected unit must not reserve population');
  g.bbztp.bbcash = cost; unit.bbUpdate(g.bbztp);
  equal(unit.bbenabled, 1, 'Every unit enabled with exact cash, prerequisite, and population');
  g.bbBuyUnit(unit);
  equal(g.bbztp.bbcash, 0, 'Every unit accepts exact price');
  equal(g.bbztp.bbforce, population, 'Every unit reserves its recovered population cost');
  equal(unit.bbbusy, duration, 'Every unit uses recovered construction duration');
  h.gameTick(duration - 1);
  equal(h.count(g.bbpeople), 1, 'Every unit waits until exact final production tick');
  h.gameTick();
  equal(h.count(g.bbpeople), 2, 'Every unit actually materializes on its final production tick');
  equal(unit.bborders, 0, 'Every unit consumes completed production order');
  equal(unit.bbbusy, 0, 'Every unit production timer clears');
}
for (const [type, cost, duration, maximum] of [
  [0, 250, 300, 15], [1, 500, 300, 5], [2, 1000, 500, 1],
  [3, 1500, 500, 1], [4, 1200, 1000, 1], [5, 1500, 2000, 1],
]) {
  const h = createHarness(); const g = h.game; g.bbPlayGame(1);
  const building = g.bbbuildings[type], before = g.bbztp.bbbuildingcount[type];
  if (building.bbdependency) g.bbztp.bbbuildingcount[building.bbdependency] = 1;
  equal(building.bbmaximum, maximum, 'Every building uses recovered capacity');
  g.bbztp.bbcash = cost - 1; g.bbBuyBuilding(building);
  equal(building.bborders, 0, 'Every building rejects price-minus-one');
  equal(g.bbztp.bbcash, cost - 1, 'Rejected building spends no money');
  g.bbztp.bbcash = cost; building.bbUpdate(g.bbztp);
  equal(building.bbenabled, 1, 'Every building enabled by exact price and prerequisites');
  g.bbBuyBuilding(building);
  equal(g.bbztp.bbcash, 0, 'Every building accepts its exact recovered price');
  equal(building.bbbusy, duration, 'Every building starts its complete recovered build duration');
  h.gameTick(duration - 1);
  equal(g.bbztp.bbbuildingcount[type], before, 'Every building remains unfinished until its final tick');
  h.gameTick();
  equal(g.bbztp.bbbuildingcount[type], before + 1, 'Every building really completes at its recovered final tick');
  equal(building.bborders, 0, 'Every building consumes its completed order');
  equal(building.bbbusy, 0, 'Every building clears its timer after completion');
}
{
  const h = createHarness(); const g = h.game; g.bbPlayGame(1);
  g.bbztp.bbcash = 250; g.bbztp.bbbuildingcount[2] = 1;
  const shovel = g.bbunits[0], farmer = g.bbunits[1];
  g.bbBuyUnit(shovel); g.bbBuyUnit(farmer);
  h.gameTick(50);
  equal(h.count(g.bbpeople), 2, 'Different unit types have independent production queues');
  equal(farmer.bbbusy, 250, 'Farmer timer progressed while shovel was producing');
  h.gameTick(250);
  equal(h.count(g.bbpeople), 3, 'Parallel farmer completes on its own tick 300');
  equal(g.bbztp.bbforce, 3, 'Independent queues reserve the sum of their population');
}
{
  const h = createHarness(); const g = h.game; g.bbPlayGame(1); g.bbztp.bbcash = 750;
  g.bbBuyBuilding(g.bbbuildings[0]); g.bbBuyBuilding(g.bbbuildings[1]);
  h.gameTick(300);
  equal(g.bbztp.bbbuildingcount[0], 2, 'Trailer queue runs in parallel with salvage yard');
  equal(g.bbztp.bbbuildingcount[1], 2, 'Salvage queue runs in parallel with trailer');
  equal(g.bbztp.bbmaxforce, 10, 'Parallel building completion updates housing on same tick');
  const trailer = g.bbbuildings[0];
  g.bbztp.bbcash = 10000;
  g.bbztp.bbbuildingcount[0] = 14; trailer.bborders = 2; trailer.bbUpdate(g.bbztp);
  equal(trailer.bbenabled, 1, 'Preserve original strict-equality capacity gate in artificially overqueued state');
}
console.log(JSON.stringify({passed: true, suite: 'economy-and-construction', behavioralAssertions: checks}, null, 2));
