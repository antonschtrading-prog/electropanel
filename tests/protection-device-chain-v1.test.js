'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epProtectionTopologyV1=require('../protection-topology-v1.js').epProtectionTopologyV1;
const {epProtectionDeviceChainV1:chain}=require('../protection-device-chain-v1.js');
function project(){return {lines:[{id:'A',catalogSku:'U',device:'C32'},
 {id:'B',catalogSku:'D',device:'C16'}],branchModelVersion:1,
 branchDevices:[{id:'BR-A',circuitId:'A',label:'C32'},{id:'BR-B',circuitId:'B',label:'C16'}],
 protectionLinks:[{upstreamLineId:'A',downstreamLineId:'B'}]};}
const lookup=sku=>({kind:'MCB',inA:sku==='U'?32:16,verificationStatus:'VERIFIED'});
test('maps protected circuits to unique apparatus IDs without inferring selectivity',()=>{
 const p=project(),before=JSON.stringify(p),r=chain(p,lookup);
 assert.equal(r.pairs.length,1);assert.equal(r.pairs[0].upstreamDeviceId,'BR-A');
 assert.equal(r.pairs[0].downstreamDeviceId,'BR-B');
 assert.equal(r.pairs[0].relation,'DECLARED_NOT_VERIFIED');
 assert.equal(r.selectivityStatus,'NOT_ASSESSED');
 assert.equal(r.engineeringApproved,false);assert.equal(JSON.stringify(p),before);
});
test('missing manufacturer article or binding cannot return approval',()=>{
 const p=project();delete p.lines[1].catalogSku;p.branchDevices.pop();
 const r=chain(p,lookup);assert.equal(r.selectivityStatus,'NOT_ASSESSED');
 assert.ok(r.issues.some(x=>x.code==='CHAIN_PROTECTIVE_DEVICE_BINDING_MISSING'));
 assert.ok(r.issues.some(x=>x.code==='CHAIN_SELECTED_ARTICLE_UNDECLARED'));
});
test('incorrect or duplicate apparatus identity blocks',()=>{
 const p=project();p.branchDevices[1].id='BR-A';
 const r=chain(p,lookup);assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='CHAIN_BRANCH_DEVICE_INVALID_OR_DUPLICATED'));
});
test('cyclic hierarchy blocks reconciliation',()=>{
 const p=project();p.protectionLinks.push({upstreamLineId:'B',downstreamLineId:'A'});
 const r=chain(p,lookup);assert.equal(r.status,'BLOCKED');assert.equal(r.pairs.length,0);
});
test('catalogue must be overcurrent device to participate in pair evaluation',()=>{
 const r=chain(project(),sku=>({kind:sku==='U'?'RCD':'MCB',inA:16,verificationStatus:'VERIFIED'}));
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='CHAIN_ARTICLE_NOT_OVERCURRENT_PROTECTIVE'));
});
test('larger nominal upstream is never treated as proof of selectivity',()=>{
 const r=chain(project(),lookup);
 assert.ok(r.issues.some(x=>x.code==='CHAIN_SELECTIVITY_MANUFACTURER_EVIDENCE_MISSING'));
 assert.equal(r.pairs[0].selectivityStatus,'NOT_ASSESSED');
});
test('missing branch model is incomplete, not an invented identity',()=>{
 const p=project();delete p.branchModelVersion;
 const r=chain(p,lookup);assert.equal(r.status,'UNKNOWN');assert.equal(r.pairs.length,0);
});
