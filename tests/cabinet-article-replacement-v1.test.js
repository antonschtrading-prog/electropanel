'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
global.epDeviceVisualEvidenceV1=require('../device-visual-evidence-v1.js').epDeviceVisualEvidenceV1;
global.epBoardVisualAuditV1=require('../board-visual-audit-v1.js').epBoardVisualAuditV1;
global.epCabinetArticleReconciliationV1=require('../cabinet-article-reconciliation-v1.js').epCabinetArticleReconciliationV1;
const {epCabinetArticleReplacementV1:replace}=require('../cabinet-article-replacement-v1.js');
const catalogue=sku=>({sku,maker:'ABB',series:'S200',kind:'MCB',modules:sku==='WIDE'?2:1,
 widthMm:sku==='WIDE'?36:18,heightMm:85,depthMm:70,poles:1,source:'https://example.org/'+sku});
const project=()=>({railCount:1,railCapacity:6,
 lines:[{id:'L1',modules:1,catalogSku:'OLD'},{id:'L2',modules:1,catalogSku:'OLD2'}],
 branchDevices:[{id:'B1',circuitId:'L1',modules:1,catalogSku:'OLD'},
 {id:'B2',circuitId:'L2',modules:1,catalogSku:'OLD2'}]});
test('replace branch SKU and update circuit width atomically',()=>{
 const p=project(),before=JSON.stringify(p);
 const r=replace(p,'B1','WIDE',catalogue);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.project.branchDevices[0].catalogSku,'WIDE');
 assert.equal(r.project.branchDevices[0].modules,2);
 assert.equal(r.project.lines[0].modules,2);
 assert.equal(r.preview.nextModules,2);
 assert.equal(r.preview.articleCount,2);
 assert.equal(JSON.stringify(p),before);
 assert.equal(r.ready_for_installation,false);
});
test('replacing shared apparatus does not mutate circuits',()=>{
 const p=project();p.sharedDevices=[{id:'S1',modules:1,catalogSku:'OLD'}];
 const r=replace(p,'S1','WIDE',catalogue);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.project.sharedDevices[0].modules,2);
 assert.equal(r.project.lines[0].modules,1);
});
test('replacing a line directly works without branch devices',()=>{
 const p=project();delete p.branchDevices;
 const r=replace(p,'L1','WIDE',catalogue);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.project.lines[0].catalogSku,'WIDE');
 assert.equal(r.project.lines[0].modules,2);
});
test('cannot replace line fallback while branch device owns selection',()=>{
 assert.equal(replace(project(),'L1','WIDE',catalogue).code,'REPLACEMENT_SELECT_BRANCH_DEVICE');
});
test('unknown device cannot be changed',()=>{
 assert.equal(replace(project(),'MISSING','WIDE',catalogue).code,'REPLACEMENT_DEVICE_NOT_FOUND');
});
test('unknown catalogue SKU cannot be changed',()=>{
 assert.equal(replace(project(),'B1','NONE',()=>null).code,'REPLACEMENT_ARTICLE_UNKNOWN');
});
test('manufacturer catalogue identity must match requested SKU',()=>{
 assert.equal(replace(project(),'B1','WIDE',()=>({...catalogue('WIDE'),sku:'OTHER'})).code,
 'REPLACEMENT_ARTICLE_ID_MISMATCH');
});
test('oversized catalogue width blocks replacement',()=>{
 assert.equal(replace(project(),'B1','WIDE',()=>({...catalogue('WIDE'),widthMm:37})).code,
 'REPLACEMENT_ARTICLE_WIDTH_INVALID');
});
test('non-integer modules block replacement',()=>{
 assert.equal(replace(project(),'B1','WIDE',()=>({...catalogue('WIDE'),modules:1.5})).code,
 'REPLACEMENT_ARTICLE_MODULES_INVALID');
});
test('lookup exception blocks replacement without changing input',()=>{
 const p=project(),before=JSON.stringify(p);
 assert.equal(replace(p,'B1','WIDE',()=>{throw Error('network');}).code,
 'REPLACEMENT_CATALOGUE_LOOKUP_FAILED');
 assert.equal(JSON.stringify(p),before);
});
test('capacity overflow blocks replacement',()=>{
 const p=project();p.railCapacity=2;
 const r=replace(p,'B1','WIDE',catalogue);
 assert.equal(r.code,'REPLACEMENT_LAYOUT_BLOCKED');
 assert.equal(r.project,null);
});
test('manual position conflict blocks replacement',()=>{
 const p=project();p.manualLayoutV1=[
  {deviceId:'B1',railIndex:0,startModule:0},
  {deviceId:'B2',railIndex:0,startModule:1}];
 const r=replace(p,'B1','WIDE',catalogue);
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.project,null);
});
test('manual layout is preserved if new article fits',()=>{
 const p=project();p.manualLayoutV1=[
  {deviceId:'B1',railIndex:0,startModule:0},
  {deviceId:'B2',railIndex:0,startModule:3}];
 const r=replace(p,'B1','WIDE',catalogue);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.preview.manualLayoutPreserved,true);
 assert.equal(r.project.manualLayoutV1[1].startModule,3);
});
test('replacement preview identifies relocated downstream apparatus',()=>{
 const r=replace(project(),'B1','WIDE',catalogue);
 assert.ok(r.preview.relocatedDeviceIds.includes('B2'));
});
test('invalid inputs are rejected without throwing',()=>{
 for(const id of ['',null,2])assert.equal(replace(project(),id,'WIDE',catalogue).status,'BLOCKED');
 for(const sku of ['',null,2,'x'.repeat(201)])assert.equal(replace(project(),'B1',sku,catalogue).status,'BLOCKED');
 assert.equal(replace(null,'B1','WIDE',catalogue).status,'BLOCKED');
});

test('unchanged SKU is a no-op and cannot create undo history',()=>{
 const r=replace(project(),'B1','OLD',catalogue);
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'REPLACEMENT_ARTICLE_UNCHANGED');
 assert.equal(r.project,null);
});
test('preview reports exact module delta and moved apparatus count',()=>{
 const r=replace(project(),'B1','WIDE',catalogue);
 assert.equal(r.preview.moduleDelta,1);
 assert.equal(r.preview.relocationCount,r.preview.relocatedDeviceIds.length);
 assert.ok(r.preview.relocationCount>0);
});
