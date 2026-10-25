"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const GameConfig=require('../src/game-config.js'),CustomRules=require('../src/custom-rules.js');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8'),plain=value=>JSON.parse(JSON.stringify(value));
// Intentional frozen v0.4.1 adapter: replay verifies this optimization against
// the previous algorithm rather than duplicating its target-selection math.
const baselineSource="/* Optional camp adapter for sandbox cross-species armies. The recovered game is untouched. */\n(function(root,factory){\n  'use strict';\n  const api=factory(typeof module==='object'&&module.exports?require('./custom-rules.js'):null);\n  if(typeof module==='object'&&module.exports)module.exports=api;else root.Factions=api;\n})(typeof globalThis==='object'?globalThis:this,function(importedRules){\n  'use strict';\n  const states=new WeakMap(), LIMIT=1000;\n  function fail(message){throw new Error('Factions: '+message);}\n  function portFor(target){if(!target||!target.ZTPGamePort)fail('missing game port');return target.ZTPGamePort;}\n  function stateFor(target){const state=states.get(target);if(!state)fail('install must run first');return state;}\n  function entries(list){const result=[];if(!list)return result;const it=list.bbObjectEnumerator();while(it.bbHasNext())result.push(it.bbNextObject());return result;}\n  function sideOf(game,body){\n    if(!game||!body)return null;\n    if(body===game.bbpeoplebase)return 'friendly';if(body===game.bbzombiebase)return 'enemy';\n    if(entries(game.bbzombies).includes(body))return 'enemy';\n    if(entries(game.bbpeople).includes(body)||entries(game.bbpombies).includes(body))return 'friendly';return null;\n  }\n  function side(value){if(value!=='friendly'&&value!=='enemy')fail('side must be friendly or enemy');return value;}\n  function record(value,allowed,required){\n    if(!value||typeof value!=='object'||Array.isArray(value))fail('expected a plain JSON object');\n    const prototype=Object.getPrototypeOf(value);\n    if(prototype!==null){\n      const constructor=Object.getOwnPropertyDescriptor(prototype,'constructor');\n      if(Object.getPrototypeOf(prototype)!==null||!constructor||typeof constructor.value!=='function'||constructor.value.name!=='Object')fail('expected a plain JSON object');\n    }\n    for(const key of Reflect.ownKeys(value)){\n      const d=Object.getOwnPropertyDescriptor(value,key);\n      if(typeof key!=='string'||!allowed.includes(key)||!d.enumerable||!Object.prototype.hasOwnProperty.call(d,'value'))fail('invalid JSON field');\n    }\n    for(const key of required||[])if(!Object.prototype.hasOwnProperty.call(value,key))fail('missing '+key);\n  }\n  function descriptor(value){\n    record(value,['kind','type'],['kind','type']);\n    if(!['unit','zombie'].includes(value.kind)||!Number.isInteger(value.type)||value.type<0||value.type>4)fail('species must be unit/zombie type 0 through 4');\n    return {kind:value.kind,type:value.type};\n  }\n  function writable(object,key){\n    const d=Object.getOwnPropertyDescriptor(object,key);\n    if(!d||!Object.prototype.hasOwnProperty.call(d,'value')||!d.writable)fail('read-only runtime field '+key);\n  }\n  function preflightList(group){\n    const head=group&&group.bb_head,seen=new Set();let node=head;\n    do{\n      if(!node||seen.has(node)||seen.size>100000)fail('damaged actor list');seen.add(node);\n      writable(node,'bb_succ');writable(node,'bb_pred');\n      if(!node.bb_succ||!node.bb_pred||node.bb_succ.bb_pred!==node||node.bb_pred.bb_succ!==node)fail('damaged actor list');\n      node=node.bb_succ;\n    }while(node!==head);\n  }\n  function list(target,options={}){\n    const game=portFor(target).state.bb_Game;if(!game)return [];\n    record(options,['side','kind','type','includeBases']);\n    if(options.side!==undefined)side(options.side);\n    if(options.kind!==undefined&&!['unit','zombie'].includes(options.kind))fail('invalid species kind');\n    if(options.type!==undefined&&(!Number.isInteger(options.type)||options.type<0||options.type>4))fail('invalid species type');\n    if(options.includeBases!==undefined&&typeof options.includeBases!=='boolean')fail('invalid includeBases');\n    const result=[],seen=new Set();\n    for(const [camp,group]of [['friendly',game.bbpeople],['friendly',game.bbpombies],['enemy',game.bbzombies]]){\n      if(options.side&&options.side!==camp)continue;\n      for(const body of entries(group)){\n        if(seen.has(body)||!body||!body.bbunit)continue;seen.add(body);\n        const type=body.bbunit.bbtype,human=type>=0&&type<=5,id=human?type:type-32;\n        if(!options.includeBases&&(id===5||body===game.bbpeoplebase||body===game.bbzombiebase))continue;\n        if(options.kind&&options.kind!==(human?'unit':'zombie'))continue;\n        if(options.type!==undefined&&options.type!==id)continue;\n        result.push(body);\n      }\n    }return result;\n  }\n  function wrap(owner,key,factory){const original=owner[key];if(typeof original!=='function')fail('missing '+key);owner[key]=factory(original);}\n  function rules(target){const api=target.CustomRules||importedRules;return api&&api.snapshot?api.snapshot(target):null;}\n  function enabled(target,key){const r=rules(target);return !r||r.abilities[key]!==false;}\n  function alive(body){return body&&body.bbunit&&body.bbhealth>0&&body.bbmode!==14&&body.bbmode!==15;}\n  function center(body,camp){\n    const human=body.bbunit.bbtype<32;\n    return body.bbxpos+(human?body.bbunit.bbhitoffset:(camp==='friendly'?-body.bbunit.bbhitoffset:body.bbunit.bbhitoffset));\n  }\n  function opponents(target,camp){return list(target,{side:camp==='friendly'?'enemy':'friendly',includeBases:true}).filter(alive);}\n  function damage(body,amount,style=1){\n    amount=Math.max(0,Math.min(2147483647,Math.trunc(amount)));\n    if(!alive(body)||!amount)return amount;\n    return typeof body.bbInfect==='function'&&body.bbunit.bbtype<32?body.bbInfect(amount):body.bbSmack(amount,style);\n  }\n  function convert(target,body,camp){\n    const state=stateFor(target),port=portFor(target),game=port.state.bb_Game;\n    const old=sideOf(game,body);\n    if(!old||old===camp||!alive(body)||body===game.bbpeoplebase||body===game.bbzombiebase)return false;\n    for(const group of [game.bbpeople,game.bbpombies,game.bbzombies])preflightList(group);\n    const writes=['bbdirection','bbmode','bbhit'];\n    if(body.bbunit.bbtype<32)writes.push('bbwaszombie','bbunit','bbscale','bbsmackstyle','bbUpdate','bbDraw','bbTurn');\n    for(const key of writes){\n      if(Object.prototype.hasOwnProperty.call(body,key))writable(body,key);else if(!Object.isExtensible(body))fail('read-only actor');\n    }\n    if(body.bbunit.bbtype<32&&!state.people.has(body)&&!Object.isExtensible(body))fail('read-only actor');\n    if(old==='friendly'&&body.bbunit.bbtype<32&&!body.bbwaszombie&&!body.bbisangry)writable(game.bbztp,'bbforce');\n    game.bbpeople.bbRemove(body);game.bbpombies.bbRemove(body);game.bbzombies.bbRemove(body);\n    if(body.bbunit.bbtype<32){\n      if(old==='friendly'&&!body.bbwaszombie&&!body.bbisangry)game.bbztp.bbforce=Math.max(0,game.bbztp.bbforce-body.bbunit.bbpeople);\n      adaptHuman(target,body,camp);body.bbwaszombie=1;\n    }\n    body.bbdirection=camp==='enemy'?1:-1;body.bbmode=0;body.bbhit=0;\n    (camp==='enemy'?game.bbzombies:game.bbpombies).bbAddLast(body);\n    const meta=state.people.get(body);if(meta)meta.side=camp;\n    state.cross=true;return true;\n  }\n  function humanUpdate(target,body){\n    const state=stateFor(target),port=portFor(target),game=port.state.bb_Game,meta=state.people.get(body),camp=meta.side,dir=camp==='friendly'?1:-1;\n    const targets=opponents(target,camp),x=center(body,camp),radius=body.bbunit.bbhitradius;\n    const reachable=targets.map(other=>{\n      const otherCamp=camp==='friendly'?'enemy':'friendly',c=center(other,otherCamp),forward=dir*(c-x);\n      return {body:other,gap:forward-radius-other.bbunit.bbhitradius,forward};\n    }).filter(v=>v.forward>=-radius-v.body.bbunit.bbhitradius).sort((a,b)=>Math.max(0,a.gap)-Math.max(0,b.gap));\n    const nearest=reachable[0],type=body.bbunit.bbtype;\n    if(body.bbmode===0&&nearest){\n      const gap=Math.max(0,nearest.gap);\n      if(type===0&&gap<16){body.bbmode=1;body.bbswing=0;}\n      else if(type===1&&gap<240){body.bbmode=3;body.bbshoot=0;}\n      else if(type===2&&gap<140){body.bbmode=5;body.bbshoot=0;}\n      else if(type===3&&gap<400){body.bbmode=4;body.bbthrow=0;}\n      else if(type===4&&gap<320){body.bbmode=6;body.bbspell=0;}\n    }\n    const mode=body.bbmode;\n    if([1,3,4,5,6].includes(mode)&&port.bb_Person.prototype.bbHitKey.call(body)){\n      const pool=Math.max(0,Math.trunc(body.bbunit.bbdamage||0));\n      if(mode===1){const victim=reachable.find(v=>v.gap<40);if(victim)damage(victim.body,pool,1);}\n      else if(mode===3){if(nearest&&nearest.gap<300)damage(nearest.body,pool,3);}\n      else if(mode===5){let left=pool;for(const hit of reachable){if(hit.gap>=180||left<=0)break;left=damage(hit.body,left,2);}}\n      else if(mode===4){\n        const previous=state.shotSide;state.shotSide=camp;\n        try{game.bbAddBottle(body.bblayer,body.bbxpos+12*dir,body.bbypos-64,4*dir,-4,0);}finally{state.shotSide=previous;}\n      }\n      else if(mode===6&&enabled(target,'preacherConversion')){\n        let budget=1000;\n        const eligible=reachable.filter(hit=>hit.gap<320&&hit.body!==game.bbpeoplebase&&hit.body!==game.bbzombiebase)\n          .sort((a,b)=>b.body.bbunit.bbtype-a.body.bbunit.bbtype);\n        for(const hit of eligible){if(budget<=0)break;if(convert(target,hit.body,camp))budget-=hit.body.bbunit.bbhealth;}\n      }\n    }\n    if(!alive(body))return 0;\n    const previous=state.shotSide,mirror=state.mirrorHuman;\n    state.shotSide=camp;state.mirrorHuman=camp==='enemy';\n    if(camp==='enemy')body.bbxpos=1600-body.bbxpos;\n    try{return port.bb_Person.prototype.bbUpdate.call(body);}\n    finally{if(camp==='enemy')body.bbxpos=1600-body.bbxpos;state.shotSide=previous;state.mirrorHuman=mirror;}\n  }\n  function adaptHuman(target,body,camp){\n    const state=stateFor(target),port=portFor(target);\n    let meta=state.people.get(body);\n    if(!meta){\n      meta={side:camp,source:body.bbunit};state.people.set(body,meta);\n      Object.setPrototypeOf(body,port.bb_Zombie.prototype);\n      const view=Object.create(meta.source);\n      Object.defineProperty(view,'bbhitoffset',{get:()=>meta.side==='enemy'?-meta.source.bbhitoffset:meta.source.bbhitoffset,enumerable:true});\n      body.bbunit=view;body.bbscale=1;body.bbsmackstyle=0;\n      body.bbUpdate=function(){return humanUpdate(target,this);};\n      body.bbDraw=function(dx,dy){\n        if(this.bbskin)this.bbskin.bbsheet[meta.side==='enemy'?'bbflipblit':'bbblit'](this.bbskin.bbframe,this.bbxpos+(dx|0),this.bbypos+(dy|0)-this.bblayer*4,1);\n        return 0;\n      };\n      body.bbTurn=function(){meta.side='friendly';this.bbdirection=-1;this.bbmode=0;this.bbhit=0;return 0;};\n    }\n    meta.side=camp;body.bbdirection=camp==='enemy'?1:-1;body.bbwaszombie=1;return body;\n  }\n  function rehomeZombie(target,body,camp){\n    if(!body||!body.bbunit)return body;\n    const game=portFor(target).state.bb_Game;\n    if(camp==='friendly'){\n      game.bbzombies.bbRemove(body);body.bbTurn();game.bbpombies.bbAddLast(body);stateFor(target).cross=true;\n    }return body;\n  }\n  function validateSpawn(target,camp,selection,count=1){\n    side(camp);const d=descriptor(selection);if(!Number.isInteger(count)||count<1||count>2147483647)fail('count must be an integer between 1 and 2147483647');\n    const state=stateFor(target),port=portFor(target),game=port.state.bb_Game;\n    if(!game||![2,6].includes(game.bbmainState))fail('an active battle is required');\n    for(const group of [game.bbpeople,game.bbpombies,game.bbzombies])preflightList(group);\n    return {kind:d.kind,type:d.type,capacity:Math.max(0,LIMIT-list(target,{includeBases:true}).length)};\n  }\n  function spawn(target,camp,selection,count=1){\n    const checked=validateSpawn(target,camp,selection,count),d=checked;\n    const state=stateFor(target),port=portFor(target),game=port.state.bb_Game;\n    const slots=checked.capacity,result=[];\n    for(let i=0;i<Math.min(count,slots);i++){\n      let body;\n      if(d.kind==='unit'){\n        body=game.bbAddPerson(game.bbunits[d.type]);if(!body)break;body.bbwaszombie=1;\n        if(camp==='enemy'){game.bbpeople.bbRemove(body);adaptHuman(target,body,camp);game.bbzombies.bbAddLast(body);state.cross=true;}\n      }else{body=game.bbAddZombie(game.bbzunits[d.type]);if(!body)break;rehomeZombie(target,body,camp);}\n      body.bbxpos=camp==='friendly'?0:1600;body.bbypos=0;result.push(body);\n    }return result;\n  }\n  function install(target){\n    const port=portFor(target);if(states.has(target))return target;\n    if(port.state.bb_Game)fail('install must run before bb_Main');\n    const state={people:new WeakMap(),projectiles:new WeakMap(),cross:false,tickDepth:0,impact:null,pendingImpact:null,exploding:null,shotSide:null,mirrorHuman:false};states.set(target,state);\n    wrap(port.bb_Zomba.prototype,'bbResetGame',original=>function(){state.cross=false;state.impact=state.pendingImpact=state.exploding=null;return original.apply(this,arguments);});\n    wrap(port.bb_Zomba.prototype,'bbGameTick',original=>function(){state.tickDepth++;try{return original.apply(this,arguments);}finally{state.tickDepth--;state.impact=state.pendingImpact=state.exploding=null;}});\n    wrap(port.bb_Zombie.prototype,'bbUpdate',original=>function(){\n      if(state.cross&&this.bbunit&&this.bbunit.bbtype===36&&this.bbdirection<0&&this.bbmode===11&&this.bbHitKey()){\n        const previous=state.shotSide;state.shotSide='friendly';try{port.state.bb_Game.bbAddFling(this.bblayer,this.bbxpos,this.bbypos);}finally{state.shotSide=previous;}\n      }return original.apply(this,arguments);\n    });\n    wrap(port.bb_Zombie.prototype,'bbDraw',original=>function(dx,dy){\n      if(this.bbunit&&this.bbunit.bbtype===36&&this.bbdirection<0){\n        const x=(dx|0)+this.bbxpos;\n        port.bb_mojo_graphics_PushMatrix();port.bb_mojo_graphics_Translate(2*x,0);port.bb_mojo_graphics_Scale(-1,1);\n        try{return original.apply(this,arguments);}finally{port.bb_mojo_graphics_PopMatrix();}\n      }return original.apply(this,arguments);\n    });\n    wrap(port.bb_Zomba.prototype,'bbAddBottle',original=>function(layer,x,y,vx,vy,kind){\n      if(state.mirrorHuman){x=1600-x;vx=-vx;}\n      const result=original.call(this,layer,x,y,vx,vy,kind),body=this.bbbottles.bbLast();\n      if(state.shotSide&&body)state.projectiles.set(body,state.shotSide);return result;\n    });\n    wrap(port.bb_Bottle.prototype,'bbUpdate',original=>function(){const result=original.apply(this,arguments);state.exploding=state.tickDepth&&this.bbexplode?this:null;return result;});\n    wrap(port.bb_Zomba.prototype,'bbExplodeBottle',original=>function(layer,x,y,amount){\n      const projectile=state.exploding;state.exploding=null;\n      if(!projectile||state.projectiles.get(projectile)!=='enemy')return original.apply(this,arguments);\n      this.bbAddExplosion(layer,x,y,1);\n      for(const victim of opponents(target,'enemy'))if(Math.abs(victim.bbxpos-x)<100){amount=damage(victim,amount,3);if(amount<=0)break;}return 0;\n    });\n    wrap(port.bb_Zomba.prototype,'bbAddFling',original=>function(){const result=original.apply(this,arguments),body=this.bbflinglist.bbLast();if(body&&state.shotSide)state.projectiles.set(body,state.shotSide);return result;});\n    wrap(port.bb_Fling.prototype,'bbUpdate',original=>function(){\n      const friendly=state.projectiles.get(this)==='friendly';if(friendly)this.bbxpos=1600-this.bbxpos;\n      let result;try{result=original.apply(this,arguments);}finally{if(friendly)this.bbxpos=1600-this.bbxpos;}\n      state.impact=state.tickDepth&&this.bbrecycle?this:null;return result;\n    });\n    wrap(port.bb_Fling.prototype,'bbDraw',original=>function(dx,dy){\n      if(state.projectiles.get(this)!=='friendly')return original.apply(this,arguments);\n      this.bbskin.bbsheet.bbflipblit(this.bbskin.bbframe,this.bbxpos+(dx|0),this.bbypos+(dy|0)-this.bblayer*4,1);return 0;\n    });\n    wrap(port.bb_Zomba.prototype,'bbBombPeople',original=>function(layer,x,y,amount){\n      const projectile=state.impact;state.impact=null;\n      if(!projectile||!state.cross)return original.apply(this,arguments);\n      const camp=state.projectiles.get(projectile)||'enemy';state.pendingImpact=camp;\n      this.bbAddExplosion(layer,x,y,1);\n      for(const victim of opponents(target,camp))if(Math.abs(victim.bbxpos-x)<60){amount=damage(victim,amount,1);if(amount<=0)break;}return 0;\n    });\n    wrap(port.bb_Zomba.prototype,'bbAddZombie',original=>function(){\n      const camp=state.pendingImpact;state.pendingImpact=null;\n      const body=original.apply(this,arguments);if(camp==='friendly')rehomeZombie(target,body,camp);return body;\n    });\n    wrap(port.bb_Zomba.prototype,'bbBlowZombie',original=>function(body){\n      if(!state.people.has(body))return original.apply(this,arguments);\n      original.apply(this,arguments); // Retain configuration adapter XP saturation.\n      const type=body.bbunit.bbtype,sheet=[this.bbshoveldeathsheet,this.bbshotgundeathsheet,null,null,this.bbpreacherdeathsheet][type];\n      if(sheet)this.bbAddDeath(sheet,body.bblayer,body.bbxpos,body.bbypos);else this.bbAddExplosion(body.bblayer,body.bbxpos,body.bbypos,type===2?3:2);return 0;\n    });\n    return target;\n  }\n  return Object.freeze({install,spawn,validateSpawn,list,getSide:(target,body)=>sideOf(portFor(target).state.bb_Game,body),convert,ENTITY_LIMIT:LIMIT});\n});\n";
const baselineConfig=()=>GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map(kind=>[kind,JSON.parse(read('config/'+kind+'.json'))])));
function entries(list){const result=[],it=list.bbObjectEnumerator();while(it.bbHasNext())result.push(it.bbNextObject());return result;}
function fixture(reference=false,edit){
  const configuration=baselineConfig();if(edit)edit(configuration);
  const rules=CustomRules.defaults();rules.automaticSpawning=false;rules.baseReinforcements=false;
  const manifest=JSON.parse(read('public/assets/manifest.json'));
  let drawingCount=0;
  const drawing=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){const item=manifest.images[name];assert.ok(item,name);return {Width:()=>item.width,Height:()=>item.height};}}, {get:(value,key)=>value[key]||(()=>{drawingCount++;return 0;})});
  const input=new Proxy({}, {get:()=>()=>0}),audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
  class App{GraphicsDevice(){return drawing;}InputDevice(){return input;}AudioDevice(){return audio;}SetUpdateRate(){return 0;}MilliSecs(){return 0;}}
  const target=vm.createContext({console,gxtkApp:App,gxtkSurfaceListener:class{},ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,PlayMovie:()=>0,MovieFinished:()=>1,EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0});
  vm.runInContext(read('src/generated-game.js'),target);GameConfig.install(target,configuration);CustomRules.install(target,rules);target.CustomRules=CustomRules;
  vm.runInContext(reference?baselineSource:read('src/factions.js'),target,{filename:reference?'factions-v041-reference.js':'factions-optimized.js'});
  const factions=target.Factions;factions.install(target);target.bb_Init();target.bb_Main();
  const port=target.ZTPGamePort,device=port.state.bb_mojo_app_device;device.OnCreate();device.OnUpdate();const game=port.state.bb_Game;game.bbPlayGame(1);
  return {target,port,game,configuration,factions,get drawingCount(){return drawingCount;},ticks(n=1){while(n-->0)game.bbGameTick(0);},spawn(camp,kind,type,count=1){return CustomRules.withManualSpawn(target,()=>factions.spawn(target,camp,{kind,type},count));}};
}
function stationary(c){for(const kind of ['units','zombies'])for(const actor of c[kind].slice(0,5)){actor.moveSpeed=0;actor.health=1000000;if('damage'in actor)actor.damage=0;}}
function place(body,x){body.bbxpos=x;body.bbypos=0;body.bblayer=0;return body;}
function snapshot(h){const g=h.game;return plain({seed:h.port.state.bb_std_random_Seed,time:[g.bbgameticks,g.bbgametime,g.bbupdates],main:g.bbmainState,
  economy:[g.bbztp.bbcash,g.bbztp.bbxp,g.bbztp.bbforce,g.bbzombieskilled,g.bbpeoplekilled],draws:h.drawingCount,witnesses:(h.witnesses||[]).map(body=>[body.bbhealth,body.bbmode,h.factions.getSide(h.target,body)]),
  actors:['bbpeople','bbpombies','bbzombies'].map(key=>entries(g[key]).map(body=>[body.bbunit.bbtype,body.bbxpos,body.bbypos,body.bbhealth,body.bbmode,body.bbhit,body.bbdirection,body.bbskin?.bbframe,body.bbswing,body.bbshoot,body.bbspell,body.bbwaszombie,body.bbisangry])),
  effects:['bbbottles','bbflinglist','bbpowerups','bbexplosions','bbdeathlist','bbbodyparts'].map(key=>entries(g[key]).map(body=>[body.bbtype,body.bbxpos,body.bbypos,body.bbmode,body.bbdamage,body.bbvelx,body.bbvely,body.bbskin?.bbframe]))});}
function twins(edit,setup){return [fixture(true,edit),fixture(false,edit)].map(h=>{setup(h);return h;});}
function checkTicks(pair,count,render=false){for(let tick=0;tick<count;tick++){for(const h of pair){h.ticks();if(render)h.game.bbRenderHorde();}assert.deepEqual(snapshot(pair[1]),snapshot(pair[0]),'original target/update semantics at tick '+tick);}}

test('cross-camp idle movement, native hits, projectiles and conversions replay v0.4.1 exactly',()=>{
  const pair=twins(c=>{for(const kind of ['units','zombies'])for(const actor of c[kind].slice(0,5))actor.health=100000;},h=>{
    for(const side of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++){
      const actor=place(h.spawn(side,kind,type)[0],side==='friendly'?520+type*7:950-type*7);
      actor.bblayer=type%3;
    }
    h.game.bbztp.bbxp=20000;
  });
  checkTicks(pair,650,true);
});

test('overlap ties, clamped-gap pool damage and priest priority preserve stable list order',()=>{
  for(const type of [0,1,2,4]){
    const pair=twins(c=>{stationary(c);if('damage'in c.units[type])c.units[type].damage=60;},h=>{
      const attacker=place(h.spawn('enemy','unit',type)[0],800);
      for(const [kind,id,x]of [['unit',0,800],['zombie',1,792],['unit',1,790],['zombie',3,803],['zombie',0,780]]){
        const body=place(h.spawn('friendly',kind,id)[0],x);body.bbhealth=type===2?25:body.bbhealth;
      }
      attacker.bbmode=({0:1,1:3,2:5,4:6})[type];attacker.bbhit=1;
    });
    checkTicks(pair,4,true);
  }
});

test('busy non-hit adapted humans avoid opponent enumeration without skipping native animation',()=>{
  const pair=twins(stationary,h=>{
    for(const actor of h.spawn('enemy','unit',0,48)){place(actor,1100);actor.bbmode=1;actor.bbswing=1;actor.bbhit=0;}
    for(const actor of h.spawn('friendly','unit',0,48))place(actor,300);
    h.enumerations=0;
    for(const group of [h.game.bbpeople,h.game.bbpombies,h.game.bbzombies]){const original=group.bbObjectEnumerator;group.bbObjectEnumerator=function(){h.enumerations++;return original.apply(this,arguments);};}
  });
  for(const h of pair)h.ticks();
  const counts=pair.map(h=>h.enumerations);assert.ok(counts[1]+90<=counts[0],JSON.stringify(counts));
  assert.deepEqual(snapshot(pair[1]),snapshot(pair[0]));
  assert.ok(entries(pair[1].game.bbzombies).some(actor=>actor.bbswing===2));
});

test('tick membership cache reuses raw references but never freezes health, mode or position',()=>{
  for(const mutate of [
    (h,old,next)=>{old.bbhealth=0;old.bbmode=14;},
    (h,old,next)=>{old.bbxpos=100;next.bbxpos=780;},
    (h,old,next)=>{old.bbmode=15;},
    (h,old,next)=>{h.factions.convert(h.target,old,'enemy');}
  ]){
    const pair=twins(c=>{stationary(c);c.units[0].damage=17;},h=>{
      const old=place(h.spawn('friendly','unit',0)[0],790),next=place(h.spawn('friendly','unit',0)[0],780);h.witnesses=[old,next];
      const [first,second]=h.spawn('enemy','unit',0,2);place(first,800);place(second,800);
      first.bbmode=0;second.bbmode=1;first.bbhit=0;second.bbhit=1;
      const original=first.bbUpdate;first.bbUpdate=function(){const answer=original.call(this);mutate(h,old,next);return answer;};
    });
    checkTicks(pair,2);
  }
});

test('every actor-list mutator invalidates before the next attacker in the same tick',()=>{
  const methods=['bbAddLast','bbAddFirst','bbRemove','bbRemoveFirst','bbRemoveLast','bbClear'];
  for(const method of methods){
    const pair=twins(c=>{stationary(c);c.units[0].damage=17;},h=>{
      const old=place(h.spawn('friendly','unit',0)[0],method==='bbAddLast'?600:790),next=place(h.spawn('friendly','unit',0)[0],method==='bbAddLast'?500:780);
      if(method==='bbRemoveFirst')h.game.bbpeople.bbRemove(h.game.bbpeoplebase);
      const spare=place(h.game.bbunits[0].bbInstance(0,h.port.bb_Cell.bbcells(h.game.bbshovelman)),780);h.witnesses=[old,next,spare];
      const [first,second]=h.spawn('enemy','unit',0,2);place(first,800);place(second,800);
      first.bbmode=0;second.bbmode=1;first.bbhit=0;second.bbhit=1;
      const original=first.bbUpdate;first.bbUpdate=function(){const answer=original.call(this),list=h.game.bbpeople;
        if(method==='bbAddLast'||method==='bbAddFirst')list[method](spare);
        else if(method==='bbRemove')list.bbRemove(old);
        else if(method==='bbRemoveFirst'){list.bbRemoveFirst();}
        else if(method==='bbRemoveLast')list.bbRemoveLast();
        else list.bbClear();
        return answer;
      };
    });
    checkTicks(pair,1);
  }
});

test('replacing actor lists and heads during a tick does not reuse obsolete membership',()=>{
  for(const replace of [false,true]){
    const pair=twins(c=>{stationary(c);c.units[0].damage=17;},h=>{
      h.witnesses=[place(h.spawn('friendly','unit',0)[0],780)];
      const [first,second]=h.spawn('enemy','unit',0,2);place(first,800);place(second,800);
      first.bbmode=0;second.bbmode=1;first.bbhit=0;second.bbhit=1;
      const original=first.bbUpdate;first.bbUpdate=function(){const answer=original.call(this);
        if(replace)h.game.bbpeople=new h.port.bb_std_list_List().bbList_new();
        else h.game.bbpeople.bb_head=new h.port.bb_std_list_Node().bbNode_new();
        return answer;
      };
    });
    checkTicks(pair,1);
  }
});

test('a 400-unit cross-camp battlefield retains exact state and random sequence',()=>{
  const pair=twins(c=>{stationary(c);},h=>{
    for(const camp of ['friendly','enemy'])for(let type=0;type<5;type++)for(const actor of h.spawn(camp,'unit',type,40))place(actor,camp==='friendly'?400:1200);
  });
  checkTicks(pair,5,true);
});


test('spawning during the tick and recovering after a thrown update never retain stale targets',()=>{
  const pair=twins(c=>{stationary(c);c.units[0].damage=17;},h=>{
    const old=place(h.spawn('friendly','unit',0)[0],500);
    const [first,second]=h.spawn('enemy','unit',0,2);place(first,800);place(second,800);
    first.bbmode=0;second.bbmode=1;first.bbhit=0;second.bbhit=1;
    const original=first.bbUpdate;let thrown=false;
    first.bbUpdate=function(){const answer=original.call(this);if(!thrown){thrown=true;throw Error('owned update probe');}return answer;};
    h.witnesses=[old];h.first=first;h.originalUpdate=original;
  });
  for(const h of pair){assert.throws(()=>h.ticks(),/owned update probe/);h.first.bbUpdate=function(){const answer=h.originalUpdate.call(this);h.witnesses.push(place(h.spawn('friendly','unit',0)[0],780));return answer;};}
  assert.deepEqual(snapshot(pair[1]),snapshot(pair[0]));
  checkTicks(pair,2);
});
