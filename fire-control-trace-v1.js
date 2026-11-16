'use strict';
// Traceability projection, not a circuit wiring diagram or device selection.
function epFireControlTraceV1(project){
 if(typeof epFireControlAuditV1!=='function')throw Error('FIRE_CONTROL_AUDIT_MISSING');
 const raw=project?.fireControlV1;
 if(!raw)return {schema:'electropanel.fire.trace.1',status:'NOT_CONFIGURED',rows:[],issues:[],engineeringApproved:false};
 const audit=epFireControlAuditV1(project,raw);
 const loads=new Map((project.loads||[]).map(x=>[x.id,x]));
 const lines=new Map((project.lines||[]).map(x=>[x.id,x]));
 const signals=new Map((raw.signals||[]).map(x=>[x.id,x]));
 const rows=audit.rows.map(x=>{
  const load=loads.get(x.loadId),line=lines.get(load?.circuitId),signal=signals.get(x.signalId);
  return {actionId:x.id,zoneId:signal?.zoneId??null,signalId:x.signalId,signalKind:signal?.kind??null,
   contactType:signal?.contactType??null,consumerId:x.loadId,circuitId:load?.circuitId??null,
   circuitName:line?.name??null,action:x.action,actuator:x.actuator,onSignalLoss:x.onSignalLoss,
   terminalAssignment:'NOT_DECLARED',controlPower:'NOT_DECLARED',articleSku:null,
   wiringStatus:'NOT_DESIGNED',dinStatus:'NOT_PLACED'};
 });
 const issues=[...audit.issues];
 for(const row of rows){
  if(!row.circuitId)issues.push({code:'FIRE_TRACE_CIRCUIT_MISSING',level:'BLOCKED',objectId:row.actionId});
  if(!row.zoneId)issues.push({code:'FIRE_TRACE_ZONE_MISSING',level:'BLOCKED',objectId:row.actionId});
  issues.push({code:'FIRE_TRACE_CONTROL_POWER_UNDECLARED',level:'UNKNOWN',objectId:row.actionId});
  issues.push({code:'FIRE_TRACE_TERMINAL_ASSIGNMENT_UNDECLARED',level:'UNKNOWN',objectId:row.actionId});
  issues.push({code:'FIRE_TRACE_ACTUATOR_ARTICLE_UNSELECTED',level:'UNKNOWN',objectId:row.actionId});
 }
 return {schema:'electropanel.fire.trace.1',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  rows,issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epFireControlTraceV1};
