'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1');
const project=(widths,capacity,rails=1)=>({
 railCount:rails,railCapacity:capacity,
 lines:widths.map((w,i)=>({id:'L'+i,modules:w})),
 branchDevices:widths.map((w,i)=>({id:'Q'+i,circuitId:'L'+i,modules:w})),
 sharedDevices:[]
});
const overlap=placements=>{
 const used=new Set();
 for(const p of placements)for(let x=p.startModule;x<p.startModule+p.modules;x++){
  const key=p.railIndex+':'+x;
  if(used.has(key))return key;
  used.add(key);
 }
 return null;
};
test('sequential draft layout retains existing placement order',()=>{
 const p=project([3,3,2],8);
 const report=epDraftBoardPlanV1(p);
 assert.equal(report.placements.length,3);
 assert.equal(report.placements[2].startModule,6);
 assert.equal(overlap(report.placements),null);
});
test('sequential layout advances to the next rail',()=>{
 const p=project([3,3,2],6,2);
 const report=epDraftBoardPlanV1(p);
 assert.equal(report.placements.length,3);
 assert.equal(report.placements[2].railIndex,1);
 assert.equal(report.placements[2].startModule,0);
 assert.equal(overlap(report.placements),null);
});
test('mixed fixed and automatic layout fills only unoccupied slots',()=>{
 const p=project([2,2,2],8);
 p.manualLayoutV1=[{deviceId:'Q1',railIndex:0,startModule:3}];
 const report=epDraftBoardPlanV1(p);
 assert.equal(report.placements.length,3);
 assert.equal(overlap(report.placements),null);
 assert.equal(report.placements.find(x=>x.deviceId==='Q1').startModule,3);
});
test('insufficient contiguous space blocks without overlapping placements',()=>{
 const p=project([3,3,3],8);
 const report=epDraftBoardPlanV1(p);
 assert.equal(report.status,'BLOCKED');
 assert.ok(report.issues.some(x=>x.code==='RAIL_CAPACITY_EXCEEDED'));
 assert.equal(overlap(report.placements),null);
});
test('board honors selected branch article while preserving line fallback evidence',()=>{
 const p=project([2],8);
 p.lines[0].catalogSku='A';p.branchDevices[0].catalogSku='B';
 const report=epDraftBoardPlanV1(p,()=>({modules:2}));
 assert.notEqual(report.status,'BLOCKED');
 assert.equal(report.placements[0].article,'B');
 assert.equal(p.lines[0].catalogSku,'A');
 assert.equal(p.branchDevices[0].catalogSku,'B');
});
