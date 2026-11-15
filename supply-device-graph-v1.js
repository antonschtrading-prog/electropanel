'use strict';
// Read-only symbolic supply graph. It reconciles existing declarations; never
// infers conductor continuity, terminal numbers, selectivity or safe installation.
function epSupplyDeviceGraphV1(project){
 const nodes=[],edges=[],issues=[];
 const add=(code,level='UNKNOWN',detail={})=>issues.push({code,level,...detail});
 const finish=()=>({schema:'electropanel.supply.device.graph.1',nodes,edges,issues,
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  physicalContinuity:'NOT_VERIFIED',selectivityStatus:'NOT_ASSESSED',
  engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||project.lines.length>400||
  !Array.isArray(project.sharedDevices)||project.sharedDevices.length>100){
  add('SUPPLY_GRAPH_PROJECT_INVALID','BLOCKED');return finish();
 }
 const ids=new Set(),lines=new Map(),branches=new Map(),groups=new Map();
 const node=(id,kind,extra={})=>{
  if(typeof id!=='string'||!id||ids.has(id)){add('SUPPLY_GRAPH_DEVICE_ID_DUPLICATE','BLOCKED',{objectId:id??null});return;}
  ids.add(id);nodes.push({id,kind,...extra});
 };
 node('SOURCE:MAIN','SOURCE',{verification:'DECLARED_SOURCE_ONLY'});
 for(const line of project.lines){
  if(!line||typeof line.id!=='string'||!line.id||lines.has(line.id)){
   add('SUPPLY_GRAPH_CIRCUIT_INVALID_OR_DUPLICATE','BLOCKED');continue;
  }
  lines.set(line.id,line);
 }
 const branchList=project.branchDevices;
 if(!Array.isArray(branchList)||project.branchModelVersion!==1)
  add('SUPPLY_GRAPH_BRANCH_MODEL_UNAVAILABLE');
 else for(const b of branchList){
  if(!b||typeof b.circuitId!=='string'||!lines.has(b.circuitId)||
   branches.has(b.circuitId)||typeof b.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(b.id)){
   add('SUPPLY_GRAPH_BRANCH_INVALID','BLOCKED');continue;
  }
  branches.set(b.circuitId,b);node('BRANCH:'+b.id,'BRANCH',{circuitId:b.circuitId,
   catalogSku:lines.get(b.circuitId).catalogSku??null});
 }
 for(const g of project.sharedDevices){
  if(!g||typeof g.id!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(g.id)||
   groups.has(g.id)||!Array.isArray(g.circuitIds)){
   add('SUPPLY_GRAPH_GROUP_INVALID','BLOCKED');continue;
  }
  groups.set(g.id,g);node('GROUP:'+g.id,'GROUP_RCD',
   {catalogSku:g.catalogSku??null,protects:g.circuitIds.slice()});
 }
 const memberships=new Map();
 for(const g of groups.values())for(const circuitId of g.circuitIds){
  if(!lines.has(circuitId))add('SUPPLY_GRAPH_GROUP_UNKNOWN_CIRCUIT','BLOCKED',{objectId:g.id,circuitId});
  else if(memberships.has(circuitId))
   add('SUPPLY_GRAPH_MULTIPLE_GROUP_PARENTS','BLOCKED',{circuitId});
  else memberships.set(circuitId,g.id);
 }
 const expected=phase=>phase==='3Ф'?['L1','L2','L3','N']:
  ['L1','L2','L3'].includes(phase)?[phase,'N']:[];
 const feeds=project.feedLinks,inputs=project.groupInputLinks;
 if(!Array.isArray(feeds)||!Array.isArray(inputs)){
  add('SUPPLY_GRAPH_FEED_COLLECTION_MISSING');return finish();
 }
 const feedMap=new Map(),inputMap=new Map();
 for(const f of feeds){
  if(!f||typeof f.circuitId!=='string'||typeof f.kind!=='string'||
   !lines.has(f.circuitId)||!['L1','L2','L3','N'].includes(f.kind)){
   add('SUPPLY_GRAPH_FEED_INVALID','BLOCKED');continue;
  }
  const key=f.circuitId+'|'+f.kind;
  if(feedMap.has(key)){add('SUPPLY_GRAPH_FEED_DUPLICATED','BLOCKED',{circuitId:f.circuitId});continue;}
  feedMap.set(key,f);
 }
 for(const f of inputs){
  if(!f||typeof f.groupId!=='string'||typeof f.kind!=='string'||
   !groups.has(f.groupId)||!['L1','L2','L3','N'].includes(f.kind)){
   add('SUPPLY_GRAPH_GROUP_INPUT_INVALID','BLOCKED');continue;
  }
  const key=f.groupId+'|'+f.kind;
  if(inputMap.has(key)){add('SUPPLY_GRAPH_GROUP_INPUT_DUPLICATED','BLOCKED',{objectId:f.groupId});continue;}
  inputMap.set(key,f);
 }
 for(const [id,g] of groups){
  const kinds=new Set();
  for(const c of g.circuitIds)for(const phase of expected(lines.get(c)?.phase))kinds.add(phase);
  if(!kinds.size)add('SUPPLY_GRAPH_GROUP_PHASES_UNKNOWN','UNKNOWN',{objectId:id});
  for(const phase of kinds){
   const input=inputMap.get(id+'|'+phase);
   if(!input){add('SUPPLY_GRAPH_GROUP_INPUT_MISSING','UNKNOWN',{objectId:id,kind:phase});continue;}
   if(input.id!=='GI:'+id+':'+phase||
      input.from!=='SOURCE:MAIN/'+phase||input.to!=='GROUP:'+id+'/IN-'+phase||
      input.origin!=='explicit-group-input'){
    add('SUPPLY_GRAPH_GROUP_INPUT_CONFLICT','BLOCKED',{objectId:id,kind:phase});continue;
   }
   edges.push({from:'SOURCE:MAIN',to:'GROUP:'+id,kind:phase,sourceId:input.id,
    evidence:'DECLARED_SYMBOLIC',physicalContinuity:'NOT_VERIFIED'});
  }
  for(const f of inputs.filter(x=>x?.groupId===id))if(!kinds.has(f.kind))
   add('SUPPLY_GRAPH_GROUP_INPUT_EXTRA','BLOCKED',{objectId:id,kind:f.kind});
 }
 for(const [id,line] of lines){
  const b=branches.get(id),kinds=expected(line.phase);
  if(!b){add('SUPPLY_GRAPH_BRANCH_MISSING','UNKNOWN',{circuitId:id});continue;}
  if(!kinds.length){add('SUPPLY_GRAPH_PHASE_UNDECLARED','UNKNOWN',{circuitId:id});continue;}
  const groupId=memberships.get(id);
  const source=groupId?'GROUP:'+groupId:'SOURCE:MAIN';
  for(const phase of kinds){
   const f=feedMap.get(id+'|'+phase);
   if(!f){add('SUPPLY_GRAPH_BRANCH_FEED_MISSING','UNKNOWN',{circuitId:id,kind:phase});continue;}
   const from=groupId?'GROUP:'+groupId+'/'+(phase==='N'?'OUT-N':'OUT-'+phase):'SOURCE:MAIN/'+phase;
   const to=phase==='N'?'BUS:N_'+(groupId||'MAIN')+'/N':
    'BRANCH:'+b.id+'/IN-'+phase;
   if(f.id!=='F:'+id+':'+phase||f.from!==from||f.to!==to||
     f.origin!=='explicit-feed-declaration'){
    add('SUPPLY_GRAPH_BRANCH_FEED_CONFLICT','BLOCKED',{circuitId:id,kind:phase});continue;
   }
   edges.push({from:source,to:phase==='N'?'BUS:N_'+(groupId||'MAIN'):'BRANCH:'+b.id,
    circuitId:id,kind:phase,sourceId:f.id,evidence:'DECLARED_SYMBOLIC',
    physicalContinuity:'NOT_VERIFIED'});
  }
  for(const f of feeds.filter(x=>x?.circuitId===id))if(!kinds.includes(f.kind))
   add('SUPPLY_GRAPH_BRANCH_FEED_EXTRA','BLOCKED',{circuitId:id,kind:f.kind});
 }
 if(!Array.isArray(project.protectionLinks))add('SUPPLY_GRAPH_PROTECTION_RELATIONS_UNDECLARED');
 else for(const pair of project.protectionLinks){
  if(!pair||!lines.has(pair.downstreamLineId)||!lines.has(pair.upstreamLineId)){
   add('SUPPLY_GRAPH_PROTECTION_RELATION_INVALID','BLOCKED');continue;
  }
  // Existing symbolic feed model cannot represent BRANCH -> BRANCH paths.
  // A declaration is not a verified contradiction, and cannot be used as proof.
  add('SUPPLY_GRAPH_PROTECTION_PATH_UNREPRESENTED','UNKNOWN',
   {circuitId:pair.downstreamLineId,upstreamLineId:pair.upstreamLineId});
 }
 return finish();
}
function epSupplyDeviceGraphHtmlV1(report){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report||!Array.isArray(report.edges))return '<p>Проверка питания недоступна.</p>';
 const rows=report.edges.slice(0,150).map(e=>'<tr><td>'+esc(e.from)+'</td><td>'+
  esc(e.to)+'</td><td>'+esc(e.kind)+'</td><td>'+esc(e.sourceId)+
  '</td><td>'+esc(e.physicalContinuity)+'</td></tr>').join('');
 return '<details class="ep-supply-device-graph"><summary>Модель питания · '+
  report.nodes.length+' узлов / '+report.edges.length+' связей · '+esc(report.status)+
  '</summary><p class="muted">Только заявленные проводники. Отсутствие ошибок не доказывает соединение, работу защиты или селективность.</p>'+
  '<div class="table-scroll"><table><thead><tr><th>От</th><th>К</th><th>L/N</th><th>Декларация</th><th>Контакт</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="5">Связи отсутствуют</td></tr>')+'</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epSupplyDeviceGraphV1,epSupplyDeviceGraphHtmlV1};
