'use strict';
// Reconcile declared device supply with independently declared terminal and wire models.
// Never create terminals/wires, infer contacts, or equate a drawn wire with certified continuity.
function epDeviceSupplyTerminalReconciliationV1(project){
 const issues=[],rows=[],add=(code,level='UNKNOWN',detail={})=>issues.push({code,level,...detail});
 const result=()=>({schema:'electropanel.device.supply.terminal.reconciliation.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',rows,issues,
  physicalContinuity:'NOT_VERIFIED',selectivityStatus:'NOT_ASSESSED',
  engineeringApproved:false,ready_for_installation:false});
 if(!project||typeof epDeviceSupplyAuditV1!=='function'){
  add('SUPPLY_TERMINAL_PROJECT_OR_ENGINE_UNAVAILABLE','BLOCKED');return result();
 }
 const supply=epDeviceSupplyAuditV1(project);
 if(supply.status==='BLOCKED'){
  add('SUPPLY_TERMINAL_UPSTREAM_GRAPH_BLOCKED','BLOCKED');return result();
 }
 if(!project.deviceSupplyV1){add('SUPPLY_TERMINAL_GRAPH_UNDECLARED');return result();}
 const model=project.deviceModelV19,wiring=project.wiringModelV18;
 if(!model||!Array.isArray(model.devices)||!Array.isArray(model.terminals)){
  add('SUPPLY_TERMINAL_MODEL_UNDECLARED');return result();
 }
 const bindings=project.boardBindingsV1;
 if(!Array.isArray(bindings)){
  add('SUPPLY_TERMINAL_BOARD_BINDINGS_UNDECLARED');return result();
 }
 const bound=new Map(),used=new Set();
 for(const b of bindings){
  if(!b||typeof b.boardDeviceId!=='string'||typeof b.modelDeviceId!=='string'||
   bound.has(b.boardDeviceId)||used.has(b.modelDeviceId)){
   add('SUPPLY_TERMINAL_BOARD_BINDING_DUPLICATE_OR_INVALID','BLOCKED');continue;
  }
  bound.set(b.boardDeviceId,b.modelDeviceId);used.add(b.modelDeviceId);
 }
 const incomingModels=new Map(),occupied=new Set(bound.values());
 if(project.incomingTerminalBindingsV1!==undefined){
  if(typeof epIncomingTerminalBindingsAuditV1!=='function')
   add('SUPPLY_TERMINAL_INCOMING_AUDIT_UNAVAILABLE','BLOCKED');
  else{
   const report=epIncomingTerminalBindingsAuditV1(project);
   if(report.status==='BLOCKED')
    add('SUPPLY_TERMINAL_INCOMING_BINDING_AUDIT_BLOCKED','BLOCKED');
   for(const row of report.rows){
    if(row.snapshotStale||row.modelReused)continue;
    if(occupied.has(row.modelDeviceId)){
     add('SUPPLY_TERMINAL_MODEL_ID_REUSED','BLOCKED',{objectId:row.incomingId});
     continue;
    }
    occupied.add(row.modelDeviceId);
    incomingModels.set(row.incomingId,row.modelDeviceId);
   }
  }
 }
 const deviceById=new Map(),termById=new Map(),byDevice=new Map();
 for(const d of model.devices){
  if(!d||typeof d.id!=='string'||deviceById.has(d.id)){add('SUPPLY_TERMINAL_DEVICE_INVALID','BLOCKED');continue;}
  deviceById.set(d.id,d);
 }
 for(const t of model.terminals){
  if(!t||typeof t.id!=='string'||typeof t.device_id!=='string'||
   typeof t.conductor!=='string'||termById.has(t.id)){
   add('SUPPLY_TERMINAL_TERMINAL_INVALID','BLOCKED');continue;
  }
  termById.set(t.id,t);
  if(!byDevice.has(t.device_id))byDevice.set(t.device_id,new Map());
  const roles=byDevice.get(t.device_id);
  if(!roles.has(t.conductor))roles.set(t.conductor,[]);
  roles.get(t.conductor).push(t.id);
 }
 const mapNode=id=>{
  if(id==='SOURCE:MAIN')return {modelId:null,source:true};
  const parts=id.split(':');
  if(parts.length!==2)return {modelId:null,source:false};
  if(parts[0]==='INCOMING'){
   const modelId=incomingModels.get(parts[1])||null;
   return {modelId,source:false,incoming:true};
  }
  if(!['GROUP','BRANCH'].includes(parts[0]))return {modelId:null,source:false};
  const modelId=bound.get(parts[1])||null;
  return {modelId,source:false};
 };
 const wires=new Set(),wireRoles=[];
 if(wiring&&Array.isArray(wiring.wires)&&Array.isArray(wiring.terminals)){
  const actual=new Map();
  for(const t of wiring.terminals){
   if(!t||typeof t.id!=='string'||actual.has(t.id)){
    add('SUPPLY_TERMINAL_WIRING_TERMINAL_INVALID','BLOCKED');continue;
   }
   actual.set(t.id,t);
  }
  for(const [id,t] of actual){
   const declared=termById.get(id);
   if(!declared||declared.conductor!==t.conductor||
     declared.device_id!==t.device_id)
    add('SUPPLY_TERMINAL_WIRING_IDENTITY_MISMATCH','BLOCKED',{terminalId:id});
  }
  for(const w of wiring.wires){
   if(typeof w?.from!=='string'||typeof w?.to!=='string'){
    add('SUPPLY_TERMINAL_WIRE_INVALID','BLOCKED');continue;
   }
   const a=actual.get(w.from),b=actual.get(w.to);
   if(!a||!b){
    add('SUPPLY_TERMINAL_WIRE_ENDPOINT_UNKNOWN','BLOCKED');continue;
   }
   if(a.conductor!==b.conductor)wireRoles.push({a:w.from,b:w.to});
   if(!termById.has(w.from)||!termById.has(w.to))continue;
   wires.add(JSON.stringify([w.from,w.to].sort()));
  }
 }else add('SUPPLY_TERMINAL_WIRING_MODEL_UNDECLARED');
 for(const link of supply.edges){
  const upstream=mapNode(link.from),downstream=mapNode(link.to);
  const row={from:link.from,to:link.to,conductors:link.conductors.slice(),
   fromModelDeviceId:upstream.modelId,toModelDeviceId:downstream.modelId,
   declaredDirectWires:0,verification:'NOT_VERIFIED'};
  rows.push(row);
  if((upstream.incoming&&!upstream.modelId)||(downstream.incoming&&!downstream.modelId))
   add('SUPPLY_TERMINAL_INCOMING_BINDING_REQUIRED','UNKNOWN',{objectId:link.to});
  if(!upstream.source&&!upstream.modelId&&!upstream.incoming)
   add('SUPPLY_TERMINAL_SOURCE_BOARD_BINDING_MISSING','UNKNOWN',{objectId:link.from});
  if(!downstream.modelId&&!downstream.incoming)
   add('SUPPLY_TERMINAL_TARGET_BOARD_BINDING_MISSING','UNKNOWN',{objectId:link.to});
  if(upstream.modelId&&!deviceById.has(upstream.modelId))
   add('SUPPLY_TERMINAL_SOURCE_MODEL_DEVICE_MISSING','BLOCKED',{objectId:link.from});
  if(downstream.modelId&&!deviceById.has(downstream.modelId))
   add('SUPPLY_TERMINAL_TARGET_MODEL_DEVICE_MISSING','BLOCKED',{objectId:link.to});
  for(const role of link.conductors){
   if(upstream.modelId&&deviceById.has(upstream.modelId)&&
    !(byDevice.get(upstream.modelId)?.get(role)||[]).length)
    add('SUPPLY_TERMINAL_SOURCE_ROLE_MISSING','UNKNOWN',{objectId:link.from,kind:role});
   if(downstream.modelId&&deviceById.has(downstream.modelId)&&
    !(byDevice.get(downstream.modelId)?.get(role)||[]).length)
    add('SUPPLY_TERMINAL_TARGET_ROLE_MISSING','UNKNOWN',{objectId:link.to,kind:role});
   if(upstream.modelId&&downstream.modelId){
    const a=byDevice.get(upstream.modelId)?.get(role)||[];
    const b=byDevice.get(downstream.modelId)?.get(role)||[];
    for(const left of a)for(const right of b)
     if(wires.has(JSON.stringify([left,right].sort())))row.declaredDirectWires++;
   }
  }
  if(row.declaredDirectWires)
   add('SUPPLY_TERMINAL_DIRECT_WIRES_DECLARED_ONLY','UNKNOWN',{objectId:link.to});
  else add('SUPPLY_TERMINAL_DIRECT_WIRE_UNPROVEN','UNKNOWN',{objectId:link.to});
 }
 for(const conflict of wireRoles)
  add('SUPPLY_TERMINAL_WIRE_ROLE_CONFLICT','BLOCKED',{terminalFrom:conflict.a,terminalTo:conflict.b});
 add('SUPPLY_TERMINAL_PHYSICAL_AND_CONTACT_PROOF_REQUIRED');
 return result();
}
function epDeviceSupplyTerminalHtmlV1(report){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report||!Array.isArray(report.rows))return '<p>Сверка клемм питания недоступна.</p>';
 const rows=report.rows.slice(0,180).map(x=>'<tr><td>'+esc(x.from)+'</td><td>'+esc(x.to)+
  '</td><td>'+esc(x.conductors.join(', '))+'</td><td>'+esc(x.fromModelDeviceId||'—')+
  '</td><td>'+esc(x.toModelDeviceId||'—')+'</td><td>'+esc(x.declaredDirectWires)+
  '</td><td>'+esc(x.verification)+'</td></tr>').join('');
 return '<details class="ep-device-supply-terminals"><summary>Сверка питания и клемм · '+
  report.rows.length+' связей · '+esc(report.status)+'</summary>'+
  '<p class="muted">Прямые провода считаются только среди заявленных терминалов одинакового проводника. Контакты аппаратов, обходные шины и физическая целостность не выводятся автоматически.</p>'+
  '<div class="table-scroll"><table><thead><tr><th>От</th><th>К</th><th>Проводники</th><th>Устройство модели 1</th><th>Устройство модели 2</th><th>Прямые провода</th><th>Статус</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="7">Нет заявленных связей</td></tr>')+'</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epDeviceSupplyTerminalReconciliationV1,epDeviceSupplyTerminalHtmlV1};
