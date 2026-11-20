'use strict';
// Auditable catalogue quality metrics. Read-only: no engineering approval.
const {items}=require('./staged-selector-v1.js');
const {KEY_FIELDS,reviewCandidate}=require('./field-evidence-v1.js');
const {validateCandidate}=require('./candidate-schema-v1.js');
const {EP_CATALOG}=require('../catalog.js');
function normalize(s){return String(s||'').trim().toUpperCase()}
function dashboard(source=items,core=Object.values(EP_CATALOG)){
 const existing=new Set(core.map(x=>normalize(x.sku)));
 const seen=new Map(),records=[],totals={records:0,readyForHumanReview:0,blocked:0,coreOverlap:0,missingGeometry:0,missingIdentityEvidence:0,missingKeyFieldEvidence:0,missingKeySpecifications:0,duplicateSkus:0};
 for(const item of source){
  const d=item.record||{},e=item.evidence||{},sku=normalize(d.sku);
  const review=reviewCandidate(d,e),schema=validateCandidate(d);
  const missingGeometry=['widthMm','heightMm','depthMm'].filter(k=>!Number.isFinite(d[k])||d[k]<=0);
  const missingSpecifications=(KEY_FIELDS[d.kind]||[]).filter(k=>d[k]==null);
  const missingEvidence=(KEY_FIELDS[d.kind]||[]).filter(k=>d[k]!=null&&(!e[k]||!e[k].url||!e[k].locator||!e[k].reviewedAt||!e[k].documentTitle));
  const identityMissing=review.errors.some(x=>x.code==='SKU_IDENTITY_EVIDENCE_MISSING');
  const duplicate=seen.has(sku);
  const reasons=[...new Set([...review.errors.map(x=>x.code),...schema.map(x=>x.code),...(duplicate?['DUPLICATE_SKU']:[])])].sort();
  const row={sku,batch:item.batch,kind:d.kind||null,maker:d.maker||null,reviewStatus:review.status,
   coreOverlap:existing.has(sku),duplicate,duplicateWith:duplicate?seen.get(sku):null,
   missingGeometry,missingSpecifications,missingEvidence,identityMissing,reasons,
   engineeringApproved:false,selectable:false};
  if(!duplicate)seen.set(sku,item.batch);
  records.push(row);totals.records++;
  if(review.status==='READY_FOR_HUMAN_REVIEW'&&!duplicate)totals.readyForHumanReview++;else totals.blocked++;
  if(row.coreOverlap)totals.coreOverlap++;
  if(missingGeometry.length)totals.missingGeometry++;
  if(identityMissing)totals.missingIdentityEvidence++;
  if(missingEvidence.length)totals.missingKeyFieldEvidence++;
  if(missingSpecifications.length)totals.missingKeySpecifications++;
  if(duplicate)totals.duplicateSkus++;
 }
 records.sort((a,b)=>a.sku.localeCompare(b.sku)||String(a.batch).localeCompare(String(b.batch)));
 const byKind={};for(const r of records){const k=r.kind||'UNKNOWN';(byKind[k]??={total:0,blocked:0}).total++;if(r.reviewStatus==='BLOCKED'||r.duplicate)byKind[k].blocked++}
 return {mode:'CATALOG_QUALITY_READ_ONLY',engineeringApproved:false,autoImportAllowed:false,totals,byKind,records};
}
function verificationQueue(source=items,core=Object.values(EP_CATALOG)){
 const report=dashboard(source,core);
 const queue=report.records.filter(r=>r.reasons.length||r.missingGeometry.length||r.missingSpecifications.length)
 .map(r=>({...r,priority:r.duplicate?0:r.coreOverlap?1:r.missingSpecifications.length?2:r.missingGeometry.length?3:4}))
 .sort((a,b)=>a.priority-b.priority||a.sku.localeCompare(b.sku));
 return {mode:'HUMAN_VERIFICATION_QUEUE',engineeringApproved:false,count:queue.length,queue};
}
module.exports={dashboard,verificationQueue};
