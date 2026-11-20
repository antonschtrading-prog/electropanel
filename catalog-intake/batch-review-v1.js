'use strict';
const {KINDS,validateCandidate}=require('./candidate-schema-v1.js');
const {reviewCandidate}=require('./field-evidence-v1.js');
function normalizedId(record){return [record?.maker,record?.series,record?.sku].map(x=>String(x||'').trim().toUpperCase()).join('::')}
function inspectBatch(records, evidenceBySku={}){
 const issues=[],seen=new Map(),groups=Object.fromEntries(KINDS.map(k=>[k,{total:0,blocked:0,reviewable:0}]));
 if(!Array.isArray(records))return {status:'BLOCKED',issues:[{code:'BATCH_NOT_ARRAY'}],groups,items:[]};
 const items=records.map((record,index)=>{
  const id=normalizedId(record);
  const errors=validateCandidate(record);
  if(seen.has(id))errors.push({code:'DUPLICATE_ARTICLE_ID',otherIndex:seen.get(id)});
  else seen.set(id,index);
  const key=record&&typeof record.sku==='string'?record.sku:'';
  const evidence=Object.hasOwn(evidenceBySku,key)?evidenceBySku[key]:{};
  const reviewed=reviewCandidate(record,evidence);
  const all=[...errors,...reviewed.errors.filter(e=>!errors.some(x=>x.code===e.code&&x.field===e.field))];
  const status=all.length?'BLOCKED':'READY_FOR_HUMAN_REVIEW';
  if(groups[record?.kind]){groups[record.kind].total++;groups[record.kind][status==='BLOCKED'?'blocked':'reviewable']++}
  if(all.length)issues.push({index,id,issues:all});
  return {index,id,status,issues:all};
 });
 return {status:issues.length?'BLOCKED':'READY_FOR_HUMAN_REVIEW',issues,groups,items,engineeringApproved:false};
}
function compareAgainstLegacy(records,legacyRecords){
 const bySku=new Map(),conflicts=[];
 for(const record of legacyRecords||[]){
  if(record&&typeof record.sku==='string'){
   const key=record.sku.trim().toUpperCase();
   if(!bySku.has(key))bySku.set(key,record);
  }
 }
 for(const record of records||[]){
  if(!record||typeof record.sku!=='string')continue;
  const old=bySku.get(record.sku.trim().toUpperCase());
  if(!old)continue;
  const fields=['maker','series','kind','poles','modules','widthMm','inA','icnKa','icnVoltageV','icnStandard'];
  const differences=fields.filter(field=>old[field]!=null&&record[field]!=null&&old[field]!==record[field]);
  conflicts.push({sku:record.sku,kind:'EXISTING_SKU',differences,requiresHumanReview:true});
 }
 return conflicts;
}
module.exports={normalizedId,inspectBatch,compareAgainstLegacy};
