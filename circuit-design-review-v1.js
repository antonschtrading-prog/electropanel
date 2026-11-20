'use strict';
// Coordinated design review, never infer missing conductor or protection data.
// Compare independent manual Ik and computed maximum Ik only when the
// engineer explicitly declares the SAME point, fault model and purpose.
// Without that declaration these are different evidences, not contradictory.
function epFaultCurrentConsistencyV1(line,maximum){
 const manual=line?.faultInput,derived=line?.maximumFaultInput;
 const result={status:'UNKNOWN',scope:'UNRELATED_OR_UNDECLARED',differenceKa:null,
  differencePercent:null,manualIkKa:null,computedIkKa:maximum?.ikMaxKa??null,
  issues:[],engineeringApproved:false};
 const parse=v=>{
  if(typeof v!=='number'&&typeof v!=='string')return null;
  const str=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(str))return null;
  const n=Number(str);return Number.isFinite(n)&&n>0?n:null;
 };
 const declared=parse(manual?.ikKa),computed=parse(maximum?.ikMaxKa);
 result.manualIkKa=declared;
 if(declared===null||computed===null)return result;
 const point=typeof manual?.comparisonPoint==='string'?manual.comparisonPoint.trim():'';
 const derivedPoint=typeof derived?.comparisonPoint==='string'?derived.comparisonPoint.trim():'';
 if(manual?.purpose!=='MAX_PROSPECTIVE'||!point||point!==derivedPoint||
    manual?.faultModel!==derived?.model)return result;
 result.scope='SAME_POINT_SAME_FAULT_MODEL';
 const difference=derivedPoint?computed-declared:null;
 result.differenceKa=difference;
 result.differencePercent=difference/declared*100;
 const tolerance=1e-9*Math.max(computed,declared);
 if(difference>tolerance){
  result.status='BLOCKED';
  result.issues.push({code:'MANUAL_IK_UNDERSTATES_SAME_POINT_MAX',level:'BLOCKED'});
 }else if(difference< -tolerance){
  result.issues.push({code:'MANUAL_IK_GREATER_THAN_CALCULATED_MAX',level:'UNKNOWN'});
 }else{
  result.issues.push({code:'MANUAL_IK_NUMERICALLY_MATCHES_UNVERIFIED',level:'UNKNOWN'});
 }
 return result;
}
function epCircuitDesignReviewV1(project,lookupSku){
 const issues=[],rows=[],ids=new Set();
 if(!project||!Array.isArray(project.lines)||project.lines.length>1000)
  return {schema:'electropanel.design.review.1',status:'BLOCKED',issues:[{code:'PROJECT_INVALID',level:'BLOCKED'}],rows:[]};
 const finite=v=>{
  if(v===null||v===undefined||typeof v==='boolean'||typeof v==='object')return null;
  const s=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>0&&n<=1e7?n:null;
 };
 for(const line of project.lines){
  if(!line||typeof line.id!=='string'||!line.id||ids.has(line.id)){
   issues.push({code:'DUPLICATE_OR_INVALID_CIRCUIT',level:'BLOCKED',lineId:line?.id??null});continue;
  }
  ids.add(line.id);
  const reasons=[],ib=finite(line.overloadInput?.ibA),iz=finite(line.overloadInput?.izA),
   ik=finite(line.faultInput?.ikKa),voltageV=finite(line.faultInput?.voltageV);
  let article=null,lookupFailed=false;
  if(line.catalogSku&&typeof lookupSku==='function')
   try{article=lookupSku(line.catalogSku);}catch(_){lookupFailed=true;}
  const inA=finite(article?.inA),icnKa=finite(article?.icnKa);
  const check=(name,ok,missing,fail)=>{
   const status=missing?'UNKNOWN':ok?'PASS':'FAIL';
   if(status!=='PASS')reasons.push({code:name+'_'+(missing?'MISSING':fail),level:status==='FAIL'?'BLOCKED':'UNKNOWN'});
   return status;
  };
  const current=check('IB_IN',ib!==null&&inA!==null&&ib<=inA,ib===null||inA===null,'EXCEEDED');
  const cable=check('IN_IZ',inA!==null&&iz!==null&&inA<=iz,inA===null||iz===null,'EXCEEDED');
  const breaking=check('ICN_IK',icnKa!==null&&ik!==null&&icnKa>=ik,icnKa===null||ik===null,'EXCEEDED');
  if(voltageV===null)reasons.push({code:'FAULT_VOLTAGE_NOT_DECLARED',level:'UNKNOWN'});
  if(article&&voltageV!==null){
   if(!Number.isFinite(article.icnVoltageV))
    reasons.push({code:'CATALOG_ICN_VOLTAGE_UNDECLARED',level:'UNKNOWN'});
   else if(article.icnVoltageV<voltageV)
    reasons.push({code:'CATALOG_ICN_VOLTAGE_LT_DECLARED',level:'BLOCKED'});
  }
  const overloadCoordination=line.overloadCoordinationInput?
   (typeof epCableOverloadCoordinationV1==='function'?
    epCableOverloadCoordinationV1(project,line,article):null):null;
  if(line.overloadCoordinationInput&&!overloadCoordination)
   reasons.push({code:'CABLE_OVERLOAD_MODULE_UNAVAILABLE',level:'BLOCKED'});
  for(const issue of overloadCoordination?.issues||[])
   reasons.push({code:issue.code,level:issue.level==='BLOCKED'?'BLOCKED':'UNKNOWN'});
  if(!line.overloadCoordinationInput)
   reasons.push({code:'CABLE_OVERLOAD_I2_EVIDENCE_REQUIRED',level:'UNKNOWN'});
  const shortCircuitThermal=line.shortCircuitThermalInput?
   (typeof epCableShortCircuitThermalV1==='function'?
    epCableShortCircuitThermalV1(project,line,article):null):null;
  if(line.shortCircuitThermalInput&&!shortCircuitThermal)
   reasons.push({code:'THERMAL_MODULE_UNAVAILABLE',level:'BLOCKED'});
  for(const issue of shortCircuitThermal?.issues||[])
   reasons.push({code:issue.code,level:issue.level==='BLOCKED'?'BLOCKED':'UNKNOWN'});
  if(!line.shortCircuitThermalInput)
   reasons.push({code:'THERMAL_SHORT_CIRCUIT_EVIDENCE_REQUIRED',level:'UNKNOWN'});
  const breakerLetThrough=line.letThroughInput?
   (typeof epBreakerLetThroughV1==='function'?epBreakerLetThroughV1(project,line,article):null):null;
  if(line.letThroughInput&&!breakerLetThrough)
   reasons.push({code:'LET_THROUGH_MODULE_UNAVAILABLE',level:'BLOCKED'});
  for(const issue of breakerLetThrough?.issues||[])
   reasons.push({code:issue.code,level:issue.level==='BLOCKED'?'BLOCKED':'UNKNOWN'});
  if(!line.letThroughInput)
   reasons.push({code:'LET_THROUGH_INPUT_MISSING',level:'UNKNOWN'});
  // Independent maximum prospective short-circuit calculation. Never
  // substitute the minimum L-PE current or silently overwrite manual Ik.
  const maximumFault=line.maximumFaultInput&&typeof epMaximumFaultCurrentV2==='function'?
   epMaximumFaultCurrentV2(project,line,lookupSku):null;
  const faultCurrentComparison=maximumFault?
   epFaultCurrentConsistencyV1(line,maximumFault):null;
  if(maximumFault){
   for(const issue of maximumFault.issues||[])
    reasons.push({code:issue.code,level:issue.level==='BLOCKED'?'BLOCKED':'UNKNOWN'});
   for(const issue of faultCurrentComparison.issues)reasons.push(issue);
   if(line.faultInput?.ikKa!==undefined&&line.faultInput?.ikKa!==null&&
      faultCurrentComparison.scope!=='SAME_POINT_SAME_FAULT_MODEL')
    reasons.push({code:'MAX_FAULT_AND_MANUAL_IK_INDEPENDENT',level:'UNKNOWN'});
  }
  const reference=typeof epCableReferenceForCircuitV1==='function'?
   epCableReferenceForCircuitV1(project,line,lookupSku):null;
  const section=finite(line.cableDesignInput?.sectionMm2);
  const candidate=section!==null?reference?.candidates?.find(x=>x.sectionMm2===section):null;
  const referenceStatus=!section?'UNKNOWN':!candidate?'UNKNOWN':
   candidate.status==='REJECTED'?'FAIL':'REFERENCE_ONLY';
  if(section!==null&&!candidate)reasons.push({code:'SECTION_CONTEXT_OR_SIZE_UNSUPPORTED',level:'UNKNOWN'});
  if(referenceStatus==='FAIL')reasons.push({code:'REFERENCE_SECTION_UNDERSIZED',level:'BLOCKED'});
  const drop=typeof epVoltageDropDesignV1==='function'?
   epVoltageDropDesignV1({...line.voltageDropDesignInput,ibA:ib,phase:line.phase}):
   {status:'UNKNOWN',issues:['VOLTAGE_DROP_MODULE_UNAVAILABLE']};
  for(const code of drop.issues||[])reasons.push({code:'DROP_'+code,level:drop.status==='FAIL'?'BLOCKED':'UNKNOWN'});
  if(line.loadCurrentCalculation?.stale)reasons.push({code:'LOAD_CURRENT_STALE',level:'UNKNOWN'});
  if(line.articleReplacementReview?.required){
   reasons.push({code:'ARTICLE_REPLACEMENT_REVIEW_REQUIRED',level:'UNKNOWN'});
   if(line.articleReplacementReview.to!==line.catalogSku)
    reasons.push({code:'ARTICLE_REPLACEMENT_SELECTION_STALE',level:'BLOCKED'});
   for(const warning of Array.isArray(line.articleReplacementReview.warnings)?
     line.articleReplacementReview.warnings:[])
    if(['ICU_IS_NOT_ICN','ICN_UNDECLARED','BODY_GEOMETRY_INCOMPLETE',
      'PASSPORT_NOT_INDEPENDENTLY_VERIFIED'].includes(warning))
     reasons.push({code:'ARTICLE_REPLACEMENT_'+warning,level:'UNKNOWN'});
  }
  if(line.calculationReview?.required){
   reasons.push({code:'CALCULATION_REVIEW_REQUIRED',level:'UNKNOWN'});
   const pending=Array.isArray(line.calculationReview.pending)?line.calculationReview.pending:[];
   for(const field of ['overloadInput','faultInput','overloadV30','lv43Input','route44Input'])
    if(pending.includes(field))reasons.push({code:'CALCULATION_REVIEW_'+field,level:'UNKNOWN'});
  }
  if(!line.catalogSku)reasons.push({code:'CATALOG_ARTICLE_MISSING',level:'UNKNOWN'});
  else if(lookupFailed)reasons.push({code:'CATALOG_LOOKUP_FAILED',level:'BLOCKED'});
  else if(!article)reasons.push({code:'CATALOG_ARTICLE_UNKNOWN',level:'BLOCKED'});
  else{
   if(!['MCB','RCBO'].includes(article.kind))
    reasons.push({code:'CATALOG_PROTECTION_KIND_UNSUPPORTED',level:'BLOCKED'});
   const correctPoles=['L1','L2','L3'].includes(line.phase)?(article.poles===1||article.poles===2&&
    (article.kind==='RCBO'||['1P+N','2P'].includes(article.poleConfiguration))):
    line.phase==='3Ф'?[3,4].includes(article.poles):null;
   if(correctPoles===false)reasons.push({code:'CATALOG_PHASE_POLES_MISMATCH',level:'BLOCKED'});
   if(line.modules!==article.modules)reasons.push({code:'CATALOG_MODULES_STALE',level:'BLOCKED'});
   if(line.device!==article.label)reasons.push({code:'CATALOG_LABEL_STALE',level:'BLOCKED'});
   const linked=Array.isArray(project.branchDevices)?
    project.branchDevices.filter(b=>b?.circuitId===line.id):[];
   if(linked.length>1)reasons.push({code:'CATALOG_BRANCH_DUPLICATED',level:'BLOCKED'});
   for(const branch of linked){
    if(branch.modules!==article.modules)reasons.push({code:'CATALOG_BRANCH_MODULES_STALE',level:'BLOCKED'});
    if(branch.label!==article.label)reasons.push({code:'CATALOG_BRANCH_LABEL_STALE',level:'BLOCKED'});
   }
   if(article.verificationStatus!=='VERIFIED')
    reasons.push({code:'CATALOG_EVIDENCE_NOT_VERIFIED',level:'UNKNOWN'});
  }
  for(const reason of reasons)issues.push({...reason,lineId:line.id});
  const status=reasons.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN';
  rows.push({lineId:line.id,name:line.name||'',phase:line.phase||null,sku:line.catalogSku||null,
   ibA:ib,inA,izA:iz,ikKa:ik,voltageV,icnKa,sectionMm2:section,current,cable,breaking,referenceStatus,
   referenceIzA:candidate?.izA??null,voltageDrop:drop,overloadCoordination,shortCircuitThermal,breakerLetThrough,maximumFault,faultCurrentComparison,status,reasons});
 }
 return {schema:'electropanel.design.review.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues,rows,engineeringApproved:false,
  summary:{circuits:rows.length,blocked:rows.filter(x=>x.status==='BLOCKED').length,
   pending:rows.filter(x=>x.status!=='BLOCKED').length}};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCircuitDesignReviewV1,epFaultCurrentConsistencyV1};
