/* Bounded, game-clock-driven sandbox batches. No work is added to normal battles. */
(function(root,factory){
  'use strict';
  const common=typeof module==='object'&&module.exports;
  const api=factory(common?require('./factions.js'):null,common?require('./custom-rules.js'):null);
  if(common)module.exports=api;else root.SpawnQueue=api;
})(typeof globalThis==='object'?globalThis:this,function(importedFactions,importedRules){
  'use strict';
  const states=new WeakMap(),TICKS_PER_SECOND=120,DEFAULT_RATE=120,MAX_RATE=1000000;
  const MAX_COUNT=2147483647,MAX_JOBS=10000,MAX_PER_TICK=32,HISTORY_LIMIT=32,ENTITY_LIMIT=1000;
  function fail(message){throw new Error('SpawnQueue: '+message);}
  function portFor(target){if(!target||!target.ZTPGamePort)fail('missing game port');return target.ZTPGamePort;}
  function stateFor(target){const state=states.get(target);if(!state)fail('install must run first');return state;}
  function record(value,allowed,required){
    if(!value||typeof value!=='object'||Array.isArray(value))fail('expected a plain JSON object');
    const prototype=Object.getPrototypeOf(value);
    if(prototype!==null){
      const constructor=Object.getOwnPropertyDescriptor(prototype,'constructor');
      if(Object.getPrototypeOf(prototype)!==null||!constructor||typeof constructor.value!=='function'||constructor.value.name!=='Object')fail('expected a plain JSON object');
    }
    for(const key of Reflect.ownKeys(value)){
      const d=Object.getOwnPropertyDescriptor(value,key);
      if(typeof key!=='string'||!allowed.includes(key)||!d.enumerable||!Object.prototype.hasOwnProperty.call(d,'value'))fail('invalid JSON field');
    }
    for(const key of required)if(!Object.prototype.hasOwnProperty.call(value,key))fail('missing '+key);
  }
  function selection(input){
    record(input,['kind','type'],['kind','type']);
    if(!['unit','zombie'].includes(input.kind)||!Number.isInteger(input.type)||input.type<0||input.type>4)fail('species must be unit/zombie type 0 through 4');
    return {kind:input.kind,type:input.type};
  }
  function rateOf(value){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>MAX_RATE)fail('rate must be between 0 and '+MAX_RATE);return value;}
  function dependencies(target){
    const factions=target.Factions||importedFactions,rules=target.CustomRules||importedRules;
    if(!factions||typeof factions.spawn!=='function')fail('Factions must be loaded first');
    return {factions,rules};
  }
  function entityStatus(game){
    let entityCount=0,baseCount=0;
    if(!game)return {entityCount,baseCount,entityLimit:ENTITY_LIMIT,capacity:ENTITY_LIMIT};
    for(const list of [game.bbpeople,game.bbpombies,game.bbzombies]){
      if(!list||typeof list.bbObjectEnumerator!=='function')fail('missing actor list');
      const iterator=list.bbObjectEnumerator();
      while(iterator.bbHasNext()){
        const body=iterator.bbNextObject();entityCount++;
        if(body===game.bbpeoplebase||body===game.bbzombiebase)baseCount++;
      }
    }
    return {entityCount,baseCount,entityLimit:ENTITY_LIMIT,capacity:Math.max(0,ENTITY_LIMIT-entityCount)};
  }
  function capacity(game){
    if(!game)return ENTITY_LIMIT;
    let total=0;
    for(const list of [game.bbpeople,game.bbpombies,game.bbzombies]){
      if(!list||typeof list.bbObjectEnumerator!=='function')fail('missing actor list');
      const iterator=list.bbObjectEnumerator();
      while(iterator.bbHasNext()){iterator.bbNextObject();if(++total>=ENTITY_LIMIT)return 0;}
    }
    return ENTITY_LIMIT-total;
  }
  function blocked(target,state,game,available){
    if(!game)return 'no-active-battle';
    // Native GameOver removes both bases and switches to its score state.
    // Pending jobs remain visible there, but must not look like a fresh menu.
    if(game.bbmainState===3||game.bbmainState===4)return 'battle-ended';
    if(![2,6].includes(game.bbmainState))return 'no-active-battle';
    if(game.bbpeoplebase?.bbhealth<=0||game.bbzombiebase?.bbhealth<=0)return 'battle-ended';
    if(game.bbmainState!==2)return 'game-paused';
    if(target.ZTPRuntime&&typeof target.ZTPRuntime.getStatus==='function'&&target.ZTPRuntime.getStatus().running===false)return 'runtime-paused';
    if(state.jobs.length&&state.jobs.every(job=>job.rate===0))return 'rate-paused';
    if((available===undefined?capacity(game):available)===0)return 'entity-limit';
    return null;
  }
  function cloneJob(job){
    const {_credit,_due,...publicJob}=job;
    return {...publicJob,kind:job.descriptor.kind,type:job.descriptor.type,descriptor:{...job.descriptor},firstSpawn:job.firstSpawn?{...job.firstSpawn}:null};
  }
  function snapshot(target){
    const state=stateFor(target),game=portFor(target).state.bb_Game;
    // One membership scan supplies both the backpressure reason and the visible
    // occupancy. Bases occupy slots too; detached death effects do not.
    const entities=entityStatus(game),reason=blocked(target,state,game,entities.capacity),jobs=state.jobs.map(cloneJob),recent=state.recent.map(cloneJob);
    const totalPending=jobs.reduce((sum,job)=>sum+job.remaining,0);
    return {rate:state.rate,defaultRate:state.rate,jobs,recent,pendingJobs:jobs.length,pending:totalPending,totalPending,
      totalRequested:state.totalRequested,totalSpawned:state.totalSpawned,totalCancelled:state.totalCancelled,
      paused:reason==='game-paused'||reason==='runtime-paused'||reason==='rate-paused',blocked:reason,
      ...entities,maxPerTick:MAX_PER_TICK};
  }
  function addTotal(value,amount){return Math.min(Number.MAX_SAFE_INTEGER,value+amount);}
  function remember(state,job){state.recent.push(cloneJob(job));if(state.recent.length>HISTORY_LIMIT)state.recent.shift();}
  function enqueue(target,side,descriptor,count,options={}){
    const state=stateFor(target),d=selection(descriptor),game=portFor(target).state.bb_Game;
    record(options,['rate'],[]);
    const rate=Object.prototype.hasOwnProperty.call(options,'rate')?rateOf(options.rate):state.rate;
    if(side!=='friendly'&&side!=='enemy')fail('side must be friendly or enemy');
    if(!Number.isInteger(count)||count<1||count>MAX_COUNT)fail('count must be an integer between 1 and '+MAX_COUNT);
    if(!game||![2,6].includes(game.bbmainState))fail('an active battle is required');
    if(game.bbpeoplebase?.bbhealth<=0||game.bbzombiebase?.bbhealth<=0)fail('the battle has ended');
    if(state.jobs.length>=MAX_JOBS)fail('too many pending batches; cancel some batches first');
    if(state.sequence>=Number.MAX_SAFE_INTEGER)fail('batch identity space exhausted; reload the game');
    const job={id:'spawn-'+(++state.sequence),side,descriptor:d,count,rate,spawned:0,remaining:count,status:'queued',
      createdTick:game.bbgameticks||0,completedTick:null,cancelledCount:0,firstSpawn:null,_credit:0,_due:0};
    state.jobs.push(job);state.totalRequested=addTotal(state.totalRequested,count);
    return cloneJob(job);
  }
  function setRate(target,value){
    const state=stateFor(target),rate=rateOf(value);
    state.rate=rate;
    return state.rate;
  }
  function updateRate(target,id,value){
    const state=stateFor(target),rate=rateOf(value);
    if(typeof id!=='string'||!/^spawn-[1-9][0-9]*$/.test(id))fail('invalid batch id');
    const job=state.jobs.find(item=>item.id===id);if(!job)fail('pending batch not found');
    if(job.rate!==rate){job.rate=rate;job._credit=job._due=0;}
    return cloneJob(job);
  }
  function cancel(target,id){
    const state=stateFor(target),game=portFor(target).state.bb_Game;
    if(id!==undefined&&(typeof id!=='string'||!/^spawn-[1-9][0-9]*$/.test(id)))fail('invalid batch id');
    const cancelled=[];
    state.jobs=state.jobs.filter(job=>{
      if(id!==undefined&&job.id!==id)return true;
      job.cancelledCount=job.remaining;state.totalCancelled=addTotal(state.totalCancelled,job.remaining);
      job.remaining=0;job.status='cancelled';job.completedTick=game?.bbgameticks||0;
      remember(state,job);cancelled.push(cloneJob(job));return false;
    });
    // Cancellation never grants a backlog or removes already born actors.
    state.cursor=state.jobs.length?state.cursor%state.jobs.length:0;return cancelled;
  }
  function dispatch(target,state,game){
    if(!state.jobs.length||blocked(target,state,game)){for(const job of state.jobs)job._credit=job._due=0;return;}
    // Per-batch game-time streams are independent, not a slow FIFO head.
    // A small due allowance crosses scheduler-budget boundaries: otherwise 64
    // simultaneous 1-Hz jobs would each run at half speed despite spare time.
    // Due work is bounded to 32 per job and is discarded on live-capacity/pause
    // backpressure, so blocked hours never turn into a giant catch-up burst.
    const jobs=state.jobs,quota=jobs.map(job=>{
      if(job.rate===0){job._credit=job._due=0;return 0;}
      job._credit+=job.rate/TICKS_PER_SECOND;
      const whole=Math.floor(job._credit+1e-10);job._credit=Math.max(0,job._credit-whole);
      return Math.min(MAX_PER_TICK,job._due+whole,job.remaining);
    });
    let budget=Math.min(MAX_PER_TICK,capacity(game)),cursor=state.cursor%jobs.length,scanned=0;
    while(budget>0&&scanned<jobs.length){
      const index=cursor,job=jobs[index];cursor=(cursor+1)%jobs.length;
      if(quota[index]===0){scanned++;continue;}
      scanned=0;
      const run=()=>state.api.factions.spawn(target,job.side,job.descriptor,1);
      const manual=state.api.rules&&(state.api.rules.withManualSpawn||state.api.rules.beginManualSpawn);
      const actors=manual?manual(target,run):run();
      const count=Array.isArray(actors)?actors.length:0;
      if(!count){for(const item of jobs)item._credit=item._due=0;quota.fill(0);break;}
      if(count>1)fail('spawn adapter exceeded its requested batch size');
      if(!job.firstSpawn){const body=actors[0];job.firstSpawn={x:body.bbxpos,y:body.bbypos,side:job.side,...job.descriptor};}
      job.spawned+=count;job.remaining-=count;job.status='spawning';
      state.totalSpawned=addTotal(state.totalSpawned,count);budget-=count;quota[index]-=count;
      if(job.remaining===0){job.status='completed';job.completedTick=game.bbgameticks||0;remember(state,job);}
    }
    const full=capacity(game)===0;
    for(let index=0;index<jobs.length;index++){
      jobs[index]._due=full?0:quota[index];if(full)jobs[index]._credit=0;
    }
    let next=null;
    for(let offset=0;offset<jobs.length;offset++){const job=jobs[(cursor+offset)%jobs.length];if(job.remaining>0){next=job;break;}}
    state.jobs=jobs.filter(job=>job.remaining>0);state.cursor=next?state.jobs.indexOf(next):0;
  }
  function install(target){
    const port=portFor(target);if(states.has(target))return target;
    if(port.state.bb_Game)fail('install must run before bb_Main');
    const api=dependencies(target),owner=port.bb_Zomba&&port.bb_Zomba.prototype;
    if(!owner||typeof owner.bbGameTick!=='function'||typeof owner.bbResetGame!=='function')fail('missing game tick/reset');
    const state={api,rate:DEFAULT_RATE,jobs:[],recent:[],sequence:0,cursor:0,totalRequested:0,totalSpawned:0,totalCancelled:0};
    const originalTick=owner.bbGameTick,originalReset=owner.bbResetGame;
    owner.bbGameTick=function(){
      const mayRun=this.bbmainState===2;
      const result=originalTick.apply(this,arguments);
      if(mayRun&&port.state.bb_Game===this)dispatch(target,state,this);else for(const job of state.jobs)job._credit=job._due=0;
      return result;
    };
    owner.bbResetGame=function(){
      const result=originalReset.apply(this,arguments);
      state.jobs=[];state.recent=[];state.cursor=0;state.totalRequested=state.totalSpawned=state.totalCancelled=0;
      return result;
    };
    states.set(target,state);return target;
  }
  return Object.freeze({install,enqueue,snapshot,getState:snapshot,setDefaultRate:setRate,setRate,updateRate,cancel,DEFAULT_RATE,MAX_RATE,MAX_COUNT,MAX_JOBS,MAX_PER_TICK,TICKS_PER_SECOND,ENTITY_LIMIT,HISTORY_LIMIT});
});
