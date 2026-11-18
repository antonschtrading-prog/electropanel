'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {epMoveBoardDeviceV1}=require('../draft-board-plan-v1');
const base=()=>({railCount:1,railCapacity:8,
 lines:[{id:'L1',modules:2},{id:'L2',modules:2}],
 branchDevices:[{id:'Q1',circuitId:'L1',modules:2},{id:'Q2',circuitId:'L2',modules:2}],
 sharedDevices:[]});
test('invalid move coordinates cannot change a project',()=>{
 for(const coords of [[-1,0],[0,-1],[0,1.5],[NaN,0]]){
  const p=base(),before=JSON.stringify(p);
  const result=epMoveBoardDeviceV1(p,'Q1',...coords);
  assert.equal(result.project,null);
  assert.equal(result.code,'MOVE_INPUT_INVALID');
  assert.equal(JSON.stringify(p),before);
 }
});
test('a blocked source project cannot be silently rewritten by a move',()=>{
 const p=base();p.branchDevices[1].circuitId='MISSING';
 const before=JSON.stringify(p);
 const result=epMoveBoardDeviceV1(p,'Q1',0,5);
 assert.equal(result.code,'MOVE_SOURCE_BLOCKED');
 assert.equal(result.project,null);
 assert.ok(result.issues.some(x=>x.code==='ORPHAN_BRANCH_DEVICE'));
 assert.equal(JSON.stringify(p),before);
});
test('valid move preserves other apparatus and never mutates original',()=>{
 const p=base(),before=JSON.stringify(p);
 const result=epMoveBoardDeviceV1(p,'Q2',0,5);
 assert.equal(result.code,'POSITION_UPDATED');
 assert.equal(result.project.manualLayoutV1.find(x=>x.deviceId==='Q2').startModule,5);
 assert.equal(result.project.manualLayoutV1.find(x=>x.deviceId==='Q1').startModule,0);
 assert.equal(JSON.stringify(p),before);
});
test('overlapping move is rejected without a changed project',()=>{
 const p=base();
 const result=epMoveBoardDeviceV1(p,'Q2',0,1);
 assert.equal(result.project,null);
 assert.equal(result.code,'MANUAL_LAYOUT_OVERLAP');
});
