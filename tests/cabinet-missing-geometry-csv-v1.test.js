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
