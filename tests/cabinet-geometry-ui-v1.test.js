'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const g=require('../cabinet-geometry-v1.js');
global.epCabinetFitAuditV1=g.epCabinetFitAuditV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDinPhysicalEnvelopeV1=require('../din-physical-envelope-v1.js').epDinPhysicalEnvelopeV1;
const {epCabinetGeometryUiV1:ui}=require('../cabinet-geometry-ui-v1.js');
const p=()=>({railCount:1,railCapacity:4,lines:[{id:'L1',modules:1}],
 cabinetGeometryV1:{version:1,source:'USER_DECLARED',
 interior:{widthMm:250,heightMm:300,depthMm:100},
 zones:[{railIndex:0,xMm:20,yMm:30,widthMm:180,heightMm:100}],
 planning:{marginMm:20,firstRowYMm:30,zoneHeightMm:100,rowGapMm:20}}});
test('no cabinet shows empty required form instead of fake dimensions',()=>{
 const x=p();delete x.cabinetGeometryV1;
 const h=ui(x);assert.match(h,/Внутренние размеры корпуса не заданы/);
 assert.match(h,/name="interiorWidthMm".*value=""/);
 assert.match(h,/data-cabinet-autoplan/);
});
test('saved cabinet renders accurate declared interior dimensions and row editor',()=>{
 const h=ui(p());
 assert.match(h,/250 × 300 × 100 мм/);
 assert.match(h,/data-cabinet-zone="0"/);
 assert.match(h,/name="xMm"/);
 assert.match(h,/role="img"/);
 assert.match(h,/DIN 1/);
});
test('raw strings cannot inject a script into dimensions or SVG',()=>{
 const x=p();x.cabinetGeometryV1.interior.widthMm='<svg onload=alert(1)>';
 const h=ui(x);assert.doesNotMatch(h,/<svg onload/);
 assert.match(h,/Внутренние размеры корпуса не заданы/);
});
test('no claimed 3D or safe installation',()=>{
 const h=ui(p());
 assert.match(h,/Совместимость и возможность монтажа не подтверждены/);
 assert.match(h,/без учёта крепежа/);
});
test('clearing control appears only if the project contains an enclosure',()=>{
 assert.match(ui(p()),/cabinetGeometryClearBtn/);
 const x=p();delete x.cabinetGeometryV1;
 assert.doesNotMatch(ui(x),/id="cabinetGeometryClearBtn"/);
});
test('declared invalid zones are marked as blocking',()=>{
 const x=p();x.cabinetGeometryV1.zones[0].widthMm=20;
 assert.match(ui(x),/CABINET_RAIL_SPAN_TOO_NARROW/);
});
