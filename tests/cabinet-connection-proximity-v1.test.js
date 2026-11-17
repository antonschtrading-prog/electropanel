'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epCabinetConnectionProximityV1:audit}=require('../cabinet-connection-proximity-v1.js');
function fixture(){return {
 lines:[{id:'L1',modules:1},{id:'L2',modules:1},{id:'L3',modules:1}],
 sharedDevices:[{id:'G1',modules:2,circuitIds:['L1','L2']}],
 branchDevices:[{id:'B1',circuitId:'L1',modules:1},{id:'B2',circuitId:'L2',modules:1},
  {id:'B3',circuitId:'L3',modules:1}],
 protectionLinks:[{upstreamLineId:'L2',downstreamLineId:'L3'}]
};}
test('declared shared grouping and hierarchy are advisory not physical wire routing',()=>{
 const p=fixture(),pos=[
  {deviceId:'G1',railIndex:0,startModule:0,modules:2},
  {deviceId:'B1',railIndex:0,startModule:2,modules:1},
  {deviceId:'B2',railIndex:1,startModule:0,modules:1},
  {deviceId:'B3',railIndex:1,startModule:1,modules:1}
 ];
 const before=JSON.stringify(p),r=audit(p,pos);
 assert.equal(JSON.stringify(p),before);assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.pairs.length,3);assert.equal(r.summary.sameRail,2);
 assert.equal(r.summary.adjacent,2);assert.equal(r.summary.crossRail,1);
 assert.equal(r.physicalWiringVerified,false);assert.equal(r.selectivityVerified,false);
 assert.ok(r.pairs.some(x=>x.basis==='DECLARED_PROTECTION_HIERARCHY'));
});
test('no declared links means no invented relationships',()=>{
 const r=audit({lines:[{id:'L1'}]},[{deviceId:'L1',railIndex:0,startModule:0,modules:1}]);
 assert.equal(r.pairs.length,0);assert.equal(r.summary.sameRail,0);
});
test('missing placement is UNKNOWN',()=>{
 const r=audit(fixture(),[{deviceId:'G1',railIndex:0,startModule:0,modules:2}]);
 assert.equal(r.summary.unresolved,3);
 assert.ok(r.issues.some(x=>x.code==='PROXIMITY_RELATION_NOT_PLACED'));
});
test('duplicated positions fail closed',()=>{
 const r=audit(fixture(),[{deviceId:'B1',railIndex:0,startModule:0,modules:1},
  {deviceId:'B1',railIndex:0,startModule:1,modules:1}]);
 assert.equal(r.status,'BLOCKED');
});
test('declared supply link computes nominal module gap only',()=>{
 const p=fixture();p.sharedDevices=[];p.protectionLinks=[];
 p.deviceSupplyV1={version:1,links:[{from:'BRANCH:B1',to:'BRANCH:B2',conductors:['L1']}]};
 const r=audit(p,[{deviceId:'B1',railIndex:0,startModule:0,modules:1},
  {deviceId:'B2',railIndex:0,startModule:5,modules:1}]);
 assert.equal(r.pairs.length,1);assert.equal(r.pairs[0].gapModules,4);
 assert.equal(r.pairs[0].basis,'DECLARED_DEVICE_SUPPLY');
});
