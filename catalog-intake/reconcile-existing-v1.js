'use strict';
const {EP_CATALOG}=require('../catalog.js');
const {candidates,evidence}=require('./manufacturer-source-batch-v1.js');
const {inspectBatch,compareAgainstLegacy}=require('./batch-review-v1.js');
const FIELDS=['maker','series','kind','poles','poleConfiguration','modules','widthMm','heightMm','depthMm','inA','curve','icnKa','icnVoltageV','icnStandard','icuKa','icuVoltageV','residualCurrentMa','residualType'];
function normalizeSku(value){return typeof value==='string'?value.trim().toUpperCase():''}
function reconcile(existing=Object.values(EP_CATALOG),incoming=candidates){
 const index=new Map(),duplicates=[],newArticles=[],overlaps=[];
 for(const row of existing){
  const sku=normalizeSku(row?.sku);if(!sku)continue;
  if(index.has(sku))duplicates.push({sku,code:'DUPLICATE_EXISTING_SKU'});
  else index.set(sku,row);
 }
 for(const row of incoming){
  const sku=normalizeSku(row?.sku);if(!sku){duplicates.push({code:'MISSING_INCOMING_SKU'});continue}
  const old=index.get(sku);
  if(!old){newArticles.push({sku,kind:row.kind,status:'REQUIRES_SOURCE_AND_INTEGRATION_REVIEW'});continue}
  const conflicts=FIELDS.filter(field=>old[field]!=null&&row[field]!=null&&old[field]!==row[field]).map(field=>({field,existing:old[field],incoming:row[field]}));
  const enrichments=FIELDS.filter(field=>old[field]==null&&row[field]!=null).map(field=>({field,value:row[field]}));
  const missingFromIncoming=FIELDS.filter(field=>old[field]!=null&&row[field]==null);
  overlaps.push({sku,kind:row.kind,conflicts,enrichments,missingFromIncoming,action:'MANUAL_REVIEW_NO_OVERWRITE'});
 }
 const intake=inspectBatch(incoming,evidence);
 return {existingCount:existing.length,incomingCount:incoming.length,overlaps,newArticles,duplicates,
  intakeStatus:intake.status,engineeringApproved:false,autoImportAllowed:false};
}
module.exports={normalizeSku,reconcile};
