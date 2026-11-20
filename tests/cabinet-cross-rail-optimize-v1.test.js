'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1').epDraftBoardPlanV1;
global.epCabinetConnectionProximityV1=require('../cabinet-connection-proximity-v1').epCabinetConnectionProximityV1;
const {epCabinetCrossRailOptimizeV1:run}=require('../cabinet-cross-rail-optimize-v1');
const project=()=>({railCount:2,railCapacity:3,lines:[{id:'A',modules:2},{id:'B',modules:2}],
 sharedDevices:[{id:'G',modules:1,circuitIds:['B']}],manualLayoutV1:[
 {deviceId:'G',railIndex:0,startModule:0},
 {deviceId:'A',railIndex:0,startModule:1},
 {deviceId:'B',railIndex:1,startModule:0}]});
const flexible=()=>({...project(),manualLayoutV1:[
 {deviceId:'A',railIndex:0,startModule:1},
 {deviceId:'B',railIndex:1,startModule:0}]});
const result=()=>run(flexible(),()=>null);
test('returns schema-like review status',()=>assert.equal(result().status,'REVIEW_REQUIRED'));
test('returns optimized code',()=>assert.equal(result().code,'CROSS_RAIL_OPTIMIZED'));
test('produces a new project',()=>assert.ok(result().project));
test('cross rail count improves',()=>assert.ok(result().after.cross<result().before.cross));
test('starts with one cross rail link',()=>assert.equal(result().before.cross,1));
test('finishes with no cross rail links',()=>assert.equal(result().after.cross,0));
test('moves only free group apparatus',()=>assert.deepEqual(result().changes.map(x=>x.deviceId),['G']));
test('moves group to second rail',()=>assert.equal(result().changes[0].to.railIndex,1));
test('preserves A rail',()=>assert.equal(result().project.manualLayoutV1.find(x=>x.deviceId==='A').railIndex,0));
test('preserves A position',()=>assert.equal(result().project.manualLayoutV1.find(x=>x.deviceId==='A').startModule,1));
test('preserves B rail',()=>assert.equal(result().project.manualLayoutV1.find(x=>x.deviceId==='B').railIndex,1));
test('preserves B position',()=>assert.equal(result().project.manualLayoutV1.find(x=>x.deviceId==='B').startModule,0));
test('keeps line count',()=>assert.equal(result().project.lines.length,2));
test('keeps shared device count',()=>assert.equal(result().project.sharedDevices.length,1));
test('keeps declared group membership',()=>assert.deepEqual(result().project.sharedDevices[0].circuitIds,['B']));
test('never approves engineering',()=>assert.equal(result().engineeringApproved,false));
test('never claims physical wiring',()=>assert.equal(result().physicalWiringVerified,false));
test('does not mutate source project',()=>{const p=flexible(),s=JSON.stringify(p);run(p,()=>null);assert.equal(JSON.stringify(p),s)});
test('deterministic output',()=>assert.deepEqual(result(),result()));
test('fixed group cannot move',()=>assert.equal(run(project(),()=>null).changes.length,0));
test('fixed group no improvement',()=>assert.equal(run(project(),()=>null).code,'CROSS_RAIL_NO_IMPROVEMENT'));
test('null project blocked',()=>assert.equal(run(null,()=>null).status,'BLOCKED'));
test('null options blocked',()=>assert.equal(run(flexible(),()=>null,null).status,'BLOCKED'));
test('invalid max passes zero blocked',()=>assert.equal(run(flexible(),()=>null,{maxPasses:0}).status,'BLOCKED'));
test('invalid max passes negative blocked',()=>assert.equal(run(flexible(),()=>null,{maxPasses:-1}).status,'BLOCKED'));
test('invalid max passes fraction blocked',()=>assert.equal(run(flexible(),()=>null,{maxPasses:1.5}).status,'BLOCKED'));
test('invalid max passes 51 blocked',()=>assert.equal(run(flexible(),()=>null,{maxPasses:51}).status,'BLOCKED'));
test('one pass can improve',()=>assert.equal(run(flexible(),()=>null,{maxPasses:1}).after.cross,0));
test('invalid board blocked',()=>assert.equal(run({...flexible(),railCapacity:0},()=>null).status,'BLOCKED'));
test('overlapping anchors blocked',()=>assert.equal(run({...project(),manualLayoutV1:[{deviceId:'A',railIndex:0,startModule:0},{deviceId:'G',railIndex:0,startModule:0}]},()=>null).status,'BLOCKED'));
test('unknown group relation remains advisory',()=>assert.equal(run({...flexible(),sharedDevices:[{id:'G',modules:1,circuitIds:['unknown']}]},()=>null).code,'CROSS_RAIL_NO_IMPROVEMENT'));
test('does not remove manual anchors',()=>assert.equal(result().project.manualLayoutV1.length,3));
test('does not change rail capacity',()=>assert.equal(result().project.railCapacity,3));
test('does not change rail count',()=>assert.equal(result().project.railCount,2));
test('does not fabricate approval when unchanged',()=>assert.equal(run(project(),()=>null).engineeringApproved,false));
test('does not move fixed A',()=>assert.ok(result().changes.every(c=>c.deviceId!=='A')));
test('does not move fixed B',()=>assert.ok(result().changes.every(c=>c.deviceId!=='B')));
test('original links preserved byte for byte',()=>assert.equal(JSON.stringify(result().project.sharedDevices),JSON.stringify(flexible().sharedDevices)));
test('source layout may have implicit placements',()=>assert.equal(run({...flexible(),manualLayoutV1:[{deviceId:'B',railIndex:1,startModule:0}]},()=>null).status,'REVIEW_REQUIRED'));
