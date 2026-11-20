'use strict';
// Deterministic, read-only portfolio over every isolated manufacturer intake batch.
const batches=[
 ['initial',require('./manufacturer-source-batch-v1.js')],
 ['rcbo',require('./rcbo-manufacturer-batch-v1.js')],
 ['abb-f200',require('./abb-f200-source-batch-v1.js')],
 ['ict',require('./ict-contactor-source-batch-v1.js')]
];
const {EP_CATALOG}=require('../catalog.js');
const {validateCandidate,KINDS}=require('./candidate-schema-v1.js');
const {reviewCandidate}=require('./field-evidence-v1.js');
const {reconcile}=require('./reconcile-existing-v1.js');
function key(s){return typeof s==='string'?s.trim().toUpperCase():''}
function buildPortfolio(sets=batches,existing=Object.values(EP_CATALOG)){
 const records=[],errors=[],seen=new Map(),byKind=Object.fromEntries(KINDS.map(k=>[k,{total:0,blocked:0,reviewable:0}]));
 for(const [batch,data] of sets){
  if(!Array.isArray(data?.candidates)){errors.push({code:'INVALID_BATCH',batch});continue}
  for(const item of data.candidates){
   const sku=key(item?.sku),id=item?.maker+'::'+sku;
   if(!sku){errors.push({code:'MISSING_SKU',batch});continue}
   if(seen.has(sku)){errors.push({code:'DUPLICATE_SKU',sku,batches:[seen.get(sku),batch]});continue}
   seen.set(sku,batch);
   const evidence=data.evidence?.[item.sku]||{};
   const reviewed=reviewCandidate(item,evidence);
   const schema=validateCandidate(item);
   const problems=[...new Set([...schema,...reviewed.errors].map(x=>x.code+':'+(x.field||'')))];
   const entry={sku,maker:item.maker,series:item.series,kind:item.kind,batch,
    source:item.source||null,reviewStatus:reviewed.status,problems,
    marketStatus:item.marketStatus||item.lifecycle||'UNREVIEWED',
    dimensionsKnown:[item.widthMm,item.heightMm,item.depthMm].every(x=>typeof x==='number'&&x>0),
    imageRightsVerified:!!item.imageRightsEvidence};
   records.push(entry);
   if(byKind[item.kind]){byKind[item.kind].total++;byKind[item.kind][reviewed.status==='BLOCKED'?'blocked':'reviewable']++}
  }
 }
 const reconciliation=reconcile(existing,sets.flatMap(([,b])=>b.candidates||[]));
 const existingSkus=new Set(existing.map(x=>key(x?.sku)));
 const newCount=records.filter(x=>!existingSkus.has(x.sku)).length;
 const missingKinds=KINDS.filter(k=>byKind[k].total===0);
 return {schemaVersion:1,mode:'STAGING_ONLY',engineeringApproved:false,autoImportAllowed:false,
  total:records.length,newToCore:newCount,overlapWithCore:records.length-newCount,
  counts:byKind,missingKinds,completeGeometry:records.filter(x=>x.dimensionsKnown).length,
  missingGeometry:records.filter(x=>!x.dimensionsKnown).length,
  duplicateErrors:errors,sourceRecords:records,
  coreConflicts:reconciliation.overlaps.filter(x=>x.conflicts.length).map(x=>({sku:x.sku,conflicts:x.conflicts})),
  blockers:records.filter(x=>x.reviewStatus==='BLOCKED').map(x=>({sku:x.sku,issues:x.problems}))};
}
module.exports={batches,buildPortfolio};
