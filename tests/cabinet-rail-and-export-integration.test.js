'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const g=require('../cabinet-geometry-v1');
global.epCabinetGeometryNormalizeV1=g.epCabinetGeometryNormalizeV1;
global.epCabinetAutoZonesV1=g.epCabinetAutoZonesV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDinPhysicalEnvelopeV1=require('../din-physical-envelope-v1.js').epDinPhysicalEnvelopeV1;
const c={epDraftBoardPlanV1:global.epDraftBoardPlanV1,epDinPhysicalEnvelopeV1:global.epDinPhysicalEnvelopeV1,
 epCabinetFitAuditV1:g.epCabinetFitAuditV1};
vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','board-placement-export-v1.js'),'utf8'),c);
const {epBoardRailCountChangeV1:change}=require('../board-rail-count-v1.js');
const p=()=>({railCount:2,railCapacity:6,lines:[{id:'L1',modules:1,catalogSku:'S1'}],sharedDevices:[],
 cabinetGeometryV1:{version:1,source:'USER_DECLARED',
  interior:{widthMm:250,heightMm:470,depthMm:120},
  zones:[{railIndex:0,xMm:15,yMm:25,widthMm:220,heightMm:95},
   {railIndex:1,xMm:15,yMm:145,widthMm:220,heightMm:95}],
  planning:{marginMm:15,firstRowYMm:25,zoneHeightMm:95,rowGapMm:25}}});
const lookup=()=>({maker:'ABB',sku:'S1',series:'S200',kind:'MCB',poles:1,modules:1,
 widthMm:17.5,heightMm:85,depthMm:75});
test('adding DIN row also re-plans user-declared cabinet zones without losing original dimensions',()=>{
 const before=p(),immutable=JSON.stringify(before);
 const r=change(before,3,lookup);
 assert.equal(r.code,'RAIL_COUNT_UPDATED');assert.equal(r.cabinetReplanned,true);
 assert.equal(r.project.cabinetGeometryV1.zones.length,3);
 assert.equal(r.project.cabinetGeometryV1.zones[2].yMm,265);
 assert.equal(r.project.cabinetGeometryV1.interior.widthMm,250);
 assert.equal(JSON.stringify(before),immutable);
});
test('adding a row is rejected if declared interior height cannot fit',()=>{
 const x=p();x.cabinetGeometryV1.interior.heightMm=250;
 const r=change(x,3,lookup);
 assert.equal(r.code,'CABINET_NEW_RAIL_ZONE_NOT_FIT');assert.equal(r.project,null);
});
test('manually edited zones cannot be silently reflowed',()=>{
 const x=p();delete x.cabinetGeometryV1.planning;
 assert.equal(change(x,3,lookup).code,'CABINET_MANUAL_ZONES_REPLAN_REQUIRED');
});
test('unconfigured cabinet keeps original rail count behavior',()=>{
 const x=p();delete x.cabinetGeometryV1;
 assert.equal(change(x,3,lookup).cabinetReplanned,false);
});
test('placement CSV records declared cabinet x/y and interior depth in independent fields',()=>{
 const r=c.epBoardPlacementCsvV1(p(),lookup);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.match(r.csv,/cabinet_fit_status/);
 assert.match(r.csv,/"REVIEW_REQUIRED";"15";"25";"95";"120"/);
 assert.equal(r.engineeringApproved,false);
});
test('cabinet body overflow makes exported placement blocked',()=>{
 const x=p();x.cabinetGeometryV1.interior.depthMm=60;
 const r=c.epBoardPlacementCsvV1(x,lookup);
 assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(i=>i.code==='CABINET_DEVICE_DEPTH_OVERFLOW'));
});
test('cabinet without declared geometry leaves empty CSV sizes',()=>{
 const x=p();delete x.cabinetGeometryV1;
 const r=c.epBoardPlacementCsvV1(x,lookup);
 assert.match(r.csv,/"NOT_CONFIGURED";"";"";"";""/);
});
test('direct rail count and width controls check physical user-declared zones',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(app,/epBoardRailCountChangeV1\(state,n,catalogDevice,\{preserve:true\}\)/);
 assert.match(app,/epCabinetGeometryCheckV1\(state\.cabinetGeometryV1,state\.railCount,n\)/);
});
