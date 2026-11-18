'use strict';
// Read-only, deterministic export for engineering review. Never approves staged devices.
const {buildBrowserSnapshot,buildComparison}=require('./catalog-browser-v1.js');
const {previewProjectTransfer}=require('./project-transfer-preview-v1.js');
const {dashboard,verificationQueue}=require('./catalog-quality-dashboard-v1.js');
const {catalogIntegration,projectMaterialDraft}=require('./catalog-project-integration-v1.js');
const SAFE=/^[=+@\-\t\r]/;
function csvCell(value){
 const raw=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);
 const safe=SAFE.test(raw)?"'"+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
}
function csv(rows){return rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'}
function exportStagingInventory(filters={}){
 const snapshot=buildBrowserSnapshot(filters);
 const cards=snapshot.results||[];
 const headers=['sku','manufacturer','series','kind','reviewStatus','fields','missing','source'];
 const rows=cards.map(c=>[c.sku,c.manufacturer,c.series,c.kind,c.reviewStatus||'UNREVIEWED',c.fields||{},c.missingRequired||[],c.sourceUrl||'']);
 return {mode:'STAGING_EXPORT_ONLY',engineeringApproved:false,count:rows.length,filename:'electropanel-staging-inventory.csv',csv:csv([headers,...rows])};
}
function exportComparison(skus){
 const result=buildComparison(skus);
 if(!result.ok)return result;
 return {ok:true,mode:'STAGING_COMPARISON_ONLY',engineeringApproved:false,
  csv:csv([['field',...result.skus],...result.rows.map(r=>[r.field,...r.values])])};
}
function exportProjectTransferReview(project){
 const result=previewProjectTransfer(project);
 const rows=result.results.map(r=>[r.sku,r.kind,r.projectSchemaAccepted,r.duplicate,r.blockers.join(';'),r.source||'']);
 return {mode:'PREVIEW_ONLY',engineeringApproved:false,transferAllowed:false,total:rows.length,
  csv:csv([['sku','kind','schemaCompatible','duplicate','blockers','source'],...rows])};
}
function exportQualityDashboard(){
 const report=dashboard();
 const rows=report.records.map(r=>[r.sku,r.batch,r.kind,r.maker,r.reviewStatus,r.coreOverlap,r.duplicate,r.missingGeometry,r.missingSpecifications,r.missingEvidence,r.identityMissing,r.reasons]);
 return {mode:'QUALITY_AUDIT_ONLY',engineeringApproved:false,count:rows.length,
  csv:csv([['sku','batch','kind','manufacturer','reviewStatus','coreOverlap','duplicate','missingGeometry','missingSpecifications','missingEvidence','identityMissing','blockers'],...rows])};
}
function exportVerificationQueue(){
 const report=verificationQueue();
 const rows=report.queue.map(r=>[r.priority,r.sku,r.kind,r.batch,r.missingSpecifications,r.missingGeometry,r.missingEvidence,r.reasons]);
 return {mode:'VERIFICATION_QUEUE_ONLY',engineeringApproved:false,count:rows.length,
  csv:csv([['priority','sku','kind','batch','missingSpecifications','missingGeometry','missingEvidence','blockers'],...rows])};
}
function exportProjectCatalogueAudit(project){
 const report=catalogIntegration(project);
 return {mode:report.mode,engineeringApproved:false,count:report.records.length,
  csv:csv([['lineId','lineName','catalogId','sku','source','manufacturer','kind','modules','widthMm','heightMm','depthMm','warnings'],
   ...report.records.map(r=>[r.lineId,r.lineName,r.catalogId,r.sku,r.source,r.manufacturer,r.kind,r.modules,r.widthMm,r.heightMm,r.depthMm,r.warnings])])};
}
function exportPreliminaryBOM(project){
 const report=projectMaterialDraft(project);
 return {mode:report.mode,engineeringApproved:false,notForProcurement:true,count:report.articles.length,
  csv:csv([['catalogId','sku','manufacturer','series','kind','quantity','modulesPerUnit','widthMmPerUnit','lines','sourceUrl'],
   ...report.articles.map(r=>[r.catalogId,r.sku,r.manufacturer,r.series,r.kind,r.quantity,r.modulesPerUnit,r.widthMmPerUnit,r.lines,r.sourceUrl])])};
}
module.exports={csvCell,csv,exportStagingInventory,exportComparison,exportProjectTransferReview,exportQualityDashboard,exportVerificationQueue,exportProjectCatalogueAudit,exportPreliminaryBOM};
