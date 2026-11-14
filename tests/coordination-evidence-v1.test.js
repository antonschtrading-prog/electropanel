'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {epCoordinationCheck}=require('../coordination-evidence-v1');
const good={ibA:12,inA:16,izA:20,i2A:20,evidence:{cableSource:'table ref',protectionSource:'manufacturer ref'}};
test('valid arithmetic remains unapproved without design applicability',()=>{
 const r=epCoordinationCheck(good);
 assert.equal(r.status,'UNKNOWN');
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.readyForInstallation,false);
 assert.ok(r.issues.some(x=>x.code==='DESIGN_APPLICABILITY_UNVERIFIED'));
});
test('Ib greater than In blocks',()=>assert.ok(epCoordinationCheck({...good,ibA:17}).issues.some(x=>x.code==='IB_GT_IN')));
test('In greater than Iz blocks',()=>assert.ok(epCoordinationCheck({...good,izA:15}).issues.some(x=>x.code==='IN_GT_IZ')));
test('I2 above 1.45 Iz blocks',()=>assert.ok(epCoordinationCheck({...good,i2A:30}).issues.some(x=>x.code==='I2_GT_145_IZ')));
test('missing data never silently defaults',()=>assert.equal(epCoordinationCheck({...good,izA:null}).status,'UNKNOWN'));
test('invalid data blocks',()=>assert.equal(epCoordinationCheck({...good,ibA:'Infinity'}).status,'BLOCKED'));
test('missing provenance remains unknown',()=>assert.ok(epCoordinationCheck({...good,evidence:null}).issues.some(x=>x.code==='EVIDENCE_INCOMPLETE')));
test('boundary I2=1.45 Iz is not blocked',()=>assert.equal(epCoordinationCheck({...good,i2A:29}).status,'UNKNOWN'));
