'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const g=require('../cabinet-geometry-v1.js');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1').epDraftBoardPlanV1;
global.epDinPhysicalEnvelopeV1=require('../din-physical-envelope-v1').epDinPhysicalEnvelopeV1;
global.epCabinetFitAuditV1=g.epCabinetFitAuditV1;
global.epCatalogFrontSvgV1=require('../catalog-front-svg-v1').epCatalogFrontSvgV1;
global.epManufacturerVisualHtmlV1=require('../manufacturer-visual-library-v1').epManufacturerVisualHtmlV1;
const {epDraftBoardPreviewV1:preview}=require('../draft-board-preview-v1.js');
const {epCabinetDrawingSvgV1:drawing}=require('../cabinet-drawing-v1.js');
const project=()=>({railCount:1,railCapacity:6,lines:[{id:'L1',modules:1,catalogSku:'A1'}],
 cabinetGeometryV1:{version:1,source:'USER_DECLARED',
 interior:{widthMm:300,heightMm:350,depthMm:120},
 zones:[{railIndex:0,xMm:20,yMm:30,widthMm:260,heightMm:110}]}});
const lookup=()=>({sku:'A1',maker:'ABB',series:'S200',kind:'MCB',poles:1,modules:1,
 widthMm:17.5,heightMm:85,depthMm:75});
test('read-only DIN preview shows exact declared cabinet band and consolidated status',()=>{
 const h=preview(project(),lookup);
 assert.match(h,/монтажная зона 260 × 110 мм/);
 assert.match(h,/Корпус: REVIEW_REQUIRED/);
 assert.match(h,/300 × 350 × 120 мм/);
});
test('preview never fabricates cabinet dimensions on legacy project',()=>{
 const x=project();delete x.cabinetGeometryV1;
 const h=preview(x,lookup);
 assert.match(h,/Корпус: NOT_CONFIGURED/);
 assert.match(h,/не заданы/);
 assert.doesNotMatch(h,/монтажная зона 260 × 110 мм/);
});
test('cabinet conflicts show blocking status in both preview and fit model',()=>{
 const x=project();x.cabinetGeometryV1.zones[0].heightMm=60;
 assert.equal(g.epCabinetFitAuditV1(x,lookup).status,'BLOCKED');
 assert.match(preview(x,lookup),/Корпус: BLOCKED/);
});
test('SVG draft warning is anchored inside right edge instead of off canvas',()=>{
 const x=drawing(project(),lookup).svg;
 assert.match(x,/text x="295" y="/);
 assert.match(x,/НЕ ПРОИЗВОДСТВЕННЫЙ ЧЕРТЁЖ/);
 assert.doesNotMatch(x,/text x="4[.]\\d+" y="/);
});
test('cross-view checks do not mutate the declared cabinet data',()=>{
 const x=project(),before=JSON.stringify(x);
 preview(x,lookup);drawing(x,lookup);
 assert.equal(JSON.stringify(x),before);
});
test('preview module remains loaded after geometry engine',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(html.indexOf('cabinet-geometry-v1.js')<html.indexOf('draft-board-preview-v1.js'));
});
