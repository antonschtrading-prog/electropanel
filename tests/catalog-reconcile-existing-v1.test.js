'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {reconcile}=require('../catalog-intake/reconcile-existing-v1.js');
const {candidates}=require('../catalog-intake/manufacturer-source-batch-v1.js');
test('two staged MCB SKUs already exist in integrated catalog',()=>{
 const result=reconcile();assert.ok(result.overlaps.some(x=>x.sku==='A9F74116'));assert.ok(result.overlaps.some(x=>x.sku==='2CDS251001R0164'));
});
test('Hager staged RCD is a new SKU and not imported',()=>{
 const result=reconcile();assert.ok(result.newArticles.some(x=>x.sku==='CDA440D'));assert.equal(result.autoImportAllowed,false);
});
test('overlapping records never overwrite original catalogue',()=>{
 const result=reconcile();assert.ok(result.overlaps.every(x=>x.action==='MANUAL_REVIEW_NO_OVERWRITE'));
});
test('difference detector catches source-versus-existing mismatches',()=>{
 const existing=[{sku:'X',kind:'MCB',inA:10,widthMm:18}];
 const incoming=[{sku:'X',kind:'MCB',inA:16,widthMm:17.5}];
 const r=reconcile(existing,incoming);
 assert.deepEqual(r.overlaps[0].conflicts.map(x=>x.field),['widthMm','inA']);
 assert.equal(existing[0].inA,10);
});
test('missing incoming dimensions cannot erase existing known values',()=>{
 const r=reconcile([{sku:'X',kind:'MCB',widthMm:18}],[{sku:'X',kind:'MCB',widthMm:null}]);
 assert.deepEqual(r.overlaps[0].missingFromIncoming,['widthMm']);
});
test('new articles are not presented as approved',()=>{
 const r=reconcile([],[candidates[2]]);
 assert.equal(r.newArticles[0].status,'REQUIRES_SOURCE_AND_INTEGRATION_REVIEW');
 assert.equal(r.engineeringApproved,false);
});
test('existing catalogue duplicate SKUs are flagged',()=>{
 const r=reconcile([{sku:'X'},{sku:'x'}],[]);
 assert.ok(r.duplicates.some(x=>x.code==='DUPLICATE_EXISTING_SKU'));
});
test('invalid incoming SKU is not treated as a valid new product',()=>{
 const r=reconcile([],[{sku:null}]);assert.equal(r.newArticles.length,0);assert.equal(r.duplicates[0].code,'MISSING_INCOMING_SKU');
});
test('SKU comparison is case-insensitive and whitespace-trimmed',()=>{
 const r=reconcile([{sku:' AbC '}],[{sku:'abc'}]);assert.equal(r.overlaps.length,1);
});
test('source-backed batch remains blocked from auto-import',()=>{
 const r=reconcile();assert.equal(r.autoImportAllowed,false);assert.equal(r.intakeStatus,'BLOCKED');
});
