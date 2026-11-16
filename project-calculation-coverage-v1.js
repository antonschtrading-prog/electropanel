'use strict';
// Coverage audit: a project is NOT calculated merely because a UI field exists.
// Review only applicable calculation inputs: routing and provenance are never prerequisites for panel design.
function epProjectCalculationCoverageV1(project,lookupSku){
 const issues=[],lines=[],add=(code,lineId=null,level='UNKNOWN')=>issues.push({code,lineId,level});
 if(!project||!Array.isArray(project.lines))
  return {status:'BLOCKED',issues:[{code:'PROJECT_LINES_MISSING',level:'BLOCKED'}],lines:[],
   engineeringApproved:false,ready_for_installation:false};
 const ids=new Set();
 for(const line of project.lines){
  if(!line||typeof line!=='object'){add('LINE_INVALID',null,'BLOCKED');continue;}
  const id=line.id??null;
  if(!id||ids.has(id))add('LINE_ID_MISSING_OR_DUPLICATE',id,'BLOCKED');
  ids.add(id);
  const missing=[];
  const positive=v=>{
   if(v===null||v===undefined||typeof v==='boolean'||typeof v==='object'||String(v).trim()==='')return false;
   const s=String(v).trim().replace(',','.');
   return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)&&Number(s)>0&&Number.isFinite(Number(s));
  };
  // Reuse a current already calculated by the project; no duplicate manual input.
  const declaredIb=line.overloadInput?.ibA;
  const derivedIb=line.loadCurrentCalculation?.stale===false?
   line.loadCurrentCalculation?.roundedIbA:null;
  const ib=declaredIb===undefined?derivedIb:declaredIb;
  const iz=line.overloadInput?.izA;
  const hasIz=iz!==undefined&&iz!==null&&String(iz).trim()!=='';
  if(hasIz&&!positive(iz))add('IZ_DECLARED_INVALID',id,'BLOCKED');
  if(!positive(ib))missing.push('IB_NOT_DECLARED');
  // Iz is checked whenever supplied; an unrouted preliminary panel may not have it.
  let sku=null;
  if(line.catalogSku){
   try{sku=typeof lookupSku==='function'?lookupSku(line.catalogSku):null;}
   catch(_){add('CATALOG_LOOKUP_FAILED',id,'BLOCKED');}
   if(!sku)add('CATALOG_ARTICLE_UNKNOWN',id,'BLOCKED');
  }else missing.push('PROTECTIVE_DEVICE_NOT_SELECTED');
  if(sku&&positive(ib)){
   if(Number(String(ib).replace(',','.'))>sku.inA)add('IB_EXCEEDS_SELECTED_IN',id,'BLOCKED');
   if(positive(iz)&&sku.inA>Number(String(iz).replace(',','.')))add('SELECTED_IN_EXCEEDS_DECLARED_IZ',id,'BLOCKED');
  }
  // Cable routing / optional fault study are assessed by their own applicable checks.
  if(line.calculationReview?.required)add('CALCULATION_REVIEW_STALE',id,'BLOCKED');
  for(const code of missing)add(code,id);
  lines.push({id,ibA:positive(ib)?Number(String(ib).replace(',','.')):null,
   ibSource:declaredIb===undefined&&positive(derivedIb)?'CALCULATED':'ENGINEER_DECLARED',
   missing,status:missing.length?'UNKNOWN':'AVAILABLE',
   engineeringApproved:false});
 }
 if(!project.lines.length)add('NO_CIRCUITS',null,'BLOCKED');
 return {schema_version:'1.0',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':issues.length?'UNKNOWN':'AVAILABLE',
  lineCount:lines.length,lines,issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epProjectCalculationCoverageV1};
