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
 const protection=section('PROTECTION',typeof epProtectionWorkbenchV1==='function'?
  (p,lookup)=>epProtectionWorkbenchV1(p,lookup,
   typeof epProjectCatalogV1==='function'?Object.entries(epProjectCatalogV1(p,typeof EP_CATALOG==='object'?EP_CATALOG:{}).articles).map(([id,device])=>({id,device})):
   typeof EP_CATALOG==='object'?Object.entries(EP_CATALOG).map(([id,device])=>({id,device})):[],null):null);
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
  ()=>epCrossViewAuditV1(project,protection,board,bom):null);
 const designEvidence=section('DESIGN_EVIDENCE',typeof assessDesignEvidence==='function'?
  p=>{const a=assessDesignEvidence(p);return {...a,status:a.status==='failed'?'BLOCKED':'UNKNOWN',issues:a.items.filter(x=>x.status!=='verified').map(x=>({code:'DESIGN_EVIDENCE_'+x.status.toUpperCase(),level:x.status==='failed'?'BLOCKED':'UNKNOWN',area:x.area}))};}:null);
 const loadCurrent={status:'UNKNOWN',rows:(Array.isArray(project?.lines)?project.lines:[]).map(x=>({lineId:x.id,calculation:x.loadCurrentCalculation||null,ibA:x.overloadInput?.ibA??null})),issues:[],engineeringApproved:false};
 const cableReference=section('CABLE_REFERENCE',typeof epCableReferenceForCircuitV1==='function'?
  (p,lookup)=>({status:'UNKNOWN',rows:(Array.isArray(p?.lines)?p.lines:[]).map(line=>({
   lineId:line.id,report:epCableReferenceForCircuitV1(p,line,lookup)
  })),issues:[],engineeringApproved:false}):null);
 const designReview=section('DESIGN_REVIEW',typeof epCircuitDesignReviewV1==='function'?
  (p,lookup)=>epCircuitDesignReviewV1(p,lookup):null);
 const designWorkQueue=section('DESIGN_WORK_QUEUE',typeof epDesignWorkQueueV1==='function'?
  (p,lookup)=>({...epDesignWorkQueueV1(p,lookup),issues:[]}):null);
 const integratedEvidence=section('INTEGRATED_EVIDENCE',typeof epIntegratedEvidenceReview==='function'?
  p=>epIntegratedEvidenceReview(p):null);
 const reconciliation=section('RECONCILIATION',typeof epReconcileProjectV2==='function'?epReconcileProjectV2:null);
 const faultRoutes=section('FAULT_ROUTES',typeof epFaultRouteProjectV2==='function'?epFaultRouteProjectV2:null);
 const catalogueIntegrity={status:catalog?.issues?.some(x=>x.status==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues:catalog?.issues?.map(x=>({code:x.code,level:x.status==='BLOCKED'?'BLOCKED':'UNKNOWN',recordIndex:x.index}))||[],
  engineeringApproved:false};
 const sections={catalogueIntegrity,faultRoutes,reconciliation,integratedEvidence,designWorkQueue,designReview,cableReference,loadCurrent,designEvidence,dossier,bom,board,layoutAlternatives,protection,crossView,wiringTrace,neutralSegregation,neutralWireIsolation,singleLine,engineering};
 sections.issueRegister=section('ISSUE_REGISTER',typeof epEngineeringIssueRegisterV1==='function'?
  ()=>epEngineeringIssueRegisterV1({sections}):null);
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
