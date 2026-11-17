'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epCabinetFrontInventoryCsvV1:csv}=require('../cabinet-front-inventory-csv-v1.js');
const rows=[{boardSku:'ABB-S200'},{boardSku:'ABB-S200'},{boardSku:'UNKNOWN'},
 {boardSku:'=FORMULA'}];
const lookup=sku=>sku==='UNKNOWN'?null:{maker:'ABB',series:'S200',sku,kind:'MCB',
 modules:1,poles:1,widthMm:18};
const resolve=d=>d.sku==='ABB-S200'?
 {status:'REVIEWED_IMAGE',issues:[],image:{src:'assets/device-fronts/abb.png',
  productEvidenceUrl:'https://example.org/abb'}}:
 {status:'ASSET_REJECTED',issues:['FRONT_RIGHTS_NOT_DOCUMENTED'],image:null};
test('inventory lists each installed article once with provenance',()=>{
 const r=csv(rows,lookup,resolve);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.rows,3);
 assert.match(r.csv,/REVIEWED_IMAGE/);
 assert.match(r.csv,/ASSET_REJECTED/);
 assert.match(r.csv,/CATALOGUE_MISSING/);
 assert.match(r.csv,/FRONT_RIGHTS_NOT_DOCUMENTED/);
 assert.match(r.csv,/assets\/device-fronts\/abb.png/);
 assert.match(r.csv,/https:\/\/example.org\/abb/);
 assert.equal(r.engineeringApproved,false);
});
test('inventory escapes spreadsheet formula injection',()=>{
 const r=csv(rows,lookup,resolve);
 assert.match(r.csv,/'=FORMULA/);
 assert.match(r.csv,/"installation_approved"/);
 assert.match(r.csv,/"NO"/);
});
test('inventory rejects malformed input',()=>{
 assert.equal(csv(null,lookup,resolve).status,'BLOCKED');
 assert.equal(csv(rows,lookup,null).code,'FRONT_INVENTORY_INPUT_INVALID');
});
test('inventory tolerates unavailable catalogue and provenance service',()=>{
 const r=csv([{boardSku:'X'}],()=>{throw Error('offline');},resolve);
 assert.equal(r.rows,1);
 assert.match(r.csv,/CATALOGUE_MISSING/);
});
test('inventory is UTF-8 BOM CSV with CRLF and semicolon columns',()=>{
 const r=csv(rows,lookup,resolve);
 assert.equal(r.csv.charCodeAt(0),0xFEFF);
 assert.ok(r.csv.includes('\r\n'));
 assert.ok(r.csv.includes('"article";"quantity";"manufacturer"'));
});

test('inventory records quantity of repeated installed SKU',()=>{
 const r=csv(rows,lookup,resolve);
 const line=r.csv.split('\r\n').find(x=>x.startsWith('"ABB-S200";'));
 assert.match(line,/^"ABB-S200";"2";/);
});
