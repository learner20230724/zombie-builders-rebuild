/* Current-camp orientation for the original detached death visuals. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.DeathEffects=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const states=new WeakMap();
  function fail(message){throw new Error('DeathEffects: '+message);}
  function portFor(target){if(!target||!target.ZTPGamePort)fail('missing game port');return target.ZTPGamePort;}
  function stateFor(target){
    portFor(target);
    let state=states.get(target);
    if(!state){state={installed:false,body:null,visuals:new WeakMap()};states.set(target,state);}
    return state;
  }
  function orientation(body){
    const type=body?.bbunit?.bbtype,human=Number.isInteger(type)&&type>=0&&type<5;
    if(!human&&!(Number.isInteger(type)&&type>=32&&type<37))fail('expected a non-base actor');
    // Native Person has no bbdirection; it belongs to the friendly list. Every
    // cross-camp human and every zombie receives the same direction convention
    // from Factions: positive enemy, negative friendly, including conversions.
    const enemy=body.bbdirection>0?true:body.bbdirection<0?false:!human;
    return {flip:human?enemy:!enemy,x:body.bbxpos};
  }
  function tag(target,effect,body){
    const port=portFor(target),state=stateFor(target),next=orientation(body);
    const part=effect instanceof port.bb_BodyPart,death=effect instanceof port.bb_Death,
      explosion=effect instanceof port.bb_Explosion;
    if(!part&&!death&&!explosion)fail('expected an original death visual');
    if(!Number.isFinite(effect.bbxpos)||!Number.isFinite(next.x))fail('invalid visual position');
    const previous=state.visuals.get(effect);
    if((previous?.flip||false)!==next.flip){
      // Mirror physical debris as well as its sprite. The other effects have
      // no horizontal motion, but bomber blasts can have a source-relative
      // offset which must also be reflected. No RNG or simulation call occurs.
      if(part)effect.bbvelx=-effect.bbvelx;
      else if(explosion)effect.bbxpos=2*next.x-effect.bbxpos;
    }
    state.visuals.set(effect,next);return effect;
  }
  function install(target){
    const port=portFor(target),state=stateFor(target);
    if(state.installed)return target;
    if(port.state.bb_Game)fail('install must run before bb_Main');
    const methods=[[port.bb_Zomba?.prototype,'bbBlowZombie'],
      [port.bb_Death?.prototype,'bbDeath_new'],[port.bb_Death?.prototype,'bbDraw'],
      [port.bb_BodyPart?.prototype,'bbBodyPart_new'],[port.bb_BodyPart?.prototype,'bbDraw'],
      [port.bb_Explosion?.prototype,'bbExplosion_new'],[port.bb_Explosion?.prototype,'bbDraw']];
    for(const [owner,key]of methods){
      if(typeof owner?.[key]!=='function')fail('missing '+key);
      const field=Object.getOwnPropertyDescriptor(owner,key);
      if(field?!Object.prototype.hasOwnProperty.call(field,'value')||!field.writable:!Object.isExtensible(owner))fail('read-only '+key);
    }
    for(const key of ['bb_mojo_graphics_PushMatrix','bb_mojo_graphics_Translate','bb_mojo_graphics_Scale','bb_mojo_graphics_PopMatrix'])
      if(typeof port[key]!=='function')fail('missing '+key);
    const wrap=(owner,key,factory)=>{owner[key]=factory(owner[key]);};
    // Cross-camp people use this same death leaf through Factions. The exact
    // actor is available synchronously, so no per-frame/per-effect army scan,
    // position matching or temporary mutation of original actor lists is needed.
    wrap(port.bb_Zomba.prototype,'bbBlowZombie',original=>function(body){
      const previous=state.body;state.body=body;
      try{return original.apply(this,arguments);}finally{state.body=previous;}
    });
    for(const [owner,key]of [[port.bb_Death.prototype,'bbDeath_new'],
      [port.bb_BodyPart.prototype,'bbBodyPart_new'],[port.bb_Explosion.prototype,'bbExplosion_new']])
      wrap(owner,key,original=>function(){
        const result=original.apply(this,arguments);
        if(state.body)tag(target,this,state.body);
        return result;
      });
    for(const owner of [port.bb_Death.prototype,port.bb_BodyPart.prototype,port.bb_Explosion.prototype])
      wrap(owner,'bbDraw',original=>function(dx,dy){
        if(!state.visuals.get(this)?.flip)return original.apply(this,arguments);
        const pivot=this.bbxpos+(dx|0);
        port.bb_mojo_graphics_PushMatrix();
        try{
          port.bb_mojo_graphics_Translate(2*pivot,0);
          port.bb_mojo_graphics_Scale(-1,1);
          return original.apply(this,arguments);
        }finally{port.bb_mojo_graphics_PopMatrix();}
      });
    state.installed=true;return target;
  }
  return Object.freeze({install,tag});
});
