'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const GameConfig=require('../src/game-config.js'),CustomRules=require('../src/custom-rules.js');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8'),plain=value=>JSON.parse(JSON.stringify(value));
const source=read('src/factions.js');
// Frozen v0.4.2 nearest-selection implementation. The reference also disables
// candidate pruning below, so it scans full live membership for ranged hits.
// Both engines otherwise share the installed combat/configuration adapters.
const originalNearest=String.raw`  function nearestTarget(target,camp,x,radius) {
    const dir=camp==='friendly'?1:-1,otherCamp=camp==='friendly'?'enemy':'friendly';
    let nearest=null,score=Infinity;
    for (const body of opponentBodies(target,camp)) {
      if (!alive(body)) continue;
      const forward=dir*(center(body,otherCamp)-x),otherRadius=body.bbunit.bbhitradius;
      if (forward < -radius-otherRadius) continue;
      const gap=forward-radius-otherRadius,next=Math.max(0,gap);
      if (next<score) {nearest={body,gap};score=next;if (score===0) break;}
    }
    return nearest;
  }
`;
function instrument(reference) {
  let script=source;
  if(reference){
    assert.match(script,/  function nearestTarget\([\s\S]*?(?=  function rangedTargets)/);
    script=script.replace(/  function nearestTarget\([\s\S]*?(?=  function rangedTargets)/,originalNearest);
  }
  const declaration='    const bodies=opponentBodies(target,camp),frame=stateFor(target).actorFrame;';
  assert.ok(script.includes(declaration));
  if(reference)script=script.replace(declaration,declaration+'return bodies;');
  for(const declaration of ['for (const body of targetCandidates(target,camp,x,radius,range)) {','for (const body of opponentBodies(target,camp)) {'])
    script=script.replaceAll(declaration,declaration+'globalThis.__targetVisits++;');
  const narrowed='    return orders.map(order=>bodies[order]);';assert.ok(script.includes(narrowed));
  return script.replace(narrowed,'    globalThis.__narrowedQueries++;'+narrowed.trimStart());
}
function fixture(reference,edit) {
  const configuration=GameConfig.fromDocuments(Object.fromEntries(['units','zombies','buildings','powers','levels'].map(kind=>[kind,JSON.parse(read('config/'+kind+'.json'))])));
  if(edit)edit(configuration);
  const rules=CustomRules.defaults();rules.automaticSpawning=false;rules.baseReinforcements=false;
  const manifest=JSON.parse(read('public/assets/manifest.json'));let draws=0;
  const drawing=new Proxy({Width:()=>800,Height:()=>600,LoadSurface(name){const info=manifest.images[name];assert.ok(info,name);return {Width:()=>info.width,Height:()=>info.height};}}, {get:(value,key)=>value[key]||(()=>{draws++;return 0;})});
  const input=new Proxy({}, {get:()=>()=>0}),audio={LoadSample:name=>({name}),PlaySample:()=>0,StopChannel:()=>0};
  class App{GraphicsDevice(){return drawing;}InputDevice(){return input;}AudioDevice(){return audio;}SetUpdateRate(){return 0;}MilliSecs(){return 0;}}
  const target=vm.createContext({console,__targetVisits:0,__narrowedQueries:0,gxtkApp:App,gxtkSurfaceListener:class{},ReadInt:()=>0,WriteInt:()=>0,FlushInts:()=>0,PlayMovie:()=>0,MovieFinished:()=>1,EndMovie:()=>0,ShowMochi:()=>0,ShowMochiScores:()=>0,HideMochiScores:()=>0,MochiState:()=>0,Redirect:()=>0});
  vm.runInContext(read('src/generated-game.js'),target);GameConfig.install(target,configuration);CustomRules.install(target,rules);target.CustomRules=CustomRules;
  vm.runInContext(instrument(reference),target);const factions=target.Factions;factions.install(target);target.bb_Init();target.bb_Main();
  const port=target.ZTPGamePort,device=port.state.bb_mojo_app_device;device.OnCreate();device.OnUpdate();const game=port.state.bb_Game;game.bbPlayGame(1);
  return {target,port,game,configuration,factions,get draws(){return draws;},tick(){game.bbGameTick(0);},spawn(camp,kind,type,count=1){return CustomRules.withManualSpawn(target,()=>factions.spawn(target,camp,{kind,type},count));}};
}
function stationary(c){for(const kind of ['units','zombies'])for(const body of c[kind].slice(0,5)){body.moveSpeed=0;body.health=1000000;if('damage'in body)body.damage=0;}}
function entries(list){const items=[],iterator=list.bbObjectEnumerator();while(iterator.bbHasNext())items.push(iterator.bbNextObject());return items;}
function place(body,x){body.bbxpos=x;body.bbypos=0;body.bblayer=0;return body;}
function centerAt(body,camp,x){const human=body.bbunit.bbtype<32,offset=human?body.bbunit.bbhitoffset:(camp==='friendly'?-body.bbunit.bbhitoffset:body.bbunit.bbhitoffset);return place(body,x-offset);}
function padding(h,camp,count=68,x=100){for(const actor of h.spawn(camp,'unit',0,count)){place(actor,x);actor.bbmode=16;}}
function twins(edit,setup){return [true,false].map(reference=>{const h=fixture(reference,edit);setup(h);return h;});}
function snapshot(h){const g=h.game;return plain({seed:h.port.state.bb_std_random_Seed,time:[g.bbgameticks,g.bbgametime,g.bbupdates],state:g.bbmainState,draws:h.draws,
  economy:[g.bbztp.bbcash,g.bbztp.bbxp,g.bbztp.bbforce,g.bbzombieskilled,g.bbpeoplekilled],
  actors:['bbpeople','bbpombies','bbzombies'].map(key=>entries(g[key]).map(body=>[body.bbunit.bbtype,body.bbxpos,body.bbypos,body.bbhealth,body.bbmode,body.bbhit,body.bbdirection,body.bbskin?.bbframe,body.bbswing,body.bbshoot,body.bbspell,body.bbwaszombie,body.bbisangry])),
  effects:['bbbottles','bbflinglist','bbpowerups','bbexplosions','bbdeathlist','bbbodyparts'].map(key=>entries(g[key]).map(body=>[body.bbtype,body.bbxpos,body.bbypos,body.bbmode,body.bbdamage,body.bbvelx,body.bbvely,body.bbskin?.bbframe]))});}
function same(pair,ticks=1,render=false){for(let tick=0;tick<ticks;tick++){for(const h of pair){h.tick();if(render)h.game.bbRenderHorde();}assert.deepEqual(snapshot(pair[1]),snapshot(pair[0]),'full linear-reference state at tick '+tick);}}

test('one-dimensional buckets exclude distant targets without reducing updates or target semantics',context=>{
  const pair=twins(stationary,h=>{padding(h,'friendly',96,100);for(const actor of h.spawn('enemy','unit',0,48))place(actor,1300);});
  same(pair,3,true);
  const [linear,spatial]=pair.map(h=>h.target.__targetVisits);
  assert.ok(linear>10000,'reference really performs the full target scan');
  assert.ok(spatial*10<linear,JSON.stringify({linear,spatial}));
  assert.ok(pair[1].target.__narrowedQueries>=100,'real bucket path was exercised');
  context.diagnostic(JSON.stringify({linearCandidateVisits:linear,spatialCandidateVisits:spatial,narrowedQueries:pair[1].target.__narrowedQueries}));
});

test('650 full mixed-species ticks retain live combat, RNG and render counts with bucket queries active',()=>{
  const pair=twins(c=>{for(const kind of ['units','zombies'])for(const actor of c[kind].slice(0,5))actor.health=100000;},h=>{
    padding(h,'friendly',58,140);
    for(const camp of ['friendly','enemy'])for(const kind of ['unit','zombie'])for(let type=0;type<5;type++){
      const body=place(h.spawn(camp,kind,type)[0],camp==='friendly'?520+type*7:950-type*7);body.bblayer=type%3;
    }
    h.game.bbztp.bbxp=20000;
  });
  same(pair,220,true);
  for(const h of pair){const next=plain(h.configuration);next.units[0].hitRadius=35;next.units[1].hitOffset=-30;next.zombies[0].moveSpeed=0.75;GameConfig.updateLive(h.target,next);h.configuration=next;}
  same(pair,430,true);
  assert.ok(pair[1].target.__narrowedQueries>0,'mixed replay must not pass solely by linear fallback');
});

test('cross-bucket overlap ties, ranged pools and preacher priority retain original list order',()=>{
  for(const type of [0,1,2,4]){
    const pair=twins(c=>{stationary(c);if('damage'in c.units[type])c.units[type].damage=60;},h=>{
      padding(h,'friendly',70,-1000);
      const attacker=centerAt(h.spawn('enemy','unit',type)[0],'enemy',400);
      for(const [kind,id,x]of [['unit',0,385],['unit',1,383],['zombie',1,390],['zombie',3,410]]){
        const body=centerAt(h.spawn('friendly',kind,id)[0],'friendly',x);if(type===2)body.bbhealth=25;
      }
      attacker.bbmode=({0:1,1:3,2:5,4:6})[type];attacker.bbhit=1;
    });
    same(pair,4,true);assert.ok(pair[1].target.__narrowedQueries>0,'ordered candidate path exercised for '+type);
  }
});

test('unknown actor callbacks fall back for the whole tick and see later position, HP and membership changes',()=>{
  for(const mutation of ['position','health','mode','convert','spawn','replace','head']){
    const pair=twins(c=>{stationary(c);c.units[0].damage=17;},h=>{
      padding(h,'friendly',70,100);
      const old=place(h.spawn('friendly','unit',0)[0],790),next=place(h.spawn('friendly','unit',0)[0],100);
      const [first,second]=h.spawn('enemy','unit',0,2);place(first,800);place(second,800);second.bbmode=1;second.bbhit=1;
      const original=first.bbUpdate;first.bbUpdate=function(){const result=original.call(this);
        if(mutation==='position'){old.bbxpos=100;next.bbxpos=790;}
        else if(mutation==='health'){old.bbhealth=0;old.bbmode=14;}
        else if(mutation==='mode')old.bbmode=15;
        else if(mutation==='convert')h.factions.convert(h.target,old,'enemy');
        else if(mutation==='spawn')place(h.spawn('friendly','unit',0)[0],795);
        else if(mutation==='replace')h.game.bbpeople=new h.port.bb_std_list_List().bbList_new();
        else h.game.bbpeople.bb_head=new h.port.bb_std_list_Node().bbNode_new();
        return result;
      };
    });
    same(pair,1);assert.equal(pair[1].target.__narrowedQueries,0,'unknown callback disables geometry caching: '+mutation);
  }
});

test('unknown Infect and Smack callbacks cannot hide a newly moved target from the next attacker',()=>{
  for(const kind of ['unit','zombie']){
    const pair=twins(c=>{stationary(c);c.units[0].damage=17;},h=>{
      padding(h,'friendly',70,100);
      const old=place(h.spawn('friendly',kind,0)[0],790),next=place(h.spawn('friendly',kind,0)[0],100);
      const method=kind==='unit'?'bbInfect':'bbSmack',original=old[method];
      old[method]=function(){const result=original.apply(this,arguments);old.bbxpos=100;next.bbxpos=790;return result;};
      for(const actor of h.spawn('enemy','unit',0,2)){place(actor,800);actor.bbmode=1;actor.bbhit=1;}
      h.next=next;
    });
    same(pair,1,true);
    assert.equal(pair[1].next.bbhealth,999983,'the next attacker hits the relocated '+kind);
    assert.equal(pair[1].target.__narrowedQueries,0,'custom damage callback disables geometry caching');
  }
});

test('prototype HitKey and Update overrides are guarded even when adapted body methods are unchanged',()=>{
  for(const method of ['bbHitKey','bbUpdate']){
    const pair=twins(c=>{stationary(c);c.units[0].damage=17;},h=>{
      padding(h,'friendly',70,100);
      const old=place(h.spawn('friendly','unit',0)[0],790),next=place(h.spawn('friendly','unit',0)[0],100);
      const [first,second]=h.spawn('enemy','unit',0,2);
      for(const actor of [first,second]){place(actor,800);actor.bbmode=1;actor.bbhit=1;}
      const prototype=h.port.bb_Person.prototype,original=prototype[method];
      prototype[method]=function(){
        const result=original.apply(this,arguments);
        if(this===(method==='bbHitKey'?second:first)){old.bbxpos=100;next.bbxpos=790;}
        return result;
      };
      h.next=next;
    });
    same(pair,1,true);
    assert.equal(pair[1].next.bbhealth,999983,'prototype hook movement is visible to next attack');
    assert.equal(pair[1].target.__narrowedQueries,0,'direct prototype override disables geometry caching: '+method);
  }
});

test('opponents are indexed after native movement, then independently after enemy updates for friendly converts',()=>{
  const pair=twins(c=>{stationary(c);c.units[0].moveSpeed=100;c.units[0].damage=17;},h=>{
    padding(h,'friendly',70,100);padding(h,'enemy',70,1500);
    const walking=place(h.spawn('friendly','unit',0)[0],690);
    const enemy=place(h.spawn('enemy','unit',0)[0],800);enemy.bbmode=1;enemy.bbhit=1;
    const converted=place(h.spawn('enemy','unit',0)[0],810);h.factions.convert(h.target,converted,'friendly');converted.bbmode=1;converted.bbhit=1;
    h.witnesses=[walking,enemy,converted];
  });
  same(pair,3,true);assert.ok(pair[1].target.__narrowedQueries>=2);
});

test('same-tick natural preacher conversion invalidates a previous bucket before subsequent attacks',()=>{
  const pair=twins(c=>{stationary(c);c.units[0].damage=17;},h=>{
    padding(h,'friendly',70,100);
    place(h.spawn('friendly','unit',0)[0],790).bbhealth=50;
    const [first,priest,second]=[h.spawn('enemy','unit',0)[0],h.spawn('enemy','unit',4)[0],h.spawn('enemy','unit',0)[0]];
    for(const body of [first,priest,second])centerAt(body,'enemy',800);
    first.bbmode=0;priest.bbmode=6;priest.bbhit=1;second.bbmode=1;second.bbhit=1;
  });
  same(pair,3,true);assert.ok(pair[1].target.__narrowedQueries>=2);
});

test('large valid custom radii, coordinates and dense buckets use exact bounded-cost linear fallback',()=>{
  for(const mode of ['radius','coordinate','dense']){
    const pair=twins(c=>{stationary(c);if(mode==='radius')c.units[0].hitRadius=10000;},h=>{
      padding(h,'friendly',70,mode==='dense'?800:100);
      const attacker=place(h.spawn('enemy','unit',0)[0],mode==='coordinate'?10000001:800);
      attacker.bbmode=0;
    });
    same(pair,1,true);assert.equal(pair[1].target.__narrowedQueries,0,mode+' falls back instead of walking huge or dense buckets');
  }
});

test('bucket and exact range boundaries keep fractional and overlapping target choices',()=>{
  for(const gap of [-20,-0.125,0,15.999,16,39.999,40,127.999,128,239.999,240,299.999,300,319.999,320,399.999,400]){
    const pair=twins(c=>{stationary(c);c.units[1].damage=17;},h=>{
      padding(h,'friendly',70,100);
      const attacker=centerAt(h.spawn('enemy','unit',1)[0],'enemy',900),victim=h.spawn('friendly','unit',0)[0];
      centerAt(victim,'friendly',900-attacker.bbunit.bbhitradius-victim.bbunit.bbhitradius-gap);
      attacker.bbmode=3;attacker.bbhit=1;
    });
    same(pair,2);
  }
});
