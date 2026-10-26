'use strict';

// Real-renderer checks shared by source Electron and the packaged EXE. The
// caller owns all processes/profile paths. These are bounded functional cases,
// not an FPS benchmark or a simulation that skips attacks/rendering.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const INT_MAX = 2147483647;

function validateQueueOccupancy(queue, expected) {
  assert.equal(queue.entityLimit,1000);
  assert.equal(queue.baseCount,2);
  assert.equal(queue.entityCount,expected);
  assert.equal(queue.capacity,Math.max(0,queue.entityLimit-expected));
}

function validateBaseStress(record) {
  assert.equal(record.limitPerSide,256);
  assert.deepEqual(record.leftovers,[0,0]);
  assert.deepEqual(record.healthAfterHits,[INT_MAX-40000000,INT_MAX-40000000]);
  assert.equal(record.actualSeed,record.expectedSeed,'Particle admission must not change the old shared game RNG sequence');
  assert.ok(record.firstSideParticles>0&&record.firstSideParticles<=256);
  assert.ok(record.secondSideParticles>0&&record.secondSideParticles<=256,'Saturating one base must leave a separate visual allowance for the other');
  assert.equal(record.baseParticles,record.firstSideParticles+record.secondSideParticles);
  assert.ok(record.baseParticles<=512,'Only decorative base particles have a shared fixed bound');
  assert.ok(record.deathVisuals>0,'Budget saturation must not swallow the original detached troop death animations');
}

async function acceptance(h) {
  const {page,check,state,save,screenshot,artifact,openEditor,closeEditor,togglePlayback,importAndStart,step,freeze,evidence}=h;
  // Read the actual ztp:// source bytes, not this harness's checkout: packaged
  // acceptance must identify exactly the runtime files inside its own EXE.
  const runtimeSourceBytes=await page.evaluate(async()=>{
    const names=['game-config.js','factions.js','effect-lists.js','spawn-queue.js','settings-ui.js','generated-game.js'];
    return Promise.all(names.map(async name=>{
      const response=await fetch('/src/'+name,{cache:'no-store'});
      if(!response.ok)throw new Error('QA runtime hash HTTP '+response.status+': '+name);
      return {name,bytes:Array.from(new Uint8Array(await response.arrayBuffer()))};
    }));
  });
  evidence.v043RuntimeSourceHashes=Object.fromEntries(runtimeSourceBytes.map(({name,bytes})=>
    [name,crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex')]));
  async function fixture(name,edit) {
    const draft=await page.evaluate(()=>{
      const s=Customization.getState(),draft={config:s.defaults,rules:s.defaultRules};
      draft.config.levels[0].waves=[];draft.rules.automaticSpawning=false;
      draft.rules.baseReinforcements=false;draft.rules.corpseSpawnOnImpact=false;
      for(const entity of [...draft.config.units.slice(0,5),...draft.config.zombies.slice(0,5)]){
        entity.moveSpeed=0;entity.health=1000000;
        if('damage'in entity)entity.damage=0;
        if('projectileDamage'in entity)entity.projectileDamage=0;
      }
      return draft;
    });
    edit?.(draft);
    await importAndStart({schemaVersion:1,name,...draft},name+'.json');
    await openEditor();await page.locator('#ztps-tab-sandbox').click();
    const time=page.locator('[data-time-toggle]');
    if(await time.getAttribute('aria-expanded')!=='true')await time.click();
    return draft;
  }
  const queue=()=>page.evaluate(()=>Customization.getState().spawnQueue);
  async function enqueue(side,count,rate) {
    const form=page.locator('[data-spawn-form="'+side+'"]');
    await form.locator('[data-spawn-species]').selectOption('unit-0');
    await form.locator('[data-spawn-count]').fill(String(count));
    await form.locator('[data-spawn-rate]').fill(String(rate));
    await form.locator('[data-spawn-batch]').click();
    return page.evaluate(()=>Customization.getState().spawnQueue.jobs.at(-1));
  }
  const summary=id=>page.locator('[data-spawn-job-id="'+id+'"] small');
  async function label(id,text) {
    await page.waitForFunction(({id,text})=>document.querySelector('[data-spawn-job-id="'+id+'"] small')?.textContent.includes(text),{id,text});
    return summary(id).textContent();
  }

  await check('SPAWN-QUEUE-BACKPRESSURE-REASONS','The real F2 queue distinguishes a stopped battle, a zero-rate batch and actual 1000-object capacity; both bases count, queued requests are retained, and clearing troops lets the existing live-rate job resume.',async()=>{
    await fixture('Queue occupancy and pause reasons');
    const stopped=await enqueue('friendly',2,0),active=await enqueue('enemy',3,120);
    assert.ok(stopped&&active);validateQueueOccupancy(await queue(),2);
    const pausedText=await label(active.id,'战斗暂停中'),zeroText=await label(stopped.id,'该批已暂停（速率 0）');
    assert.ok(!pausedText.includes('场上已满'));assert.ok(!pausedText.includes('等待场上空位'));
    await page.waitForFunction(()=>document.querySelector('[data-spawn-queue-summary]')?.textContent.includes('场上占用 2 / 1000（含基地）'));
    const filled=await page.evaluate(()=>Customization.spawnFactionUnit('friendly',{kind:'unit',type:0},998));
    assert.equal(filled.count,998);validateQueueOccupancy(await queue(),1000);
    evidence.syntheticFixtures.push({name:'Exact shared live-capacity boundary',synthetic:true,notNaturalRecruitment:true,
      method:'The public paused immediate API adds 998 stationary harmless ordinary humans to the two real bases; real queued UI batches remain pending and real clock controls demonstrate backpressure and recovery.',actors:998});
    await togglePlayback();await page.evaluate(()=>{ZTPRuntime.useRealtime();ZTPRuntime.start();});
    const fullText=await label(active.id,'场上已满，等待单位退场');
    let full=await queue();validateQueueOccupancy(full,1000);
    assert.equal(full.blocked,'entity-limit');assert.equal(full.jobs.find(job=>job.id===active.id).remaining,3);
    assert.equal(full.jobs.find(job=>job.id===stopped.id).remaining,2);
    await summary(active.id).scrollIntoViewIfNeeded();
    await page.locator('[data-spawn-queue-summary]').scrollIntoViewIfNeeded();
    await screenshot(artifact('18-queue-actual-capacity.png'));
    await togglePlayback();await freeze();
    assert.equal((await state()).customization.paused,true);
    await label(active.id,'战斗暂停中');
    await page.locator('[data-clear-troops="all"]').click();
    const cleared=await queue();validateQueueOccupancy(cleared,2);
    assert.equal(cleared.totalPending,5);assert.equal(cleared.totalSpawned,0);
    await togglePlayback();await page.evaluate(()=>{ZTPRuntime.useRealtime();ZTPRuntime.start();});
    await page.waitForFunction(id=>Customization.getState().spawnQueue.recent.some(job=>job.id===id&&job.spawned===3),active.id,{timeout:20000});
    await togglePlayback();await freeze();
    const resumed=await queue();validateQueueOccupancy(resumed,5);
    assert.equal(resumed.jobs.length,1);assert.equal(resumed.jobs[0].id,stopped.id);assert.equal(resumed.jobs[0].remaining,2);
    await label(stopped.id,'该批已暂停（速率 0）');
    await page.locator('[data-cancel-spawn-all]').click();assert.equal((await queue()).pendingJobs,0);
    await save('18a-queue-resumed-after-clear');
    return {pausedText,zeroText,fullText,capacityIncludesBases:true,initialOccupancy:2,fullOccupancy:1000,
      pendingAtFull:5,activeBatchResumed:3,zeroRateBatchRetained:2,afterResumeOccupancy:5};
  });

  await check('HIGH-DAMAGE-BASE-VISUAL-BUDGET','Real high-damage hits keep exact base HP/leftovers/shared RNG while decorative debris stays bounded independently per base; saturated visuals do not swallow troop deaths, and full native updates/draws recycle effects and restore the allowance.',async()=>{
    await fixture('High damage base visual budget',draft=>{draft.config.units[5].health=INT_MAX;draft.config.zombies[5].health=INT_MAX;});
    const record=await page.evaluate(()=>{
      const p=ZTPGamePort,g=p.state.bb_Game,entries=list=>{const a=[],it=list.bbObjectEnumerator();while(it.bbHasNext())a.push(it.bbNextObject());return a;};
      const seed=0x13579bd;
      p.setRandomSeed(seed);
      // Exact six-RNG-call legacy cap-1024 visual leaf, without allocating any
      // particles. Actual bbInfect/bbSmack below must leave the same seed.
      for(let hit=0;hit<80;hit++)for(let left=1024;left>0;){
        p.bb_std_random_Rnd2(4);p.bb_std_random_Rnd2(4);p.bb_Rand(8);p.bb_Rand(4);p.bb_std_random_Rnd2(80);
        left=(left-((4+p.bb_std_random_Rnd2(6))|0))|0;
      }
      const expectedSeed=p.state.bb_std_random_Seed;
      p.setRandomSeed(seed);
      let firstLeft=0,secondLeft=0;
      for(let hit=0;hit<40;hit++)firstLeft+=g.bbpeoplebase.bbInfect(1000000);
      const first=new Set(entries(g.bbbodyparts)),firstSideParticles=first.size;
      for(let hit=0;hit<40;hit++)secondLeft+=g.bbzombiebase.bbSmack(1000000,1);
      const parts=entries(g.bbbodyparts),secondSideParticles=parts.filter(part=>!first.has(part)).length;
      return {limitPerSide:GameConfig.BASE_DEBRIS_LIMIT_PER_SIDE,firstSideParticles,secondSideParticles,
        baseParticles:parts.filter(part=>part.bbsheet===g.bbbitsheet).length,
        actualSeed:p.state.bb_std_random_Seed,expectedSeed,leftovers:[firstLeft,secondLeft],
        healthAfterHits:[g.bbpeoplebase.bbhealth,g.bbzombiebase.bbhealth],effectListBefore:EffectLists.diagnostics(window)};
    });
    await page.evaluate(()=>{Customization.spawnFactionUnit('friendly',{kind:'zombie',type:3},1);Customization.spawnFactionUnit('enemy',{kind:'unit',type:0},1);});
    await page.locator('[data-clear-troops="all"]').click();
    record.deathVisuals=await page.evaluate(()=>{
      const g=ZTPGamePort.state.bb_Game;let count=0;
      for(const key of ['bbdeathlist','bbbodyparts','bbexplosions']){const it=g[key].bbObjectEnumerator();while(it.bbHasNext())if(it.bbNextObject().bbSandboxDeath)count++;}
      return count;
    });
    validateBaseStress(record);
    evidence.syntheticFixtures.push({name:'Both base high-damage decoration pressure',synthetic:true,notNaturalStageProgress:true,
      method:'The recovered real bbInfect/bbSmack APIs apply forty 1,000,000-damage hits to each INT_MAX-health base. The old bounded visual RNG sequence is replayed without allocations and restored before actual hits. One public-spawned zombie and human are then killed by the real both-army clear button. InvokeOnRender refreshes the real paused Canvas once before capture; no simulation tick or fake drawing is used for this refresh.',damagePerHit:1000000,hitsPerBase:40});
    // A pause intentionally leaves the previous canvas frame on screen. Render
    // once through the original app drawing path so native capture shows the
    // newly created effects without advancing animation or combat timers.
    await page.evaluate(()=>app.InvokeOnRender());
    await screenshot(artifact('19-base-high-damage-budget-and-deaths.png'));
    await closeEditor();
    const before=await page.evaluate(()=>({ticks:ZTPGamePort.state.bb_Game.bbgameticks,frames:ZTPRuntime.getStatus().diagnostics.frames,draws:ZTPRuntime.getStatus().diagnostics.drawCalls}));
    for(let n=0;n<12;n++){await step(10);await page.waitForTimeout(0);}
    const after120=await page.evaluate(()=>({ticks:ZTPGamePort.state.bb_Game.bbgameticks,frames:ZTPRuntime.getStatus().diagnostics.frames,draws:ZTPRuntime.getStatus().diagnostics.drawCalls,rate:ZTPRuntime.getStatus().updateRate}));
    assert.equal(after120.rate,60);assert.equal(after120.frames-before.frames,120);
    assert.ok(Math.abs((after120.ticks-before.ticks)-240)<=2,'Full native gameplay, not a shortened particle-only loop, must advance');
    assert.ok(after120.draws>before.draws,'Native drawing still executes');
    // Base rubble can bounce for more than 240 ticks. Continue complete frames
    // to 600 ticks rather than directly deleting effects or changing velocities.
    for(let n=0;n<18;n++){await step(10);await page.waitForTimeout(0);}
    const recycled=await page.evaluate(()=>{
      const g=ZTPGamePort.state.bb_Game,entries=list=>{const a=[],it=list.bbObjectEnumerator();while(it.bbHasNext())a.push(it.bbNextObject());return a;};
      const before=entries(g.bbbodyparts),deaths=entries(g.bbdeathlist);
      const health=[g.bbpeoplebase.bbhealth,g.bbzombiebase.bbhealth],beforeSeed=ZTPGamePort.state.bb_std_random_Seed;
      g.bbpeoplebase.bbInfect(1);g.bbzombiebase.bbSmack(1,1);
      return {baseParticlesBefore:before.filter(part=>part.bbsheet===g.bbbitsheet).length,
        deathVisualsBefore:[...before,...deaths].filter(part=>part.bbSandboxDeath).length,
        baseParticlesAfter:entries(g.bbbodyparts).filter(part=>part.bbsheet===g.bbbitsheet).length,
        healthBefore:health,healthAfter:[g.bbpeoplebase.bbhealth,g.bbzombiebase.bbhealth],
        beforeSeed,afterSeed:ZTPGamePort.state.bb_std_random_Seed,effectLists:EffectLists.diagnostics(window),
        frames:ZTPRuntime.getStatus().diagnostics.frames,ticks:g.bbgameticks};
    });
    assert.equal(recycled.baseParticlesBefore,0);assert.equal(recycled.deathVisualsBefore,0);
    assert.equal(recycled.baseParticlesAfter,2,'Both independent decorative allowances return after natural recycle');
    assert.deepEqual(recycled.healthAfter,recycled.healthBefore.map(value=>value-1));
    assert.equal(recycled.frames-before.frames,300);assert.ok(Math.abs((recycled.ticks-before.ticks)-600)<=2);
    assert.ok(recycled.effectLists.fastRemovals>record.effectListBefore.fastRemovals,'Natural effect expiry exercises the node-index fast removal path');
    await save('19a-base-effects-naturally-recycled');
    return {record,before,after120,recycled,scope:'Bounded real native updates/draws and counters. No wall-time or universal FPS threshold is asserted.'};
  });
}

module.exports=acceptance;
Object.assign(module.exports,{validateQueueOccupancy,validateBaseStress});
