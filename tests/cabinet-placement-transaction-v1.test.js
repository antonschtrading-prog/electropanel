'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const cabinet=require('../cabinet-geometry-v1.js');
global.epCabinetFitAuditV1=cabinet.epCabinetFitAuditV1;
global.epCabinetPlacementChangeAuditV1=cabinet.epCabinetPlacementChangeAuditV1;
global.epDinPhysicalEnvelopeV1=require('../din-physical-envelope-v1.js').epDinPhysicalEnvelopeV1;
const {epDraftBoardPlanV1,epMoveBoardDeviceV1}=require('../draft-board-plan-v1.js');
global.epDraftBoardPlanV1=epDraftBoardPlanV1;
global.epMoveBoardDeviceV1=epMoveBoardDeviceV1;
const {epBoardDragMoveV1}=require('../board-drag-move-v1.js');
const {epBoardReflowV1}=require('../board-reflow-v1.js');
const {epBoardRailCountChangeV1}=require('../board-rail-count-v1.js');
global.epCabinetGeometryNormalizeV1=cabinet.epCabinetGeometryNormalizeV1;
global.epCabinetAutoZonesV1=cabinet.epCabinetAutoZonesV1;
const p=()=>({railCount:2,railCapacity:2,sharedDevices:[],
 lines:[{id:'A',modules:1,catalogSku:'A'},{id:'B',modules:1,catalogSku:'B'}],
 manualLayoutV1:[{deviceId:'A',railIndex:0,startModule:0},{deviceId:'B',railIndex:1,startModule:0}],
 cabinetGeometryV1:{version:1,source:'USER_DECLARED',
  interior:{widthMm:150,heightMm:300,depthMm:120},
  zones:[{railIndex:0,xMm:10,yMm:10,widthMm:120,heightMm:90},
   {railIndex:1,xMm:10,yMm:160,widthMm:120,heightMm:65}]}});
const lookup=sku=>({sku,kind:'MCB',maker:'ABB',series:'S200',poles:1,modules:1,
 widthMm:17.5,heightMm:sku==='A'?85:60,depthMm:75});
test('move into a shorter cabinet row is atomically rejected',()=>{
 const x=p(),before=JSON.stringify(x);
 const r=epMoveBoardDeviceV1(x,'A',1,1,lookup);
 assert.equal(r.project,null);assert.equal(r.code,'CABINET_MOVE_FIT_CONFLICT');
 assert.ok(r.issues.some(i=>i.code==='CABINET_DEVICE_HEIGHT_OVERFLOW'));
 assert.equal(JSON.stringify(x),before);
});
test('valid move within the original allocated band remains possible',()=>{
 const r=epMoveBoardDeviceV1(p(),'A',0,1,lookup);
 assert.equal(r.code,'POSITION_UPDATED');assert.equal(r.project.manualLayoutV1[0].startModule,1);
});
test('drag-swap cannot introduce a cabinet-fit conflict',()=>{
 const x=p(),before=JSON.stringify(x);
 const r=epBoardDragMoveV1(x,'A','B',lookup);
 assert.equal(r.code,'BOARD_DRAG_CABINET_FIT_CONFLICT');assert.equal(r.project,null);
 assert.equal(JSON.stringify(x),before);
});
test('a reflow that introduces an incompatible mounting row is refused',()=>{
 const x=p();x.cabinetGeometryV1.zones[0].heightMm=65;
 x.cabinetGeometryV1.zones[1].heightMm=90;
 x.manualLayoutV1=[{deviceId:'A',railIndex:1,startModule:0},{deviceId:'B',railIndex:0,startModule:0}];
 const result=epBoardReflowV1(x,lookup,{mode:'compact'});
 assert.equal(result.code,'REFLOW_CABINET_FIT_CONFLICT');
});
test('new change conflict detection compares blockers without approving source state',()=>{
 const x=p(),y=JSON.parse(JSON.stringify(x));
 y.manualLayoutV1[0].railIndex=1;y.manualLayoutV1[0].startModule=1;
 const r=cabinet.epCabinetPlacementChangeAuditV1(x,y,lookup);
 assert.equal(r.status,'BLOCKED');assert.equal(r.engineeringApproved,false);
});
test('old unconfigured projects keep move and reflow capability',()=>{
 const x=p();delete x.cabinetGeometryV1;
 assert.equal(epMoveBoardDeviceV1(x,'A',1,1,lookup).code,'POSITION_UPDATED');
 assert.equal(epBoardReflowV1(x,lookup,{mode:'compact'}).code,'REFLOW_APPLIED');
});
