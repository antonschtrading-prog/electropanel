'use strict';
// Reproducible draft bundle of existing independent projections, without approval claims.
function epEngineeringBundleV1(project,lookupSku){
 const section=(name,fn)=>{try{return typeof fn==='function'?fn(project,lookupSku):{
  status:'BLOCKED',issues:[{code:name+'_UNAVAILABLE',level:'BLOCKED'}]};}
 catch(e){return {status:'BLOCKED',issues:[{code:name+'_FAILED',level:'BLOCKED'}]};}};
 const dossier=section('DOSSIER',typeof epCircuitDossierV1==='function'?epCircuitDossierV1:null);
 const bom=section('BOM',typeof epDraftBomV1==='function'?epDraftBomV1:null);
 const board=section('BOARD',typeof epDraftBoardPlanV1==='function'?epDraftBoardPlanV1:null);
 const engineering=section('GATE',typeof epEngineeringGateV1==='function'?epEngineeringGateV1:null);
 const protection=section('PROTECTION',typeof epProtectionWorkbenchV1==='function'?
  (p,lookup)=>epProtectionWorkbenchV1(p,lookup,
   typeof EP_CATALOG==='object'&&EP_CATALOG?
   Object.entries(EP_CATALOG).map(([id,device])=>({id,device})):[],null):null);
 const layoutAlternatives=section('LAYOUT_ALTERNATIVES',typeof epDraftLayoutAlternativesV1==='function'?epDraftLayoutAlternativesV1:null);
 const crossView=section('CROSS_VIEW',typeof epCrossViewAuditV1==='function'?
  ()=>epCrossViewAuditV1(project,protection,board,bom):null);
 const sections={dossier,bom,board,layoutAlternatives,protection,crossView,engineering};
 sections.issueRegister=section('ISSUE_REGISTER',typeof epEngineeringIssueRegisterV1==='function'?
  ()=>epEngineeringIssueRegisterV1({sections}):null);
 const statuses=Object.fromEntries(Object.entries(sections).map(([k,v])=>[k,v.status||'UNKNOWN']));
 return {schema:'electropanel.engineering.bundle.draft.1',projectTitle:String(project?.title??''),
  statuses,sections,overallStatus:Object.values(statuses).includes('BLOCKED')?'BLOCKED':'UNKNOWN',
  engineeringApproved:false,ready_for_installation:false,
  disclaimer:'DRAFT ONLY. Catalogue data, declared calculations, wiring and DIN placement require independent verification.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epEngineeringBundleV1};
