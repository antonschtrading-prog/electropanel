'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1').epDraftBoardPlanV1;
global.epDinPhysicalEnvelopeV1=require('../din-physical-envelope-v1').epDinPhysicalEnvelopeV1;
global.epCabinetFitAuditV1=require('../cabinet-geometry-v1').epCabinetFitAuditV1;
const {epCabinetDrawingSvgV1:draw}=require('../cabinet-drawing-v1');
const p=()=>({railCount:2,railCapacity:6,lines:[{id:'L1',modules:1,catalogSku:'A1'}],
 cabinetGeometryV1:{version:1,source:'USER_DECLARED',
  interior:{widthMm:300,heightMm:350,depthMm:120},
  zones:[{railIndex:0,xMm:20,yMm:30,widthMm:260,heightMm:120},
   {railIndex:1,xMm:20,yMm:170,widthMm:260,heightMm:120}]}});
const lookup=()=>({sku:'A1',maker:'ABB',kind:'MCB',modules:1,widthMm:17.5,heightMm:85,depthMm:75});
test('drawing uses actual user-declared interior dimensions and two rail zones',()=>{
 const x=draw(p(),lookup);
 assert.equal(x.declaredWidthMm,300);assert.equal(x.declaredHeightMm,350);
 assert.match(x.svg,/viewBox="0 0 300 350"/);
 assert.match(x.svg,/width="300mm" height="350mm"/);
 assert.match(x.svg,/data-rail="0"/);assert.match(x.svg,/data-rail="1"/);
 assert.match(x.svg,/data-device-id="L1"/);
 assert.match(x.svg,/width="17.50"/);
});
test('SVG has explicit non-factory, unapproved engineering provenance',()=>{
 const x=draw(p(),lookup);
 assert.equal(x.engineeringApproved,false);
 assert.equal(x.manufacturerDrawing,false);
 assert.match(x.svg,/data-factory-cad="false"/);
 assert.match(x.svg,/НЕ ПРОИЗВОДСТВЕННЫЙ ЧЕРТЁЖ/);
});
test('unknown device dimensions show a dashed placeholder',()=>{
 const x=draw(p(),()=>({modules:1}));
 assert.match(x.svg,/data-dimensions="UNKNOWN"/);
 assert.match(x.svg,/stroke-dasharray="3 2"/);
 assert.equal(x.ready_for_installation,false);
});
test('XSS strings in apparatus IDs are escaped in SVG',()=>{
 const x=p();x.lines[0].id='"><script>alert(1)</script>';
 const r=draw(x,lookup);
 assert.doesNotMatch(r.svg,/<script>/);
 assert.match(r.svg,/&lt;script&gt;/);
});
test('missing cabinet produces no invented geometry or canvas',()=>{
 const x=p();delete x.cabinetGeometryV1;
 const r=draw(x,lookup);
 assert.equal(r.svg,null);assert.equal(r.status,'NOT_CONFIGURED');
});
test('out-of-bounds cabinet produces a blocked report with no uncertified sketch',()=>{
 const x=p();x.cabinetGeometryV1.zones[0].widthMm=9999;
 const r=draw(x,lookup);
 assert.equal(r.status,'BLOCKED');assert.equal(r.engineeringApproved,false);
});
test('drawing does not mutate source project or assignments',()=>{
 const x=p(),before=JSON.stringify(x);draw(x,lookup);
 assert.equal(JSON.stringify(x),before);
});
test('page loads drawing engine before app',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(html.indexOf('cabinet-drawing-v1.js')<html.indexOf('app.js'));
});
