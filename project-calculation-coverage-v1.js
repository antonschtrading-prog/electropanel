'use strict';
// Coverage audit: a project is NOT calculated merely because a UI field exists.
// Explicit evidence requirements, no auto-generated values or normative PASS.
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
  const ib=line.overloadInput?.ibA,iz=line.overloadInput?.izA;
  if(!positive(ib))missing.push('IB_NOT_DECLARED');
  if(!positive(iz))missing.push('IZ_NOT_DECLARED');
  let sku=null;
  if(line.catalogSku){
   try{sku=typeof lookupSku==='function'?lookupSku(line.catalogSku):null;}
   catch(_){add('CATALOG_LOOKUP_FAILED',id,'BLOCKED');}
   if(!sku)add('CATALOG_ARTICLE_UNKNOWN',id,'BLOCKED');
  }else missing.push('PROTECTIVE_DEVICE_NOT_SELECTED');
  if(sku&&positive(ib)&&positive(iz)){
   if(Number(String(ib).replace(',','.'))>sku.inA)add('IB_EXCEEDS_SELECTED_IN',id,'BLOCKED');
   if(sku.inA>Number(String(iz).replace(',','.')))add('SELECTED_IN_EXCEEDS_DECLARED_IZ',id,'BLOCKED');
  }
  if(!line.route44Input)missing.push('ROUTE_IMPEDANCE_NOT_DECLARED');
  if(!positive(line.faultInput?.ikKa??line.ikKa??line.breakingCapacityInput?.ikKa))missing.push('SHORT_CIRCUIT_INPUT_NOT_DECLARED');
  if(line.calculationReview?.required)add('CALCULATION_REVIEW_STALE',id,'BLOCKED');
  // Absence of a review flag is not evidence that an engineer reviewed a calculation.
  missing.push('ENGINEERING_REVIEW_EVIDENCE_NOT_ESTABLISHED');
  for(const code of missing)add(code,id);
  lines.push({id,missing,status:missing.length?'UNKNOWN':'REVIEW_REQUIRED',
   engineeringApproved:false});
 }
 if(!project.lines.length)add('NO_CIRCUITS',null,'BLOCKED');
 add('SELECTIVITY_AND_THERMAL_VERIFICATION_NOT_ESTABLISHED');
 add('NORMATIVE_ENGINEERING_REVIEW_REQUIRED');
 return {schema_version:'1.0',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  lineCount:lines.length,lines,issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epProjectCalculationCoverageV1};
