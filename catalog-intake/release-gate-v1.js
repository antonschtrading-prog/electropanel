'use strict';
const {candidates,evidence}=require('./manufacturer-source-batch-v1.js');
const {reconcile}=require('./reconcile-existing-v1.js');
const {reviewCandidate}=require('./field-evidence-v1.js');
const {EP_CATALOG}=require('../catalog.js');
const REQUIRED=['sku','maker','series','kind'];
function createReleaseGate(existing=Object.values(EP_CATALOG),incoming=candidates,proof=evidence){
 const reconciliation=reconcile(existing,incoming);
 const decisions=incoming.map(row=>{
  const evidenceResult=reviewCandidate(row,proof[row.sku]||{});
  const overlap=reconciliation.overlaps.find(x=>x.sku===row.sku);
  const unresolved=evidenceResult.errors.map(x=>({code:x.code,field:x.field||null}));
  if(overlap){
   unresolved.push({code:'EXISTING_SKU_REVIEW_REQUIRED',field:'sku'});
   if(overlap.conflicts.length)unresolved.push({code:'EXISTING_SKU_CONFLICTS',field:overlap.conflicts.map(x=>x.field).join(',')});
  }
  if(!REQUIRED.every(field=>typeof row[field]==='string'&&row[field].trim()))unresolved.push({code:'IDENTITY_INCOMPLETE',field:null});
  return {sku:row.sku,kind:row.kind,action:overlap?'REVIEW_ENRICHMENT':'HOLD_NEW_ARTICLE',
   status:'BLOCKED',unresolved,source:row.source||null,approval:false};
 });
 return {schemaVersion:1,baseCatalogCount:existing.length,stagedCount:incoming.length,
  decisions,blocked:decisions.length,readyToImport:0,autoMergeAllowed:false,
  electricalEngineeringApproved:false,uiModified:false};
}
module.exports={createReleaseGate};
