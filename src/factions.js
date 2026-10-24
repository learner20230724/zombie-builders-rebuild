/* Optional camp adapter for sandbox cross-species armies. The recovered game is untouched. */
(function(root,factory){
  'use strict';
  const api=factory(typeof module==='object'&&module.exports?require('./custom-rules.js'):null);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.Factions=api;
})(typeof globalThis==='object'?globalThis:this,function(importedRules){
  'use strict';
  const states=new WeakMap(), LIMIT=1000;
  function fail(message){throw new Error('Factions: '+message);}
  function portFor(target){if(!target||!target.ZTPGamePort)fail('missing game port');return target.ZTPGamePort;}
  function stateFor(target){const state=states.get(target);if(!state)fail('install must run first');return state;}
  function entries(list){const result=[];if(!list)return result;const it=list.bbObjectEnumerator();while(it.bbHasNext())result.push(it.bbNextObject());return result;}
  function sideOf(game,body){
    if(!game||!body)return null;
    if(body===game.bbpeoplebase)return 'friendly';if(body===game.bbzombiebase)return 'enemy';
    if(entries(game.bbzombies).includes(body))return 'enemy';
    if(entries(game.bbpeople).includes(body)||entries(game.bbpombies).includes(body))return 'friendly';return null;
  }
  function side(value){if(value!=='friendly'&&value!=='enemy')fail('side must be friendly or enemy');return value;}
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
    for(const key of required||[])if(!Object.prototype.hasOwnProperty.call(value,key))fail('missing '+key);
  }
  function descriptor(value){
    record(value,['kind','type'],['kind','type']);
    if(!['unit','zombie'].includes(value.kind)||!Number.isInteger(value.type)||value.type<0||value.type>4)fail('species must be unit/zombie type 0 through 4');
    return {kind:value.kind,type:value.type};
  }
  function writable(object,key){
    const d=Object.getOwnPropertyDescriptor(object,key);
    if(!d||!Object.prototype.hasOwnProperty.call(d,'value')||!d.writable)fail('read-only runtime field '+key);
  }
  function preflightList(group){
    const head=group&&group.bb_head,seen=new Set();let node=head;
    do{
      if(!node||seen.has(node)||seen.size>100000)fail('damaged actor list');seen.add(node);
      writable(node,'bb_succ');writable(node,'bb_pred');
      if(!node.bb_succ||!node.bb_pred||node.bb_succ.bb_pred!==node||node.bb_pred.bb_succ!==node)fail('damaged actor list');
      node=node.bb_succ;
    }while(node!==head);
  }
  function list(target,options={}){
    const game=portFor(target).state.bb_Game;if(!game)return [];
    record(options,['side','kind','type','includeBases']);
    if(options.side!==undefined)side(options.side);
    if(options.kind!==undefined&&!['unit','zombie'].includes(options.kind))fail('invalid species kind');
    if(options.type!==undefined&&(!Number.isInteger(options.type)||options.type<0||options.type>4))fail('invalid species type');
    if(options.includeBases!==undefined&&typeof options.includeBases!=='boolean')fail('invalid includeBases');
    const result=[],seen=new Set();
    for(const [camp,group]of [['friendly',game.bbpeople],['friendly',game.bbpombies],['enemy',game.bbzombies]]){
      if(options.side&&options.side!==camp)continue;
      for(const body of entries(group)){
        if(seen.has(body)||!body||!body.bbunit)continue;seen.add(body);
        const type=body.bbunit.bbtype,human=type>=0&&type<=5,id=human?type:type-32;
        if(!options.includeBases&&(id===5||body===game.bbpeoplebase||body===game.bbzombiebase))continue;
        if(options.kind&&options.kind!==(human?'unit':'zombie'))continue;
        if(options.type!==undefined&&options.type!==id)continue;
        result.push(body);
      }
    }return result;
  }
  function wrap(owner,key,factory){const original=owner[key];if(typeof original!=='function')fail('missing '+key);owner[key]=factory(original);}
  function rules(target){const api=target.CustomRules||importedRules;return api&&api.snapshot?api.snapshot(target):null;}
  function enabled(target,key){const r=rules(target);return !r||r.abilities[key]!==false;}
  function alive(body){return body&&body.bbunit&&body.bbhealth>0&&body.bbmode!==14&&body.bbmode!==15;}
  function center(body,camp){
    const human=body.bbunit.bbtype<32;
    return body.bbxpos+(human?body.bbunit.bbhitoffset:(camp==='friendly'?-body.bbunit.bbhitoffset:body.bbunit.bbhitoffset));
  }
  function opponents(target,camp){return list(target,{side:camp==='friendly'?'enemy':'friendly',includeBases:true}).filter(alive);}
  function damage(body,amount,style=1){
    amount=Math.max(0,Math.min(2147483647,Math.trunc(amount)));
    if(!alive(body)||!amount)return amount;
    return typeof body.bbInfect==='function'&&body.bbunit.bbtype<32?body.bbInfect(amount):body.bbSmack(amount,style);
  }
  function convert(target,body,camp){
    const state=stateFor(target),port=portFor(target),game=port.state.bb_Game;
    const old=sideOf(game,body);
    if(!old||old===camp||!alive(body)||body===game.bbpeoplebase||body===game.bbzombiebase)return false;
    for(const group of [game.bbpeople,game.bbpombies,game.bbzombies])preflightList(group);
    const writes=['bbdirection','bbmode','bbhit'];
    if(body.bbunit.bbtype<32)writes.push('bbwaszombie','bbunit','bbscale','bbsmackstyle','bbUpdate','bbDraw','bbTurn');
    for(const key of writes){
      if(Object.prototype.hasOwnProperty.call(body,key))writable(body,key);else if(!Object.isExtensible(body))fail('read-only actor');
    }
    if(body.bbunit.bbtype<32&&!state.people.has(body)&&!Object.isExtensible(body))fail('read-only actor');
    if(old==='friendly'&&body.bbunit.bbtype<32&&!body.bbwaszombie&&!body.bbisangry)writable(game.bbztp,'bbforce');
    game.bbpeople.bbRemove(body);game.bbpombies.bbRemove(body);game.bbzombies.bbRemove(body);
    if(body.bbunit.bbtype<32){
      if(old==='friendly'&&!body.bbwaszombie&&!body.bbisangry)game.bbztp.bbforce=Math.max(0,game.bbztp.bbforce-body.bbunit.bbpeople);
      adaptHuman(target,body,camp);body.bbwaszombie=1;
    }
    body.bbdirection=camp==='enemy'?1:-1;body.bbmode=0;body.bbhit=0;
    (camp==='enemy'?game.bbzombies:game.bbpombies).bbAddLast(body);
    const meta=state.people.get(body);if(meta)meta.side=camp;
    state.cross=true;return true;
  }
  function humanUpdate(target,body){
    const state=stateFor(target),port=portFor(target),game=port.state.bb_Game,meta=state.people.get(body),camp=meta.side,dir=camp==='friendly'?1:-1;
    const targets=opponents(target,camp),x=center(body,camp),radius=body.bbunit.bbhitradius;
    const reachable=targets.map(other=>{
      const otherCamp=camp==='friendly'?'enemy':'friendly',c=center(other,otherCamp),forward=dir*(c-x);
      return {body:other,gap:forward-radius-other.bbunit.bbhitradius,forward};
    }).filter(v=>v.forward>=-radius-v.body.bbunit.bbhitradius).sort((a,b)=>Math.max(0,a.gap)-Math.max(0,b.gap));
    const nearest=reachable[0],type=body.bbunit.bbtype;
    if(body.bbmode===0&&nearest){
      const gap=Math.max(0,nearest.gap);
      if(type===0&&gap<16){body.bbmode=1;body.bbswing=0;}
      else if(type===1&&gap<240){body.bbmode=3;body.bbshoot=0;}
      else if(type===2&&gap<140){body.bbmode=5;body.bbshoot=0;}
      else if(type===3&&gap<400){body.bbmode=4;body.bbthrow=0;}
      else if(type===4&&gap<320){body.bbmode=6;body.bbspell=0;}
    }
    const mode=body.bbmode;
    if([1,3,4,5,6].includes(mode)&&port.bb_Person.prototype.bbHitKey.call(body)){
      const pool=Math.max(0,Math.trunc(body.bbunit.bbdamage||0));
      if(mode===1){const victim=reachable.find(v=>v.gap<40);if(victim)damage(victim.body,pool,1);}
      else if(mode===3){if(nearest&&nearest.gap<300)damage(nearest.body,pool,3);}
      else if(mode===5){let left=pool;for(const hit of reachable){if(hit.gap>=180||left<=0)break;left=damage(hit.body,left,2);}}
      else if(mode===4){
        const previous=state.shotSide;state.shotSide=camp;
        try{game.bbAddBottle(body.bblayer,body.bbxpos+12*dir,body.bbypos-64,4*dir,-4,0);}finally{state.shotSide=previous;}
      }
      else if(mode===6&&enabled(target,'preacherConversion')){
        let budget=1000;
        const eligible=reachable.filter(hit=>hit.gap<320&&hit.body!==game.bbpeoplebase&&hit.body!==game.bbzombiebase)
          .sort((a,b)=>b.body.bbunit.bbtype-a.body.bbunit.bbtype);
        for(const hit of eligible){if(budget<=0)break;if(convert(target,hit.body,camp))budget-=hit.body.bbunit.bbhealth;}
      }
    }
    if(!alive(body))return 0;
    const previous=state.shotSide,mirror=state.mirrorHuman;
    state.shotSide=camp;state.mirrorHuman=camp==='enemy';
    if(camp==='enemy')body.bbxpos=1600-body.bbxpos;
    try{return port.bb_Person.prototype.bbUpdate.call(body);}
    finally{if(camp==='enemy')body.bbxpos=1600-body.bbxpos;state.shotSide=previous;state.mirrorHuman=mirror;}
  }
  function adaptHuman(target,body,camp){
    const state=stateFor(target),port=portFor(target);
    let meta=state.people.get(body);
    if(!meta){
      meta={side:camp,source:body.bbunit};state.people.set(body,meta);
      Object.setPrototypeOf(body,port.bb_Zombie.prototype);
      const view=Object.create(meta.source);
      Object.defineProperty(view,'bbhitoffset',{get:()=>meta.side==='enemy'?-meta.source.bbhitoffset:meta.source.bbhitoffset,enumerable:true});
      body.bbunit=view;body.bbscale=1;body.bbsmackstyle=0;
      body.bbUpdate=function(){return humanUpdate(target,this);};
      body.bbDraw=function(dx,dy){
        if(this.bbskin)this.bbskin.bbsheet[meta.side==='enemy'?'bbflipblit':'bbblit'](this.bbskin.bbframe,this.bbxpos+(dx|0),this.bbypos+(dy|0)-this.bblayer*4,1);
        return 0;
      };
      body.bbTurn=function(){meta.side='friendly';this.bbdirection=-1;this.bbmode=0;this.bbhit=0;return 0;};
    }
    meta.side=camp;body.bbdirection=camp==='enemy'?1:-1;body.bbwaszombie=1;return body;
  }
  function rehomeZombie(target,body,camp){
    if(!body||!body.bbunit)return body;
    const game=portFor(target).state.bb_Game;
    if(camp==='friendly'){
      game.bbzombies.bbRemove(body);body.bbTurn();game.bbpombies.bbAddLast(body);stateFor(target).cross=true;
    }return body;
  }
  function spawn(target,camp,selection,count=1){
    side(camp);const d=descriptor(selection);if(!Number.isInteger(count)||count<1||count>2147483647)fail('count must be an integer between 1 and 2147483647');
    const state=stateFor(target),port=portFor(target),game=port.state.bb_Game;
    if(!game||![2,6].includes(game.bbmainState))fail('an active battle is required');
    for(const group of [game.bbpeople,game.bbpombies,game.bbzombies])preflightList(group);
    const slots=Math.max(0,LIMIT-list(target,{includeBases:true}).length),result=[];
    for(let i=0;i<Math.min(count,slots);i++){
      let body;
      if(d.kind==='unit'){
        body=game.bbAddPerson(game.bbunits[d.type]);if(!body)break;body.bbwaszombie=1;
        if(camp==='enemy'){game.bbpeople.bbRemove(body);adaptHuman(target,body,camp);game.bbzombies.bbAddLast(body);state.cross=true;}
      }else{body=game.bbAddZombie(game.bbzunits[d.type]);if(!body)break;rehomeZombie(target,body,camp);}
      body.bbxpos=camp==='friendly'?0:1600;body.bbypos=0;result.push(body);
    }return result;
  }
  function install(target){
    const port=portFor(target);if(states.has(target))return target;
    if(port.state.bb_Game)fail('install must run before bb_Main');
    const state={people:new WeakMap(),projectiles:new WeakMap(),cross:false,tickDepth:0,impact:null,pendingImpact:null,exploding:null,shotSide:null,mirrorHuman:false};states.set(target,state);
    wrap(port.bb_Zomba.prototype,'bbResetGame',original=>function(){state.cross=false;state.impact=state.pendingImpact=state.exploding=null;return original.apply(this,arguments);});
    wrap(port.bb_Zomba.prototype,'bbGameTick',original=>function(){state.tickDepth++;try{return original.apply(this,arguments);}finally{state.tickDepth--;state.impact=state.pendingImpact=state.exploding=null;}});
    wrap(port.bb_Zombie.prototype,'bbUpdate',original=>function(){
      if(state.cross&&this.bbunit&&this.bbunit.bbtype===36&&this.bbdirection<0&&this.bbmode===11&&this.bbHitKey()){
        const previous=state.shotSide;state.shotSide='friendly';try{port.state.bb_Game.bbAddFling(this.bblayer,this.bbxpos,this.bbypos);}finally{state.shotSide=previous;}
      }return original.apply(this,arguments);
    });
    wrap(port.bb_Zombie.prototype,'bbDraw',original=>function(dx,dy){
      if(this.bbunit&&this.bbunit.bbtype===36&&this.bbdirection<0){
        const x=(dx|0)+this.bbxpos;
        port.bb_mojo_graphics_PushMatrix();port.bb_mojo_graphics_Translate(2*x,0);port.bb_mojo_graphics_Scale(-1,1);
        try{return original.apply(this,arguments);}finally{port.bb_mojo_graphics_PopMatrix();}
      }return original.apply(this,arguments);
    });
    wrap(port.bb_Zomba.prototype,'bbAddBottle',original=>function(layer,x,y,vx,vy,kind){
      if(state.mirrorHuman){x=1600-x;vx=-vx;}
      const result=original.call(this,layer,x,y,vx,vy,kind),body=this.bbbottles.bbLast();
      if(state.shotSide&&body)state.projectiles.set(body,state.shotSide);return result;
    });
    wrap(port.bb_Bottle.prototype,'bbUpdate',original=>function(){const result=original.apply(this,arguments);state.exploding=state.tickDepth&&this.bbexplode?this:null;return result;});
    wrap(port.bb_Zomba.prototype,'bbExplodeBottle',original=>function(layer,x,y,amount){
      const projectile=state.exploding;state.exploding=null;
      if(!projectile||state.projectiles.get(projectile)!=='enemy')return original.apply(this,arguments);
      this.bbAddExplosion(layer,x,y,1);
      for(const victim of opponents(target,'enemy'))if(Math.abs(victim.bbxpos-x)<100){amount=damage(victim,amount,3);if(amount<=0)break;}return 0;
    });
    wrap(port.bb_Zomba.prototype,'bbAddFling',original=>function(){const result=original.apply(this,arguments),body=this.bbflinglist.bbLast();if(body&&state.shotSide)state.projectiles.set(body,state.shotSide);return result;});
    wrap(port.bb_Fling.prototype,'bbUpdate',original=>function(){
      const friendly=state.projectiles.get(this)==='friendly';if(friendly)this.bbxpos=1600-this.bbxpos;
      let result;try{result=original.apply(this,arguments);}finally{if(friendly)this.bbxpos=1600-this.bbxpos;}
      state.impact=state.tickDepth&&this.bbrecycle?this:null;return result;
    });
    wrap(port.bb_Fling.prototype,'bbDraw',original=>function(dx,dy){
      if(state.projectiles.get(this)!=='friendly')return original.apply(this,arguments);
      this.bbskin.bbsheet.bbflipblit(this.bbskin.bbframe,this.bbxpos+(dx|0),this.bbypos+(dy|0)-this.bblayer*4,1);return 0;
    });
    wrap(port.bb_Zomba.prototype,'bbBombPeople',original=>function(layer,x,y,amount){
      const projectile=state.impact;state.impact=null;
      if(!projectile||!state.cross)return original.apply(this,arguments);
      const camp=state.projectiles.get(projectile)||'enemy';state.pendingImpact=camp;
      this.bbAddExplosion(layer,x,y,1);
      for(const victim of opponents(target,camp))if(Math.abs(victim.bbxpos-x)<60){amount=damage(victim,amount,1);if(amount<=0)break;}return 0;
    });
    wrap(port.bb_Zomba.prototype,'bbAddZombie',original=>function(){
      const camp=state.pendingImpact;state.pendingImpact=null;
      const body=original.apply(this,arguments);if(camp==='friendly')rehomeZombie(target,body,camp);return body;
    });
    wrap(port.bb_Zomba.prototype,'bbBlowZombie',original=>function(body){
      if(!state.people.has(body))return original.apply(this,arguments);
      original.apply(this,arguments); // Retain configuration adapter XP saturation.
      const type=body.bbunit.bbtype,sheet=[this.bbshoveldeathsheet,this.bbshotgundeathsheet,null,null,this.bbpreacherdeathsheet][type];
      if(sheet)this.bbAddDeath(sheet,body.bblayer,body.bbxpos,body.bbypos);else this.bbAddExplosion(body.bblayer,body.bbxpos,body.bbypos,type===2?3:2);return 0;
    });
    return target;
  }
  return Object.freeze({install,spawn,list,getSide:(target,body)=>sideOf(portFor(target).state.bb_Game,body),convert,ENTITY_LIMIT:LIMIT});
});
