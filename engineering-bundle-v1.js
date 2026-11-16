'use strict';
// Reproducible draft bundle of existing independent projections, without approval claims.
function epEngineeringBundleV1(project,lookupSku){
 // A project-specific catalogue must be resolved once for every downstream
 // projection. A caller's editor-global lookup may refer to another project.
 const catalog=typeof epProjectCatalogV1==='function'
  ?epProjectCatalogV1(project,typeof EP_CATALOG==='object'?EP_CATALOG:{})
  :null;
 const projectLookup=catalog?catalog.lookup:lookupSku;
 const section=(name,fn)=>{try{return typeof fn==='function'?fn(project,projectLookup):{
  status:'BLOCKED',issues:[{code:name+'_UNAVAILABLE',level:'BLOCKED'}]};}
 catch(e){return {status:'BLOCKED',issues:[{code:name+'_FAILED',level:'BLOCKED'}]};}};
 const dossier=section('DOSSIER',typeof epCircuitDossierV1==='function'?epCircuitDossierV1:null);
 const bom=section('BOM',typeof epDraftBomV1==='function'?epDraftBomV1:null);
 const board=section('BOARD',typeof epDraftBoardPlanV1==='function'?epDraftBoardPlanV1:null);
 const engineering=section('GATE',typeof epEngineeringGateV1==='function'?epEngineeringGateV1:null);
 const projectCatalogItems=catalog?Object.entries(catalog.articles).map(([id,device])=>({id,device})):
  typeof EP_CATALOG==='object'?Object.entries(EP_CATALOG).map(([id,device])=>({id,device})):[];
 const protectionSelection=section('PROTECTIVE_SHORTLIST',typeof epProtectiveDeviceProjectAuditV1==='function'?
  (p,lookup)=>epProtectiveDeviceProjectAuditV1(p,lookup,projectCatalogItems):null);
 const protection=section('PROTECTION',typeof epProtectionWorkbenchV1==='function'?
  (p,lookup)=>epProtectionWorkbenchV1(p,lookup,projectCatalogItems,null):null);
 const layoutAlternatives=section('LAYOUT_ALTERNATIVES',typeof epDraftLayoutAlternativesV1==='function'?epDraftLayoutAlternativesV1:null);
 const singleLine=section('SINGLE_LINE',typeof epSingleLineDraftV1==='function'?
  (p,lookup)=>epSingleLineDraftV1(p,lookup):null);
 const neutralWireIsolation=section('NEUTRAL_WIRE_ISOLATION',typeof epNeutralWireIsolationV1==='function'?
  p=>epNeutralWireIsolationV1(p):null);
 const neutralSegregation=section('NEUTRAL_SEGREGATION',typeof epNeutralSegregationV1==='function'?
  p=>epNeutralSegregationV1(p):null);
 const wiringTrace=section('WIRING_TRACE',typeof epCircuitWiringTraceV1==='function'?
  p=>epCircuitWiringTraceV1(p):null);
 const crossView=section('CROSS_VIEW',typeof epCrossViewAuditV1==='function'?
  ()=>epCrossViewAuditV1(project,protection,board,bom,singleLine,projectLookup):null);
 const workflowPreview=section('WORKFLOW_PREVIEW',
  typeof epWorkflowPreviewV1==='function'?
   (p,lookup)=>epWorkflowPreviewV1(p,lookup,projectCatalogItems,p?.workflowDesignInputsV1): 
   p=>({status:'UNKNOWN',issues:[],rows:[],steps:[],engineeringApproved:false}));
 const consumerMerge=section('CONSUMER_MERGE',
  p=>p?.consumerGroupMergeRulesV1&&typeof epGroupMergePlanV1==='function'?
   epGroupMergePlanV1(p,p.consumerGroupMergeRulesV1):{
    schema:'electropanel.group.merge.plan.1',status:'NOT_REQUIRED',
    proposals:[],issues:[],engineeringApproved:false,ready_for_installation:false});
 const consumerGrouping=section('CONSUMER_GROUPING',
  p=>p?.consumerGroupSplitRulesV1&&typeof epGroupSplitPlanV1==='function'?
   epGroupSplitPlanV1(p,p.consumerGroupSplitRulesV1):{
    schema:'electropanel.group.split.plan.1',status:'NOT_REQUIRED',
    proposals:[],issues:[],engineeringApproved:false,ready_for_installation:false});
 const designStageScope=section('DESIGN_STAGE_SCOPE',
  typeof epDesignStageScopeV1==='function'?p=>({
   ...epDesignStageScopeV1(p),status:'UNKNOWN',issues:[],engineeringApproved:false
  }):p=>({status:'UNKNOWN',issues:[],stage:'PRELIMINARY',items:[],
   engineeringApproved:false}));
 const designEvidence=section('DESIGN_EVIDENCE',typeof assessDesignEvidence==='function'?
  p=>{const a=assessDesignEvidence(p);return {...a,status:a.status==='failed'?'BLOCKED':a.status==='not_required'?'NOT_REQUIRED':'UNKNOWN',issues:a.items.filter(x=>x.status==='failed'||x.status==='unknown').map(x=>({code:'DESIGN_EVIDENCE_'+x.status.toUpperCase(),level:x.status==='failed'?'BLOCKED':'UNKNOWN',area:x.area}))};}:null);
 const loadCurrent=section('LOAD_CURRENT',typeof epLoadCurrentEvidenceV1==='function'?
  p=>epLoadCurrentEvidenceV1(p):
  p=>({status:'UNKNOWN',rows:(Array.isArray(p?.lines)?p.lines:[]).map(x=>({lineId:x.id,calculation:x.loadCurrentCalculation||null,ibA:x.overloadInput?.ibA??null})),issues:[],engineeringApproved:false}));
 const cableReference=section('CABLE_REFERENCE',typeof epCableReferenceForCircuitV1==='function'?
  (p,lookup)=>({status:'UNKNOWN',rows:(Array.isArray(p?.lines)?p.lines:[]).map(line=>({
   lineId:line.id,report:epCableReferenceForCircuitV1(p,line,lookup)
  })),issues:[],engineeringApproved:false}):null);
 const designReview=section('DESIGN_REVIEW',typeof epCircuitDesignReviewV1==='function'?
  (p,lookup)=>epCircuitDesignReviewV1(p,lookup):null);
 const protectionDecision=section('PROTECTION_DECISION',typeof epProtectionDecisionV1==='function'?
  (p,lookup)=>epProtectionDecisionV1(p,lookup):null);
 const protectionTopology=section('PROTECTION_TOPOLOGY',
  typeof epProtectionTopologyV1==='function'?
   p=>epProtectionTopologyV1(p,p?.protectionLinks):null);
 const protectionDeviceChain=section('PROTECTION_DEVICE_CHAIN',
  typeof epProtectionDeviceChainV1==='function'?
   (p,lookup)=>epProtectionDeviceChainV1(p,lookup):null);
 const supplyDeviceGraph=section('SUPPLY_DEVICE_GRAPH',
  typeof epSupplyDeviceGraphV1==='function'?p=>epSupplyDeviceGraphV1(p):null);
 const deviceSupply=section('DEVICE_SUPPLY',
  typeof epDeviceSupplyAuditV1==='function'?p=>epDeviceSupplyAuditV1(p):null);
 const supplyTerminals=section('SUPPLY_TERMINAL_RECONCILIATION',
  typeof epDeviceSupplyTerminalReconciliationV1==='function'?
   p=>epDeviceSupplyTerminalReconciliationV1(p):null);
 const incomingTerminalBindings=section('INCOMING_TERMINAL_BINDINGS',
  typeof epIncomingTerminalBindingsAuditV1==='function'?
   p=>epIncomingTerminalBindingsAuditV1(p):null);
 const supplyCrossEvidence=section('SUPPLY_CROSS_EVIDENCE',
  typeof epDeviceSupplyCrossEvidenceV1==='function'?p=>epDeviceSupplyCrossEvidenceV1(p):null);
 const deviceFaultScenarios=section('DEVICE_FAULT_SCENARIOS',
  typeof epDeviceFaultAuditV1==='function'?
   (p,lookup)=>epDeviceFaultAuditV1(p,lookup):null);
 const deviceCoordinationEvidence=section('DEVICE_COORDINATION_EVIDENCE',
  typeof epCoordAuditV1==='function'?(p,lookup)=>epCoordAuditV1(p,lookup):null);
 const calculatedDeviceFault=section('CALCULATED_DEVICE_FAULT',
  typeof epCalculatedDeviceFaultAuditV1==='function'?
   (p,lookup)=>epCalculatedDeviceFaultAuditV1(p,lookup):null);
 const incomingMaximum=section('INCOMING_MAXIMUM',
  typeof epIncomingMaximumAuditV1==='function'?
   (p,lookup)=>epIncomingMaximumAuditV1(p,lookup):null);
 const protectionEvidenceMatrix=section('PROTECTION_EVIDENCE_MATRIX',
  typeof epProtectionEvidenceMatrixV1==='function'?
   (p,lookup)=>epProtectionEvidenceMatrixV1(p,lookup):null);
 const faultSourceConvergence=section('FAULT_SOURCE_CONVERGENCE',
  typeof epFaultSourceConvergenceV1==='function'?
   (p,lookup)=>epFaultSourceConvergenceV1(p,lookup):null);
 const manufacturerEvidence=section('MANUFACTURER_EVIDENCE_REGISTER',
  typeof epManufacturerEvidenceRegisterV1==='function'?
   p=>epManufacturerEvidenceRegisterV1(p):null);
 const manufacturerFacts=section('MANUFACTURER_FACTS',
  typeof epManufacturerFactsReconciliationV1==='function'?
   (p,lookup)=>epManufacturerFactsReconciliationV1(p,lookup):null);
 const designWorkQueue=section('DESIGN_WORK_QUEUE',typeof epDesignWorkQueueV1==='function'?
  (p,lookup)=>({...epDesignWorkQueueV1(p,lookup),issues:[]}):null);
 const integratedEvidence=section('INTEGRATED_EVIDENCE',typeof epIntegratedEvidenceReview==='function'?
  p=>epIntegratedEvidenceReview(p):null);
 const reconciliation=section('RECONCILIATION',typeof epReconcileProjectV2==='function'?epReconcileProjectV2:null);
 const faultRoutes=section('FAULT_ROUTES',typeof epFaultRouteProjectV2==='function'?epFaultRouteProjectV2:null);
 const catalogEvidence=section('CATALOG_EVIDENCE',typeof epCatalogEvidenceAuditV1==='function'?epCatalogEvidenceAuditV1:null);
 // Persisted article substitution history is a design review obligation,
 // not an approval token. Make it independently visible in exports and issues.
 const replacementReview=section('ARTICLE_REPLACEMENTS',p=>{
  if(!p||!Array.isArray(p.lines))return {status:'BLOCKED',
   issues:[{code:'REPLACEMENT_PROJECT_INVALID',level:'BLOCKED'}],rows:[],engineeringApproved:false};
  const rows=[],issues=[];
  for(const line of p.lines){
   if(!line?.articleReplacementReview?.required)continue;
   const r=line.articleReplacementReview;
   const mismatch=r.to!==line.catalogSku;
   const warnings=Array.isArray(r.warnings)?r.warnings.filter(x=>typeof x==='string').slice(0,30):[];
   const lineId=line.id??null;
   if(mismatch)issues.push({code:'REPLACEMENT_CURRENT_ARTICLE_MISMATCH',level:'BLOCKED',lineId});
   issues.push({code:'ARTICLE_REPLACEMENT_REVIEW_REQUIRED',level:'UNKNOWN',lineId});
   rows.push({lineId,from:r.from??null,to:r.to??null,currentSku:line.catalogSku??null,
    warnings,status:mismatch?'BLOCKED':'UNKNOWN',engineeringApproved:false});
  }
  return {status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',rows,issues,
   engineeringApproved:false,ready_for_installation:false};
 });
 const catalogueIntegrity={status:!catalog||catalog.issues.some(x=>x.status==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues:catalog?.issues?.map(x=>({code:x.code,level:x.status==='BLOCKED'?'BLOCKED':'UNKNOWN',recordIndex:x.index}))||[{code:'PROJECT_CATALOGUE_AUDIT_UNAVAILABLE',level:'BLOCKED'}],
  engineeringApproved:false};
 const fireControl=section('FIRE_CONTROL',typeof epFireControlAuditV1==='function'?p=>p.fireControlV1?epFireControlAuditV1(p,p.fireControlV1):({status:'UNKNOWN',issues:[],rows:[],engineeringApproved:false}):null);
 const fireControlBill=section('FIRE_CONTROL_BILL',typeof epFireControlBillV1==='function'?epFireControlBillV1:null);
 const fireControlTrace=section('FIRE_CONTROL_TRACE',typeof epFireControlTraceV1==='function'?epFireControlTraceV1:null);
 const fireControlDesign=section('FIRE_CONTROL_DESIGN',typeof epFireControlDesignV1==='function'?epFireControlDesignV1:null);
 const fireControlSchedule=section('FIRE_CONTROL_SCHEDULE',typeof epFireControlScheduleV1==='function'?epFireControlScheduleV1:null);
 const sections={fireControl,fireControlBill,fireControlTrace,fireControlDesign,fireControlSchedule,workflowPreview,consumerGrouping,consumerMerge,designStageScope,manufacturerFacts,manufacturerEvidence,protectionTopology,protectionDeviceChain,supplyDeviceGraph,deviceSupply,supplyTerminals,incomingTerminalBindings,supplyCrossEvidence,deviceFaultScenarios,deviceCoordinationEvidence,calculatedDeviceFault,incomingMaximum,protectionEvidenceMatrix,faultSourceConvergence,protectionDecision,replacementReview,catalogueIntegrity,catalogEvidence,faultRoutes,reconciliation,integratedEvidence,designWorkQueue,designReview,cableReference,loadCurrent,designEvidence,dossier,bom,board,layoutAlternatives,protection,protectionSelection,crossView,wiringTrace,neutralSegregation,neutralWireIsolation,singleLine,engineering};
 sections.issueRegister=section('ISSUE_REGISTER',typeof epEngineeringIssueRegisterV1==='function'?
  ()=>epEngineeringIssueRegisterV1({sections},project):null);
 const statuses=Object.fromEntries(Object.entries(sections).map(([k,v])=>[k,v?.status||'UNKNOWN']));
 const blockedSections=Object.entries(statuses).filter(([,status])=>status==='BLOCKED').map(([name])=>name);
 const unresolvedSections=Object.entries(statuses).filter(([,status])=>status!=='BLOCKED').map(([name])=>name);
 const issueCount=Object.values(sections).reduce((sum,section)=>sum+(Array.isArray(section?.issues)?section.issues.length:0),0);
 return {schema:'electropanel.engineering.bundle.draft.1',projectTitle:String(project?.title??''),
  statuses,sections,blockedSections,unresolvedSections,issueCount,
  overallStatus:blockedSections.length?'BLOCKED':'UNKNOWN',
  engineeringApproved:false,ready_for_installation:false,
  disclaimer:'DRAFT ONLY. Catalogue data, declared calculations, wiring and DIN placement require independent verification.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epEngineeringBundleV1};
