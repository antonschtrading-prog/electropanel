'use strict';
// Read-only convergence of device-level supply declarations with legacy feed and route records.
function epDeviceSupplyCrossEvidenceV1(project){
 const issues=[],rows=[],add=(code,level='UNKNOWN',extra={})=>issues.push({code,level,...extra});
 const finish=()=>({schema:'electropanel.device.supply.cross.evidence.1',
  status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  rows,issues,physicalContinuity:'NOT_VERIFIED',selectivityStatus:'NOT_ASSESSED',
  engineeringApproved:false,ready_for_installation:false});
 if(!project||typeof epDeviceSupplyAuditV1!=='function'){
  add('SUPPLY_CROSS_ENGINE_UNAVAILABLE','BLOCKED');return finish();
 }
 const graph=epDeviceSupplyAuditV1(project);
 if(graph.status==='BLOCKED'){add('SUPPLY_CROSS_GRAPH_BLOCKED','BLOCKED');return finish();}
 if(!project.deviceSupplyV1){add('SUPPLY_CROSS_DEVICE_PATH_UNDECLARED');return finish();}
 const lines=Array.isArray(project.lines)?project.lines:[],
  branches=new Map((project.branchDevices||[]).map(b=>[b.circuitId,b])),
  routes=Array.isArray(project.conductorRoutes)?project.conductorRoutes:[],
  feeds=Array.isArray(project.feedLinks)?project.feedLinks:[],
  groups=Array.isArray(project.sharedDevices)?project.sharedDevices:[],
  groupInputs=Array.isArray(project.groupInputLinks)?project.groupInputLinks:[];
 const parent=new Map(graph.edges.map(x=>[x.to,x]));
 const groupByCircuit=new Map();
 for(const g of groups)for(const circuitId of g.circuitIds||[])groupByCircuit.set(circuitId,g.id);
 for(const line of lines){
  const id=line?.id,branch=branches.get(id);
  if(!branch){add('SUPPLY_CROSS_BRANCH_UNDECLARED','UNKNOWN',{circuitId:id});continue;}
  const edge=parent.get('BRANCH:'+branch.id),
   route=routes.find(x=>x?.circuitId===id),
   legacy=feeds.filter(x=>x?.circuitId===id),
   phases=line.phase==='3Ф'?['L1','L2','L3']:
    ['L1','L2','L3'].includes(line.phase)?[line.phase]:[];
  const record={circuitId:id,upstream:edge?.from??null,
   deviceConductors:edge?.conductors??[],legacyCount:legacy.length,
   routeDeclared:!!route,comparison:'NOT_VERIFIED'};
  rows.push(record);
  if(!edge){add('SUPPLY_CROSS_BRANCH_PARENT_MISSING','UNKNOWN',{circuitId:id});continue;}
  if(!phases.length){add('SUPPLY_CROSS_PHASE_UNKNOWN','UNKNOWN',{circuitId:id});continue;}
  for(const k of phases)if(!edge.conductors.includes(k))
   add('SUPPLY_CROSS_BRANCH_PHASE_CONFLICT','BLOCKED',{circuitId:id,kind:k});
  if(route){
   const routePhases=route.phaseConductors;
   if(!Array.isArray(routePhases)){
    add('SUPPLY_CROSS_ROUTE_INVALID','BLOCKED',{circuitId:id});
   }else for(const kind of phases)if(!routePhases.includes(kind))
    add('SUPPLY_CROSS_ROUTE_PHASE_CONFLICT','BLOCKED',{circuitId:id,kind});
  }else add('SUPPLY_CROSS_ROUTE_UNDECLARED','UNKNOWN',{circuitId:id});
  const groupId=groupByCircuit.get(id);
  if(groupId&&edge.from!=='GROUP:'+groupId)
   add('SUPPLY_CROSS_GROUP_PARENT_CONFLICT','BLOCKED',{circuitId:id});
  for(const f of legacy){
   if(!['L1','L2','L3','N'].includes(f.kind)){
    add('SUPPLY_CROSS_LEGACY_KIND_INVALID','BLOCKED',{circuitId:id});continue;
   }
   if(f.kind!=='N'&&!edge.conductors.includes(f.kind))
    add('SUPPLY_CROSS_LEGACY_PHASE_CONFLICT','BLOCKED',{circuitId:id,kind:f.kind});
   const fromExpected=groupId?'GROUP:'+groupId+'/OUT-'+f.kind:'SOURCE:MAIN/'+f.kind;
   if(f.from!==fromExpected)
    add('SUPPLY_CROSS_LEGACY_ORIGIN_STALE','BLOCKED',{circuitId:id,kind:f.kind});
  }
  if(legacy.length)
   add('SUPPLY_CROSS_LEGACY_FEED_SYMBOLIC_ONLY','UNKNOWN',{circuitId:id});
 }
 for(const group of groups){
  const edge=parent.get('GROUP:'+group.id);
  if(!edge){add('SUPPLY_CROSS_GROUP_PARENT_MISSING','UNKNOWN',{objectId:group.id});continue;}
  for(const input of groupInputs.filter(x=>x?.groupId===group.id)){
   if(!edge.conductors.includes(input.kind))
    add('SUPPLY_CROSS_GROUP_INPUT_PHASE_CONFLICT','BLOCKED',
     {objectId:group.id,kind:input.kind});
  }
 }
 if(graph.edges.length)add('SUPPLY_CROSS_TERMINAL_AND_MANUFACTURER_EVIDENCE_REQUIRED');
 return finish();
}
function epDeviceSupplyCrossEvidenceHtmlV1(report){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=(report?.rows||[]).slice(0,200).map(x=>'<tr><td>'+esc(x.circuitId)+
  '</td><td>'+esc(x.upstream??'—')+'</td><td>'+esc(x.deviceConductors.join(', '))+
  '</td><td>'+esc(x.legacyCount)+'</td><td>'+esc(x.routeDeclared?'Да':'Нет')+'</td></tr>').join('');
 return '<details class="ep-device-supply-cross"><summary>Сверка питания с прежними схемами · '+
  esc(report?.status??'UNKNOWN')+'</summary><p class="muted">Сравниваются декларации фаз и источников. Совпадение не доказывает монтаж или селективность.</p>'+
  '<div class="table-scroll"><table><thead><tr><th>Цепь</th><th>Родитель</th><th>Фазы</th><th>Старые связи</th><th>Маршрут</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="5">Данные не заявлены</td></tr>')+'</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDeviceSupplyCrossEvidenceV1,epDeviceSupplyCrossEvidenceHtmlV1};
