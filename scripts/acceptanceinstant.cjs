'use strict';

// Additional real-renderer acceptance for instant controls. Imported by the
// desktop harness so the same checks run against source and packaged EXEs.
// The caller owns all processes, an isolated profile, and retained artifacts.
const assert = require('node:assert/strict');

module.exports = async function instantAcceptance(h) {
  const {page, check, state, save, screenshot, artifact, openEditor, closeEditor, field, settled,
    togglePlayback, importAndStart, step, freeze, canvasClick, evidence} = h;
  const troopCount = (snapshot, type) => snapshot.people.filter(body => body.type === type).length;
  const zombieCount = (snapshot, type) => snapshot.zombies.filter(body => body.type === type).length;
  async function assertLiveTroopTable(expected){
    await page.waitForFunction(expected=>{
      const counts=Customization.getState().troopCounts;
      if(!counts||!document.querySelector('[data-troop-counts]'))return false;
      for(const side of ['friendly','enemy']){
        for(const kind of ['units','zombies'])for(let type=0;type<5;type++){
          const cell=document.querySelector('[data-troop-count][data-troop-side="'+side+'"][data-troop-kind="'+kind+'"][data-troop-type="'+type+'"]');
          const value=counts[side][kind][type];
          if(!cell||Number(cell.textContent.replace(/,/g,''))!==value)return false;
          if(expected&&value!==expected[side][kind][type])return false;
        }
        const total=document.querySelector('[data-troop-total="'+side+'"]');
        if(!total||Number(total.textContent.replace(/,/g,''))!==counts[side].total)return false;
      }return true;
    },expected||null);
    return page.evaluate(()=>Customization.getState().troopCounts);
  }
  async function fixture(name, customize) {
    const draft = await page.evaluate(() => {
      const s = Customization.getState();
      const draft = {config: s.defaults, rules: s.defaultRules};
      draft.config.levels[0].waves = [];
      draft.rules.automaticSpawning = false;
      draft.rules.baseReinforcements = false;
      draft.rules.corpseSpawnOnImpact = false;
      return draft;
    });
    customize?.(draft);
    await importAndStart({schemaVersion: 1, name, ...draft}, name + '.json');
    return draft;
  }
  async function currentHP(side, value, commit = 'enter') {
    const input = page.locator('[data-base-current="' + side + '"]');
    await input.fill(String(value));
    if (commit === 'enter') await input.press('Enter'); else await input.blur();
    await settled();
  }
  async function batch(type, count, side = 'enemy', kind = 'zombie') {
    // Deep encounter/cleanup fixtures use the public immediate API, not an
    // artificial clock bypass. The separate batchQueued/matrix/stream checks
    // below exercise the actual queued UI and real realtime dispatch.
    await page.evaluate(({side,kind,type,count})=>Customization.spawnFactionUnit(side,{kind,type},count),{side,kind,type,count});
    evidence.syntheticFixtures.push({name:'Paused direct-spawn fixture',synthetic:true,
      method:'Public immediate spawnFactionUnit API only, to establish an isolated encounter/cleanup fixture without advancing the game clock.',side,kind,type,count});
  }
  const spawnForm = side => page.locator('[data-spawn-form="' + side + '"]');
  async function enqueueOnly(type,count,side='enemy',kind='zombie',rate=1000000){
    const form = spawnForm(side);
    await form.locator('[data-spawn-species]').selectOption(kind + '-' + type);
    await form.locator('[data-spawn-count]').fill(String(count));
    await form.locator('[data-spawn-rate]').fill(String(rate));
    const before=await state();assert.equal(before.customization.paused,true);
    await form.locator('[data-spawn-batch]').click();
    const job=await page.evaluate(()=>Customization.getState().spawnQueue.jobs.at(-1));assert.ok(job);
    const after=await state();
    for(const key of ['ticks','cash','coins','force','randomSeed','people','zombies','converted','bases','units','waves','waveTicks'])assert.deepEqual(after[key],before[key],'Enqueue while paused must not advance or create actors: '+key);
    assert.equal(job.spawned,0);assert.equal(job.remaining,count);assert.equal(job.rate,rate);
    return job;
  }
  async function runQueuedUntil(id){
    await togglePlayback();await page.evaluate(()=>{ZTPRuntime.useRealtime();ZTPRuntime.start();});
    await page.waitForFunction(id=>!Customization.getState().spawnQueue.jobs.some(job=>job.id===id),id,{timeout:20000});
    await togglePlayback();await freeze();
    assert.equal((await state()).customization.paused,true);
    return page.evaluate(id=>Customization.getState().spawnQueue.recent.find(job=>job.id===id),id);
  }
  async function batchQueued(type,count,side='enemy',kind='zombie'){
    const job=await enqueueOnly(type,count,side,kind);
    const finished=await runQueuedUntil(job.id);assert.equal(finished.spawned,count);assert.equal(finished.remaining,0);
    assert.equal(finished.firstSpawn.x,side==='friendly'?0:1600);assert.equal(finished.firstSpawn.side,side);
    return finished;
  }
  function stableBattle(snapshot) {
    return {ticks: snapshot.ticks, cash: snapshot.cash, coins: snapshot.coins, xp: snapshot.xp,
      bases: snapshot.bases, liveBases: snapshot.liveBases, units: snapshot.units,
      buildingOrders: snapshot.buildingOrders, waves: snapshot.waves, waveTicks: snapshot.waveTicks,
      waveProgress: snapshot.waveProgress, powers: snapshot.powers,
      kills: snapshot.kills, lost: snapshot.lost, records: snapshot.records};
  }

  await check('BATCH-SPAWN-AND-NATURAL-ENTRY', 'The retained single cards and real type/count batch form create exact counts at x=1600 beyond the enemy base; a positioned base attacker then meets the entering fat zombie rather than being skipped.', async () => {
    const raw = await fixture('Batch entry acceptance', draft => {
      for(const unit of draft.config.units.slice(0,5))unit.moveSpeed=0;
      draft.config.units[0].buildTicks=100000;
      draft.config.units[0].health = 10000; draft.config.units[0].damage = 0; draft.config.units[0].moveSpeed = 0;
      draft.config.zombies[3].health = 10000; draft.config.zombies[3].moveSpeed = 1;
    });
    await canvasClick(40,90); assert.equal((await state()).units[0].orders,1,'Keep one genuine paid recruit queued during manual friendly additions');
    await openEditor(); await page.locator('#ztps-tab-sandbox').click();
    assert.equal(await page.locator('[data-spawn]').count(), 5, 'All five original one-click cards stay available');
    const paid=await state();
    for(let type=0;type<5;type++)await batchQueued(type,2,'friendly','unit');
    const friendly=await state();
    assert.deepEqual([0,1,2,3,4].map(type=>troopCount(friendly,type)),[2,2,2,2,2]);
    for(const body of friendly.people.filter(body=>body.type!==5)){
      assert.equal(body.health,raw.config.units[body.type].health);assert.equal(body.speed,raw.config.units[body.type].moveSpeed);
      assert.equal(body.angry,0);assert.equal(body.x,0,'Friendly units enter at their natural left-side origin, not enemy gate');
    }
    assert.equal(friendly.force,paid.force);assert.equal(friendly.cash,paid.cash+Math.floor((paid.coins+(friendly.ticks-paid.ticks))/600)*50);
    assert.equal(friendly.units[0].orders,paid.units[0].orders);assert.equal(friendly.units[0].busy,paid.units[0].busy-(friendly.ticks-paid.ticks));
    assert.deepEqual(friendly.waves,paid.waves);assert.deepEqual(friendly.bases,paid.bases);
    await page.locator('[data-clear-troops="friendly"]').click();
    assert.equal((await state()).force,paid.force,'Clearing free sandbox troops may not release reserved paid population');
    assert.equal((await state()).units[0].orders,1);
    await spawnForm('enemy').locator('[data-spawn-count-preset]').selectOption('5');
    assert.equal(await spawnForm('enemy').locator('[data-spawn-count]').inputValue(), '5');
    const before = await state(); const fatJob=await batchQueued(3,4); const four = await state();
    assert.equal(zombieCount(four, 35), 4);assert.ok(four.ticks>before.ticks);
    assert.equal(fatJob.firstSpawn.x,1600);assert.ok(fatJob.firstSpawn.x>four.bases.enemy.x);
    await page.locator('[data-spawn="3"]').click(); assert.equal(zombieCount(await state(), 35), 5);
    await page.locator('[data-clear-type="enemy"]').selectOption('zombie-3');
    await page.locator('[data-clear-selected="enemy"]').click(); await page.locator('[data-spawn="3"]').click();
    // Explicit synthetic positioning, not a claimed natural full-stage battle:
    // create with the original method, at the gate and on the incoming lane.
    await page.evaluate(() => {
      const g = ZTPGamePort.state.bb_Game, it = g.bbzombies.bbObjectEnumerator(); let fat;
      while (it.bbHasNext()) { const body = it.bbNextObject(); if (body.bbunit.bbtype === 35) fat = body; }
      const worker = g.bbAddPerson(g.bbunits[0]);
      worker.bbxpos = 1460; worker.bbypos = fat.bbypos; worker.bblayer = fat.bblayer;
    });
    evidence.syntheticFixtures.push({name: 'Enemy gate encounter', synthetic: true, notNaturalStageProgress: true,
      method: 'Original bbAddPerson creates one stationary zero-damage high-health worker at x=1460 on the real UI-spawned fat zombie lane; normal simulation must produce their encounter.'});
    const waiting = await state(); assert.equal(waiting.people.find(body => body.type === 0).health, 10000);
    await closeEditor();
    for (let frame = 0; frame < 350 && (await state()).people.find(body => body.type === 0)?.health === 10000; frame++) await step(1);
    const encounter = await save('09-batch-natural-entry-encounter');
    assert.ok(encounter.people.find(body => body.type === 0)?.health < 10000, 'The incoming enemy actually attacks the worker at the gate');
    assert.equal(encounter.mainState, 2); assert.equal(encounter.bases.enemy.health, waiting.bases.enemy.health);
    return {friendlyFiveKindCounts:[2,2,2,2,2],friendlyFreeAndNormal:true,batchCount: 4, singleCardTotal: 5, batchEntry: four.zombies.filter(body => body.type === 35), workerBefore: waiting.people.find(body => body.type === 0), workerAfter: encounter.people.find(body => body.type === 0)};
  });

  await check('PARALLEL-CAMP-SPAWN-FORMS', 'Both camp forms remain visible with independent species/count/rate drafts, immediate quick cards and concurrent queued jobs; no camp dropdown or repeated switching is needed.', async () => {
    await fixture('Parallel camp forms acceptance',draft=>{
      for(const source of [...draft.config.units.slice(0,5),...draft.config.zombies.slice(0,5)])source.moveSpeed=0;
    });
    await openEditor();await page.locator('#ztps-tab-sandbox').click();
    assert.equal(await page.locator('[data-spawn-side]').count(),0);
    for(const side of ['friendly','enemy'])assert.equal(await spawnForm(side).isVisible(),true);
    const friendlyBox=await spawnForm('friendly').boundingBox(),enemyBox=await spawnForm('enemy').boundingBox();
    assert.ok(friendlyBox&&enemyBox);assert.ok(Math.abs(friendlyBox.y-enemyBox.y)<=1&&friendlyBox.x+friendlyBox.width<=enemyBox.x+1,'Camp forms are horizontally adjacent, not hidden behind a camp selector');
    assert.equal(await page.locator('[data-spawn-friendly]').count(),5);assert.equal(await page.locator('[data-spawn]').count(),5);
    const friendly=spawnForm('friendly'),enemy=spawnForm('enemy');
    await friendly.locator('[data-spawn-species]').selectOption('unit-2');await friendly.locator('[data-spawn-count]').fill('3');await friendly.locator('[data-spawn-rate]').fill('2');
    await enemy.locator('[data-spawn-species]').selectOption('zombie-3');await enemy.locator('[data-spawn-count]').fill('4');await enemy.locator('[data-spawn-rate]').fill('0.1');
    const draft=async form=>({kind:await form.locator('[data-spawn-species]').inputValue(),count:await form.locator('[data-spawn-count]').inputValue(),rate:await form.locator('[data-spawn-rate]').inputValue()});
    const friendlyDraft=await draft(friendly),enemyDraft=await draft(enemy),before=await state();
    await friendly.locator('[data-spawn-batch]').click();await enemy.locator('[data-spawn-batch]').click();
    const queued=await page.evaluate(()=>Customization.getState().spawnQueue);
    assert.equal(queued.jobs.length,2);assert.deepEqual(queued.jobs.map(job=>({side:job.side,type:job.type,count:job.count,rate:job.rate})),[{side:'friendly',type:2,count:3,rate:2},{side:'enemy',type:3,count:4,rate:0.1}]);
    assert.deepEqual(await draft(friendly),friendlyDraft);assert.deepEqual(await draft(enemy),enemyDraft);assert.equal((await state()).ticks,before.ticks);
    await page.locator('[data-spawn-friendly="4"]').click();await page.locator('[data-spawn="3"]').click();
    const quick=await state();assert.equal(troopCount(quick,4),1);assert.equal(zombieCount(quick,35),1);assert.equal(quick.cash,before.cash);assert.equal(quick.xp,before.xp);assert.equal(quick.force,before.force);
    assert.deepEqual(await draft(friendly),friendlyDraft);assert.deepEqual(await draft(enemy),enemyDraft);
    await page.locator('#ztps-tab-powers').click();await page.locator('#ztps-tab-sandbox').click();
    assert.deepEqual(await draft(friendly),friendlyDraft);assert.deepEqual(await draft(enemy),enemyDraft);
    await screenshot(artifact('10d-parallel-camp-spawn-panels.png'));
    return {friendlyDraft,enemyDraft,jobs:queued.jobs.map(job=>({side:job.side,type:job.type,count:job.count,rate:job.rate})),immediateFriendly:1,immediateEnemy:1};
  });

  await check('ATOMIC-BOTH-ARMY-CLEAR', 'One real button clears both camps including converted/cross-species actors in one paused operation, retains bases/orders/queued jobs/waves/effects and rewards, is idempotent, and paid recruitment still finishes afterwards.', async () => {
    await fixture('Both-army clear acceptance',draft=>{
      draft.config.levels[0].startingCash=10000;
      draft.config.levels[0].waves=[{id:'both-clear-preserved-wave',type:1,count:3,delay:30,enabled:true}];
      Object.assign(draft.config.units[0],{cost:1,buildTicks:40,dependency:0,people:1,moveSpeed:0});
      for(const source of [...draft.config.units.slice(1,5),...draft.config.zombies.slice(0,5)])source.moveSpeed=0;
    });
    await canvasClick(40,90);for(let frame=0;frame<80&&!troopCount(await state(),0);frame++)await step(1);
    assert.equal(troopCount(await state(),0),1);await canvasClick(40,90);
    await openEditor();await page.locator('#ztps-tab-sandbox').click();
    await batch(1,1,'friendly','unit');await batch(3,1,'friendly','zombie');await batch(4,1,'enemy','unit');await batch(3,1,'enemy','zombie');
    await enqueueOnly(0,7,'friendly','unit',0);await enqueueOnly(0,9,'enemy','zombie',0);
    const before=await state(),queueBefore=await page.evaluate(()=>Customization.getState().spawnQueue);
    assert.equal(before.units[0].orders,1);assert.equal(before.force,2);
    await page.locator('[data-clear-troops="all"]').click();const cleared=await state(),queueAfter=await page.evaluate(()=>Customization.getState().spawnQueue);
    assert.deepEqual(cleared.people,[before.bases.friendly]);assert.deepEqual(cleared.zombies,[before.bases.enemy]);assert.deepEqual(cleared.converted,[]);
    assert.deepEqual(stableBattle(cleared),stableBattle(before));assert.deepEqual(cleared.effects,before.effects);assert.equal(cleared.randomSeed,before.randomSeed);
    assert.equal(cleared.force,1,'Only the live paid recruit releases population; its paid queued replacement remains reserved');
    const removed=before.people.length+before.converted.length+before.zombies.length-2;
    assert.equal(queueAfter.capacity,queueBefore.capacity+removed,'Clearing frees shared live actor capacity');
    assert.deepEqual({...queueAfter,capacity:queueBefore.capacity},queueBefore);assert.equal(cleared.customization.paused,true);
    const deathVisuals=Object.values(cleared.clearVisuals).reduce((sum,count)=>sum+count,0);assert.ok(deathVisuals>0,'Clearing both camps must create original detached death animations');
    const counts=await assertLiveTroopTable();assert.equal(counts.friendly.total,0);assert.equal(counts.enemy.total,0);
    await page.locator('[data-clear-troops="all"]').click();assert.deepEqual(await state(),cleared);
    await screenshot(artifact('10e-both-armies-cleared.png'));
    await closeEditor();for(let frame=0;frame<80&&!(await state()).people.some(body=>body.type===0);frame++)await step(1);
    const resumed=await state();assert.equal(troopCount(resumed,0),1);assert.equal(resumed.units[0].orders,0);assert.equal(resumed.force,1);
    assert.equal((await page.evaluate(()=>Customization.getState().spawnQueue)).totalPending,16);
    await step(300);const recycled=await state();assert.equal(Object.values(recycled.clearVisuals).reduce((sum,count)=>sum+count,0),0,'Original native death animations recycle under normal gameplay');
    assert.equal(troopCount(recycled,0),1);assert.equal(recycled.kills,before.kills);assert.equal(recycled.lost,before.lost);assert.equal(recycled.xp,before.xp);assert.deepEqual(recycled.bases,before.bases);
    return {beforeCounts:before.people.length+before.converted.length+before.zombies.length-2,clearedCounts:counts,paidOrderRetained:1,pendingRetained:16,deathVisuals,nativeDeathAnimationsRecycled:true,paidRecruitCompleted:true};
  });

  await check('FILTERED-CLEAR', 'Species dropdowns distinguish native humans, converted zombies, and enemy species; unrelated troops, bases, paid orders, and future waves survive every selected clear.', async () => {
    await fixture('Filtered clear acceptance', draft => {
      draft.config.levels[0].startingCash = 10000;
      draft.config.levels[0].waves = [{id: 'filtered-clear-future', type: 1, count: 3, delay: 30, enabled: true}];
      Object.assign(draft.config.units[0], {cost: 1, buildTicks: 50, dependency: 0, people: 1});
    });
    await canvasClick(40, 90);
    for (let frame = 0; frame < 80 && !troopCount(await state(), 0); frame++) await step(1);
    assert.equal(troopCount(await state(), 0), 1); await canvasClick(40, 90);
    assert.equal((await state()).units[0].orders, 1);
    await openEditor(); await page.locator('#ztps-tab-sandbox').click(); await batch(0, 2); await batch(3, 2);
    await page.evaluate(() => {
      const g = ZTPGamePort.state.bb_Game, it = g.bbzombies.bbObjectEnumerator(), transferred = new Set();
      while (it.bbHasNext()) {
        const body = it.bbNextObject(), type = body.bbunit.bbtype;
        if ([32,35].includes(type) && !transferred.has(type)) {
          transferred.add(type); g.bbzombies.bbRemove(body); g.bbpombies.bbAddLast(body); body.bbTurn();
        }
      }
      g.bbAddPerson(g.bbunits[1]).bbAnger();
    });
    evidence.syntheticFixtures.push({name: 'Species filtered clear', synthetic: true, notNaturalConversionOrSkill: true,
      method: 'One real canvas recruit plus paid order; four paused public-API spawn fixtures; two transferred through original list/Turn methods; one original-method angry farmer. Clearing itself uses the real species controls.'});
    const before = await state(); assert.deepEqual(before.converted.map(body => body.type).sort(), [32,35]);
    const invariant = stableBattle(before);
    await page.locator('[data-clear-type="friendly"]').selectOption('unit-0');
    await page.locator('[data-clear-selected="friendly"]').click(); const humanCleared = await state();
    assert.equal(troopCount(humanCleared, 0), 0); assert.equal(troopCount(humanCleared, 1), 1);
    assert.deepEqual(humanCleared.converted, before.converted); assert.deepEqual(humanCleared.zombies, before.zombies);
    assert.equal(humanCleared.force, before.force - 1); assert.deepEqual(stableBattle(humanCleared), invariant);
    await page.locator('[data-clear-type="friendly"]').selectOption('zombie-0');
    await page.locator('[data-clear-selected="friendly"]').click(); const convertedCleared = await state();
    assert.deepEqual(convertedCleared.converted.map(body => body.type), [35]);
    assert.deepEqual(convertedCleared.people, humanCleared.people); assert.deepEqual(convertedCleared.zombies, before.zombies);
    assert.deepEqual(stableBattle(convertedCleared), invariant);
    await page.locator('[data-clear-type="enemy"]').selectOption('zombie-3');
    await page.locator('[data-clear-selected="enemy"]').click(); const enemyCleared = await save('10-filtered-species-clear');
    assert.equal(zombieCount(enemyCleared, 35), 0); assert.equal(zombieCount(enemyCleared, 32), 1);
    assert.deepEqual(enemyCleared.people, convertedCleared.people); assert.deepEqual(enemyCleared.converted, convertedCleared.converted);
    assert.equal(enemyCleared.units[0].orders, 1); assert.deepEqual(stableBattle(enemyCleared), invariant);
    return {before, humanCleared, convertedCleared, enemyCleared};
  });

  await check('ALL-TWENTY-FACTION-SPECIES', 'Every one of ten source species can join either camp in the real batch UI; forty resulting actors retain source-group/stage stats, actual list faction and natural origins, then all twenty type/camp filters clear only their requested two without touching bases or paid production.', async () => {
    const raw=await fixture('All twenty camp species acceptance',draft=>{
      draft.config.levels[0].startingCash=10000;
      draft.config.levels[0].zombieHealthMultiplier=2.9;draft.config.levels[0].zombieDamageMultiplier=1.25;
      draft.config.levels[0].waves=[{id:'twenty-untouched-wave',type:1,count:3,delay:30,enabled:true}];
      Object.assign(draft.config.units[0],{cost:1,buildTicks:50,dependency:0,people:1});
      draft.config.units[0].buildTicks=100000;
      for(const source of [...draft.config.units.slice(0,5),...draft.config.zombies.slice(0,5)])source.moveSpeed=0;
      for(const kind of ['units','zombies'])Object.assign(draft.rules.multipliers[kind],{health:1.5,moveSpeed:1.5,damage:1.5});
    });
    await canvasClick(40,90);await openEditor();await page.locator('#ztps-tab-sandbox').click();
    const paid=await state();assert.equal(paid.units[0].orders,1);
    assert.equal(await page.locator('[data-spawn-form]').count(),2);
    for(const side of ['friendly','enemy'])assert.equal(await spawnForm(side).locator('[data-spawn-species] option').count(),10);
    assert.equal(await page.locator('[data-clear-type="friendly"] option').count(),10);
    assert.equal(await page.locator('[data-clear-type="enemy"] option').count(),10);
    const bodies=(snapshot,side)=>side==='friendly'?[...snapshot.people,...snapshot.converted]:snapshot.zombies;
    const match=(snapshot,side,kind,type)=>bodies(snapshot,side).filter(body=>body.type===(kind==='unit'?type:type+32));
    const combinations=[];
    for(const side of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++){
      await batchQueued(type,2,side,kind);const actual=await state(),selected=match(actual,side,kind,type),source=raw.config[kind==='unit'?'units':'zombies'][type];
      assert.equal(selected.length,2,side+' '+kind+' '+type+' exact count');
      for(const body of selected){
        assert.equal(body.faction,side);assert.equal(body.x,side==='friendly'?0:1600);
        assert.equal(body.health,Math.trunc(source.health*1.5*(kind==='zombie'?2:1)));
        assert.equal(body.speed,source.moveSpeed*1.5);
        if('damage'in source)assert.equal(body.damage,source.damage*1.5);
        if(kind==='unit')assert.equal(body.angry,0,'Cross-camp soldiers remain normal troops, not angry skill reinforcements');
      }
      combinations.push({side,kind,type,count:2});
    }
    const full=await save('10a-all-twenty-faction-species');
    const allTwo={friendly:{units:[2,2,2,2,2],zombies:[2,2,2,2,2]},enemy:{units:[2,2,2,2,2],zombies:[2,2,2,2,2]}};
    const fullTable=await assertLiveTroopTable(allTwo);assert.equal(fullTable.friendly.total,20);assert.equal(fullTable.enemy.total,20);
    assert.equal(full.people.length+full.converted.length+full.zombies.length,42);
    assert.equal(full.force,paid.force);assert.equal(full.units[0].orders,1);
    assert.equal(full.units[0].busy,paid.units[0].busy-(full.ticks-paid.ticks));
    const accumulated=paid.coins+(full.ticks-paid.ticks);assert.equal(full.cash,paid.cash+Math.floor(accumulated/600)*50);assert.equal(full.coins,accumulated%600);
    assert.deepEqual(full.bases,paid.bases);assert.deepEqual(full.waves,paid.waves);assert.equal(full.waveTicks,paid.waveTicks);
    for(const selected of combinations){
      const before=await state();
      await page.locator('[data-clear-type="'+selected.side+'"]').selectOption(selected.kind+'-'+selected.type);
      await page.locator('[data-clear-selected="'+selected.side+'"]').click();const after=await state();
      assert.equal(match(after,selected.side,selected.kind,selected.type).length,0);
      assert.equal(after.people.length+after.converted.length+after.zombies.length,before.people.length+before.converted.length+before.zombies.length-2);
      for(const other of combinations)if(other!==selected){
        assert.equal(match(after,other.side,other.kind,other.type).length,match(before,other.side,other.kind,other.type).length,'A typed clear must not affect another side/species');
      }
      assert.equal(after.randomSeed,before.randomSeed);assert.deepEqual(after.effects,before.effects);
      assert.equal(after.force,paid.force);assert.deepEqual(stableBattle(after),stableBattle(full));
      await assertLiveTroopTable();
    }
    const cleared=await save('10b-all-twenty-typed-clears');
    assert.deepEqual(cleared.people,[paid.bases.friendly]);assert.deepEqual(cleared.zombies,[paid.bases.enemy]);assert.deepEqual(cleared.converted,[]);
    const clearedTable=await assertLiveTroopTable();assert.equal(clearedTable.friendly.total,0);assert.equal(clearedTable.enemy.total,0);
    const deathVisuals=Object.values(cleared.clearVisuals).reduce((sum,count)=>sum+count,0);assert.ok(deathVisuals>0,'All twenty species/camp clear combinations produce original native death visuals');
    await closeEditor();await step(300);const recycled=await state();assert.equal(Object.values(recycled.clearVisuals).reduce((sum,count)=>sum+count,0),0);
    assert.deepEqual(recycled.bases,cleared.bases);assert.equal(recycled.kills,cleared.kills);assert.equal(recycled.lost,cleared.lost);assert.equal(recycled.xp,cleared.xp);assert.equal(recycled.units[0].orders,1);
    await openEditor();await page.locator('#ztps-tab-sandbox').click();
    return {combinations,spawned:40,typedClears:20,fullTable,clearedTable,deathVisuals,nativeDeathAnimationsRecycled:true,freePopulation:full.force===paid.force,paidOrderRetained:cleared.units[0].orders};
  });

  await check('INDEPENDENT-SPAWN-JOB-STREAMS', 'A slow 1000-unit batch and a later fast batch have separate live rates and timers: paused enqueue is inert, changing only the fast stream lets it complete first, and individual/all pending cancellation never kills already born troops.', async () => {
    await fixture('Independent spawn streams acceptance',draft=>{for(const source of [...draft.config.units.slice(0,5),...draft.config.zombies.slice(0,5)])source.moveSpeed=0;});
    await openEditor();await page.locator('#ztps-tab-sandbox').click();
    const slow=await enqueueOnly(3,1000,'enemy','zombie',0.1),fast=await enqueueOnly(2,2,'friendly','unit',2);
    let queue=await page.evaluate(()=>Customization.getState().spawnQueue);
    assert.equal(queue.totalPending,1002);assert.equal(queue.jobs.find(job=>job.id===slow.id).rate,0.1);assert.equal(queue.jobs.find(job=>job.id===fast.id).rate,2);
    const fastRate=page.locator('[data-spawn-job-rate="'+fast.id+'"]');await fastRate.fill('4');await fastRate.press('Enter');
    await page.waitForFunction(id=>Customization.getState().spawnQueue.jobs.find(job=>job.id===id)?.rate===4,fast.id);
    queue=await page.evaluate(()=>Customization.getState().spawnQueue);assert.equal(queue.jobs.find(job=>job.id===slow.id).rate,0.1);
    await screenshot(artifact('10c1-independent-rates-paused.png'));
    const completed=await runQueuedUntil(fast.id);assert.equal(completed.spawned,2);assert.equal(completed.firstSpawn.x,0);
    queue=await page.evaluate(()=>Customization.getState().spawnQueue);const stillSlow=queue.jobs.find(job=>job.id===slow.id);
    assert.ok(stillSlow&&stillSlow.remaining===1000&&stillSlow.spawned===0,'The fast stream completes without waiting for the earlier 0.1-per-second stream');
    const born=await state();assert.equal(troopCount(born,2),2);assert.equal(zombieCount(born,35),0);
    await screenshot(artifact('10c2-fast-completed-slow-remains.png'));
    const stopped=await enqueueOnly(0,1001,'friendly','unit',0);assert.equal(stopped.remaining,1001,'A second 1000+ plan is accepted even while another stream is queued');
    await page.locator('[data-cancel-spawn-job="'+slow.id+'"]').click();
    queue=await page.evaluate(()=>Customization.getState().spawnQueue);assert.equal(queue.jobs.some(job=>job.id===slow.id),false);assert.equal(queue.jobs.find(job=>job.id===stopped.id).remaining,1001);
    assert.equal(troopCount(await state(),2),2);
    await page.locator('[data-cancel-spawn-all]').click();queue=await page.evaluate(()=>Customization.getState().spawnQueue);
    assert.equal(queue.pendingJobs,0);assert.equal(queue.totalPending,0);assert.equal(troopCount(await state(),2),2);
    await save('10c-independent-spawn-streams');return {slow:{count:1000,rate:0.1},fast:{count:2,originalRate:2,editedRate:4},fastCompletedFirst:true,paused1001Accepted:true,bornTroopsRetained:2,totalCancelled:queue.totalCancelled};
  });

  await check('QUICK-BASE-CURRENT-AND-MAX', 'Sandbox base controls appear below troop cleanup; maximum HP commits immediately, independent current-HP Enter/blur edits reach the actual bases, and invalid HP is atomic.', async () => {
    const order = await page.evaluate(() => [...document.querySelectorAll('.ztps-content h2')].map(el => el.textContent));
    assert.ok(order.indexOf('基地生命') > order.indexOf('清理当前小兵'));
    await field('config.units.5.health', 8000, 'enter');
    assert.equal((await state()).liveBases.friendly.maximum, 8000);
    await currentHP('friendly', 1234); assert.equal((await state()).bases.friendly.health, 1234);
    await field('config.zombies.5.health', 20000, 'blur');
    assert.equal((await state()).liveBases.enemy.maximum, 20000);
    await currentHP('enemy', 4321, 'blur'); assert.equal((await state()).bases.enemy.health, 4321);
    await field('config.units.5.health', 16000, 'enter'); const increased = await state();
    assert.equal(increased.liveBases.friendly.maximum, 16000); assert.equal(increased.bases.friendly.health, 2468, 'Maximum edit keeps the existing health percentage');
    const stored = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
    await currentHP('friendly', 16001); assert.match(await page.locator('.ztps-message.ztps-error').textContent(), /生命|血量|16000/);
    assert.deepEqual(await state(), increased); assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage))), stored);
    await currentHP('friendly', 2468); await screenshot(artifact('11-base-current-and-max.png'));
    return {friendly: increased.liveBases.friendly, enemy: increased.liveBases.enemy};
  });

  await check('INSTANT-PRESET-DEFAULT-AND-NEXT-BATTLE', 'Loading the existing saved preset, restoring defaults, and Undo apply immediately without extra controls; a genuinely next-battle starting-cash field leaves this match intact and is used by the next explicit start.', async () => {
    await fixture('Preset default timing acceptance', draft => {
      draft.config.levels[0].startingCash = 100;
      Object.assign(draft.config.units[0], {cost:1,buildTicks:1});
    });
    await canvasClick(40,90);
    for (let frame=0;frame<30&&!troopCount(await state(),0);frame++) await step(1);
    assert.equal(troopCount(await state(),0),1); await openEditor();
    const preset = await page.evaluate(() => Customization.listPresets()[0]); assert.ok(preset, 'Reuse the preset created by the earlier real save workflow');
    await page.getByLabel('选择已保存的规则',{exact:true}).selectOption(preset.id); await settled();
    const loaded=await state(); assert.equal(loaded.units[0].cost,25); assert.equal(loaded.people.find(body=>body.type===0).health,100);
    await page.getByRole('button',{name:'恢复原版默认',exact:true}).click(); await settled();
    const defaults=await state(); assert.equal(defaults.units[0].cost,50); assert.equal(defaults.people.find(body=>body.type===0).health,50);
    assert.equal(defaults.rules.corpseSpawnOnImpact,true);
    await page.getByRole('button',{name:'撤销修改',exact:true}).click(); await settled();
    const undone=await state(); assert.equal(undone.units[0].cost,25); assert.equal(undone.people.find(body=>body.type===0).health,100);
    await page.locator('#ztps-tab-levels').click(); const cashBefore=undone.cash;
    await field('config.levels.0.startingCash',999,'enter'); assert.equal((await state()).cash,cashBefore,'Starting cash must not mint resources into an ongoing match');
    await page.locator('#ztps-tab-sandbox').click();
    await Promise.all([page.waitForEvent('domcontentloaded'),page.getByRole('button',{name:'开始自定义战局',exact:true}).click()]);
    await page.waitForFunction(()=>window.gameReady&&Customization.getState().isBattle,null,{timeout:90000}); await freeze();
    const restarted=await save('11a-preset-default-and-next-battle'); assert.equal(restarted.cash,999);
    assert.equal(await page.evaluate(()=>Customization.listPresets().length),1,'Acceptance may not add or delete extra presets');
    return {loadedHealth:100,defaultHealth:50,undoneHealth:100,liveCashBefore:cashBefore,nextBattleStartingCash:restarted.cash};
  });

  await check('GLOBAL-ARMY-MULTIPLIERS', 'Independent 1.5× army controls update all five friendly and all five enemy kinds plus converted enemies; zombie health/damage compose with stage scaling once, raw settings and both bases stay unchanged.', async () => {
    const raw = await fixture('Army multipliers acceptance', draft => {
      draft.config.levels[0].zombieHealthMultiplier = 2.9;
      draft.config.levels[0].zombieDamageMultiplier = 1.25;
    });
    await page.evaluate(() => {
      const g = ZTPGamePort.state.bb_Game;
      for (let type = 0; type < 5; type++) { g.bbAddPerson(g.bbunits[type]); g.bbAddZombie(g.bbzunits[type]); }
      const converted = g.bbAddZombie(g.bbzunits[0]); g.bbzombies.bbRemove(converted); g.bbpombies.bbAddLast(converted); converted.bbTurn();
    });
    evidence.syntheticFixtures.push({name: 'Every-kind multiplier coverage', synthetic: true, notNaturalRecruitOrConversion: true,
      method: 'Create all ten kinds with original AddPerson/AddZombie and one original list/Turn conversion while paused; edit multipliers using real UI fields.'});
    await openEditor(); const before = await state(); await page.locator('#ztps-tab-units').click();
    await field('rules.multipliers.units.health', 1.5, 'enter');
    await field('rules.multipliers.units.moveSpeed', 1.5, 'blur'); await field('rules.multipliers.units.damage', 1.5);
    await page.locator('#ztps-tab-zombies').click();
    await field('rules.multipliers.zombies.health', 1.5, 'enter');
    await field('rules.multipliers.zombies.moveSpeed', 1.5, 'blur'); await field('rules.multipliers.zombies.damage', 1.5);
    const multiplied = await state();
    for (let type = 0; type < 5; type++) {
      const human = multiplied.people.find(body => body.type === type), zombie = multiplied.zombies.find(body => body.type === 32 + type);
      assert.equal(human.health, Math.trunc(raw.config.units[type].health * 1.5));
      assert.equal(human.speed, raw.config.units[type].moveSpeed * 1.5);
      if ('damage' in raw.config.units[type]) assert.equal(human.damage, raw.config.units[type].damage * 1.5);
      assert.equal(zombie.health, Math.trunc(raw.config.zombies[type].health * 1.5 * 2));
      assert.equal(zombie.speed, raw.config.zombies[type].moveSpeed * 1.5);
      if ('damage' in raw.config.zombies[type]) assert.equal(zombie.damage, raw.config.zombies[type].damage * 1.5);
    }
    assert.equal(multiplied.stageDamageMultiplier, 1.25);
    assert.equal(Math.trunc(multiplied.zombies.find(body => body.type === 32).damage * multiplied.stageDamageMultiplier), Math.trunc(raw.config.zombies[0].damage * 1.5 * 1.25));
    assert.equal(multiplied.converted[0].health, Math.trunc(raw.config.zombies[0].health * 1.5 * 2));
    assert.equal(multiplied.converted[0].speed, raw.config.zombies[0].moveSpeed * 1.5);
    assert.deepEqual(multiplied.bases, before.bases); assert.deepEqual(multiplied.liveBases, before.liveBases);
    assert.deepEqual(await page.evaluate(() => Customization.getDraft().config.units.map(unit => unit.health)), raw.config.units.map(unit => unit.health));
    await page.locator('#ztps-tab-units').click(); await page.getByLabel('选择兵种', {exact: true}).selectOption('0');
    await field('config.units.0.cost', 49); const repeated = await save('12-army-global-multipliers');
    assert.deepEqual(repeated.people, multiplied.people); assert.deepEqual(repeated.zombies, multiplied.zombies); assert.deepEqual(repeated.converted, multiplied.converted);
    return {before, multiplied, unrelatedEditDoesNotCompound: true};
  });

  await check('POWER-FIVE-KINDS-AND-LARGE-PLAN', 'All five angry-mob count fields instantly configure the next real skill; actual UI activation spawns exact five-kind totals, accepts 1001, and retains overflow as a bounded pending plan instead of truncating the requested army.', async () => {
    await fixture('Five kind power acceptance', draft => {
      draft.config.levels[0].startingXp = 10000;
      Object.assign(draft.config.powers[0], {xp: 1, buildTicks: 1, cooldownTicks: 1});
      for (const unit of draft.config.units.slice(0, 5)) unit.moveSpeed = 0;
    });
    const keys = ['shovelCount','shotgunCount','survivalistCount','bomberCount','preacherCount'];
    await openEditor(); await page.locator('#ztps-tab-powers').click();
    for (let type = 0; type < keys.length; type++) await field('config.powers.0.effect.' + keys[type], type + 1, type % 2 ? 'blur' : 'enter');
    assert.deepEqual(await page.evaluate(keys => keys.map(key => Customization.getDraft().config.powers[0].effect[key]), keys), [1,2,3,4,5]);
    await closeEditor(); await canvasClick(650, 90);
    for (let frame = 0; frame < 60 && troopCount(await state(), 4) < 5; frame++) await step(1);
    const five = await state(); assert.deepEqual(keys.map((_, type) => troopCount(five, type)), [1,2,3,4,5]);
    assert.ok(five.people.filter(body => body.type !== 5).every(body => body.angry === 1));
    await openEditor(); await page.locator('#ztps-tab-sandbox').click(); await page.locator('[data-clear-troops="friendly"]').click();
    await page.locator('#ztps-tab-powers').click();
    for (let type = 0; type < keys.length; type++) await field('config.powers.0.effect.' + keys[type], type === 0 ? 1001 : 0);
    assert.equal((await page.evaluate(() => Customization.getDraft())).config.powers[0].effect.shovelCount, 1001);
    await closeEditor(); await canvasClick(650, 90); await step(100);
    const full = await state(), pending = await page.evaluate(() => GameConfig.getPowerProgress(window));
    assert.equal(troopCount(full, 0) + pending.pendingTotal, 1001, 'All 1001 requested reinforcements are either live or retained, not silently dropped');
    assert.ok(troopCount(full, 0) <= 998 && pending.pendingTotal > 0, 'A large plan keeps bounded simultaneous entities and pending work');
    await openEditor(); await page.locator('#ztps-tab-sandbox').click(); await page.locator('[data-clear-troops="friendly"]').click();
    await closeEditor(); await step(10); const drained = await state(), remaining = await page.evaluate(() => GameConfig.getPowerProgress(window));
    assert.equal(troopCount(drained, 0), pending.pendingTotal); assert.equal(remaining.pendingTotal, 0, 'Freed capacity dispatches the retained remainder');
    await save('13-five-kind-power-and-large-plan');
    return {fiveKindCounts: [1,2,3,4,5], requested: 1001, liveAtCapacity: troopCount(full, 0), pendingAtCapacity: pending.pendingTotal, remainderAfterClear: troopCount(drained, 0)};
  });

  await check('CANCEL-SKILL-EFFECTS-BY-SOURCE', 'Selected-skill and all-skill buttons remove real active/pending angry-mob troops, harvesters, jets and air bombs by provenance while preserving free manual troops, an ordinary bottle, paid recruitment, cooldowns, bases and wave plans.', async () => {
    await fixture('Cancel skills acceptance',draft=>{
      draft.config.levels[0].startingCash=10000;draft.config.levels[0].startingXp=10000;
      for(const unit of draft.config.units.slice(0,5))unit.moveSpeed=0;
      draft.config.units[0].buildTicks=100000;
      for(const power of draft.config.powers)Object.assign(power,{xp:1,buildTicks:1,cooldownTicks:10000,unlockAfterStage:0});
      Object.assign(draft.config.powers[0].effect,{shovelCount:1001,shotgunCount:0,survivalistCount:0,bomberCount:0,preacherCount:0});
    });
    const progress=()=>page.evaluate(()=>GameConfig.getPowerProgress(window,{includeActive:true}));
    await canvasClick(40,90);await openEditor();await page.locator('#ztps-tab-sandbox').click();await batch(0,2,'friendly','unit');
    await closeEditor();await canvasClick(650,90);await step(100);await openEditor();await page.locator('#ztps-tab-powers').click();
    await page.getByLabel('选择技能',{exact:true}).selectOption('0');
    const angryBefore=await state(),angryProgress=await progress();
    assert.equal(angryProgress.byPower[0].actors+angryProgress.byPower[0].pending,1001);
    assert.ok(angryProgress.byPower[0].pending>0);assert.equal(angryBefore.units[0].orders,1);
    await page.locator('[data-cancel-power-effects="0"]').click();const angryAfter=await state(),angryCancelled=await progress();
    assert.equal(angryCancelled.byPower[0].actors,0);assert.equal(angryCancelled.byPower[0].pending,0);
    assert.equal(troopCount(angryAfter,0),2);assert.ok(angryAfter.people.filter(body=>body.type===0).every(body=>!body.angry));
    assert.equal(angryAfter.force,angryBefore.force);assert.deepEqual(stableBattle(angryAfter),stableBattle(angryBefore));
    assert.equal(angryAfter.randomSeed,angryBefore.randomSeed);assert.equal(angryAfter.customization.paused,true);
    await closeEditor();await canvasClick(700,90);await canvasClick(750,90);
    for(let frame=0;frame<100&&!(await progress()).byPower[2].projectiles;frame++)await step(1);
    await openEditor();await page.locator('#ztps-tab-powers').click();await page.getByLabel('选择技能',{exact:true}).selectOption('1');
    const vehiclesBefore=await progress();assert.ok(vehiclesBefore.byPower[1].powerups>0);assert.ok(vehiclesBefore.byPower[2].powerups>0);assert.ok(vehiclesBefore.byPower[2].projectiles>0,'The actual jets must have dropped real air bombs before cancellation');
    await page.evaluate(()=>{
      ZTPGamePort.state.bb_Game.bbAddBottle(0,300,-200,0,0,0);
      window.__instantOrdinaryBottle=ZTPGamePort.state.bb_Game.bbbottles.bbLast();
    });
    evidence.syntheticFixtures.push({name:'Unrelated ordinary bottle survives skill cancellation',synthetic:true,
      method:'One original bbAddBottle kind0 instance is explicitly unrelated to skill provenance; real canvas-created jets and their real air bombs are cancelled separately.'});
    const beforeHarvestCancel=await state();
    await page.locator('[data-cancel-power-effects="1"]').click();const harvestCancelled=await progress(),afterHarvestCancel=await state();
    assert.equal(harvestCancelled.byPower[1].powerups,0);assert.deepEqual(harvestCancelled.byPower[2],vehiclesBefore.byPower[2]);
    assert.equal(afterHarvestCancel.effects.bbpowerups,beforeHarvestCancel.effects.bbpowerups-vehiclesBefore.byPower[1].powerups);
    assert.equal(afterHarvestCancel.effects.bbbottles,beforeHarvestCancel.effects.bbbottles);
    const beforeAll=await state();await page.locator('[data-cancel-power-effects="all"]').click();const cancelledAll=await progress(),afterAll=await save('13a-cancel-skills-by-source');
    for(const item of cancelledAll.byPower)for(const key of ['pending','actors','powerups','projectiles','explosions','charging'])assert.equal(item[key],0);
    assert.equal(afterAll.effects.bbpowerups,0);assert.equal(afterAll.effects.bbbottles,1);
    assert.equal(await page.evaluate(()=>{
      const it=ZTPGamePort.state.bb_Game.bbbottles.bbObjectEnumerator();while(it.bbHasNext())if(it.bbNextObject()===window.__instantOrdinaryBottle)return true;return false;
    }),true);
    assert.equal(troopCount(afterAll,0),2);assert.equal(afterAll.units[0].orders,1);assert.equal(afterAll.force,beforeAll.force);
    for(const key of ['ticks','cash','coins','xp','kills','lost','randomSeed','bases','liveBases','units','powers','waves','waveTicks','waveProgress','records'])assert.deepEqual(afterAll[key],beforeAll[key]);
    assert.equal(afterAll.customization.paused,true);assert.equal(afterAll.runtime.running,false);
    return {angryRequested:1001,angryPendingBefore:angryProgress.byPower[0].pending,manualTroopsRetained:2,vehiclesBefore,harvestCancelled,cancelledAll,ordinaryBottleRetained:true,paidOrderRetained:afterAll.units[0].orders};
  });

  await check('DUAL-CAMP-INSTANT-POWERS', 'Both camp columns provide three real free-release icons; all six casts work paused with zero XP and a real existing cooldown/lock state unchanged, use mirrored origins, cancel by source, and enemy Harvester/Air Strike actually damage friendly troops without friendly fire or base damage.', async () => {
    await fixture('Dual camp instant powers acceptance',draft=>{
      draft.config.levels[0].startingXp=1;
      Object.assign(draft.config.powers[0],{xp:1,buildTicks:1,cooldownTicks:10000});
      Object.assign(draft.config.powers[0].effect,{shovelCount:1,shotgunCount:2,survivalistCount:0,bomberCount:0,preacherCount:0});
      draft.config.powers[2].effect.jetCount=1;
      for(const source of [...draft.config.units.slice(0,5),...draft.config.zombies.slice(0,5)]){source.moveSpeed=0;source.health=10000;if('damage' in source)source.damage=0;}
      draft.rules.abilities.harvesterDamagePerTick=17;draft.rules.abilities.harvesterRange=250;
    });
    await canvasClick(650,90);for(let frame=0;frame<60&&troopCount(await state(),1)<2;frame++)await step(1);
    await openEditor();await page.locator('#ztps-tab-sandbox').click();await page.locator('[data-clear-troops="all"]').click();await page.locator('#ztps-tab-powers').click();
    const before=await state();assert.equal(before.xp,0);assert.ok(before.powers[0].cooldown>0);assert.equal(before.powers[2].locked,1);
    assert.equal(await page.locator('[data-release-power]').count(),6);
    for(const side of ['friendly','enemy'])for(let id=0;id<3;id++)await page.locator('[data-power-side="'+side+'"] [data-release-power="'+id+'"]').click();
    const cast=await state(),progress=await page.evaluate(()=>GameConfig.getPowerProgress(window,{includeActive:true}));
    assert.equal(cast.ticks,before.ticks);assert.equal(cast.xp,before.xp);assert.equal(cast.cash,before.cash);assert.equal(cast.force,before.force);assert.deepEqual(cast.powers,before.powers);assert.deepEqual(cast.bases,before.bases);assert.equal(cast.customization.paused,true);
    assert.deepEqual([troopCount(cast,0),troopCount(cast,1)],[1,2]);assert.deepEqual([zombieCount(cast,0),zombieCount(cast,1)],[1,2]);
    assert.ok(cast.people.filter(body=>body.type<5).every(body=>body.x<0&&body.angry===1));assert.ok(cast.zombies.filter(body=>body.type<5).every(body=>body.x>1600&&body.angry===1));
    assert.equal(progress.byPower[0].actors,6);assert.equal(progress.byPower[1].powerups,2);assert.equal(progress.byPower[2].powerups,2);
    const vehicles=await page.evaluate(()=>{const out=[],it=ZTPGamePort.state.bb_Game.bbpowerups.bbObjectEnumerator();while(it.bbHasNext()){const p=it.bbNextObject();out.push({type:p.bbtype,x:p.bbxpos,speed:p.bbwalkspeed});}return out;});
    for(const id of [1,2]){const pair=vehicles.filter(p=>p.type===id);assert.equal(pair.length,2);assert.ok(pair.some(p=>p.x<0&&p.speed>0));assert.ok(pair.some(p=>p.x>1600&&p.speed<0));}
    await screenshot(artifact('13b-dual-camp-power-icons.png'));
    await page.locator('[data-cancel-power-effects="all"]').click();const cancelled=await page.evaluate(()=>GameConfig.getPowerProgress(window,{includeActive:true}));
    for(const p of cancelled.byPower)for(const key of ['actors','pending','powerups','projectiles'])assert.equal(p[key],0);
    assert.deepEqual((await state()).powers,before.powers);
    await batch(0,1,'friendly','unit');await batch(0,1,'friendly','zombie');await batch(1,1,'enemy','unit');
    await page.evaluate(()=>{
      const specs=[['human','friendly','unit',0],['zombie','friendly','zombie',0],['witness','enemy','unit',1]];window.__instantPowerVictims={};
      for(const [name,side,kind,type] of specs){const body=Factions.list(window,{side,kind,type,includeBases:false})[0];body.bbxpos=800;body.bbypos=0;body.bblayer=0;window.__instantPowerVictims[name]=body;}
    });
    const victims=()=>page.evaluate(()=>Object.fromEntries(Object.entries(window.__instantPowerVictims).map(([name,body])=>[name,{health:body.bbhealth,x:body.bbxpos,side:Factions.getSide(window,body)}])));
    await page.locator('[data-power-side="enemy"] [data-release-power="1"]').click();
    await page.evaluate(()=>{const it=ZTPGamePort.state.bb_Game.bbpowerups.bbObjectEnumerator();while(it.bbHasNext()){const p=it.bbNextObject();if(p.bbtype===1)p.bbxpos=900;}});
    evidence.syntheticFixtures.push({name:'Enemy power native attack encounter',synthetic:true,notNaturalFullStage:true,method:'Real free-release icon creates the actual enemy effect. Paused public API creates stationary high-HP witnesses; only x/y/layer and the actual vehicle x are positioned. Original attack, bomb generation, flight, impact, damage and runtime are used unchanged.'});
    const harvestBefore=await state();await closeEditor();await step(1);const harvestAfter=await state(),harvestVictims=await victims();
    const ticks=harvestAfter.ticks-harvestBefore.ticks;assert.ok(ticks>0);assert.equal(harvestVictims.human.health,10000-17*ticks);assert.equal(harvestVictims.zombie.health,10000-17*ticks);assert.equal(harvestVictims.witness.health,10000);assert.deepEqual(harvestAfter.bases,harvestBefore.bases);
    await openEditor();await page.locator('#ztps-tab-powers').click();await page.getByLabel('选择技能',{exact:true}).selectOption('1');await page.locator('[data-cancel-power-effects="1"]').click();
    await page.locator('[data-power-side="enemy"] [data-release-power="2"]').click();
    await page.evaluate(()=>{const it=ZTPGamePort.state.bb_Game.bbpowerups.bbObjectEnumerator();while(it.bbHasNext()){const p=it.bbNextObject();if(p.bbtype===2)p.bbxpos=800;}});
    await closeEditor();
    for(let frame=0;frame<150;frame++){
      const found=await page.evaluate(()=>{const bottle=ZTPGamePort.state.bb_Game.bbbottles.bbFirst();if(!bottle)return false;window.__instantRealAirBomb=bottle;for(const body of Object.values(window.__instantPowerVictims))body.bbxpos=bottle.bbxpos;return true;});
      if(found)break;await step(1);
    }
    assert.equal(await page.evaluate(()=>!!window.__instantRealAirBomb),true,'The actual enemy jet must generate its own air bomb');
    const airBefore=await victims(),airBases=(await state()).bases;
    for(let frame=0;frame<400&&(await victims()).human.health===airBefore.human.health;frame++)await step(1);
    const airAfter=await victims();assert.ok(airAfter.human.health<airBefore.human.health,'Enemy air bombs must damage friendly troops at their real landing');assert.equal(airAfter.witness.health,10000,'Enemy air bombs do not damage enemy witnesses');assert.deepEqual((await state()).bases,airBases);
    await openEditor();await page.locator('#ztps-tab-powers').click();await page.locator('[data-cancel-power-effects="all"]').click();await screenshot(artifact('13c-enemy-power-real-damage.png'));
    return {zeroXp:true,normalCooldownProtected:before.powers[0].cooldown,sixPausedCasts:true,vehicles,sourceCancellation:true,harvester:{ticks,victims:harvestVictims},airstrike:{before:airBefore,after:airAfter}};
  });

  await check('NEWEST-WAVE-DISPLAY-APPEND', 'Wave rows display newest-first and a newly appended row appears immediately on page one, while runtime queue execution remains ascending and the current group is not reset.', async () => {
    await fixture('Newest wave acceptance', draft => {
      draft.config.levels[0].waves = [
        {id:'newest-a',type:1,count:1,delay:30,enabled:true},
        {id:'newest-b',type:2,count:2,delay:30,enabled:true},
        {id:'newest-c',type:4,count:3,delay:30,enabled:true}
      ];
    });
    await openEditor(); await page.locator('#ztps-tab-levels').click();
    const waves = page.locator('.ztps-section').filter({has: page.getByRole('heading', {name:'关卡波次顺序',exact:true})});
    assert.deepEqual(await waves.locator('tbody tr[data-wave-index]').evaluateAll(rows => rows.map(row => Number(row.dataset.waveIndex))), [2,1,0]);
    const before = await state(); await waves.getByRole('button', {name:'＋ 添加一组',exact:true}).click(); await settled();
    assert.equal(await waves.locator('tbody tr[data-wave-index]').first().getAttribute('data-wave-index'), '3');
    await field('config.levels.0.waves.3.type', 5); await field('config.levels.0.waves.3.count', 2);
    const after = await save('14-newest-wave-immediate');
    assert.deepEqual(after.waves.map(wave => wave.type), [1,2,4,5]);
    assert.deepEqual(after.waves[0], before.waves[0]); assert.equal(after.waveProgress.current.id, before.waveProgress.current.id);
    const first = await waves.locator('tbody tr[data-wave-index]').first().boundingBox();
    assert.ok(first && first.height > 0, 'The new row is rendered on the first page without navigating to the old last page');
    return {display: [3,2,1,0], execution: after.waves.map(wave => wave.type), retainedCurrent: after.waveProgress.current.id};
  });

  await check('PAUSE-WAVES-NOT-BATTLE', 'The obvious wave-header toggle freezes a partially consumed wave independently of combat and manual queue streams, works despite an invalid unrelated draft, and resumes the same stable wave ID without replay.', async () => {
    await fixture('Wave only pause acceptance',draft=>{
      draft.config.levels[0].waves=[{id:'independent-wave-current',type:1,count:20,delay:0.5,enabled:true},{id:'independent-wave-future',type:4,count:1,delay:30,enabled:true}];
      draft.rules.automaticSpawning=true;
    });
    for(let frame=0;frame<150&&zombieCount(await state(),32)<2;frame++)await step(1);
    const partial=await state();assert.equal(zombieCount(partial,32),2);assert.equal(partial.waveProgress.current.spawned,2);
    await openEditor();await page.locator('#ztps-tab-units').click();await field('config.units.0.health',-1);
    assert.equal(await page.locator('.ztps-message.ztps-error').isVisible(),true);
    await page.locator('#ztps-tab-levels').click();await page.locator('[data-toggle-waves]').click();await settled();
    const paused=await state();assert.equal(paused.rules.automaticSpawning,false);assert.equal(paused.customization.paused,true);
    assert.deepEqual(paused.waves,partial.waves);assert.equal(paused.waveTicks,partial.waveTicks);
    assert.equal(paused.units[0].health,50,'The wave shortcut may not apply an unrelated invalid health draft');
    await page.locator('#ztps-tab-units').click();await field('config.units.0.health',50);
    await page.locator('#ztps-tab-sandbox').click();assert.equal(await page.locator('[data-path="rules.automaticSpawning"]').isChecked(),false);
    const manual=await enqueueOnly(0,2,'friendly','unit',20);const completed=await runQueuedUntil(manual.id);assert.equal(completed.spawned,2);
    const whilePaused=await state();assert.ok(whilePaused.ticks>paused.ticks);assert.equal(troopCount(whilePaused,0),2);
    assert.deepEqual(whilePaused.waves,paused.waves);assert.equal(whilePaused.waveTicks,paused.waveTicks);
    assert.equal(whilePaused.waveProgress.current.id,paused.waveProgress.current.id);assert.equal(whilePaused.waveProgress.current.consumed,paused.waveProgress.current.consumed);
    assert.ok(whilePaused.zombies.find(body=>body.type===32).x<paused.zombies.find(body=>body.type===32).x,'Already spawned enemies keep moving while only automatic waves are paused');
    await page.locator('#ztps-tab-levels').click();assert.match(await page.locator('[data-toggle-waves]').textContent(),/继续/);
    await page.locator('[data-toggle-waves]').click();await settled();const resumed=await state();
    assert.equal(resumed.rules.automaticSpawning,true);assert.equal(resumed.waveProgress.current.id,paused.waveProgress.current.id);assert.equal(resumed.waveProgress.current.spawned,2);
    await closeEditor();
    for(let frame=0;frame<60&&zombieCount(await state(),32)<3;frame++)await step(1);
    const next=await save('14b-pause-waves-not-battle');assert.equal(zombieCount(next,32),3);assert.equal(next.waveProgress.current.spawned,3);
    assert.equal(next.waveProgress.current.id,'independent-wave-current');
    return {before:partial.waveProgress.current,whilePaused:whilePaused.waveProgress.current,manualSpawned:2,battleTicksAdvanced:whilePaused.ticks-paused.ticks,resumed:next.waveProgress.current};
  });

  await check('CROSS-FACTION-REAL-COMBAT', 'Real simulation, natural hit-animation timing and real projectiles exercise enemy gunner fire, enemy preacher conversion, friendly fat pooled area damage, and friendly corpse launch/landing with faction-safe damage and spawned allies.', async () => {
    async function combatFixture(name,configure){
      await fixture(name,draft=>{
        for(const unit of draft.config.units.slice(0,5)){unit.moveSpeed=0;unit.health=10000;if('damage'in unit)unit.damage=0;}
        for(const zombie of draft.config.zombies.slice(0,5)){zombie.moveSpeed=0;zombie.health=10000;if('damage'in zombie)zombie.damage=0;}
        draft.rules.abilities.ghoulLongLeap=false;configure(draft);
      });
      await openEditor();await page.locator('#ztps-tab-sandbox').click();
    }
    async function position(actors){
      await page.evaluate(actors=>{
        window.__instantCombatActors={};
        for(const spec of actors){
          const body=Factions.list(window,{side:spec.side,kind:spec.kind,type:spec.type,includeBases:false})[spec.index||0];
          if(!body)throw new Error('Missing real batch actor '+spec.name);
          body.bbxpos=spec.x;body.bbypos=0;body.bblayer=0;window.__instantCombatActors[spec.name]=body;
        }
      },actors);
      evidence.syntheticFixtures.push({name:'Positioned cross-camp encounter',synthetic:true,notNaturalFullStage:true,
        method:'Actors are paused public direct-spawn API fixtures. Only x/y/layer are positioned; source config sets HP, movement and damage. Actual queued form coverage is separate. Original animation/mode/hit timers and runtime simulation are not forced.',actors});
    }
    async function actors(){return page.evaluate(()=>Object.fromEntries(Object.entries(window.__instantCombatActors).map(([name,body])=>[name,{type:body.bbunit.bbtype,side:Factions.getSide(window,body),health:body.bbhealth,x:body.bbxpos,mode:body.bbmode}])));}
    async function advanceUntil(predicate,frames=600){
      for(let frame=0;frame<frames;frame++){if(await predicate())return;await step(1);}
      throw new Error('Natural cross-faction encounter did not reach its expected event within '+frames+' physical frames');
    }
    const details={};
    await combatFixture('Enemy gunner real fire',draft=>{draft.config.units[2].damage=5;});
    await batch(2,1,'enemy','unit');await batch(0,1,'friendly','zombie');await batch(1,1,'enemy','zombie');
    await position([{name:'gunner',side:'enemy',kind:'unit',type:2,x:900},{name:'victim',side:'friendly',kind:'zombie',type:0,x:800},{name:'witness',side:'enemy',kind:'zombie',type:1,x:800}]);
    const gunBefore=await actors(),gunBases=(await state()).bases;await closeEditor();
    await advanceUntil(async()=> (await actors()).victim.health<gunBefore.victim.health);
    const gunAfter=await actors();assert.equal(gunAfter.victim.health,9995);assert.equal(gunAfter.witness.health,gunBefore.witness.health);
    assert.equal(gunAfter.gunner.side,'enemy');assert.deepEqual((await state()).bases,gunBases);details.gunner={before:gunBefore,after:gunAfter};

    await combatFixture('Enemy preacher real conversion',()=>{});
    await batch(4,1,'enemy','unit');await batch(3,1,'friendly','zombie');await batch(0,1,'enemy','zombie');
    await position([{name:'priest',side:'enemy',kind:'unit',type:4,x:900},{name:'victim',side:'friendly',kind:'zombie',type:3,x:700},{name:'witness',side:'enemy',kind:'zombie',type:0,x:700}]);
    const priestBefore=await actors(),priestState=await state();await togglePlayback();await freeze();
    const countDraft=spawnForm('friendly').locator('[data-spawn-count]');await countDraft.fill('37');
    await page.evaluate(()=>{window.__instantFocusedCount=document.querySelector('[data-spawn-form="friendly"] [data-spawn-count]');});
    const priestCountBefore=await assertLiveTroopTable();assert.equal(priestCountBefore.friendly.zombies[3],1);assert.equal(priestCountBefore.enemy.zombies[3],0);
    await advanceUntil(async()=> (await actors()).victim.side==='enemy');const priestAfter=await actors(),priestEnd=await state();
    assert.equal(priestAfter.victim.health,priestBefore.victim.health);assert.equal(priestAfter.victim.type,35);
    assert.equal(priestAfter.priest.side,'enemy');assert.equal(priestAfter.witness.health,priestBefore.witness.health);
    assert.equal(priestEnd.kills,priestState.kills);assert.equal(priestEnd.lost,priestState.lost);assert.equal(priestEnd.xp,priestState.xp);
    const priestCountAfter=await assertLiveTroopTable();assert.equal(priestCountAfter.friendly.zombies[3],0);assert.equal(priestCountAfter.enemy.zombies[3],1);
    assert.equal(await countDraft.inputValue(),'37');assert.equal(await page.evaluate(()=>document.activeElement===window.__instantFocusedCount&&window.__instantFocusedCount.isConnected),true,'Live count polling/conversion must not replace or defocus an in-progress draft input');
    assert.deepEqual(priestEnd.bases,priestState.bases);details.preacher={before:priestBefore,after:priestAfter,sameObjectReference:true,countsBefore:priestCountBefore,countsAfter:priestCountAfter,draftFocusRetained:true};

    await combatFixture('Friendly fat real area hit',draft=>{draft.config.zombies[3].damage=60;draft.config.units[0].health=10;draft.config.units[1].health=1000;});
    await batch(3,1,'friendly','zombie');await batch(0,1,'enemy','unit');await batch(1,1,'enemy','unit');await batch(0,1,'friendly','zombie');
    await position([{name:'fat',side:'friendly',kind:'zombie',type:3,x:500},{name:'first',side:'enemy',kind:'unit',type:0,x:555},{name:'second',side:'enemy',kind:'unit',type:1,x:575},{name:'witness',side:'friendly',kind:'zombie',type:0,x:550}]);
    const fatBefore=await actors(),fatBases=(await state()).bases;await closeEditor();
    await advanceUntil(async()=> (await actors()).second.health<fatBefore.second.health);const fatAfter=await actors();
    assert.ok(fatAfter.first.health<=0);assert.equal(fatAfter.second.health,950,'The first 10 HP consumes ten of the original 60-point pooled area budget');
    assert.equal(fatAfter.witness.health,fatBefore.witness.health);assert.deepEqual((await state()).bases,fatBases);details.fat={before:fatBefore,after:fatAfter};

    await combatFixture('Friendly corpse real flight',draft=>{draft.config.zombies[4].projectileDamage=500;draft.config.units[0].health=1000;draft.rules.corpseSpawnOnImpact=true;});
    await batch(4,1,'friendly','zombie');await batch(0,1,'enemy','unit');await batch(0,1,'friendly','unit');
    await position([{name:'thrower',side:'friendly',kind:'zombie',type:4,x:400},{name:'victim',side:'enemy',kind:'unit',type:0,x:1160},{name:'witness',side:'friendly',kind:'unit',type:0,x:1160}]);
    const corpseBefore=await actors(),corpseBases=(await state()).bases;await closeEditor();
    const projectiles=()=>page.evaluate(()=>{const result=[],it=ZTPGamePort.state.bb_Game.bbflinglist.bbObjectEnumerator();while(it.bbHasNext()){const body=it.bbNextObject();result.push({x:body.bbxpos,y:body.bbypos});}return result;});
    await advanceUntil(async()=> (await projectiles()).length>0);const launched=await projectiles();
    await step(2);const flying=await projectiles();assert.ok(flying.length&&flying[0].x>launched[0].x,'The real friendly corpse projectile travels right');
    await advanceUntil(async()=> (await actors()).victim.health<corpseBefore.victim.health);const corpseAfter=await actors(),corpseEnd=await state();
    assert.equal(corpseAfter.victim.health,500);assert.equal(corpseAfter.witness.health,corpseBefore.witness.health);
    assert.equal(corpseEnd.converted.filter(body=>body.type===32).length,1,'A real landing creates a friendly, not hostile, basic zombie');
    assert.equal(corpseEnd.zombies.filter(body=>body.type===32).length,0);assert.deepEqual(corpseEnd.bases,corpseBases);
    details.corpse={before:corpseBefore,after:corpseAfter,launched,flying,landingAlly:corpseEnd.converted.find(body=>body.type===32)};
    await combatFixture('In flight corpse checkbox instant',draft=>{draft.config.zombies[4].projectileDamage=500;draft.config.units[0].health=1000;draft.rules.corpseSpawnOnImpact=true;});
    await batch(4,1,'friendly','zombie');await batch(0,1,'enemy','unit');await batch(0,1,'friendly','unit');
    await position([{name:'thrower',side:'friendly',kind:'zombie',type:4,x:400},{name:'victim',side:'enemy',kind:'unit',type:0,x:1160},{name:'witness',side:'friendly',kind:'unit',type:0,x:1160}]);
    await closeEditor();await advanceUntil(async()=> (await projectiles()).length>0);
    await openEditor();await page.locator('#ztps-tab-sandbox').click();
    await field('rules.corpseSpawnOnImpact',false);assert.equal((await state()).rules.corpseSpawnOnImpact,false);
    await closeEditor();await advanceUntil(async()=> (await actors()).victim.health<1000);
    const noSpawn=await state(),noSpawnActors=await actors();assert.equal(noSpawnActors.victim.health,500);
    assert.equal(noSpawnActors.witness.health,1000);assert.equal(noSpawn.converted.filter(body=>body.type===32).length,0);
    assert.equal(noSpawn.zombies.filter(body=>body.type===32).length,0,'Unchecking while a corpse is already in flight must prevent its real landing spawn immediately');
    details.corpseCheckboxWhileInFlight={effective:false,victimHealth:500,extraZombieCount:0};
    await save('14a-cross-faction-corpse-landing');return details;
  });

  await check('UNLOCK-ALL-AND-ORIGINAL-SCORE-ISOLATION', 'The real unlock-all button beside the stage editor promotes an original match to custom, immediately removes unit/building/power locks without gifting anything or altering either score store, and enables a genuine canvas Stage 4 selection with zero Stage 3 wins.', async () => {
    await openEditor();await page.locator('#ztps-tab-sandbox').click();
    await Promise.all([page.waitForEvent('domcontentloaded'),page.getByRole('button',{name:'回到原版模式',exact:true}).click()]);
    await page.waitForFunction(()=>window.gameReady&&ZTPGamePort.state.bb_Game.bbmainState===1,null,{timeout:90000});await freeze();
    assert.equal(await page.evaluate(()=>Customization.getState().mode),'original');
    await canvasClick(660,65);for(let frame=0;frame<220&&(await state()).mainState!==2;frame++)await step(1);
    assert.equal((await state()).mainState,2);await openEditor();await page.locator('#ztps-tab-levels').click();
    const scoreStorage=()=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith(Customization.constants.ORIGINAL_STORAGE+'/')||key.startsWith(Customization.constants.CUSTOM_STORAGE+'/'))));
    const before=await state(),stores=await scoreStorage();
    const placement=await page.evaluate(()=>{const b=document.querySelector('[data-unlock-all]'),s=document.querySelector('select[aria-label="选择关卡 / 出怪"]');return {sameRow:b?.parentElement===s?.closest('.ztps-section-heading'),button:b?.getBoundingClientRect().toJSON(),picker:s?.getBoundingClientRect().toJSON()};});
    assert.equal(await page.locator('[data-unlock-all]').isVisible(),true);assert.equal(placement.sameRow,true,'Unlock belongs beside the stage editor selector');
    await page.locator('[data-unlock-all]').click();await settled();
    const after=await state(),draft=await page.evaluate(()=>Customization.getDraft()),runtimeLocks=await page.evaluate(()=>{const g=ZTPGamePort.state.bb_Game;return {units:g.bbunits.slice(0,5).map(p=>p.bbdependency),buildings:g.bbbuildings.map(p=>p.bbdependency),powers:g.bbpowers.map(p=>p.bblocked)};});
    assert.equal(after.customization.mode,'custom');assert.equal(draft.rules.unlockAllStages,true);assert.ok(draft.config.units.slice(0,5).every(x=>x.dependency===0));assert.ok(draft.config.buildings.every(x=>x.dependency===0));assert.ok(draft.config.powers.every(x=>x.unlockAfterStage===0));
    assert.deepEqual(runtimeLocks,{units:[0,0,0,0,0],buildings:[0,0,0,0,0,0],powers:[0,0,0]});
    for(const key of ['ticks','cash','xp','force','buildings','bases','people','zombies','converted','kills','lost'])assert.deepEqual(after[key],before[key],'Unlocking must not grant resources/buildings/wins: '+key);
    assert.deepEqual(await scoreStorage(),stores);assert.equal(after.records[2],0,'The fourth-stage prerequisite win is genuinely absent');
    await screenshot(artifact('15a-unlock-all-stage-editor.png'));
    await closeEditor();await canvasClick(718,18);assert.equal((await state()).mainState,6);await canvasClick(300,412);await step(1);assert.equal((await state()).mainState,1);
    await screenshot(artifact('15b-unlocked-canvas-menu.png'));
    await canvasClick(660,340);for(let frame=0;frame<220&&(await state()).mainState!==2;frame++)await step(1);
    const fourth=await state();assert.equal(fourth.mainState,2);assert.equal(fourth.difficulty,3);assert.deepEqual(await scoreStorage(),stores);assert.equal(fourth.records[2],0);
    return {placement,unlocked:runtimeLocks,customStageFlag:true,actualCanvasStage:4,originalAndCustomScoresPreserved:true,noBuildingsOrResourcesGifted:true};
  });

  await check('INDEPENDENT-TIME-DIMENSION', 'The independent time panel owns pause/resume and 0.5×/2× numeric/preset controls; actual runtime elapsed time and simulation ticks scale without changing original game speed or replaying paused time.', async () => {
    await fixture('Independent time acceptance'); await openEditor();
    assert.equal(await page.locator('#ztps-panel #ztps-time-host [data-time-controls]').count(), 1, 'Time controls belong inside the F2 settings dock');
    assert.equal(await page.locator('body > [data-time-controls],main [data-time-controls]').count(),0);
    assert.equal(await page.locator('.ztps-entry').count(),0);
    assert.equal(await page.locator('[data-editor-playback]').count(), 0);
    const toggle = page.locator('[data-time-toggle]');
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
    assert.equal(await page.locator('[data-time-pause]').isVisible(), true);
    const paused = await state(); await page.waitForTimeout(150); assert.equal((await state()).ticks, paused.ticks);
    await togglePlayback(); await freeze();
    await page.locator('[data-time-speed="0.5"]').click();
    assert.equal((await state()).runtime.timeScale, 0.5);
    const slowBefore = await state(); await step(60); const slowAfter = await state();
    const numeric = page.locator('[data-time-number]'); await numeric.fill('2'); await numeric.press('Enter');
    assert.equal((await state()).runtime.timeScale, 2);
    const fastBefore = await state(); await step(60); const fastAfter = await state();
    const slowDelta = slowAfter.ticks - slowBefore.ticks, fastDelta = fastAfter.ticks - fastBefore.ticks;
    assert.ok(slowDelta > 0 && fastDelta >= slowDelta * 3.8 && fastDelta <= slowDelta * 4.2, '2× produces four times the simulation of 0.5× for the same physical frames');
    assert.ok(Math.abs((fastAfter.runtime.milliseconds-fastBefore.runtime.milliseconds) / (slowAfter.runtime.milliseconds-slowBefore.runtime.milliseconds) - 4) < 0.03);
    assert.equal(await page.evaluate(() => ZTPGamePort.state.bb_Game.bbgamespeed), 2, 'Outer time scaling never overwrites the original game speed setting');
    await page.locator('[data-time-speed="0"]').click(); const zeroBefore = await state(); await step(60); const zeroAfter = await state();
    assert.equal(zeroAfter.ticks, zeroBefore.ticks); assert.equal(zeroAfter.runtime.milliseconds, zeroBefore.runtime.milliseconds);
    await page.locator('[data-time-speed="1"]').click(); await togglePlayback();
    assert.equal((await state()).customization.paused, true);
    await page.locator('.ztps-close').focus(); await page.keyboard.press('Escape');
    assert.equal(await page.locator('.ztps-overlay').isVisible(), false);
    assert.equal(await page.locator('[data-time-controls]').isVisible(),false,'Closing F2 hides the entire time section instead of leaving game-side controls');
    assert.equal((await state()).customization.paused, true, 'Closing settings may not release the independent time panel pause');
    await openEditor();
    await save('15-independent-time-panel');
    return {slowTicks:slowDelta,fastTicks:fastDelta,ratio:fastDelta/slowDelta,zeroPaused:true,originalGameSpeed:2};
  });
};
