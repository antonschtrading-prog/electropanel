'use strict';
// Read-only, deterministic export for engineering review. Never approves staged devices.
const {buildBrowserSnapshot,buildComparison}=require('./catalog-browser-v1.js');
const {previewProjectTransfer}=require('./project-transfer-preview-v1.js');
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
 const rows=cards.map(c=>[c.sku,c.manufacturer,c.series,c.kind,c.reviewStatus||'UNREVIEWED',c.fields||{},c.missing||[],c.source||'']);
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
module.exports={csvCell,csv,exportStagingInventory,exportComparison,exportProjectTransferReview};
