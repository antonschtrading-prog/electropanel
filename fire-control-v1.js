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
 if(!Array.isArray(signals)||!Array.isArray(actions)||signals.length>200||actions.length>800) {
  issue('FIRE_CONTROL_LIST_INVALID');return done();
 }
 const signalIds=new Set(),loadIds=new Set(),lineIds=new Set();
 for(const line of project.lines)if(typeof line?.id==='string'&&line.id)lineIds.add(line.id);
 for(const load of project.loads)if(typeof load?.id==='string'&&load.id&&lineIds.has(load.circuitId))loadIds.add(load.id);
 const idOk=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x);
 for(const s of signals) {
  if(!s||!idOk(s.id)||signalIds.has(s.id)||!['FIRE','FAULT','CONTROL_POWER_LOSS','RESET'].includes(s.kind)||!idOk(s.zoneId)||!['NO','NC'].includes(s.contactType)) {
   issue('FIRE_CONTROL_SIGNAL_INVALID','BLOCKED',s?.id??null);continue;
  }
  signalIds.add(s.id);
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
  if(a.onSignalLoss==='UNSPECIFIED')issue('FIRE_CONTROL_LOSS_STATE_UNDECLARED','UNKNOWN',a.id);
  if(a.action==='EXTERNAL_CONTROL'&&a.actuator!=='EXTERNAL')issue('FIRE_CONTROL_EXTERNAL_INTERFACE_CONFLICT','BLOCKED',a.id);
  if(a.action!=='EXTERNAL_CONTROL'&&a.actuator==='EXTERNAL')issue('FIRE_CONTROL_ACTUATOR_UNDECLARED','UNKNOWN',a.id);
  if(!byLoad.has(a.loadId))byLoad.set(a.loadId,[]);
  byLoad.get(a.loadId).push(a);
  rows.push({id:a.id,loadId:a.loadId,signalId:a.signalId,action:a.action,actuator:a.actuator,onSignalLoss:a.onSignalLoss});
 }
 for(const [loadId,items] of byLoad) {
  for(const signalId of new Set(items.map(x=>x.signalId))) {
   const commands=new Set(items.filter(x=>x.signalId===signalId).map(x=>x.action));
   if(commands.has('DISCONNECT')&&(commands.has('ENABLE')||commands.has('MAINTAIN')))
    issue('FIRE_CONTROL_CONFLICTING_COMMANDS','BLOCKED',loadId);
  }
 }
 return done();
}
if(typeof module!=='undefined')module.exports={epFireControlAuditV1};
