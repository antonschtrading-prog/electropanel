'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epProjectCalculationCoverageV1:audit}=require('../project-calculation-coverage-v1.js');
const sku={inA:16};
test('no project is blocked',()=>assert.equal(audit(null).status,'BLOCKED'));
test('empty project cannot pass',()=>assert.equal(audit({lines:[]}).status,'BLOCKED'));
test('incomplete line is explicitly unknown',()=>{
 const r=audit({lines:[{id:'L1'}]});assert.equal(r.status,'UNKNOWN');
 assert.ok(r.issues.some(x=>x.code==='IB_NOT_DECLARED'));
 assert.equal(r.engineeringApproved,false);
});
test('declared load above catalogue In blocks',()=>{
 const r=audit({lines:[{id:'L1',catalogSku:'x',overloadInput:{ibA:20,izA:25}}]},()=>sku);
 assert.ok(r.issues.some(x=>x.code==='IB_EXCEEDS_SELECTED_IN'));
});
test('catalogue In above declared cable Iz blocks',()=>{
 const r=audit({lines:[{id:'L1',catalogSku:'x',overloadInput:{ibA:10,izA:12}}]},()=>sku);
 assert.ok(r.issues.some(x=>x.code==='SELECTED_IN_EXCEEDS_DECLARED_IZ'));
});
test('duplicate circuit id blocks',()=>{
 const r=audit({lines:[{id:'x'},{id:'x'}]});
 assert.ok(r.issues.some(x=>x.code==='LINE_ID_MISSING_OR_DUPLICATE'));
});
test('invalid current is not treated as evidence',()=>{
 const r=audit({lines:[{id:'L1',overloadInput:{ibA:'NaN',izA:'-5'}}]});
 assert.ok(r.issues.some(x=>x.code==='IB_NOT_DECLARED'));
});
test('even complete declarations require independent engineering review',()=>{
 const r=audit({lines:[{id:'L1',catalogSku:'x',overloadInput:{ibA:10,izA:20},
 route44Input:{},breakingCapacityInput:{},calculationReview:{}}]},()=>sku);
 assert.equal(r.status,'UNKNOWN');assert.equal(r.ready_for_installation,false);
});
