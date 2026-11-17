'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epCabinetConnectionProximityV1=require('../cabinet-connection-proximity-v1.js').epCabinetConnectionProximityV1;
const {epCabinetGroupReflowV1:reflow}=require('../cabinet-group-reflow-v1.js');
const fixture=()=>({railCount:1,railCapacity:8,lines:[
 {id:'L1',modules:1},{id:'L2',modules:1},{id:'L3',modules:1},{id:'L4',modules:1}],
 sharedDevices:[],branchDevices:[],protectionLinks:[
 {upstreamLineId:'L1',downstreamLineId:'L4'}]});
test('explicit reflow shortens declared connection gap without changing circuits',()=>{
 const p=fixture(),orig=JSON.stringify(p),r=reflow(p);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.code,'GROUP_REFLOW_READY');
 assert.ok(r.changes.length>0);
 assert.ok(r.after.nominalDistanceModules<r.before.nominalDistanceModules);
 assert.equal(JSON.stringify(p),orig);
 assert.deepEqual(r.project.lines,p.lines);
 assert.equal(r.project.railCount,p.railCount);
 assert.equal(r.project.railCapacity,p.railCapacity);
});
test('reflow leaves a no-link board electrically and visually unchanged',()=>{
 const p=fixture();p.protectionLinks=[];
 const r=reflow(p);
 assert.equal(r.code,'GROUP_REFLOW_NO_IMPROVEMENT');
 assert.equal(r.changes.length,0);
});
test('malformed baseline cannot be silently corrected',()=>{
 const p=fixture();p.manualLayoutV1=[{deviceId:'L1',railIndex:7,startModule:0}];
 assert.equal(reflow(p).status,'BLOCKED');
});
test('unrelated apparatuses remain intact and stay on original rails',()=>{
 const p=fixture();p.railCount=2;p.railCapacity=3;
 const r=reflow(p);
 assert.equal(r.status,'REVIEW_REQUIRED');
 const a=global.epDraftBoardPlanV1(p),b=global.epDraftBoardPlanV1(r.project);
 for(const d of a.placements)
  assert.equal(b.placements.find(x=>x.deviceId===d.deviceId).railIndex,d.railIndex);
});
