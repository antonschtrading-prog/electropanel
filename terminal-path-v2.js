'use strict';
// Conservative multi-segment declared-wire continuity. No implicit conduction
// through apparatus contacts, loads, switches or unknown terminals.
function epDeclaredWirePathV2(wiring, from, to, role) {
 const result=(status,code,path=[])=>({status,code,path,
  engineeringApproved:false,ready_for_installation:false});
 if(!wiring||!Array.isArray(wiring.terminals)||!Array.isArray(wiring.wires)||
    wiring.terminals.length>5000||wiring.wires.length>10000)
  return result('UNKNOWN','MODEL_INVALID');
 if(!['L1','L2','L3','N','PE'].includes(role))
  return result('UNKNOWN','ROLE_INVALID');
 const terminals=new Map();
 for(const t of wiring.terminals){
  if(!t||typeof t.id!=='string'||!t.id||terminals.has(t.id)||
     typeof t.conductor!=='string')return result('UNKNOWN','TERMINALS_INVALID');
  terminals.set(t.id,t);
 }
 if(!terminals.has(from)||!terminals.has(to))
  return result('BLOCKED','ENDPOINT_NOT_FOUND');
 if(terminals.get(from).conductor!==role||terminals.get(to).conductor!==role)
  return result('BLOCKED','ENDPOINT_ROLE_MISMATCH');
 if(from===to)return result('UNKNOWN','SAME_TERMINAL');
 const edges=new Map();
 for(const id of terminals.keys())edges.set(id,[]);
 for(const w of wiring.wires){
  if(!w||typeof w.from!=='string'||typeof w.to!=='string'||
     !terminals.has(w.from)||!terminals.has(w.to)||w.from===w.to)
   return result('UNKNOWN','WIRE_SCHEMA_INVALID');
  const a=terminals.get(w.from),b=terminals.get(w.to);
  if(a.conductor!==b.conductor)return result('BLOCKED','CROSS_ROLE_WIRE');
  edges.get(w.from).push(w.to);edges.get(w.to).push(w.from);
 }
 const queue=[from],parents=new Map([[from,null]]);
 for(let i=0;i<queue.length;i++){
  const current=queue[i];
  for(const next of edges.get(current)){
   if(terminals.get(next).conductor!==role||parents.has(next))continue;
   parents.set(next,current);
   if(next===to){
    const path=[];for(let at=to;at!==null;at=parents.get(at))path.push(at);
    path.reverse();
    return result('DECLARED_PATH','DECLARED_WIRE_PATH_ONLY',path);
   }
   queue.push(next);
  }
 }
 return result('BLOCKED','DECLARED_WIRE_PATH_MISSING');
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDeclaredWirePathV2};
