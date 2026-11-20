'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1');
const source=fs.readFileSync(path.join(__dirname,'..','board-capacity-review-v1.js'),'utf8');
const make=()=>{const c={epDraftBoardPlanV1};vm.createContext(c);vm.runInContext(source,c);return c};
const project=()=>({railCount:2,railCapacity:6,lines:[{id:'L1',modules:1},{id:'L2',modules:2},{id:'L3',modules:1}],sharedDevices:[]});
const run=(p=project(),c=make())=>c.epBoardCapacityReviewV1(p);
const has=(code,p=project(),c=make())=>run(p,c).issues.some(x=>x.code===code);
test('two rails',()=>assert.equal(run().rails.length,2));
test('first rail occupancy',()=>assert.equal(run().rails[0].occupied,4));
test('first rail free',()=>assert.equal(run().rails[0].free,2));
test('second rail empty',()=>assert.equal(run().rails[1].occupied,0));
test('second rail free',()=>assert.equal(run().rails[1].free,6));
test('first largest free run',()=>assert.equal(run().rails[0].largestFreeRun,2));
test('second largest free run',()=>assert.equal(run().rails[1].largestFreeRun,6));
test('first utilization',()=>assert.equal(run().rails[0].utilizationPct,66.7));
test('second utilization',()=>assert.equal(run().rails[1].utilizationPct,0));
test('three devices placed',()=>assert.equal(run().rails[0].devices.length,3));
test('devices sorted',()=>assert.equal(run().rails[0].devices[0].deviceId,'L1'));
test('no approval',()=>assert.equal(run().engineeringApproved,false));
test('no installation readiness',()=>assert.equal(run().ready_for_installation,false));
test('review status',()=>assert.equal(run().status,'REVIEW_REQUIRED'));
test('null project blocked',()=>assert.equal(run(null).status,'BLOCKED'));
test('zero rails blocked',()=>{const p=project();p.railCount=0;assert.equal(run(p).status,'BLOCKED')});
test('negative rail count blocked',()=>{const p=project();p.railCount=-1;assert.equal(run(p).status,'BLOCKED')});
test('zero capacity blocked',()=>{const p=project();p.railCapacity=0;assert.equal(run(p).status,'BLOCKED')});
test('fractional capacity blocked',()=>{const p=project();p.railCapacity=2.5;assert.equal(run(p).status,'BLOCKED')});
test('excessive rail count blocked',()=>{const p=project();p.railCount=101;assert.equal(run(p).status,'BLOCKED')});
test('excessive capacity blocked',()=>{const p=project();p.railCapacity=201;assert.equal(run(p).status,'BLOCKED')});
test('full rail flagged',()=>{const p=project();p.railCount=1;p.railCapacity=4;assert.ok(has('CAPACITY_RAIL_FULL',p))});
test('fragmented free space flagged',()=>{
 const p=project();p.manualLayoutV1=[{deviceId:'L1',railIndex:0,startModule:0},{deviceId:'L2',railIndex:0,startModule:2},{deviceId:'L3',railIndex:0,startModule:5}];
 assert.ok(has('CAPACITY_FRAGMENTED_FREE_SPACE',p));
});
test('gaps accurately reported',()=>{
 const p=project();p.manualLayoutV1=[{deviceId:'L1',railIndex:0,startModule:0},{deviceId:'L2',railIndex:0,startModule:2},{deviceId:'L3',railIndex:0,startModule:5}];
 assert.deepEqual(JSON.parse(JSON.stringify(run(p).rails[0].gaps)),[{startModule:1,modules:1},{startModule:4,modules:1}]);
});
test('invalid catalogue blocks',()=>{
 const p=project();p.lines[0].catalogSku='SKU';assert.ok(has('CAPACITY_BOARD_BLOCKED',p));
});
test('unplaced device flagged',()=>{
 const p=project();p.railCount=1;p.railCapacity=3;assert.ok(has('CAPACITY_DEVICES_UNPLACED',p));
});
test('overlap blocked',()=>{
 const p=project();p.manualLayoutV1=[{deviceId:'L1',railIndex:0,startModule:1},{deviceId:'L2',railIndex:0,startModule:1}];
 assert.ok(has('CAPACITY_BOARD_BLOCKED',p));
});
test('missing engine blocked',()=>{
 const c=make();c.epDraftBoardPlanV1=null;assert.ok(has('CAPACITY_ENGINE_UNAVAILABLE',project(),c));
});
test('throwing engine blocked',()=>{
 const c=make();c.epDraftBoardPlanV1=()=>{throw Error('fail')};assert.ok(has('CAPACITY_ENGINE_FAILED',project(),c));
});
test('source unchanged',()=>{const p=project(),before=JSON.stringify(p);run(p);assert.equal(JSON.stringify(p),before)});
test('deterministic',()=>{const p=project();assert.deepEqual(JSON.parse(JSON.stringify(run(p))),JSON.parse(JSON.stringify(run(p))))});
test('capacity engine in index before app',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(s.indexOf('board-capacity-review-v1.js')<s.indexOf('app.js'));
});
test('capacity engine in engineering bundle',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','engineering-bundle-v1.js'),'utf8');
 assert.match(s,/BOARD_CAPACITY_REVIEW/);
});
test('board UI displays largest contiguous run',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(s,/максимальный непрерывный участок/);
});
