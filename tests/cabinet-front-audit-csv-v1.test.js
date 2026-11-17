'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epCabinetFrontAuditCsvV1:csv}=require('../cabinet-front-audit-csv-v1.js');
const report=()=>({schema:'electropanel.cabinet.front.gallery.1',status:'BLOCKED',
 totals:{articles:1},rows:[{sku:'A',maker:'ABB',series:'S200',kind:'MCB',count:2,
 deviceIds:['B1','B2'],modules:1,widthMm:25,nominalSlotWidthMm:18,
 geometryStatus:'EXCEEDS_DIN_SLOT',status:'STYLIZED_ONLY',
 issues:['FRONT_GALLERY_BODY_EXCEEDS_DIN_SLOT']}]});
test('CSV retains article, manufacturer, installed quantity and DIN width discrepancy',()=>{
 const r=csv(report());
 assert.equal(r.status,'BLOCKED');assert.equal(r.rowCount,1);
 assert.match(r.csv,/"A";"ABB";"S200";"MCB";"2";"B1\|B2";"1";"25";"18"/);
 assert.match(r.csv,/FRONT_GALLERY_BODY_EXCEEDS_DIN_SLOT/);
 assert.match(r.csv,/"BLOCKED";"NO"/);
 assert.equal(r.engineeringApproved,false);
});
test('CSV includes UTF-8 BOM for spreadsheet import',()=>{
 assert.equal(csv(report()).csv.charCodeAt(0),0xfeff);
});
test('CSV escapes semicolons, embedded quotes and newline characters',()=>{
 const r=report();r.rows[0].maker='A;"B"\nC';
 assert.match(csv(r).csv,/"A;""B""\nC"/);
});
test('CSV protects formula injection in catalogue article identifiers',()=>{
 const r=report();r.rows[0].sku='=HYPERLINK("https://bad")';
 r.rows[0].series='+SUM(1,2)';
 const result=csv(r).csv;
 assert.match(result,/"'=HYPERLINK/);
 assert.match(result,/"'\+SUM/);
});
test('CSV never claims manufacturer cabinet fit verified',()=>{
 const r=csv(report());
 assert.equal(r.manufacturerCabinetFitVerified,false);
});
test('CSV rejects malformed report without fabricating data',()=>{
 for(const bad of [null,{},[],{schema:'wrong',rows:[]},
  {schema:'electropanel.cabinet.front.gallery.1',rows:null,totals:{}}]){
  const r=csv(bad);assert.equal(r.status,'BLOCKED');assert.equal(r.csv,null);
 }
});
test('CSV does not mutate input and is deterministic',()=>{
 const p=report(),before=JSON.stringify(p);
 assert.deepEqual(csv(p),csv(p));
 assert.equal(JSON.stringify(p),before);
});
