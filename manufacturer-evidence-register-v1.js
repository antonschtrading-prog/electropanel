'use strict';
// Project-local evidence records. A reviewed document is not a factory test,
// signed certificate, or automatic electrical conformity determination.
function epManufacturerEvidenceRegisterV1(project){
 const issues=[],rows=[],records=project?.manufacturerEvidenceRecords;
 const add=(code,level,id)=>issues.push({code,level,recordId:id??null});
 const finish=()=>({schema:'electropanel.manufacturer.evidence.register.1',
  status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  records:rows,issues,engineeringApproved:false,ready_for_installation:false});
 if(records===undefined||records===null)return finish();
 if(!Array.isArray(records)||records.length>250){
  add('EVIDENCE_REGISTER_INVALID','BLOCKED');return finish();
 }
 const ids=new Set();
 const str=(s,max=200)=>typeof s==='string'&&s.trim()&&s.length<=max&&
  !/[\u0000-\u001f\u007f]/.test(s);
 const date=s=>{
  if(typeof s!=='string'||!/^(?:\d{4})-(?:\d\d)-(?:\d\d)$/.test(s))return false;
  const d=new Date(s+'T00:00:00Z');
  return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s;
 };
 const url=s=>{
  if(!str(s,2000))return false;
  try{const parsed=new URL(s);return parsed.protocol==='https:'&&
   !!parsed.hostname&&!parsed.username&&!parsed.password;}catch(_){return false;}
 };
 const num=s=>typeof s==='number'&&Number.isFinite(s)&&s>0;
 for(const r of records){
  const id=r?.id;
  if(!str(id,80)||ids.has(id)||['__proto__','constructor','prototype'].includes(id)){
   add('EVIDENCE_ID_INVALID_OR_DUPLICATE','BLOCKED',id);continue;
  }
  ids.add(id);
  if(r.kind!=='LET_THROUGH_I2T'){
   add('EVIDENCE_KIND_UNSUPPORTED','BLOCKED',id);continue;
  }
  for(const field of ['catalogKey','manufacturerSku','manufacturerName','series','documentTitle','documentRevision','reviewedBy']){
   if(!str(r[field]))add('EVIDENCE_IDENTITY_OR_DOCUMENT_MISSING','UNKNOWN',id);
  }
  if(!url(r.documentUrl))add('EVIDENCE_DOCUMENT_URL_INVALID','BLOCKED',id);
  if(!str(r.documentLocation))add('EVIDENCE_LOCATION_MISSING','UNKNOWN',id);
  if(!date(r.reviewedAt))add('EVIDENCE_REVIEW_DATE_INVALID','BLOCKED',id);
  if(!['MANUFACTURER_DOCUMENT','THIRD_PARTY_MIRROR'].includes(r.sourceType))
   add('EVIDENCE_SOURCE_TYPE_INVALID','BLOCKED',id);
  if(r.sourceType==='THIRD_PARTY_MIRROR')
   add('EVIDENCE_MIRROR_REQUIRES_ORIGINAL','UNKNOWN',id);
  // This describes the evidence of an engineer's entry, not whether
  // the manufacturer legitimately guarantees its application.
  if(r.documentChecked!==true)
   add('EVIDENCE_DOCUMENT_NOT_REVIEWED','UNKNOWN',id);
  const scope=r.scope;
  if(!scope||typeof scope!=='object'||Array.isArray(scope)||
     !str(scope.deviceStandard)||!num(scope.nominalCurrentA)||
     !Number.isInteger(scope.poles)||scope.poles<1||scope.poles>8||
     !num(scope.testVoltageV)||!num(scope.testFrequencyHz)||
     !['SINGLE_PHASE_L_N','THREE_PHASE_POSITIVE_SEQUENCE'].includes(scope.faultModel))
   add('EVIDENCE_SCOPE_INVALID','BLOCKED',id);
  if(!Array.isArray(r.bands)||r.bands.length<1||r.bands.length>30)
   add('EVIDENCE_BANDS_INVALID','BLOCKED',id);
  else{
   let prev=0;
   for(const b of r.bands){
    if(!num(b?.minProspectiveA)||!num(b?.maxProspectiveA)||
       !num(b?.maxLetThroughA2s)||b.minProspectiveA> b.maxProspectiveA||
       b.minProspectiveA<=prev){
     add('EVIDENCE_BAND_INVALID','BLOCKED',id);break;
    }
    prev=b.maxProspectiveA;
   }
  }
  rows.push({id,kind:r.kind,catalogKey:r.catalogKey,manufacturerSku:r.manufacturerSku,
   manufacturerName:r.manufacturerName,series:r.series,documentTitle:r.documentTitle,
   documentUrl:r.documentUrl,documentRevision:r.documentRevision,
   documentLocation:r.documentLocation,reviewedAt:r.reviewedAt,
   reviewedBy:r.reviewedBy,sourceType:r.sourceType,
   documentChecked:r.documentChecked===true,scope:r.scope,bands:r.bands,
   approval:'NOT_ESTABLISHED'});
 }
 return finish();
}
function epLetThroughEvidenceBindingV1(project,line,article,input){
 const issues=[],add=(code,level='UNKNOWN')=>issues.push({code,level,lineId:line?.id??null});
 const end=(extra={})=>({status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues,matched:false,documentUrl:null,documentLocation:null,
  engineeringApproved:false,...extra});
 const id=input?.evidenceRecordId;
 if(typeof id!=='string'||!id.trim()){
  add('LET_THROUGH_EVIDENCE_RECORD_UNLINKED');return end();
 }
 const all=project?.manufacturerEvidenceRecords;
 if(!Array.isArray(all)){add('LET_THROUGH_EVIDENCE_REGISTER_UNAVAILABLE','BLOCKED');return end();}
 const matched=all.filter(r=>r?.id===id);
 if(matched.length!==1){add('LET_THROUGH_EVIDENCE_RECORD_NOT_UNIQUE','BLOCKED');return end();}
 const rec=matched[0];
 const audit=epManufacturerEvidenceRegisterV1({manufacturerEvidenceRecords:[rec]});
 for(const issue of audit.issues){
  add('LET_THROUGH_'+issue.code,issue.level);
 }
 if(rec.kind!=='LET_THROUGH_I2T'||rec.catalogKey!==line?.catalogSku||
    rec.manufacturerSku!==article?.sku)
  add('LET_THROUGH_EVIDENCE_IDENTITY_MISMATCH','BLOCKED');
 const scope=rec.scope||{};
 if(scope.deviceStandard!==input.deviceStandard||
    scope.nominalCurrentA!==Number(input.articleInA)||
    scope.poles!==input.protectionPoles||
    scope.testVoltageV!==Number(input.testVoltageV)||
    scope.testFrequencyHz!==Number(input.testFrequencyHz)||
    scope.faultModel!==input.faultModel)
  add('LET_THROUGH_EVIDENCE_SCOPE_MISMATCH','BLOCKED');
 const sameBand=(a,b)=>Number(a?.minProspectiveA)===b?.minProspectiveA&&
  Number(a?.maxProspectiveA)===b?.maxProspectiveA&&
  Number(a?.maxLetThroughA2s)===b?.maxLetThroughA2s;
 if(!Array.isArray(input.bands)||!Array.isArray(rec.bands)||
    input.bands.length!==rec.bands.length||
    rec.bands.some((b,i)=>!sameBand(input.bands[i],b)))
  add('LET_THROUGH_EVIDENCE_CURVE_MISMATCH','BLOCKED');
 return end({matched:issues.every(x=>x.level!=='BLOCKED')&&
    rec.documentChecked===true&&audit.issues.length===0,
   documentUrl:rec.documentUrl??null,documentLocation:rec.documentLocation??null,
   documentTitle:rec.documentTitle??null,documentRevision:rec.documentRevision??null,
   reviewedAt:rec.reviewedAt??null,recordId:id,
   notice:'Matching project-local source record means only that an engineer checked a declared document; not independently authenticated manufacturer data.'});
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epManufacturerEvidenceRegisterV1,epLetThroughEvidenceBindingV1};
