'use strict';
// Declarative interface between an external fire system and an electrical board.
// No fire detector, alarm panel or suppression logic is designed here.
function epFireControlAuditV1(project, raw) {
 const issues=[], rows=[];
 const issue=(code,level='BLOCKED',id=null)=>issues.push({code,level,objectId:id});
 const done=()=>({schema:'electropanel.fire.control.audit.1',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':issues.length?'UNKNOWN':'DRAFT',rows,issues,engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.loads)||!raw||typeof raw!=='object'||Array.isArray(raw)) {
  issue('FIRE_CONTROL_INPUT_INVALID');return done();
 }
 const {signals,actions}=raw;
 if(Object.keys(raw).some(k=>!['signals','actions','version'].includes(k))||raw.version!==undefined&&raw.version!==1)issue('FIRE_CONTROL_SCHEMA_INVALID');
 if(!Array.isArray(signals)||!Array.isArray(actions)||signals.length>200||actions.length>800) {
  issue('FIRE_CONTROL_LIST_INVALID');return done();
 }
 const signalIds=new Set(),loadIds=new Set(),lineIds=new Set();
 const signalMap=new Map();
 for(const line of project.lines)if(typeof line?.id==='string'&&line.id)lineIds.add(line.id);
 for(const load of project.loads)if(typeof load?.id==='string'&&load.id&&lineIds.has(load.circuitId))loadIds.add(load.id);
 const idOk=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x);
 for(const s of signals) {
  if(!s||!idOk(s.id)||signalIds.has(s.id)||!['FIRE','FAULT','CONTROL_POWER_LOSS','RESET'].includes(s.kind)||!idOk(s.zoneId)||!['NO','NC'].includes(s.contactType)) {
   issue('FIRE_CONTROL_SIGNAL_INVALID','BLOCKED',s?.id??null);continue;
  }
  signalIds.add(s.id);signalMap.set(s.id,s);
 }
 const seen=new Set(),byLoad=new Map();
 for(const a of actions) {
  if(!a||!idOk(a.id)||seen.has(a.id)||!idOk(a.loadId)||!idOk(a.signalId)||
   !['DISCONNECT','ENABLE','MAINTAIN','EXTERNAL_CONTROL'].includes(a.action)||
   !['CONTACTOR','SHUNT_TRIP','UNDERVOLTAGE_RELEASE','INTERFACE_RELAY','EXTERNAL'].includes(a.actuator)||
   !['ENERGIZED','DEENERGIZED','UNSPECIFIED'].includes(a.onSignalLoss)) {
   issue('FIRE_CONTROL_ACTION_INVALID','BLOCKED',a?.id??null);continue;
  }
  seen.add(a.id);
  if(!loadIds.has(a.loadId))issue('FIRE_CONTROL_LOAD_ORPHAN','BLOCKED',a.id);
  if(!signalIds.has(a.signalId))issue('FIRE_CONTROL_SIGNAL_ORPHAN','BLOCKED',a.id);
  if(a.action==='DISCONNECT'&&a.actuator==='SHUNT_TRIP'&&a.onSignalLoss==='DEENERGIZED')issue('FIRE_CONTROL_SHUNT_TRIP_LOSS_NOT_PROVEN','UNKNOWN',a.id);
  if(a.actuator==='UNDERVOLTAGE_RELEASE'&&a.onSignalLoss==='ENERGIZED')issue('FIRE_CONTROL_UVR_LOSS_CONFLICT','BLOCKED',a.id);
  if(a.actuator==='SHUNT_TRIP'&&a.action==='ENABLE')issue('FIRE_CONTROL_SHUNT_CANNOT_ENABLE','BLOCKED',a.id);
  if(a.actuator==='UNDERVOLTAGE_RELEASE'&&a.action==='ENABLE')issue('FIRE_CONTROL_UVR_CANNOT_ENABLE','BLOCKED',a.id);
  if(a.action==='MAINTAIN'&&a.actuator==='SHUNT_TRIP')issue('FIRE_CONTROL_MAINTAIN_SHUNT_CONFLICT','BLOCKED',a.id);
  if(a.action==='MAINTAIN'&&a.actuator==='UNDERVOLTAGE_RELEASE')issue('FIRE_CONTROL_MAINTAIN_UVR_CONFLICT','BLOCKED',a.id);
  if(signalMap.get(a.signalId)?.kind==='RESET'&&a.action==='DISCONNECT')issue('FIRE_CONTROL_RESET_TRIP_REVIEW','UNKNOWN',a.id);
  if(a.onSignalLoss==='UNSPECIFIED')issue('FIRE_CONTROL_LOSS_STATE_UNDECLARED','UNKNOWN',a.id);
  if(a.action==='EXTERNAL_CONTROL'&&a.actuator!=='EXTERNAL')issue('FIRE_CONTROL_EXTERNAL_INTERFACE_CONFLICT','BLOCKED',a.id);
  if(a.action!=='EXTERNAL_CONTROL'&&a.actuator==='EXTERNAL')issue('FIRE_CONTROL_ACTUATOR_UNDECLARED','UNKNOWN',a.id);
  if(a.actuator==='EXTERNAL'&&a.onSignalLoss==='UNSPECIFIED')issue('FIRE_CONTROL_EXTERNAL_LOSS_STATE_REVIEW','UNKNOWN',a.id);
  if(!byLoad.has(a.loadId))byLoad.set(a.loadId,[]);
  byLoad.get(a.loadId).push(a);
  rows.push({id:a.id,loadId:a.loadId,signalId:a.signalId,action:a.action,actuator:a.actuator,onSignalLoss:a.onSignalLoss});
 }
 for(const [loadId,items] of byLoad) {
  if(items.length>32)issue('FIRE_CONTROL_EXCESSIVE_ACTIONS','BLOCKED',loadId);
  for(const signalId of new Set(items.map(x=>x.signalId))) {
   const commands=new Set(items.filter(x=>x.signalId===signalId).map(x=>x.action));
   if(commands.has('DISCONNECT')&&(commands.has('ENABLE')||commands.has('MAINTAIN')))
    issue('FIRE_CONTROL_CONFLICTING_COMMANDS','BLOCKED',loadId);
  }
 }
 return done();
}
function epFireControlAffectedCircuitsV1(project){
 const linked=new Set((project?.fireControlV1?.actions||[]).map(a=>a.loadId));
 return [...new Set((project?.loads||[]).filter(l=>linked.has(l.id)).map(l=>l.circuitId))].sort();
}
function epFireControlConsumerDeleteV1(project,id){
 if((project?.fireControlV1?.actions||[]).some(a=>a.loadId===id))
  throw Error('FIRE_CONTROL_CONSUMER_LINKED');
}
function epFireControlCircuitDeleteV1(project,id){
 if(epFireControlAffectedCircuitsV1(project).includes(id))
  throw Error('FIRE_CONTROL_CIRCUIT_LINKED');
}
function epFireControlBillV1(project){
 const audit=project?.fireControlV1?epFireControlAuditV1(project,project.fireControlV1):null;
 if(!audit)return {status:'NOT_CONFIGURED',items:[],issues:[]};
 const kinds=['CONTACTOR','SHUNT_TRIP','UNDERVOLTAGE_RELEASE','INTERFACE_RELAY'];
 const items=kinds.map(kind=>({kind,quantity:audit.rows.filter(x=>x.actuator===kind).length,articleSku:null,modules:null,selectionStatus:'REQUIRES_ENGINEER_SELECTION'})).filter(x=>x.quantity);
 return {status:audit.status,items,issues:audit.issues,engineeringApproved:false};
}
if(typeof module!=='undefined')module.exports={epFireControlAuditV1,epFireControlAffectedCircuitsV1,epFireControlConsumerDeleteV1,epFireControlCircuitDeleteV1,epFireControlBillV1};
