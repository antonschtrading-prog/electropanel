'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const modulePath='../cabinet-geometry-v1.js';
const c=require(modulePath);
const raw=()=>({version:1,source:'USER_DECLARED',interior:{widthMm:520,heightMm:600,depthMm:130},
 planning:{marginMm:20,firstRowYMm:40,zoneHeightMm:120,rowGapMm:30},
 zones:[{railIndex:0,xMm:20,yMm:40,widthMm:480,heightMm:120},
 {railIndex:1,xMm:20,yMm:190,widthMm:480,heightMm:120}]});
const project=()=>({railCount:2,railCapacity:12,lines:[{id:'L1',modules:1,catalogSku:'A1'}],
 branchDevices:[{id:'Q1',circuitId:'L1',modules:1}],sharedDevices:[],cabinetGeometryV1:raw()});
const lookup=()=>({sku:'A1',maker:'ABB',series:'S200',kind:'MCB',modules:1,
 widthMm:17.5,heightMm:85,depthMm:75,poles:1});
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDinPhysicalEnvelopeV1=require('../din-physical-envelope-v1.js').epDinPhysicalEnvelopeV1;
test('legacy project without cabinet is explicitly unconfigured, not passed',()=>{
 const p=project();delete p.cabinetGeometryV1;const r=c.epCabinetFitAuditV1(p,lookup);
 assert.equal(r.status,'NOT_CONFIGURED');assert.equal(r.confirmedCabinetFit,false);
});
test('normalized geometry retains exact user-owned dimensions and safe source only',()=>{
 const r=c.epCabinetGeometryNormalizeV1(raw());
 assert.deepEqual(r,raw());assert.equal(r.zones.length,2);assert.equal(r.source,'USER_DECLARED');
});
test('a cabinet drawing and rail positions are provisional, not manufacturer proven',()=>{
 const r=c.epCabinetFitAuditV1(project(),lookup);
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.rows.length,1);
 assert.equal(r.rows[0].xMm,20);assert.equal(r.rows[0].yMm,40);
 assert.equal(r.rows[0].bodyHeightMm,85);assert.equal(r.confirmedCabinetFit,false);
 assert.equal(r.engineeringApproved,false);
});
test('body taller than allocated band blocks',()=>{
 const r=c.epCabinetFitAuditV1(project(),()=>({...lookup(),heightMm:125}));
 assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.code==='CABINET_DEVICE_HEIGHT_OVERFLOW'));
});
test('body deeper than declared usable interior blocks',()=>{
 const p=project();p.cabinetGeometryV1.interior.depthMm=65;
 const r=c.epCabinetFitAuditV1(p,lookup);assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='CABINET_DEVICE_DEPTH_OVERFLOW'));
});
test('unknown product dimensions remain unknown, not fabricated',()=>{
 const r=c.epCabinetFitAuditV1(project(),()=>({modules:1}));
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.issues.some(x=>x.code==='CABINET_DEVICE_HEIGHT_UNKNOWN'));
 assert.ok(r.issues.some(x=>x.code==='CABINET_DEVICE_DEPTH_UNKNOWN'));
});
test('rail count changes make an outdated cabinet layout blocked',()=>{
 const p=project();p.railCount=3;
 assert.equal(c.epCabinetFitAuditV1(p,lookup).status,'BLOCKED');
 assert.ok(c.epCabinetFitAuditV1(p,lookup).issues.some(x=>x.code==='CABINET_RAIL_COUNT_MISMATCH'));
});
test('zone outside interior and narrower than rail are blocked',()=>{
 const p=raw();p.zones[0].xMm=120;
 assert.ok(c.epCabinetGeometryCheckV1(p,2,12).issues.some(x=>x.code==='CABINET_ZONE_OUTSIDE_INTERIOR'));
 const q=raw();q.zones[0].widthMm=210;
 assert.ok(c.epCabinetGeometryCheckV1(q,2,12).issues.some(x=>x.code==='CABINET_RAIL_SPAN_TOO_NARROW'));
});
test('overlapping allocated rail bands cannot pass',()=>{
 const p=raw();p.zones[1].yMm=90;
 assert.ok(c.epCabinetGeometryCheckV1(p,2,12).issues.some(x=>x.code==='CABINET_ZONE_OVERLAP'));
});
test('malformed and adversarial geometry is rejected atomically',()=>{
 for(const change of [null,[],{...raw(),version:2},{...raw(),source:'CERTIFIED'},
  {...raw(),interior:{...raw().interior,widthMm:Infinity}},
  {...raw(),interior:{...raw().interior,widthMm:'520'}},
  {...raw(),zones:[raw().zones[0],raw().zones[0]]},
  {...raw(),__proto__:null,bogus:true}]){
  assert.throws(()=>c.epCabinetGeometryNormalizeV1(change));
 }
});
test('automatically planned bands only use explicitly supplied values',()=>{
 const r=c.epCabinetAutoZonesV1({interiorWidthMm:520,interiorHeightMm:600,interiorDepthMm:130,
  marginMm:20,firstRowYMm:40,zoneHeightMm:120,rowGapMm:30},2,12);
 assert.equal(r.status,'REVIEW_REQUIRED');assert.deepEqual(r.geometry.zones,raw().zones);
});
test('automatic planner rejects impossible internal row layout',()=>{
 const r=c.epCabinetAutoZonesV1({interiorWidthMm:520,interiorHeightMm:200,interiorDepthMm:130,
  marginMm:20,firstRowYMm:40,zoneHeightMm:120,rowGapMm:30},2,12);
 assert.equal(r.status,'BLOCKED');
});
test('apply clones project and leaves source intact',()=>{
 const p=project();delete p.cabinetGeometryV1;const before=JSON.stringify(p);
 const a=c.epCabinetGeometryApplyV1(p,raw());
 assert.equal(a.code,'CABINET_GEOMETRY_UPDATED');
 assert.equal(JSON.stringify(p),before);
 assert.equal(a.project.cabinetGeometryV1.zones.length,2);
});
test('invalid enclosure proposal is rejected without a project copy',()=>{
 const p=project(),g=raw();g.zones[0].widthMm=2;
 assert.equal(c.epCabinetGeometryApplyV1(p,g).project,null);
});
