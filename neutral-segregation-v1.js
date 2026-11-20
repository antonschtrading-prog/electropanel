'use strict';
// Deterministic declarations-only RCD neutral and PE segregation. No electrical certification.
function epNeutralSegregationV1(project){
 const issues=[],rows=[],add=(code,level,lineId=null,details={})=>issues.push({code,level,lineId,...details});
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.sharedDevices)||
  !Array.isArray(project.conductorRoutes)||project.lines.length>1000)
  return {status:'BLOCKED',issues:[{code:'NEUTRAL_PROJECT_INVALID',level:'BLOCKED'}],rows:[],
   engineeringApproved:false,ready_for_installation:false};
 const groups=new Map(),owners=new Map();
 for(const group of project.sharedDevices){
  if(!group||typeof group.id!=='string'||!group.id||groups.has(group.id)||!Array.isArray(group.circuitIds)){
   add('RCD_GROUP_INVALID','BLOCKED');continue;
  }
  groups.set(group.id,group);
  for(const id of group.circuitIds){
   if(owners.has(id))add('CIRCUIT_IN_MULTIPLE_RCD_GROUPS','BLOCKED',id);
   owners.set(id,group.id);
  }
 }
 const lineIds=new Set(),routeIds=new Set(),busOwners=new Map();
 for(const line of project.lines){
  const id=line?.id;
  if(typeof id!=='string'||!id||lineIds.has(id)){add('NEUTRAL_LINE_INVALID','BLOCKED',id??null);continue;}
  lineIds.add(id);
  const groupId=owners.get(id)||null;
  const expected='N_'+(groupId||'MAIN');
  const matches=project.conductorRoutes.filter(x=>x?.circuitId===id);
  if(matches.length>1)add('NEUTRAL_ROUTE_DUPLICATE','BLOCKED',id);
  const route=matches[0];
  if(!route){add('NEUTRAL_ROUTE_MISSING','UNKNOWN',id);
   rows.push({lineId:id,groupId,expectedBus:expected,declaredBus:null,protectiveBus:null,status:'UNKNOWN'});continue;}
  routeIds.add(id);
  if(route.neutralBus!==expected)add('RCD_NEUTRAL_BUS_MISMATCH','BLOCKED',id,
   {expectedBus:expected,declaredBus:route.neutralBus??null});
  if(route.protectiveBus!=='PE_MAIN')add('PE_ROUTE_UNVERIFIED','UNKNOWN',id);
  const owner=groupId||'MAIN';
  if(busOwners.has(route.neutralBus)&&busOwners.get(route.neutralBus)!==owner)
   add('RCD_NEUTRAL_SHARED_BETWEEN_GROUPS','BLOCKED',id,{bus:route.neutralBus});
  busOwners.set(route.neutralBus,owner);
  rows.push({lineId:id,groupId,expectedBus:expected,declaredBus:route.neutralBus??null,
   protectiveBus:route.protectiveBus??null,
   status:route.neutralBus===expected?'UNKNOWN':'BLOCKED'});
 }
 for(const route of project.conductorRoutes)
  if(!lineIds.has(route?.circuitId))add('NEUTRAL_ROUTE_ORPHAN','BLOCKED',route?.circuitId??null);
 for(const id of owners.keys())if(!lineIds.has(id))add('RCD_GROUP_CIRCUIT_ORPHAN','BLOCKED',id);
 for(const group of project.sharedDevices){
  if(!group||typeof group.id!=='string'||!Array.isArray(group.circuitIds))continue;
  const members=group.circuitIds.filter(id=>lineIds.has(id));
  if(!members.length)add('RCD_GROUP_EMPTY','UNKNOWN',null,{groupId:group.id});
  const links=Array.isArray(project.groupInputLinks)?project.groupInputLinks.filter(x=>x?.groupId===group.id):[];
  const nLinks=links.filter(x=>x.kind==='N');
  if(nLinks.length===0)add('RCD_NEUTRAL_INPUT_UNDECLARED','UNKNOWN',null,{groupId:group.id});
  if(nLinks.length>1)add('RCD_NEUTRAL_INPUT_DUPLICATE','BLOCKED',null,{groupId:group.id});
  for(const n of nLinks)if(n.from!=='SOURCE:MAIN/N'||n.to!=='GROUP:'+group.id+'/IN-N')
   add('RCD_NEUTRAL_INPUT_STALE','BLOCKED',null,{groupId:group.id});
 }
 add('RCD_CONTACTS_AND_PHYSICAL_NEUTRAL_SEPARATION_UNVERIFIED','UNKNOWN');
 return {schema:'electropanel.neutral.segregation.draft.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  rows,issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epNeutralSegregationV1};
