'use strict';
// A single, read-only protection decision dossier over existing bounded
// project calculations. It never selects or certifies apparatus automatically.
function epProtectionDecisionV1(project,lookup){
 const rows=[],issues=[];
 const report=(status,extra={})=>({schema:'electropanel.protection.decision.draft.1',
  status,rows,issues,engineeringApproved:false,ready_for_installation:false,...extra});
 if(!project||!Array.isArray(project.lines)||project.lines.length>1000)
  return report('BLOCKED',{issues:[{code:'PROTECTION_PROJECT_INVALID',level:'BLOCKED'}]});
 const parse=v=>{
  if(typeof v!=='number'&&typeof v!=='string')return null;
  const str=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(str))return null;
  const n=Number(str);return Number.isFinite(n)&&n>0&&n<=1e8?n:null;
 };
 const add=(list,lineId,code,level)=>list.push({lineId,code,level});
 const ids=new Set();
 for(const line of project.lines){
  const rowIssues=[],lineId=line?.id??null;
  if(!line||typeof lineId!=='string'||!lineId||ids.has(lineId)){
   add(rowIssues,lineId,'PROTECTION_LINE_INVALID_OR_DUPLICATED','BLOCKED');
   issues.push(...rowIssues);
   rows.push({lineId,status:'BLOCKED',issues:rowIssues,engineeringApproved:false});
   continue;
  }
  ids.add(lineId);
  let article=null;
  if(!line.catalogSku)add(rowIssues,lineId,'PROTECTION_ARTICLE_MISSING','UNKNOWN');
  else if(typeof lookup!=='function')
   add(rowIssues,lineId,'PROTECTION_CATALOGUE_UNAVAILABLE','BLOCKED');
  else {
   try{article=lookup(line.catalogSku)||null;}catch(_){
    add(rowIssues,lineId,'PROTECTION_CATALOGUE_FAILED','BLOCKED');
   }
   if(!article)add(rowIssues,lineId,'PROTECTION_ARTICLE_NOT_FOUND','BLOCKED');
  }
  if(article&&!['MCB','RCBO'].includes(article.kind))
   add(rowIssues,lineId,'PROTECTION_KIND_UNSUPPORTED','BLOCKED');
  if(article?.verificationStatus!=='VERIFIED')
   add(rowIssues,lineId,'PROTECTION_PASSPORT_NOT_VERIFIED','UNKNOWN');
  if(line.calculationReview?.required||line.articleReplacementReview?.required)
   add(rowIssues,lineId,'PROTECTION_DEPENDENCIES_REQUIRE_REVIEW','UNKNOWN');
  const ib=parse(line.overloadInput?.ibA),iz=parse(line.overloadInput?.izA),In=parse(article?.inA);
  const currentChecks={
   ibVsIn:ib===null||In===null?'UNKNOWN':ib>In?'FAIL':'PRELIMINARY_PASS',
   inVsIz:In===null||iz===null?'UNKNOWN':In>iz?'FAIL':'PRELIMINARY_PASS',
   ibA:ib,inA:In,izA:iz
  };
  if(currentChecks.ibVsIn==='FAIL')add(rowIssues,lineId,'PROTECTION_IB_EXCEEDS_IN','BLOCKED');
  if(currentChecks.inVsIz==='FAIL')add(rowIssues,lineId,'PROTECTION_IN_EXCEEDS_IZ','BLOCKED');
  if(currentChecks.ibVsIn==='UNKNOWN'||currentChecks.inVsIz==='UNKNOWN')
   add(rowIssues,lineId,'PROTECTION_THERMAL_INPUTS_INCOMPLETE','UNKNOWN');
  let overloadCoordination=null;
  if(line.overloadCoordinationInput){
   if(typeof epCableOverloadCoordinationV1==='function'){
    try{overloadCoordination=epCableOverloadCoordinationV1(project,line,article);}
    catch(_){add(rowIssues,lineId,'PROTECTION_OVERLOAD_COORDINATION_FAILED','BLOCKED');}
   }else add(rowIssues,lineId,'PROTECTION_OVERLOAD_MODULE_UNAVAILABLE','BLOCKED');
   for(const issue of overloadCoordination?.issues||[])
    add(rowIssues,lineId,issue.code,issue.level==='BLOCKED'?'BLOCKED':'UNKNOWN');
  }else add(rowIssues,lineId,'PROTECTION_OVERLOAD_I2_EVIDENCE_MISSING','UNKNOWN');
  let maximum=null,minimum=null;
  if(typeof epMaximumFaultCurrentV2==='function'){
   try{maximum=epMaximumFaultCurrentV2(project,line,lookup);}catch(_){
    add(rowIssues,lineId,'PROTECTION_MAX_FAULT_FAILED','BLOCKED');
   }
  }else add(rowIssues,lineId,'PROTECTION_MAX_FAULT_UNAVAILABLE','BLOCKED');
  if(typeof epFaultRouteReviewV2==='function'){
   try{minimum=epFaultRouteReviewV2(project,line,lookup);}catch(_){
    add(rowIssues,lineId,'PROTECTION_MIN_FAULT_FAILED','BLOCKED');
   }
  }else add(rowIssues,lineId,'PROTECTION_MIN_FAULT_UNAVAILABLE','BLOCKED');
  const icn=parse(article?.icnKa),imax=parse(maximum?.ikMaxKa);
  // Icu and Ics never substitute for Icn.
  const breakingStatus=icn===null||imax===null?'UNKNOWN':
   imax>icn?'FAIL':'PRELIMINARY_PASS';
  if(breakingStatus==='FAIL')add(rowIssues,lineId,'PROTECTION_IKMAX_EXCEEDS_ICN','BLOCKED');
  if(breakingStatus==='UNKNOWN')add(rowIssues,lineId,'PROTECTION_IKMAX_OR_ICN_MISSING','UNKNOWN');
  if(maximum?.issues)for(const issue of maximum.issues)
   if(issue.level==='BLOCKED')add(rowIssues,lineId,issue.code,'BLOCKED');
   else add(rowIssues,lineId,issue.code,'UNKNOWN');
  const loopStatus=minimum?.thresholdStatus??'UNKNOWN';
  if(minimum?.issues)for(const issue of minimum.issues)
   add(rowIssues,lineId,issue.code,issue.level==='BLOCKED'?'BLOCKED':'UNKNOWN');
  const trip=minimum?.tripEnvelope??null,ads=minimum?.disconnectionContext??null;
  if(trip?.numericalStatus==='NOT_DEMONSTRATED')
   add(rowIssues,lineId,'PROTECTION_TRIP_TIME_NOT_DEMONSTRATED','UNKNOWN');
  if(ads?.numericalStatus==='FAIL')
   add(rowIssues,lineId,'PROTECTION_ADS_TIME_LIMIT_EXCEEDED','BLOCKED');
  if(!trip||!ads||trip.numericalStatus!=='PRELIMINARY_WITHIN_ENVELOPE'||
     ads.numericalStatus!=='PRELIMINARY_WITHIN_DECLARED_LIMIT')
   add(rowIssues,lineId,'PROTECTION_DISCONNECTION_EVIDENCE_INCOMPLETE','UNKNOWN');
  // The named protection decision must never hide an arithmetic failure.
  const unique=[...new Map(rowIssues.map(x=>[x.code,x])).values()];
  const status=unique.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN';
  rows.push({lineId,sku:line.catalogSku??null,deviceKind:article?.kind??null,
   status,currentChecks,overloadCoordination,breaking:{status:breakingStatus,ikMaxKa:imax,icnKa:icn},
   minimum:{status:loopStatus,ikMinA:minimum?.ikMinA??null,
    tripTimeStatus:trip?.numericalStatus??'UNKNOWN',
    requiredTimeS:minimum?.requiredTimeS??null,
    allowedTimeStatus:ads?.numericalStatus??'UNKNOWN'},
   issues:unique,engineeringApproved:false,ready_for_installation:false});
  issues.push(...unique);
 }
 return report(issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',{
  summary:{circuits:rows.length,blocked:rows.filter(x=>x.status==='BLOCKED').length,
   incomplete:rows.filter(x=>x.status!=='BLOCKED').length},
  notice:'Numerical cross-check only. No independent verification of source impedances, cable thermal ratings, device curves, normative times, selectivity or manufacturer breaking capacity applicability.'});
}
if(typeof module!=='undefined'&&module.exports)module.exports={epProtectionDecisionV1};
