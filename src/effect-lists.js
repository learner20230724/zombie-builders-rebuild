/* Reverse node lookup for cosmetic/projectile lists; recovered lists stay intact. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.EffectLists=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const states=new WeakMap();
  const EFFECT_KEYS=Object.freeze(['bbbodyparts','bbdeathlist','bbexplosions','bbsmokelist','bbbottles','bbflinglist','bbpowerups']);
  const object=value=>value!==null&&(typeof value==='object'||typeof value==='function');
  function fail(message){throw new Error('EffectLists: '+message);}
  function portFor(target){if(!target||!target.ZTPGamePort)fail('missing game port');return target.ZTPGamePort;}
  function diagnostics(target){const state=states.get(target);if(!state)fail('install must run first');return {...state.stats};}
  function install(target){
    const port=portFor(target);if(states.has(target))return target;
    if(port.state.bb_Game)fail('install must run before bb_Main');
    const listProto=port.bb_std_list_List?.prototype,nodeProto=port.bb_std_list_Node?.prototype;
    for(const [owner,key]of [[listProto,'bbRemove'],[listProto,'bbAddFirst'],[listProto,'bbAddLast'],[listProto,'bbClear'],
      [listProto,'bbRemoveFirst'],[listProto,'bbRemoveLast'],[listProto,'bbEquals'],[nodeProto,'bbRemove'],[nodeProto,'bbNode_new2']]){
      if(typeof owner?.[key]!=='function')fail('missing '+key);
      const field=Object.getOwnPropertyDescriptor(owner,key);
      if(field?!Object.prototype.hasOwnProperty.call(field,'value')||!field.writable:!Object.isExtensible(owner))fail('read-only '+key);
    }
    const state={indices:new WeakMap(),owners:new WeakMap(),payloads:new WeakMap(),stats:{builds:0,indexedNodes:0,fastRemovals:0,fallbackRemovals:0,removedNodes:0,invalidations:0}};
    const equals=listProto.bbEquals;
    const eligible=list=>{
      const game=port.state.bb_Game;
      return game&&EFFECT_KEYS.some(key=>game[key]===list)&&list.bbEquals===equals;
    };
    const invalidate=index=>{if(index?.valid){index.valid=false;state.stats.invalidations++;}};
    function trackablePayload(node){
      const field=Object.getOwnPropertyDescriptor(node,'bb_data'),payload=state.payloads.get(node);
      if(!field)return false;
      return payload&&field.get===payload.get&&field.set===payload.set ||
        Object.prototype.hasOwnProperty.call(field,'value')&&field.configurable&&field.writable;
    }
    function watchPayload(node){
      const field=Object.getOwnPropertyDescriptor(node,'bb_data'),known=state.payloads.get(node);
      if(known&&field?.get===known.get&&field?.set===known.set)return true;
      if(!trackablePayload(node))return false;
      // Raw data writes are a supported recovered-node operation too. Track
      // those writes without rescanning every list on every removal. Unknown
      // user accessors/non-configurable fields stay on the recovered slow path.
      const payload={value:field.value,get:null,set:null};
      payload.get=()=>payload.value;
      payload.set=value=>{payload.value=value;invalidate(state.owners.get(node)?.index);};
      try{Object.defineProperty(node,'bb_data',{get:payload.get,set:payload.set,enumerable:field.enumerable,configurable:true});}
      catch{return false;}
      state.payloads.set(node,payload);return true;
    }
    function validIndex(list){
      const index=state.indices.get(list);
      if(!index||!index.valid||index.head!==list.bb_head)return null;
      const head=index.head;
      if(!head?.bb_succ||!head.bb_pred||head.bb_succ.bb_pred!==head||head.bb_pred.bb_succ!==head){invalidate(index);return null;}
      return index;
    }
    function track(index,node,front=false){
      const value=node.bb_data;
      if(!object(value)||Object.hasOwn(node,'bbRemove')||!watchPayload(node)){invalidate(index);return;}
      let nodes=index.values.get(value);
      if(!nodes)index.values.set(value,nodes=new Set());
      if(nodes.has(node))return;
      // Sets retain list order, including duplicate values added at the front.
      if(front&&nodes.size)index.values.set(value,new Set([node,...nodes]));else nodes.add(node);
      state.owners.set(node,{index,value});
    }
    function build(list){
      const head=list.bb_head;
      if(!head?.bb_succ||!head.bb_pred)return null;
      const index={list,head,valid:true,values:new Map()},seen=new Set();
      const reject=()=>{invalidate(index);return null;};
      let node=head.bb_succ;
      while(node!==head){
        // Unknown/non-object/custom node lists use the recovered equality loop.
        if(!node||seen.has(node)||seen.size>=1000000||!node.bb_succ||!node.bb_pred||
          node.bb_succ.bb_pred!==node||node.bb_pred.bb_succ!==node||!object(node.bb_data)||Object.hasOwn(node,'bbRemove')||!trackablePayload(node))return reject();
        seen.add(node);track(index,node);if(!index.valid)return null;node=node.bb_succ;
      }
      if(head.bb_succ.bb_pred!==head||head.bb_pred.bb_succ!==head)return reject();
      state.owners.set(head,{index,value:undefined});state.indices.set(list,index);
      state.stats.builds++;state.stats.indexedNodes+=seen.size;
      return index;
    }
    const wrap=(owner,key,factory)=>{owner[key]=factory(owner[key]);};
    wrap(nodeProto,'bbNode_new2',original=>function(next,previous,value){
      const nextOwner=state.owners.get(next),previousOwner=state.owners.get(previous);
      const result=original.apply(this,arguments);
      const index=nextOwner?.index||previousOwner?.index;
      if(index?.valid&&index.head===index.list.bb_head){
        // The public list API inserts at an end. Direct middle insertion is
        // legal too, but lazily rebuild its duplicate order on the next remove.
        if(nextOwner?.index===index&&previousOwner?.index===index){
          if(next===index.head)track(index,this);
          else if(previous===index.head)track(index,this,true);
          else invalidate(index);
        }else invalidate(index);
      }
      return result;
    });
    wrap(nodeProto,'bbRemove',original=>function(){
      const owner=state.owners.get(this),result=original.apply(this,arguments);
      if(owner){
        state.owners.delete(this);
        const {index,value}=owner;
        if(this===index.head)invalidate(index);
        else if(index.valid){const nodes=index.values.get(value);if(nodes){nodes.delete(this);if(!nodes.size)index.values.delete(value);}}
      }
      return result;
    });
    for(const key of ['bbAddFirst','bbAddLast'])wrap(listProto,key,original=>function(){
      const index=validIndex(this),result=original.apply(this,arguments);
      if(index?.valid&&result&&index.head===this.bb_head)track(index,result,key==='bbAddFirst');
      return result;
    });
    wrap(listProto,'bbClear',original=>function(){
      const index=state.indices.get(this);invalidate(index);state.indices.delete(this);
      return original.apply(this,arguments);
    });
    wrap(listProto,'bbRemove',original=>function(value){
      if(!object(value)||!eligible(this))return original.apply(this,arguments);
      let index=validIndex(this)||build(this),nodes=index?.values.get(value);
      if(!index){state.stats.fallbackRemovals++;return original.apply(this,arguments);}
      // A missing key can also result from external raw bb_data edits. Avoid
      // claiming ownership of unknown mutation: invalidate and use the leaf.
      if(!nodes){invalidate(index);state.stats.fallbackRemovals++;return original.apply(this,arguments);}
      for(const node of nodes)if(node.bb_data!==value||!node.bb_succ||!node.bb_pred||
        node.bb_succ.bb_pred!==node||node.bb_pred.bb_succ!==node||Object.hasOwn(node,'bbRemove')){
        invalidate(index);state.stats.fallbackRemovals++;return original.apply(this,arguments);
      }
      state.stats.fastRemovals++;
      // Node.remove retains its original neighbour pointers, so an already
      // active recovered Enumerator has precisely the old deletion semantics.
      for(const node of [...nodes]){node.bbRemove();state.stats.removedNodes++;}
      return 0;
    });
    states.set(target,state);return target;
  }
  return Object.freeze({install,diagnostics,EFFECT_KEYS});
});
