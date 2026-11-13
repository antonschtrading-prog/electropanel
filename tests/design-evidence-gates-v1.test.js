'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {assessDesignEvidence,REQUIRED}=require('../design-evidence-gates-v1');
test('missing project never passes',()=>{
 const r=assessDesignEvidence(null);
 assert.equal(r.status,'incomplete');
 assert.equal(r.counts.unknown,6);
 assert.equal(r.installationApproved,false);
});
test('verified claims without traceable evidence remain unknown',()=>{
 const evidence=Object.fromEntries(REQUIRED.map(k=>[k,{status:'verified'}]));
 assert.equal(assessDesignEvidence({evidence}).counts.unknown,6);
});
test('documented design evidence is not installation approval',()=>{
 const evidence=Object.fromEntries(REQUIRED.map(k=>[k,{status:'verified',source:'manufacturer/manual',method:'independent calculation'}]));
 const r=assessDesignEvidence({evidence});
 assert.equal(r.status,'documented');
 assert.equal(r.counts.verified,6);
 assert.equal(r.installationApproved,false);
});
test('failure takes precedence over missing evidence',()=>{
 const r=assessDesignEvidence({evidence:{cable:{status:'failed'}}});
 assert.equal(r.status,'failed');
 assert.equal(r.counts.failed,1);
 assert.equal(r.counts.unknown,5);
});
test('inherited and malformed evidence never pass',()=>{
 const evidence=Object.create({load:{status:'verified',source:'a',method:'b'}});
 evidence.network={status:'verified',source:' ',method:'b'};
 const r=assessDesignEvidence({evidence});
 assert.equal(r.counts.verified,0);
});
