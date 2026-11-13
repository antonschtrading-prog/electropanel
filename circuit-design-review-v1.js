'use strict';
// Coordinated design review, never infer missing conductor or protection data.
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
   ik=finite(line.faultInput?.ikKa);
  let article=null;
  try{article=line.catalogSku&&typeof lookupSku==='function'?lookupSku(line.catalogSku):null;}catch(_){}
  const inA=finite(article?.inA),icnKa=finite(article?.icnKa);
  const check=(name,ok,missing,fail)=>{
   const status=missing?'UNKNOWN':ok?'PASS':'FAIL';
   if(status!=='PASS')reasons.push({code:name+'_'+(missing?'MISSING':fail),level:status==='FAIL'?'BLOCKED':'UNKNOWN'});
   return status;
  };
  const current=check('IB_IN',ib!==null&&inA!==null&&ib<=inA,ib===null||inA===null,'EXCEEDED');
  const cable=check('IN_IZ',inA!==null&&iz!==null&&inA<=iz,inA===null||iz===null,'EXCEEDED');
  const breaking=check('ICN_IK',icnKa!==null&&ik!==null&&icnKa>=ik,icnKa===null||ik===null,'EXCEEDED');
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
  if(line.calculationReview?.required)reasons.push({code:'CALCULATION_REVIEW_REQUIRED',level:'UNKNOWN'});
  if(!article)reasons.push({code:'CATALOG_ARTICLE_MISSING',level:'UNKNOWN'});
  for(const reason of reasons)issues.push({...reason,lineId:line.id});
  const status=reasons.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN';
  rows.push({lineId:line.id,name:line.name||'',phase:line.phase||null,sku:line.catalogSku||null,
   ibA:ib,inA,izA:iz,ikKa:ik,icnKa,sectionMm2:section,current,cable,breaking,referenceStatus,
   referenceIzA:candidate?.izA??null,voltageDrop:drop,status,reasons});
 }
 return {schema:'electropanel.design.review.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues,rows,engineeringApproved:false,
  summary:{circuits:rows.length,blocked:rows.filter(x=>x.status==='BLOCKED').length,
   pending:rows.filter(x=>x.status!=='BLOCKED').length}};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCircuitDesignReviewV1};
