'use strict';
// Advisory DIN proximity for DECLARED logical relations. Never physical wire routing.
function epCabinetConnectionProximityV1(project,placements){
 const issues=[],pairs=[],add=(code,level='UNKNOWN',detail={})=>issues.push({code,level,...detail});
 const result=(status,summary)=>({schema:'electropanel.cabinet.connection.proximity.1',
  status,pairs,summary,issues,physicalWiringVerified:false,selectivityVerified:false,engineeringApproved:false});
 const summary={sameRail:0,adjacent:0,crossRail:0,unresolved:0,nominalDistanceModules:0};
 if(!project||!Array.isArray(project.lines)||!Array.isArray(placements)||
  project.lines.length>500||placements.length>1000){
  add('PROXIMITY_INPUT_INVALID','BLOCKED');return result('BLOCKED',summary);
 }
 const positions=new Map();
 for(const p of placements){
  if(!p||typeof p.deviceId!=='string'||positions.has(p.deviceId)||
   !Number.isInteger(p.railIndex)||p.railIndex<0||
   !Number.isInteger(p.startModule)||p.startModule<0||
   !Number.isInteger(p.modules)||p.modules<1){
   add('PROXIMITY_POSITION_INVALID','BLOCKED');return result('BLOCKED',summary);
  }
  positions.set(p.deviceId,p);
 }
 const branches=new Map(),usedIds=new Set();
 for(const l of project.lines){
  const related=Array.isArray(project.branchDevices)?
   project.branchDevices.filter(b=>b?.circuitId===l?.id):[];
  if(related.length>1){add('PROXIMITY_BRANCH_BINDING_DUPLICATED','BLOCKED',{circuitId:l.id});return result('BLOCKED',summary);}
  const id=related[0]?.id??l.id;
  if(typeof id!=='string'||usedIds.has(id)){
   add('PROXIMITY_BRANCH_ID_INVALID','BLOCKED',{circuitId:l.id});return result('BLOCKED',summary);
  }
  usedIds.add(id);branches.set(l.id,id);
 }
 const relations=new Map();
 function register(from,to,basis){
  if(from===to)return;
  const key=[from,to].sort().join('|')+'|'+basis;
  if(!relations.has(key))relations.set(key,{from,to,basis});
 }
 for(const g of Array.isArray(project.sharedDevices)?project.sharedDevices:[]){
  if(!g||typeof g.id!=='string')continue;
  for(const cid of Array.isArray(g.circuitIds)?g.circuitIds:[]){
   if(!branches.has(cid)){add('PROXIMITY_GROUP_CIRCUIT_UNKNOWN','UNKNOWN',{circuitId:cid});continue;}
   register(g.id,branches.get(cid),'DECLARED_GROUP_MEMBERSHIP');
  }
 }
 for(const edge of Array.isArray(project.protectionLinks)?project.protectionLinks:[]){
  if(!edge||!branches.has(edge.downstreamLineId)||!branches.has(edge.upstreamLineId)){
   add('PROXIMITY_PROTECTION_LINK_UNRESOLVED');continue;
  }
  register(branches.get(edge.upstreamLineId),branches.get(edge.downstreamLineId),
   'DECLARED_PROTECTION_HIERARCHY');
 }
 for(const link of Array.isArray(project.deviceSupplyV1?.links)?project.deviceSupplyV1.links:[]){
  if(!link||typeof link.from!=='string'||typeof link.to!=='string')continue;
  const id=x=>x.startsWith('BRANCH:')?x.slice(7):x.startsWith('GROUP:')?x.slice(6):null;
  const from=id(link.from),to=id(link.to);
  if(from&&to)register(from,to,'DECLARED_DEVICE_SUPPLY');
 }
 for(const rel of relations.values()){
  const a=positions.get(rel.from),b=positions.get(rel.to);
  if(!a||!b){
   summary.unresolved++;add('PROXIMITY_RELATION_NOT_PLACED','UNKNOWN',{from:rel.from,to:rel.to});
   pairs.push({...rel,status:'UNKNOWN',sameRail:null,gapModules:null,railSeparation:null});continue;
  }
  const shared=a.railIndex===b.railIndex;
  const gap=shared?Math.max(0,a.startModule-b.startModule-b.modules,
   b.startModule-a.startModule-a.modules):null;
  const railSeparation=Math.abs(a.railIndex-b.railIndex);
  if(shared){summary.sameRail++;if(gap===0)summary.adjacent++;summary.nominalDistanceModules+=gap;}
  else summary.crossRail++;
  pairs.push({...rel,status:'REVIEW_REQUIRED',sameRail:shared,gapModules:gap,railSeparation,
   fromPosition:{railIndex:a.railIndex,startModule:a.startModule},
   toPosition:{railIndex:b.railIndex,startModule:b.startModule}});
 }
 add('PROXIMITY_PHYSICAL_ROUTING_UNVERIFIED');
 return result('REVIEW_REQUIRED',summary);
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetConnectionProximityV1};
