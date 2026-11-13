'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
const {epDraftLayoutAlternativesV1:compare,epDraftLayoutAlternativesHtmlV1:html}=require('../draft-layout-alternatives-v1.js');
const p=()=>({railCount:2,railCapacity:5,lines:[
 {id:'L1',modules:3},{id:'L2',modules:3},{id:'L3',modules:2},{id:'L4',modules:2}]});
test('first-fit packing can recover a device from sequential placement',()=>{
 const r=compare(p());assert.equal(r.comparison.baselinePlaced,3);
 assert.equal(r.comparison.compactPlaced,4);assert.equal(r.comparison.gainedDevices,1);
});
test('compact packing never exceeds rail capacity',()=>{
 const r=compare(p());for(const d of r.compact.placements)
  assert.ok(d.startModule+d.modules<=5);
});
test('compact placement never mutates project',()=>{
 const x=p(),before=JSON.stringify(x);compare(x);assert.equal(JSON.stringify(x),before);
});
test('overflow remains blocked even after compact packing',()=>{
 const x=p();x.railCount=1;
 const r=compare(x);assert.equal(r.status,'BLOCKED');assert.ok(r.compact.unplaced.length>0);
});
test('invalid rail capacity fails closed',()=>{
 const x=p();x.railCapacity=0;assert.equal(compare(x).status,'BLOCKED');
});
test('unknown catalogue article is blocking',()=>{
 const x=p();x.lines[0].catalogSku='UNKNOWN';
 assert.ok(compare(x,()=>null).issues.some(i=>i.code==='ARTICLE_WIDTH_UNVERIFIED'));
});
test('catalogue width mismatch blocks',()=>{
 const x=p();x.lines[0].catalogSku='A';
 assert.ok(compare(x,()=>({modules:2})).issues.some(i=>i.code==='WIDTH_CONFLICT'));
});
test('branch binding mismatch is not silently accepted',()=>{
 const x=p();x.branchDevices=[{id:'B1',circuitId:'L1',modules:1}];
 assert.ok(compare(x).issues.some(i=>i.code==='BRANCH_BINDING_INVALID'));
});
test('duplicate shared device ID blocks',()=>{
 const x=p();x.sharedDevices=[{id:'S1',modules:1},{id:'S1',modules:1}];
 assert.ok(compare(x).issues.some(i=>i.code==='DEVICE_ID_INVALID'));
});
test('HTML escapes user-controlled apparatus IDs',()=>{
 const x=p();x.lines[0].id='<script>alert(1)</script>';
 const h=html(compare(x));assert.doesNotMatch(h,/<script>/);assert.match(h,/&lt;script&gt;/);
});
test('comparison does not approve engineering',()=>{
 const r=compare(p());assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
});
test('same size devices sort deterministically by ID',()=>{
 const x={railCount:1,railCapacity:4,lines:[{id:'Z',modules:1},{id:'A',modules:1}]};
 assert.deepEqual(compare(x).compact.placements.map(d=>d.deviceId),['A','Z']);
});
