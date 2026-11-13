'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epDesignChangeImpactV1:a,epInvalidateDesignEvidenceV1:invalidate}=require('../design-change-impact-v1');
const base=()=>({lines:[{id:'L1',powerKw:2}],network:{voltage:230},
 cables:[{lineId:'L1',section:2.5}],branchDevices:[{circuitId:'L1',catalogSku:'ABB'}],
 sharedDevices:[],wiringModelV18:{terminals:[],wires:[]},endpointBindingsV1:[],
 railCount:2,railCapacity:12,enclosure:{sku:'BOX1'}});
test('unchanged project does not demand recalculation',()=>{
 const p=base();assert.equal(a(p,structuredClone(p)).status,'UNCHANGED');
});
test('changed load affects all dependent design outputs',()=>{
 const p=base(),q=structuredClone(p);q.lines[0].powerKw=3;
 assert.deepEqual(a(p,q).affected,['load','cable','device','topology','enclosure']);
});
test('apparatus change affects protection, topology and enclosure',()=>{
 const p=base(),q=structuredClone(p);q.branchDevices[0].catalogSku='SCHNEIDER';
 assert.deepEqual(a(p,q).affected,['device','topology','enclosure']);
});
test('wiring change does not silently claim recalculation completed',()=>{
 const p=base(),q=structuredClone(p);q.wiringModelV18.wires.push({from:'A',to:'B'});
 assert.equal(a(p,q).status,'REVIEW_REQUIRED');
 assert.deepEqual(a(p,q).affected,['topology','enclosure']);
});
test('enclosure change affects enclosure only',()=>{
 const p=base(),q=structuredClone(p);q.railCapacity=18;
 assert.deepEqual(a(p,q).affected,['enclosure']);
});
test('invalid input fails closed',()=>assert.equal(a(null,{}).status,'BLOCKED'));
test('change impact does not mutate source',()=>{
 const p=base(),q=structuredClone(p),before=JSON.stringify(p);a(p,q);assert.equal(JSON.stringify(p),before);
});

test('stale evidence resets only impacted areas and keeps provenance',()=>{
 const p=base(),q=structuredClone(p);
 q.evidence=Object.fromEntries(['load','network','cable','device','topology','enclosure'].map(x=>[x,
  {status:'verified',source:'datasheet',method:'calculation'}]));
 const next=structuredClone(q);next.branchDevices[0].catalogSku='NEW';
 const impact=a(q,next),updated=invalidate(next,impact);
 for(const area of ['device','topology','enclosure']){
  assert.equal(updated.evidence[area].status,'unknown');
  assert.equal(updated.evidence[area].stale,true);
  assert.equal(updated.evidence[area].source,'datasheet');
 }
 assert.equal(updated.evidence.load.status,'verified');
 assert.equal(updated.evidence.network.status,'verified');
 assert.equal(next.evidence.device.status,'verified');
});
test('unchanged project preserves evidence object',()=>{
 const p=base();p.evidence={load:{status:'verified',source:'a',method:'b'}};
 assert.equal(invalidate(p,a(p,structuredClone(p))),p);
});
