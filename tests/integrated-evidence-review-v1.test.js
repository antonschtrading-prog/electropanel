'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {epIntegratedEvidenceReview}=require('../integrated-evidence-review-v1.js');
test('empty project remains UNKNOWN and cannot be approved',()=>{
 const r=epIntegratedEvidenceReview({lines:[]});
 assert.equal(r.status,'UNKNOWN');assert.equal(r.engineeringApproved,false);
 assert.ok(r.issues.some(i=>i.code==='NO_CIRCUITS'));
});
test('invalid project blocked',()=>assert.equal(epIntegratedEvidenceReview(null).status,'BLOCKED'));
test('incomplete circuit remains UNKNOWN',()=>{
 const r=epIntegratedEvidenceReview({lines:[{id:'L1'}]});
 assert.equal(r.status,'UNKNOWN');assert.equal(r.checks.length,2);
 assert.ok(r.issues.some(i=>i.scope==='coordination'));
});
test('contradictory protection is blocked',()=>{
 const r=epIntegratedEvidenceReview({lines:[{id:'L1',coordinationEvidence:{
 ibA:25,inA:16,izA:20,i2A:25,evidence:{cableSource:'catalog',protectionSource:'datasheet'}
 }}]});
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(i=>i.code==='IB_GT_IN'));
});
test('DIN overflow blocks project',()=>{
 const r=epIntegratedEvidenceReview({lines:[],dinEvidence:{railWidthMm:30,devices:[{id:'Q1',xMm:20,widthMm:20}]}});
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(i=>i.code==='RAIL_OVERFLOW'));
});
test('declared catalog evidence never implies engineering approval',()=>{
 const r=epIntegratedEvidenceReview({lines:[],catalogArticles:[{maker:'M',series:'S',sku:'A',source:'https://example.com',poles:1,modules:1,inA:16,widthMm:18,appearanceEvidence:{kind:'original-stylized'}}]});
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.checks.find(x=>x.scope==='catalog').status,'DOCUMENTED_UNVERIFIED');
});
