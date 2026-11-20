'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
global.epDeviceVisualEvidenceV1=require('../device-visual-evidence-v1.js').epDeviceVisualEvidenceV1;
global.epBoardVisualAuditV1=require('../board-visual-audit-v1.js').epBoardVisualAuditV1;
global.epCabinetArticleReconciliationV1=require('../cabinet-article-reconciliation-v1.js').epCabinetArticleReconciliationV1;
global.epCabinetArticleReplacementV1=require('../cabinet-article-replacement-v1.js').epCabinetArticleReplacementV1;
const {epCabinetArticleBulkReplacementV1:bulk}=require('../cabinet-article-bulk-replacement-v1.js');
const catalogue=sku=>({sku,maker:'ABB',series:'S200',kind:'MCB',
 modules:sku==='WIDE'?2:1,widthMm:sku==='WIDE'?36:18,heightMm:85,depthMm:70,
 poles:1,source:'https://example.org/'+sku});
const project=()=>({railCount:1,railCapacity:8,
 lines:[{id:'L1',modules:1,catalogSku:'OLD'},{id:'L2',modules:1,catalogSku:'OLD'},
 {id:'L3',modules:1,catalogSku:'KEEP'}],
 branchDevices:[{id:'B1',circuitId:'L1',modules:1,catalogSku:'OLD'},
 {id:'B2',circuitId:'L2',modules:1,catalogSku:'OLD'},
 {id:'B3',circuitId:'L3',modules:1,catalogSku:'KEEP'}]});
test('bulk replacement migrates every matching article and preserves unrelated SKU',()=>{
 const p=project(),before=JSON.stringify(p);
 const r=bulk(p,'OLD','NEW',catalogue);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.preview.replacedCount,2);
 assert.deepEqual(r.preview.replacedDeviceIds,['B1','B2']);
 assert.equal(r.project.branchDevices[0].catalogSku,'NEW');
 assert.equal(r.project.branchDevices[1].catalogSku,'NEW');
 assert.equal(r.project.branchDevices[2].catalogSku,'KEEP');
 assert.equal(JSON.stringify(p),before);
 assert.equal(r.ready_for_installation,false);
});
test('bulk replacement handles width growth with layout reflow',()=>{
 const r=bulk(project(),'OLD','WIDE',catalogue);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.project.lines[0].modules,2);
 assert.equal(r.project.lines[1].modules,2);
 assert.ok(r.preview.relocatedCount>=1);
 assert.equal(r.preview.finalPlacementCount,3);
});
test('bulk replacement rejects unknown source article',()=>{
 assert.equal(bulk(project(),'MISSING','NEW',catalogue).code,
  'BULK_REPLACEMENT_SOURCE_ARTICLE_NOT_FOUND');
});
test('bulk replacement rejects same source and destination',()=>{
 assert.equal(bulk(project(),'OLD','OLD',catalogue).status,'BLOCKED');
});
test('bulk replacement is atomic when second replacement exceeds capacity',()=>{
 const p=project();p.railCapacity=4;
 const before=JSON.stringify(p);
 const r=bulk(p,'OLD','WIDE',catalogue);
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'BULK_REPLACEMENT_STEP_BLOCKED');
 assert.equal(r.project,null);
 assert.equal(JSON.stringify(p),before);
});
test('bulk replacement rejects missing target catalogue article',()=>{
 const r=bulk(project(),'OLD','UNKNOWN',sku=>sku==='UNKNOWN'?null:catalogue(sku));
 assert.equal(r.code,'BULK_REPLACEMENT_STEP_BLOCKED');
 assert.equal(r.project,null);
});
test('bulk replacement deterministic and never approved for installation',()=>{
 const p=project(),a=bulk(p,'OLD','NEW',catalogue),b=bulk(p,'OLD','NEW',catalogue);
 assert.deepEqual(a,b);
 assert.equal(a.engineeringApproved,false);
 assert.equal(a.manufacturerCabinetFitVerified,false);
});

test('bulk migration includes shared apparatus with the same selected SKU',()=>{
 const p=project();p.sharedDevices=[{id:'S1',catalogSku:'OLD',modules:1}];
 const r=bulk(p,'OLD','NEW',catalogue);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.preview.replacedCount,3);
 assert.equal(r.project.sharedDevices[0].catalogSku,'NEW');
});
test('bulk migration leaves unmatched shared apparatus unchanged',()=>{
 const p=project();p.sharedDevices=[{id:'S1',catalogSku:'KEEP',modules:1}];
 const r=bulk(p,'OLD','NEW',catalogue);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.preview.replacedCount,2);
 assert.equal(r.project.sharedDevices[0].catalogSku,'KEEP');
});
test('bulk migration handles implicit branch fallback selections',()=>{
 const p=project();delete p.branchDevices[0].catalogSku;
 const r=bulk(p,'OLD','NEW',catalogue);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.preview.replacedCount,2);
 assert.equal(r.project.branchDevices[0].catalogSku,'NEW');
});

test('bulk migration reports module growth and exact BOM article deltas',()=>{
 const r=bulk(project(),'OLD','WIDE',catalogue);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.preview.beforeModules,3);
 assert.equal(r.preview.afterModules,5);
 assert.equal(r.preview.moduleDelta,2);
 assert.deepEqual(r.preview.bomChanges,[
  {sku:'OLD',oldQuantity:2,newQuantity:0,delta:-2},
  {sku:'WIDE',oldQuantity:0,newQuantity:2,delta:2}
 ]);
});

test('bulk migration uses one catalogue snapshot for all devices and reports',()=>{
 const calls=new Map();
 const r=bulk(project(),'OLD','NEW',sku=>{
  calls.set(sku,(calls.get(sku)||0)+1);
  return {...catalogue(sku),label:'Snapshot '+calls.get(sku)};
 });
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(calls.get('OLD'),1);
 assert.equal(calls.get('NEW'),1);
 assert.equal(calls.get('KEEP'),1);
});

test('bulk migration rejects ambiguous or oversized source and destination SKUs',()=>{
 for(const sku of [' OLD','OLD ','',' '.repeat(3),'X'.repeat(201)]){
  assert.equal(bulk(project(),sku,'NEW',catalogue).status,'BLOCKED');
 }
 for(const sku of [' NEW','NEW ','','X'.repeat(201)]){
  assert.equal(bulk(project(),'OLD',sku,catalogue).status,'BLOCKED');
 }
});
