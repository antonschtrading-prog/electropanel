'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDinPhysicalEnvelopeV1=require('../din-physical-envelope-v1.js').epDinPhysicalEnvelopeV1;
global.epCabinetFitAuditV1=require('../cabinet-geometry-v1.js').epCabinetFitAuditV1;
const {epCabinetGeometryUiV1}=require('../cabinet-geometry-ui-v1.js');
const {epCabinetDrawingSvgV1}=require('../cabinet-drawing-v1.js');
const p=()=>({railCount:1,railCapacity:6,lines:[{id:'L1',modules:1}],
 cabinetGeometryV1:{version:1,source:'USER_DECLARED',
  interior:{widthMm:400,heightMm:400,depthMm:130},
  zones:[{railIndex:0,xMm:20,yMm:30,widthMm:360,heightMm:110}],
  obstacles:[{id:'WD1',kind:'WIRE_DUCT',xMm:20,yMm:160,widthMm:360,heightMm:25}]}});
test('editor shows stable IDs, kind, add form, remove controls and reserved-zone scheme',()=>{
 const h=epCabinetGeometryUiV1(p());
 assert.match(h,/Кабель-каналы, клеммные области и резервы/);
 assert.match(h,/data-cabinet-obstacle/);
 assert.match(h,/data-cabinet-obstacle-remove="WD1"/);
 assert.match(h,/ep-cabinet-obstacle/);
 assert.match(h,/Клеммная область/);
});
test('drawing marks reserved rectangles separately from mounted devices',()=>{
 const report=epCabinetDrawingSvgV1(p());
 assert.match(report.svg,/data-obstacle="WD1"/);
 assert.match(report.svg,/data-kind="WIRE_DUCT"/);
 assert.match(report.svg,/user-declared reserved zone/);
 assert.equal(report.manufacturerDrawing,false);
});
test('user-controlled geometry actions are linked to checkpoint and change history',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(app,/form.matches\('\[data-cabinet-obstacle\]'\)/);
 assert.match(app,/data\.obstacles\.push/);
 assert.match(app,/data\.obstacles=.*filter/);
 assert.match(app,/checkpoint\(\);state=saved\.project;changed\(\)/);
});
test('colliding reserved zone is not silently accepted',()=>{
 const g=require('../cabinet-geometry-v1.js'),x=p();
 x.cabinetGeometryV1.obstacles[0].yMm=50;
 assert.equal(g.epCabinetFitAuditV1(x).status,'BLOCKED');
});
