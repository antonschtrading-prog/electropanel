'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epCabinetGeometryCheckV1=require('../cabinet-geometry-v1.js').epCabinetGeometryCheckV1;
global.epCabinetApparatusEvidenceV1=
 require('../cabinet-apparatus-evidence-v1.js').epCabinetApparatusEvidenceV1;
const {epCabinetMissingGeometryCsvV1:csv}=require('../cabinet-missing-geometry-csv-v1.js');
const {EP_CATALOG}=require('../catalog.js');
test('supplier checklist retains honest missing H/D and selected supplier references',()=>{
 const p={railCount:1,railCapacity:4,lines:[
  {id:'L1',modules:1,catalogSku:'SE-A9F73110'},
  {id:'L2',modules:1,catalogSku:'ABB-2CDS251001R0164'}]};
 const r=csv(p,id=>EP_CATALOG[id]);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.rows,2);
 assert.match(r.csv,/source_reviewed_at/);
 assert.match(r.csv,/A9F73110/);
 assert.match(r.csv,/BODY_HEIGHT\|BODY_DEPTH/);
 assert.match(r.csv,/DIN_MOUNT_OFFSET\|TERMINAL_POSITIONS\|CONNECTION_CLEARANCES/);
 assert.equal(r.engineeringApproved,false);
});
test('spreadsheet formula injection from untrusted device ids is escaped',()=>{
 const p={railCount:1,railCapacity:4,
  lines:[{id:'=2+2',modules:1,catalogSku:'TEST'}]};
 const r=csv(p,()=>({sku:'TEST',modules:1,widthMm:18}));
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.match(r.csv,/"'=2\+2"/);
});
test('invalid layout cannot produce fake procurement-ready schedule',()=>{
 const r=csv({railCount:0,railCapacity:4,lines:[]});
 assert.equal(r.status,'BLOCKED');assert.equal(r.rows,0);
});

test('supplier CSV carries missing source and independent body geometry evidence',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}],
  cabinetGeometryV1:{version:1,source:'USER_DECLARED',
   interior:{widthMm:100,heightMm:140,depthMm:100},
   zones:[{railIndex:0,xMm:20,yMm:10,widthMm:40,heightMm:100}]}};
 const r=csv(p,()=>({sku:'C',modules:1,widthMm:17.5,heightMm:80,depthMm:70,
  sourceType:'MANUFACTURER_DATASHEET_MIRROR',sourceReviewedAt:'2099-01-01'}));
 assert.equal(r.rows,1);
 assert.match(r.csv,/SOURCE_REVIEW\|SOURCE_URL\|CORRECT_REVIEW_DATE/);
 assert.match(r.csv,/actual_body_end_x_mm/);
 assert.match(r.csv,/"37.5"/);
 assert.match(r.csv,/"22.5"/);
 assert.equal(r.ready_for_installation,false);
});

test('supplier checklist requests independent evidence for user declarations',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}]};
 const r=csv(p,()=>({sku:'C',widthMm:18,heightMm:80,depthMm:70,
  sourceType:'PROJECT_DECLARATION',source:'https://example.org/user'}));
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.match(r.csv,/INDEPENDENT_MANUFACTURER_EVIDENCE/);
 assert.match(r.csv,/DIN_MOUNT_OFFSET/);
 assert.equal(r.ready_for_installation,false);
});
test('supplier checklist requests source classification when absent',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}]};
 const r=csv(p,()=>({sku:'C',widthMm:18,heightMm:80,depthMm:70}));
 assert.match(r.csv,/SOURCE_CATEGORY/);
 assert.equal(r.engineeringApproved,false);
});
test('missing manufacturer mirror URL has an explicit supplier request',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}]};
 const r=csv(p,()=>({sku:'C',widthMm:18,heightMm:80,depthMm:70,
  sourceType:'MANUFACTURER_DATASHEET_MIRROR',sourceReviewedAt:'2026-11-14'}));
 assert.match(r.csv,/VALID_SOURCE_LINK/);
 assert.equal(r.status,'REVIEW_REQUIRED');
});

test('blocked cabinet body conflict retains supplier article rows',()=>{
 const p={railCount:1,railCapacity:2,lines:[{id:'L1',modules:1,catalogSku:'C'}],
  cabinetGeometryV1:{version:1,source:'USER_DECLARED',
   interior:{widthMm:110,heightMm:140,depthMm:65},
   zones:[{railIndex:0,xMm:30,yMm:20,widthMm:50,heightMm:75}]}};
 const r=csv(p,()=>({sku:'C',modules:1,widthMm:18,heightMm:86,depthMm:80}));
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.rows,1);
 assert.match(r.csv,/"L1"/);
 assert.match(r.csv,/"86"/);
 assert.match(r.csv,/"80"/);
 assert.ok(r.issues.some(x=>x.code==='MISSING_GEOMETRY_INPUT_BLOCKED'));
 assert.equal(r.ready_for_installation,false);
});
