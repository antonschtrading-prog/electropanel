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

test('invalid calendar date or future source review is never counted as reviewed',()=>{
 for(const date of ['2026-02-30','2099-01-01','not-a-date']){
  const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}]};
  const r=audit(p,()=>({sku:'C',modules:1,widthMm:18,heightMm:80,depthMm:70,
   sourceType:'MANUFACTURER_DATASHEET_MIRROR',sourceReviewedAt:date}));
  assert.equal(r.sourceReviewed,0);
  assert.equal(r.rows[0].sourceReviewedAt,null);
  assert.ok(r.issues.some(x=>x.code==='APPARATUS_EVIDENCE_SOURCE_REVIEW_DATE_INVALID'));
  assert.ok(r.issues.some(x=>x.code==='APPARATUS_EVIDENCE_SOURCE_LINK_MISSING'));
  assert.equal(r.engineeringApproved,false);
 }
});
test('valid reviewed source date remains visible without implying cabinet approval',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}]};
 const r=audit(p,()=>({sku:'C',modules:1,widthMm:18,heightMm:80,depthMm:70,
  sourceType:'MANUFACTURER_DATASHEET_MIRROR',sourceReviewedAt:'2026-11-14',
  source:'https://example.org/datasheet'}));
 assert.equal(r.sourceReviewed,1);
 assert.equal(r.rows[0].sourceReviewedAt,'2026-11-14');
 assert.equal(r.rows[0].sourceUrl,'https://example.org/datasheet');
 assert.equal(r.ready_for_installation,false);
});

test('coverage counts are derived from actual selected articles',()=>{
 const p=board(),r=audit(p,id=>catalog[id]);
 assert.equal(r.dimensionCoverage.complete,1);
 assert.equal(r.dimensionCoverage.incomplete,1);
 assert.equal(r.sourceCoverage.total,2);
 assert.equal(r.engineeringApproved,false);
});
test('nominal device coordinates are relative to the declared installation band',()=>{
 const p={railCount:1,railCapacity:3,lines:[{id:'L1',modules:1,catalogSku:'C'}],
  cabinetGeometryV1:{version:1,source:'USER_DECLARED',
   interior:{widthMm:140,heightMm:140,depthMm:100},
   zones:[{railIndex:0,xMm:25,yMm:20,widthMm:60,heightMm:100}]}};
 const r=audit(p,()=>({sku:'C',modules:1,widthMm:18,heightMm:85,depthMm:70}));
 assert.equal(r.rows[0].nominalStartXMm,25);
 assert.equal(r.rows[0].nominalEndXMm,43);
 assert.equal(r.rows[0].remainingZoneWidthMm,42);
 assert.equal(r.status,'REVIEW_REQUIRED');
});

test('actual body edge is independently reported in a declared mounting zone',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}],
  cabinetGeometryV1:{version:1,source:'USER_DECLARED',
   interior:{widthMm:120,heightMm:150,depthMm:100},
   zones:[{railIndex:0,xMm:20,yMm:10,widthMm:40,heightMm:100}]}};
 const r=audit(p,()=>({sku:'C',modules:1,widthMm:17.5,heightMm:85,depthMm:70}));
 assert.equal(r.rows[0].actualBodyEndXMm,37.5);
 assert.equal(r.rows[0].remainingBodyZoneWidthMm,22.5);
 assert.equal(r.rows[0].remainingZoneWidthMm,22);
 assert.equal(r.status,'REVIEW_REQUIRED');
});
test('missing body width is unknown and not inferred from module count',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}]};
 const r=audit(p,()=>({sku:'C',modules:1,heightMm:85,depthMm:70}));
 assert.equal(r.rows[0].actualBodyEndXMm,null);
 assert.equal(r.rows[0].remainingBodyZoneWidthMm,null);
 assert.equal(r.dimensionCoverage.incomplete,1);
});

test('unclassified catalogue sources never inflate manufacturer coverage',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}]};
 const r=audit(p,()=>({sku:'C',modules:1,widthMm:18,heightMm:80,depthMm:70,
  sourceReviewedAt:'2026-11-14',source:'https://example.org/unknown'}));
 assert.equal(r.sourceReviewed,0);
 assert.equal(r.sourceCoverage.reviewed,0);
 assert.equal(r.sourceCoverage.total,1);
});
test('manufacturer mirror without URL is not counted as reviewed evidence',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}]};
 const r=audit(p,()=>({sku:'C',modules:1,widthMm:18,heightMm:80,depthMm:70,
  sourceType:'MANUFACTURER_DATASHEET_MIRROR',sourceReviewedAt:'2026-11-14'}));
 assert.equal(r.sourceReviewed,0);
 assert.equal(r.sourceCoverage.reviewed,0);
 assert.ok(r.issues.some(x=>x.code==='APPARATUS_EVIDENCE_SOURCE_LINK_MISSING'));
});

test('malformed, credentialed and non-HTTPS provenance links are not counted',()=>{
 for(const source of ['https://','https://user:pass@example.org/datasheet',
  'https://example.org/a b','http://example.org/data',
  'javascript:alert(1)','https://example.org/data#fragment']){
  const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}]};
  const r=audit(p,()=>({sku:'C',modules:1,widthMm:18,heightMm:80,depthMm:70,
   sourceType:'MANUFACTURER_DATASHEET_MIRROR',sourceReviewedAt:'2026-11-14',source}));
  assert.equal(r.sourceReviewed,0,source);
  assert.equal(r.rows[0].sourceUrl,null,source);
  assert.ok(r.issues.some(x=>x.code==='APPARATUS_EVIDENCE_SOURCE_URL_INVALID'),source);
  assert.ok(r.issues.some(x=>x.code==='APPARATUS_EVIDENCE_SOURCE_LINK_MISSING'),source);
 }
});
test('unclassified evidence has an actionable provenance issue',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}]};
 const r=audit(p,()=>({sku:'C',modules:1,widthMm:18,heightMm:80,depthMm:70,
  source:'https://example.org/data',sourceReviewedAt:'2026-11-14'}));
 assert.equal(r.sourceReviewed,0);
 assert.ok(r.issues.some(x=>x.code==='APPARATUS_EVIDENCE_SOURCE_CATEGORY_MISSING'));
});

test('official datasheets, manufacturer catalogues and product pages count as traceable sources',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L',modules:1,catalogSku:'A'}]};
 for(const sourceType of ['MANUFACTURER_DATASHEET_OFFICIAL',
  'MANUFACTURER_PRODUCT_PAGE','MANUFACTURER_CATALOG']){
  const r=audit(p,()=>({sku:'A',modules:1,widthMm:18,heightMm:85,depthMm:70,
   sourceType,sourceReviewedAt:'2026-11-14',source:'https://manufacturer.example/data'}));
  assert.equal(r.sourceCoverage.reviewed,1,sourceType);
  assert.equal(r.sourceReviewed,1,sourceType);
  assert.equal(r.ready_for_installation,false);
 }
});
test('unknown source categories never count as manufacturer-reviewed evidence',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L',modules:1,catalogSku:'A'}]};
 const r=audit(p,()=>({sku:'A',modules:1,widthMm:18,heightMm:85,depthMm:70,
  sourceType:'SOCIAL_MEDIA_POST',sourceReviewedAt:'2026-11-14',
  source:'https://example.org/post'}));
 assert.equal(r.sourceReviewed,0);
 assert.ok(r.issues.some(x=>x.code==='APPARATUS_EVIDENCE_SOURCE_CATEGORY_UNRECOGNIZED'));
});
test('manufacturer product page without valid URL is explicitly incomplete',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L',modules:1,catalogSku:'A'}]};
 const r=audit(p,()=>({sku:'A',modules:1,widthMm:18,heightMm:85,depthMm:70,
  sourceType:'MANUFACTURER_PRODUCT_PAGE',sourceReviewedAt:'2026-11-14'}));
 assert.equal(r.sourceReviewed,0);
 assert.ok(r.issues.some(x=>x.code==='APPARATUS_EVIDENCE_SOURCE_LINK_MISSING'));
});
