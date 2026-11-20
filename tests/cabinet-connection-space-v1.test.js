'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epCabinetGeometryCheckV1=require('../cabinet-geometry-v1.js').epCabinetGeometryCheckV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
const {epCabinetConnectionSpaceV1:review}=require('../cabinet-connection-space-v1.js');
function base(){return {railCount:1,railCapacity:6,
 lines:[{id:'L1',modules:2},{id:'L2',modules:1}]};}
function geometry(){return {version:1,source:'USER_DECLARED',
 interior:{widthMm:260,heightMm:280,depthMm:140},
 zones:[{railIndex:0,xMm:50,yMm:85,widthMm:120,heightMm:100}],
 obstacles:[
  {id:'ductB',kind:'WIRE_DUCT',xMm:50,yMm:195,widthMm:120,heightMm:30},
  {id:'terminalA',kind:'TERMINAL_REGION',xMm:185,yMm:85,widthMm:50,heightMm:90}
 ]};}
test('without geometry connection-space evidence remains explicitly not configured',()=>{
 const p=base(),r=review(p);
 assert.equal(r.status,'NOT_CONFIGURED');assert.deepEqual(r.rows,[]);
 assert.equal(r.actualAccessVerified,undefined);
 assert.equal(r.terminalConnectionsVerified,false);
});
test('nominal slot to declared wiring and terminal rectangles computes planar gap only',()=>{
 const p=base();p.cabinetGeometryV1=geometry();
 const original=JSON.stringify(p),r=review(p);
 assert.equal(JSON.stringify(p),original);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.rows.length,2);
 assert.equal(r.rows[0].nearestWireDuct.regionId,'ductB');
 assert.equal(r.rows[0].nearestWireDuct.verticalGapMm,10);
 assert.equal(r.rows[0].nearestTerminalRegion.regionId,'terminalA');
 assert.equal(r.rows[0].nearestTerminalRegion.horizontalGapMm,99);
 assert.equal(r.rows[0].connectionTerminalsKnown,false);
 assert.equal(r.conductorRoutesVerified,false);
 assert.equal(r.manufacturerClearancesVerified,false);
});
test('missing duct or terminal region is not silently accepted',()=>{
 const p=base();p.cabinetGeometryV1={...geometry(),obstacles:[]};
 const r=review(p);
 assert.equal(r.rows[0].nearestWireDuct,null);
 assert.equal(r.rows[0].nearestTerminalRegion,null);
 assert.ok(r.issues.some(x=>x.code==='CABINET_CONNECTION_SPACE_DUCT_NOT_DECLARED'));
 assert.ok(r.issues.some(x=>x.code==='CABINET_CONNECTION_SPACE_TERMINAL_REGION_NOT_DECLARED'));
});
test('invalid reserved-space intersection cannot yield credible geometry evidence',()=>{
 const p=base();p.cabinetGeometryV1=geometry();
 p.cabinetGeometryV1.obstacles[0].yMm=120;
 const r=review(p);
 assert.equal(r.status,'BLOCKED');assert.equal(r.rows.length,0);
});
test('rail slots beyond declared nominal band refuse review',()=>{
 const p=base();p.cabinetGeometryV1=geometry();
 p.manualLayoutV1=[{deviceId:'L2',railIndex:0,startModule:5}];
 // This position is within nominal 6 modules and zone 120mm, so still valid.
 const r=review(p);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.rows.find(x=>x.deviceId==='L2').nominalBand.xMm,140);
});

test('changing one user-declared terminal region shifts only nominal distance',()=>{
 const p=base();p.cabinetGeometryV1=geometry();
 const a=review(p).rows[0].nearestTerminalRegion.distanceMm;
 p.cabinetGeometryV1.obstacles[1].xMm=195;
 const b=review(p);
 assert.equal(b.status,'REVIEW_REQUIRED');
 assert.equal(b.rows[0].nearestTerminalRegion.distanceMm,a+10);
 assert.equal(b.terminalConnectionsVerified,false);
});

test('delta flags nominal increases and never claims verified conductor access',()=>{
 const {epCabinetConnectionSpaceDeltaV1:delta}=require('../cabinet-connection-space-v1.js');
 const p=base();p.cabinetGeometryV1=geometry();
 const b=JSON.parse(JSON.stringify(p));
 b.manualLayoutV1=[{deviceId:'L1',railIndex:0,startModule:3},
  {deviceId:'L2',railIndex:0,startModule:0}];
 const r=delta(p,b);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.increases.some(x=>x.deviceId==='L1'&&x.kind==='nearestWireDuct')===false);
 assert.ok(r.decreases.some(x=>x.deviceId==='L1'&&x.kind==='nearestTerminalRegion'));
 assert.equal(r.actualConnectionsVerified,false);
});
test('delta remains not configured when user has not declared cabinet geometry',()=>{
 const {epCabinetConnectionSpaceDeltaV1:delta}=require('../cabinet-connection-space-v1.js');
 assert.equal(delta(base(),base()).status,'NOT_CONFIGURED');
});
