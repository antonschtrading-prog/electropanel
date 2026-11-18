'use strict';
// Independent negative acceptance cases, isolated from production and shared tests.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {epDraftBomV1}=require('../draft-bom-v1.js');
const {epLoadCurrentV1}=require('../load-current-v1.js');
const article={sku:'QA-C16',maker:'Audit fixture',series:'Fixture',label:'C16',kind:'MCB',modules:1,widthMm:18,verificationStatus:'UNVERIFIED'};
const base=()=>({lines:[{id:'L1',name:'Lighting',phase:'L1',power:1.5,catalogSku:'QA-C16',modules:1}],
branchDevices:[{id:'Q1',circuitId:'L1',modules:1}],sharedDevices:[]});
test('release negative: unresolved manufacturer evidence is visible in BOM and never approved',()=>{
 const result=epDraftBomV1(base(),()=>article);
 assert.equal(result.engineeringApproved,false);
 assert.ok(result.issues.some(x=>x.code==='ARTICLE_EVIDENCE_NOT_VERIFIED'));
});
test('release negative: duplicate branch-to-circuit link must not inflate exported quantity',()=>{
 const p=base();p.branchDevices.push({id:'Q2',circuitId:'L1',modules:1});
 const result=epDraftBomV1(p,()=>article);
 assert.equal(result.status,'BLOCKED');assert.equal(result.totalCataloguedDevices,0);
 assert.ok(result.issues.some(x=>x.code==='BRANCH_DUPLICATE'));
});
test('release negative: duplicate circuit and device identifiers are rejected',()=>{
 const p=base();p.lines.push({...p.lines[0]});p.branchDevices.push({...p.branchDevices[0]});
 const codes=epDraftBomV1(p,()=>article).issues.map(x=>x.code);
 assert.ok(codes.includes('CIRCUIT_ID_DUPLICATE'));
 assert.ok(codes.includes('BRANCH_ID_DUPLICATE'));
});
test('release negative: missing physical article dimensions must not be treated as verified fit',()=>{
 const result=epDraftBomV1(base(),()=>({...article,widthMm:30}));
 assert.equal(result.status,'BLOCKED');
 assert.ok(result.issues.some(x=>x.code==='ARTICLE_GEOMETRY_UNCONFIRMED'));
});
test('release negative: invalid branch-device collection cannot produce accepted BOM',()=>{
 const p=base();p.branchDevices={};
 assert.ok(epDraftBomV1(p,()=>article).issues.some(x=>x.code==='BRANCH_DEVICES_INVALID'));
});
