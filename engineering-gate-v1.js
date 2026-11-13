'use strict';
// Combined declaration gate. Conservative status: never a normative approval.
function epEngineeringGateV1(project, lookupSku){
 const issues=[],components={};
 const add=(origin,code,level)=>issues.push({origin,code,level});
 function inspect(name,fn){
  try{
   const r=fn();
   components[name]={status:r?.status??'UNKNOWN',engineeringApproved:false};
   for(const issue of r?.issues||[]){
    const code=typeof issue==='string'?issue:issue.code||'UNSPECIFIED';
    const level=typeof issue==='string'?'UNKNOWN':issue.level||'UNKNOWN';
    add(name,code,level);
   }
   if(r?.status==='BLOCKED'&&!issues.some(i=>i.origin===name&&i.level==='BLOCKED'))
    add(name,'COMPONENT_BLOCKED','BLOCKED');
   else if(r?.status!=='BLOCKED')add(name,'ENGINEERING_EVIDENCE_INCOMPLETE','UNKNOWN');
  }catch(e){
   components[name]={status:'BLOCKED',engineeringApproved:false};
   add(name,'AUDIT_EXECUTION_FAILED','BLOCKED');
  }
 }
 if(typeof epBoardBindingsAuditV1==='function')
  inspect('board',()=>epBoardBindingsAuditV1(project,lookupSku));
 else add('board','BOARD_AUDIT_UNAVAILABLE','UNKNOWN');
 if(typeof epTopologyBatchAuditV1==='function')
  inspect('topology',()=>epTopologyBatchAuditV1(project));
 else add('topology','TOPOLOGY_AUDIT_UNAVAILABLE','UNKNOWN');
 if(typeof epWiringDeviceModelConsistencyV19==='function'){
  inspect('model_consistency',()=>{
   const r=epWiringDeviceModelConsistencyV19(project?.wiringModelV18,project?.deviceModelV19);
   return {status:r.status,issues:(r.issues||[]).map(code=>({code,
    level:r.status==='BLOCKED'?'BLOCKED':'UNKNOWN'}))};
  });
 }else add('model_consistency','MODEL_CONSISTENCY_UNAVAILABLE','UNKNOWN');
 if(typeof epCatalogEvidenceAuditV1==='function')
  inspect('catalog',()=>epCatalogEvidenceAuditV1(project,lookupSku));
 else add('catalog','CATALOG_EVIDENCE_AUDIT_UNAVAILABLE','UNKNOWN');
 if(typeof epDinPlacementAuditV1==='function')
  inspect('din_placement',()=>epDinPlacementAuditV1(project,lookupSku));
 else add('din_placement','DIN_PLACEMENT_AUDIT_UNAVAILABLE','UNKNOWN');
 if(typeof epProjectCalculationCoverageV1==='function')
  inspect('calculation_coverage',()=>epProjectCalculationCoverageV1(project,lookupSku));
 else add('calculation_coverage','CALCULATION_COVERAGE_UNAVAILABLE','UNKNOWN');
 if(typeof epDraftBoardPlanV1==='function')
  inspect('draft_board_plan',()=>epDraftBoardPlanV1(project,lookupSku));
 else add('draft_board_plan','DRAFT_BOARD_PLAN_UNAVAILABLE','UNKNOWN');
 if(typeof epProtectiveDeviceProjectAuditV1==='function')
  inspect('protective_shortlist',()=>epProtectiveDeviceProjectAuditV1(project,lookupSku));
 else add('protective_shortlist','PROTECTIVE_SHORTLIST_UNAVAILABLE','UNKNOWN');
 if(typeof epProjectIntegrityV1==='function')
  inspect('project_integrity',()=>epProjectIntegrityV1(project,lookupSku));
 else add('project_integrity','PROJECT_INTEGRITY_UNAVAILABLE','UNKNOWN');
 if(typeof epCircuitWiringTraceV1==='function')
  inspect('circuit_wiring_trace',()=>epCircuitWiringTraceV1(project));
 else add('circuit_wiring_trace','CIRCUIT_WIRING_TRACE_UNAVAILABLE','UNKNOWN');
 if(typeof epNeutralSegregationV1==='function')
  inspect('neutral_segregation',()=>epNeutralSegregationV1(project));
 else add('neutral_segregation','NEUTRAL_SEGREGATION_UNAVAILABLE','UNKNOWN');
 const status=issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN';
 return {schema_version:'1.0',status,components,issues,
  engineeringApproved:false,ready_for_installation:false,
  warning:'The combined gate checks only declared project data. It does not validate manufacturer terminals, actual wiring, calculations, norms, or installation.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epEngineeringGateV1};
