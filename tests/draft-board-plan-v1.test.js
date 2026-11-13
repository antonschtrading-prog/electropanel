'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epDraftBoardPlanV1:plan}=require('../draft-board-plan-v1.js');
const base=()=>({railCount:2,railCapacity:4,lines:[
 {id:'L1',modules:2},{id:'L2',modules:3}]});
test('valid layout never claims engineering approval',()=>{
 const x=plan(base());assert.equal(x.status,'UNKNOWN');assert.equal(x.engineeringApproved,false);
});
test('whole device moves to next rail',()=>{
 const x=plan(base());assert.deepEqual(x.placements.map(p=>[p.railIndex,p.startModule]),[[0,0],[1,0]]);
});
test('capacity overflow blocks',()=>{
 const p=base();p.railCount=1;assert.ok(plan(p).issues.some(i=>i.code==='RAIL_CAPACITY_EXCEEDED'));
});
test('invalid module width blocks',()=>{
 const p=base();p.lines[0].modules=0;assert.equal(plan(p).status,'BLOCKED');
});
test('unknown article blocks without inventing geometry',()=>{
 const p=base();p.lines[0].catalogSku='unknown';assert.ok(plan(p,()=>null).issues.some(i=>i.code==='ARTICLE_UNKNOWN'));
});
test('catalogue width conflicts with manual width',()=>{
 const p=base();p.lines[0].catalogSku='A';assert.ok(plan(p,()=>({modules:1})).issues.some(i=>i.code==='CATALOG_WIDTH_CONFLICT'));
});
test('duplicate device IDs block',()=>{
 const p=base();p.lines[1].id='L1';assert.equal(plan(p).status,'BLOCKED');
});
test('shared apparatus participates in placement',()=>{
 const p=base();p.sharedDevices=[{id:'RCD1',modules:1}];
 const x=plan(p);assert.equal(x.placements[0].deviceId,'RCD1');
});
test('invalid board dimensions blocked',()=>assert.equal(plan({railCount:0,railCapacity:4,lines:[]}).status,'BLOCKED'));

test('orphan and duplicate branch devices are blocked',()=>{
 const p=base();p.branchDevices=[{id:'B1',circuitId:'L1',modules:2},{id:'B2',circuitId:'L1',modules:2},{id:'B3',circuitId:'GHOST',modules:1}];
 const codes=plan(p).issues.map(x=>x.code);
 for(const c of ['ORPHAN_BRANCH_DEVICE','DUPLICATE_BRANCH_FOR_CIRCUIT','MISSING_BRANCH_DEVICE'])assert.ok(codes.includes(c));
});
test('branch and line width disagreement is blocked',()=>{
 const p=base();p.branchDevices=[{id:'B1',circuitId:'L1',modules:1},{id:'B2',circuitId:'L2',modules:3}];
 assert.ok(plan(p).issues.some(x=>x.code==='BRANCH_LINE_WIDTH_CONFLICT'));
});
