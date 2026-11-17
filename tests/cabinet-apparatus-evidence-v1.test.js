'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epCabinetGeometryCheckV1=require('../cabinet-geometry-v1.js').epCabinetGeometryCheckV1;
const {epCabinetApparatusEvidenceV1:audit}=require('../cabinet-apparatus-evidence-v1.js');
const board=()=>({railCount:1,railCapacity:6,lines:[
 {id:'L1',modules:1,catalogSku:'SE-A9F73110'},
 {id:'L2',modules:1,catalogSku:'ABB-2CDS251001R0164'}
]});
const catalog=require('../catalog.js').EP_CATALOG;
test('source-traced measurements preserve unknown ABB height and depth rather than guessing',()=>{
 const p=board(),before=JSON.stringify(p),r=audit(p,id=>catalog[id]);
 assert.equal(JSON.stringify(p),before);
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.rows.length,2);
 const sch=r.rows[0],abb=r.rows[1];
 assert.equal(sch.bodyWidthMm,18);assert.equal(sch.bodyHeightMm,85);
 assert.equal(sch.bodyDepthMm,78.5);
 assert.equal(sch.sourceType,'MANUFACTURER_DATASHEET_MIRROR');
 assert.equal(sch.sourceReviewedAt,'2026-11-14');
 assert.equal(abb.bodyWidthMm,17.5);
 assert.equal(abb.bodyHeightMm,null);assert.equal(abb.bodyDepthMm,null);
 assert.equal(r.knownDimensions.height,1);assert.equal(r.knownDimensions.depth,1);
 assert.equal(r.actualTerminalCoordinatesVerified,false);
});
test('user-entered dimensions do not become manufacturer-verified evidence',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'CUSTOM'}]};
 const r=audit(p,()=>({maker:'A',sku:'X',series:'Y',modules:1,widthMm:18,
  heightMm:85,depthMm:80,sourceType:'PROJECT_DECLARATION',
  source:'https://example.org/datasheet'}));
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.rows[0].sourceReviewedAt,null);
 assert.ok(r.issues.some(x=>x.code==='APPARATUS_EVIDENCE_USER_ENTERED_UNVERIFIED'));
});
test('known dimensions exceeding user-declared interior are blocked, not approved',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}],
  cabinetGeometryV1:{version:1,source:'USER_DECLARED',
   interior:{widthMm:110,heightMm:140,depthMm:65},
   zones:[{railIndex:0,xMm:30,yMm:20,widthMm:50,heightMm:75}]}};
 const r=audit(p,()=>({maker:'A',sku:'C',modules:1,widthMm:18,heightMm:86,depthMm:80}));
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='APPARATUS_EVIDENCE_DECLARED_RAIL_BAND_HEIGHT_EXCEEDED'));
 assert.ok(r.issues.some(x=>x.code==='APPARATUS_EVIDENCE_DECLARED_INTERIOR_DEPTH_EXCEEDED'));
});
test('bound branch article takes precedence for dimension evidence',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'OLD'}],
  branchDevices:[{id:'B1',circuitId:'L1',modules:1,catalogSku:'NEW'}]};
 const r=audit(p,id=>({sku:id,modules:1,widthMm:id==='NEW'?17.5:18,heightMm:80,depthMm:70}));
 assert.equal(r.rows[0].articleId,'NEW');
 assert.equal(r.rows[0].bodyWidthMm,17.5);
});
test('no catalogue article stays unknown rather than treated as 18mm verified body',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1}]};
 const r=audit(p);
 assert.equal(r.rows[0].nominalSlotWidthMm,18);
 assert.equal(r.rows[0].bodyWidthMm,null);
 assert.equal(r.actualMountingPositionVerified,false);
});
