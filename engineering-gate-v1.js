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
 if(typeof epFaultRouteProjectV2==='function')
  inspect('fault_routes',()=>epFaultRouteProjectV2(project,lookupSku));
 if(typeof epCircuitDesignReviewV1==='function')
  inspect('design_review',()=>epCircuitDesignReviewV1(project,lookupSku));
 else add('design_review','DESIGN_REVIEW_UNAVAILABLE','UNKNOWN');
 if(typeof epCableReferenceForCircuitV1==='function')
  inspect('cable_reference',()=>({status:'UNKNOWN',
   issues:(Array.isArray(project?.lines)?project.lines:[]).flatMap(line=>{
    const report=epCableReferenceForCircuitV1(project,line,lookupSku);
    return (report.issues||[]).map(code=>({code:'CABLE_'+code,level:report.status==='BLOCKED'?'BLOCKED':'UNKNOWN'}));
   })}));
 else add('cable_reference','CABLE_REFERENCE_UNAVAILABLE','UNKNOWN');
 if(typeof epProjectCalculationCoverageV1==='function')
  inspect('calculation_coverage',()=>epProjectCalculationCoverageV1(project,lookupSku));
 else add('calculation_coverage','CALCULATION_COVERAGE_UNAVAILABLE','UNKNOWN');
 if(typeof epReconcileProjectV2==='function')
  inspect('native_reconciliation',()=>epReconcileProjectV2(project,lookupSku));
 else add('native_reconciliation','RECONCILIATION_UNAVAILABLE','UNKNOWN');
 if(typeof epDraftBomV1==='function')
  inspect('draft_bom',()=>epDraftBomV1(project,lookupSku));
 else add('draft_bom','BOM_UNAVAILABLE','UNKNOWN');
 if(typeof epDraftBoardPlanV1==='function')
  inspect('draft_board_plan',()=>epDraftBoardPlanV1(project,lookupSku));
 else add('draft_board_plan','DRAFT_BOARD_PLAN_UNAVAILABLE','UNKNOWN');
 if(typeof epProtectiveDeviceProjectAuditV1==='function')
  inspect('protective_shortlist',()=>epProtectiveDeviceProjectAuditV1(project,lookupSku));
 else add('protective_shortlist','PROTECTIVE_SHORTLIST_UNAVAILABLE','UNKNOWN');
 if(typeof epProjectIntegrityV1==='function')
  inspect('project_integrity',()=>epProjectIntegrityV1(project,lookupSku));
 else add('project_integrity','PROJECT_INTEGRITY_UNAVAILABLE','UNKNOWN');
 if(typeof epSingleLineDraftV1==='function')
  inspect('single_line',()=>epSingleLineDraftV1(project,lookupSku));
 else add('single_line','SINGLE_LINE_UNAVAILABLE','UNKNOWN');
 if(typeof epCircuitWiringTraceV1==='function')
  inspect('circuit_wiring_trace',()=>epCircuitWiringTraceV1(project));
 else add('circuit_wiring_trace','CIRCUIT_WIRING_TRACE_UNAVAILABLE','UNKNOWN');
 if(typeof epNeutralWireIsolationV1==='function')
  inspect('neutral_wire_isolation',()=>epNeutralWireIsolationV1(project));
 else add('neutral_wire_isolation','NEUTRAL_WIRE_ISOLATION_UNAVAILABLE','UNKNOWN');
 if(typeof epNeutralSegregationV1==='function')
  inspect('neutral_segregation',()=>epNeutralSegregationV1(project));
 else add('neutral_segregation','NEUTRAL_SEGREGATION_UNAVAILABLE','UNKNOWN');
 if(typeof assessDesignEvidence==='function')
  inspect('design_evidence',()=>{
   const report=assessDesignEvidence(project);
   return {status:report.status==='failed'?'BLOCKED':'UNKNOWN',
    issues:report.items.filter(x=>x.status!=='verified').map(x=>({
     code:'DESIGN_EVIDENCE_'+x.status.toUpperCase()+'_'+x.area.toUpperCase(),
     level:x.status==='failed'?'BLOCKED':'UNKNOWN'}))};
  });
 else add('design_evidence','DESIGN_EVIDENCE_UNAVAILABLE','UNKNOWN');
 const status=issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN';
 return {schema_version:'1.0',status,components,issues,
  engineeringApproved:false,ready_for_installation:false,
  warning:'The combined gate checks only declared project data. It does not validate manufacturer terminals, actual wiring, calculations, norms, or installation.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epEngineeringGateV1};
