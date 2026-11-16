'use strict';
// Non-normative control schematic schedule from engineer-declared design evidence.
function epFireControlScheduleV1(project){
 if(typeof epFireControlDesignV1!=='function'||typeof epFireControlTraceV1!=='function')
  throw Error('FIRE_SCHEDULE_DEPENDENCY_MISSING');
 const design=epFireControlDesignV1(project),trace=epFireControlTraceV1(project);
 if(design.status==='NOT_CONFIGURED')return {schema:'electropanel.fire.schedule.1',status:'NOT_CONFIGURED',circuits:[],devices:[],terminals:[],issues:[],engineeringApproved:false};
 const byAction=new Map(design.rows.map(x=>[x.actionId,x]));
 const circuits=[],devices=[],terminals=[],issues=[...design.issues];
 for(const row of trace.rows){
  const item=byAction.get(row.actionId);
  if(!item){issues.push({code:'FIRE_SCHEDULE_ACTION_MISSING',level:'BLOCKED',objectId:row.actionId});continue;}
  circuits.push({id:row.actionId,signalId:row.signalId,zoneId:row.zoneId,
   consumerId:row.consumerId,circuitId:row.circuitId,command:row.action,
   contactType:row.contactType,actuator:item.actuator,
   controlSupplyId:item.controlSupplyId,controlVoltageV:item.controlVoltageV,
   wireReference:item.wireReference,connectionState:'DRAFT_UNVERIFIED'});
  if(item.deviceId)devices.push({id:item.deviceId,actionId:item.actionId,actuator:item.actuator,
   articleSku:item.articleSku,railId:item.dinRailId,startModule:item.dinStartModule,
   widthModules:item.moduleWidth,selectedByEngineer:item.reviewed});
  for(const terminalId of item.terminalIds||[])
   terminals.push({terminalId,actionId:item.actionId,deviceId:item.deviceId,wireReference:item.wireReference});
 }
 const terminalOwners=new Map();
 for(const terminal of terminals){
  if(terminalOwners.has(terminal.terminalId))
   issues.push({code:'FIRE_SCHEDULE_TERMINAL_REUSED',level:'BLOCKED',objectId:terminal.actionId});
  terminalOwners.set(terminal.terminalId,terminal.actionId);
 }
 const bySku=new Map();
 for(const d of devices)if(d.articleSku){
  const key=d.articleSku+'|'+d.actuator;
  if(!bySku.has(key))bySku.set(key,{articleSku:d.articleSku,actuator:d.actuator,quantity:0,reviewedQuantity:0});
  const item=bySku.get(key);item.quantity++;if(d.selectedByEngineer)item.reviewedQuantity++;
 }
 return {schema:'electropanel.fire.schedule.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',circuits,devices,terminals,
  preliminaryBom:[...bySku.values()],issues,engineeringApproved:false,ready_for_installation:false,
  note:'CONTROL SCHEMATIC SCHEDULE ONLY; no physical wiring or normative approval is inferred.'};
}
if(typeof module!=='undefined')module.exports={epFireControlScheduleV1};
