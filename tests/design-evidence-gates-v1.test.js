'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {assessDesignEvidence,REQUIRED}=require('../design-evidence-gates-v1');
test('missing project has no mandatory evidence domain',()=>{
 const r=assessDesignEvidence(null);
 assert.equal(r.status,'not_required');
 assert.equal(r.counts.notRequired,6);
 assert.equal(r.installationApproved,false);
});
test('project stage specifies only applicable required areas',()=>{
 const r=assessDesignEvidence({}, {requiredAreas:['load','device','not-a-domain']});
 assert.equal(r.counts.unknown,2); assert.equal(r.counts.notRequired,4);
});
test('engineer-declared successful checks do not require provenance metadata',()=>{
 const r=assessDesignEvidence({evidence:{load:{status:'verified'}}});
 assert.equal(r.counts.verified,1);assert.equal(r.counts.notRequired,5);
 assert.equal(r.installationApproved,false);
});
test('failure takes precedence over missing optional areas',()=>{
 const r=assessDesignEvidence({evidence:{cable:{status:'failed'}}});
 assert.equal(r.status,'failed');assert.equal(r.counts.failed,1);
 assert.equal(r.counts.unknown,0);
});
test('stale verification remains unresolved',()=>{
 const r=assessDesignEvidence({evidence:{device:{status:'verified',stale:true}}});
 assert.equal(r.counts.unknown,1);assert.equal(r.status,'incomplete');
});
test('inherited claims and malformed records never pass',()=>{
 const evidence=Object.create({load:{status:'verified'}});
 evidence.network='verified';
 const r=assessDesignEvidence({evidence});
 assert.equal(r.counts.verified,0);
});
test('all declared areas can be evaluated without installation approval',()=>{
 const evidence=Object.fromEntries(REQUIRED.map(k=>[k,{status:'verified'}]));
 const r=assessDesignEvidence({evidence});
 assert.equal(r.status,'documented');assert.equal(r.counts.verified,6);
 assert.equal(r.installationApproved,false);
});
