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
test('panel calculations can be available without routing or provenance',()=>{
 const r=audit({lines:[{id:'L1',catalogSku:'x',overloadInput:{ibA:10,izA:20},
 route44Input:{},breakingCapacityInput:{},calculationReview:{}}]},()=>sku);
 assert.equal(r.status,'AVAILABLE');assert.equal(r.ready_for_installation,false);
});

test('actual faultInput Ik counts as a declaration, not a verification',()=>{
 const r=audit({lines:[{id:'L1',catalogSku:'x',overloadInput:{ibA:'10,5',izA:'20,5'},
 faultInput:{ikKa:'3,5'},route44Input:{}}]},()=>sku);
 assert.ok(!r.issues.some(x=>x.code==='SHORT_CIRCUIT_INPUT_NOT_DECLARED'));
 assert.ok(!r.issues.some(x=>x.code==='ENGINEERING_REVIEW_EVIDENCE_NOT_ESTABLISHED'));
 assert.ok(!r.issues.some(x=>x.code==='ROUTE_IMPEDANCE_NOT_DECLARED'));
});
test('stale calculation review blocks',()=>{
 const r=audit({lines:[{id:'L1',calculationReview:{required:true}}]});
 assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.code==='CALCULATION_REVIEW_STALE'));
});
test('decimal comma currents compared to article rating',()=>{
 const r=audit({lines:[{id:'L1',catalogSku:'x',overloadInput:{ibA:'16,5',izA:'20,0'}}]},()=>sku);
 assert.ok(r.issues.some(x=>x.code==='IB_EXCEEDS_SELECTED_IN'));
});

test('no cable length or Iz is mandatory for preliminary panel design',()=>{
 const r=audit({lines:[{id:'L1',catalogSku:'x',overloadInput:{ibA:10}}]},()=>sku);
 assert.equal(r.status,'AVAILABLE');
 assert.ok(!r.issues.some(x=>x.code==='IZ_NOT_DECLARED'));
 assert.ok(!r.issues.some(x=>x.code==='SHORT_CIRCUIT_INPUT_NOT_DECLARED'));
});
test('invalid declared cable ampacity does not produce false numeric pass',()=>{
 const r=audit({lines:[{id:'L1',catalogSku:'x',overloadInput:{ibA:10,izA:'bad'}}]},()=>sku);
 assert.equal(r.engineeringApproved,false);
});

test('auto-calculated load Ib is reused without asking engineer to re-enter it',()=>{
 const p={lines:[{id:'L1',catalogSku:'x',
  loadCurrentCalculation:{roundedIbA:10,stale:false}}]};
 const r=audit(p,()=>sku);
 assert.equal(r.status,'AVAILABLE');assert.equal(r.lines[0].ibSource,'CALCULATED');
 assert.equal(r.lines[0].ibA,10);
 assert.ok(!r.issues.some(x=>x.code==='IB_NOT_DECLARED'));
});
test('stale calculated Ib cannot silently substitute an absent declared current',()=>{
 const p={lines:[{id:'L1',catalogSku:'x',
  loadCurrentCalculation:{roundedIbA:10,stale:true}}]};
 const r=audit(p,()=>sku);
 assert.ok(r.issues.some(x=>x.code==='IB_NOT_DECLARED'));
});
test('explicitly supplied invalid Iz is blocked; unknown Iz is not',()=>{
 const p={lines:[{id:'L1',catalogSku:'x',overloadInput:{ibA:10,izA:'bad'}}]};
 const r=audit(p,()=>sku);assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='IZ_DECLARED_INVALID'));
 delete p.lines[0].overloadInput.izA;
 const missing=audit(p,()=>sku);assert.equal(missing.status,'AVAILABLE');
});
test('auto-calculated load exceeding selected breaker is still a blocker',()=>{
 const p={lines:[{id:'L1',catalogSku:'x',
  loadCurrentCalculation:{roundedIbA:20,stale:false}}]};
 const r=audit(p,()=>sku);assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='IB_EXCEEDS_SELECTED_IN'));
});
