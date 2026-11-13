'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epProjectIntegrityV1:audit}=require('../project-integrity-v1.js');
const base=()=>({railCount:1,railCapacity:4,lines:[{id:'L1',catalogSku:'a',overloadInput:{ibA:10,izA:20},ikKa:5,route44Input:{}}],
 branchDevices:[{id:'B1',circuitId:'L1',modules:1}]});
const lookup=()=>({kind:'MCB',source:'https://example.com/device'});
test('five diagnostic blocks are present',()=>assert.deepEqual(Object.keys(audit(base(),lookup).blocks),['structure','catalog','calculations','binding','placement']));
test('invalid project blocks',()=>assert.equal(audit(null).status,'BLOCKED'));
test('duplicate line IDs block',()=>{
 const p=base();p.lines.push({...p.lines[0]});
 assert.ok(audit(p,lookup).issues.some(i=>i.code==='DUPLICATE_OR_INVALID_LINE'));
});
test('unknown article blocks',()=>assert.ok(audit(base(),()=>null).issues.some(i=>i.code==='ARTICLE_UNKNOWN')));
test('catalogue source missing stays unknown',()=>assert.ok(audit(base(),()=>({kind:'MCB'})).issues.some(i=>i.code==='ARTICLE_SOURCE_NOT_DECLARED')));
test('missing calculation evidence does not pass',()=>{
 const p=base();delete p.lines[0].route44Input;
 assert.ok(audit(p,lookup).issues.some(i=>i.code==='ROUTE_NOT_DECLARED'));
});
test('orphan branch blocks',()=>{
 const p=base();p.branchDevices[0].circuitId='missing';
 assert.ok(audit(p,lookup).issues.some(i=>i.code==='ORPHAN_BRANCH_DEVICE'));
});
test('duplicate branch binding blocks',()=>{
 const p=base();p.branchDevices.push({id:'B2',circuitId:'L1',modules:1});
 assert.ok(audit(p,lookup).issues.some(i=>i.code==='DUPLICATE_BRANCH_DEVICE'));
});
test('over-capacity board blocks',()=>{
 const p=base();p.branchDevices[0].modules=5;
 assert.ok(audit(p,lookup).issues.some(i=>i.code==='TOTAL_MODULES_EXCEED_RAIL_CAPACITY'));
});
test('normal declarations never imply approval',()=>{
 const a=audit(base(),lookup);assert.equal(a.status,'UNKNOWN');
 assert.equal(a.ready_for_installation,false);
});
