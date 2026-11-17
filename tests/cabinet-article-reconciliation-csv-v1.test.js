'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epCabinetArticleReconciliationCsvV1:csv}=require('../cabinet-article-reconciliation-csv-v1.js');
const sample=()=>({schema:'electropanel.cabinet.article.reconciliation.1',
 status:'BLOCKED',rows:[{deviceId:'B1',boardSku:'A',bomSku:'B',visualSku:'A',
 modules:2,railIndex:0,startModule:3,status:'BLOCKED',issues:['CABINET_ARTICLE_BOM_SKU_MISMATCH']}],
 issues:[{code:'CABINET_ARTICLE_BOM_SKU_MISMATCH',level:'BLOCKED'}]});
test('CSV preserves article mismatch evidence and DIN location',()=>{
 const r=csv(sample());
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.rowCount,1);
 assert.equal(r.issueCount,1);
 assert.match(r.csv,/CABINET_ARTICLE_BOM_SKU_MISMATCH/);
 assert.match(r.csv,/"board_sku"/);
 assert.match(r.csv,/"B1";"A";"B";"A";"2";"0";"3"/);
 assert.equal(r.ready_for_installation,false);
});
test('CSV starts with BOM for spreadsheet encoding compatibility',()=>{
 assert.equal(csv(sample()).csv.charCodeAt(0),0xfeff);
});
test('CSV protects against formula injection in device IDs and SKU',()=>{
 const r=sample();r.rows[0].deviceId='=HYPERLINK("https://bad")';
 r.rows[0].boardSku='+SUM(1,1)';
 const result=csv(r);
 assert.match(result.csv,/"'=HYPERLINK/);
 assert.match(result.csv,/"'\+SUM/);
});
test('CSV quotes semicolons, embedded double quotes and newlines',()=>{
 const r=sample();r.rows[0].deviceId='A;"B"\nC';
 const result=csv(r);
 assert.match(result.csv,/"A;""B""\nC"/);
});
test('CSV rejects malformed reconciliation report',()=>{
 for(const value of [null,{},[],{schema:'wrong',rows:[]},
  {schema:'electropanel.cabinet.article.reconciliation.1',rows:null}])
  assert.equal(csv(value).status,'BLOCKED');
});
test('CSV never mutates source report',()=>{
 const r=sample(),before=JSON.stringify(r);
 assert.deepEqual(csv(r),csv(r));
 assert.equal(JSON.stringify(r),before);
});
