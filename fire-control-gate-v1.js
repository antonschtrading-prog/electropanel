'use strict';
// Consolidated safety gate for fire-interface changes, independent of visual previews.
function epFireControlGateV1(project,lookupSku){
 const audit=typeof epFireControlAuditV1==='function'?epFireControlAuditV1(project,project?.fireControlV1):null;
 if(!project?.fireControlV1)return {schema:'electropanel.fire.gate.1',status:'NOT_CONFIGURED',checks:[],issues:[],engineeringApproved:false};
 const engines=[
  ['SCENARIO',()=>audit],
  ['DESIGN',()=>epFireControlDesignV1(project)],
  ['TRACE',()=>epFireControlTraceV1(project)],
  ['SCHEDULE',()=>epFireControlScheduleV1(project)],
  ['CATALOGUE',()=>epFireCatalogReconcileV1(project,lookupSku)],
  ['DIN',()=>epFireDinReconcileV1(project)],
  ['CHECKLIST_50',()=>epFireControlChecklistV1(project)]
 ];
 const checks=[],issues=[];
 for(const [name,fn] of engines){
  try{
   const result=fn();
   checks.push({name,status:result?.status??'BLOCKED',issueCount:result?.issues?.length??0});
   for(const item of result?.issues||[])issues.push({...item,source:name});
  }catch(_){
   checks.push({name,status:'BLOCKED',issueCount:1});
   issues.push({code:'FIRE_GATE_'+name+'_FAILED',level:'BLOCKED',source:name});
  }
 }
 const blocked=checks.some(x=>x.status==='BLOCKED');
 return {schema:'electropanel.fire.gate.1',status:blocked?'BLOCKED':'REVIEW_REQUIRED',
  checks,issues,engineeringApproved:false,ready_for_installation:false,
  requiredReview:['EXTERNAL_FIRE_SYSTEM_INTERFACE','FAIL_SAFE_AND_RESET','CONTROL_POWER','ACTUATOR_COMPATIBILITY','DIN_AND_THERMAL_CLEARANCES','TERMINALS_AND_WIRING','SCHEMATIC','BOM']};
}
if(typeof module!=='undefined')module.exports={epFireControlGateV1};
