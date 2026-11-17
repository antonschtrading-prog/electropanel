'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
global.epDeviceVisualEvidenceV1=require('../device-visual-evidence-v1.js').epDeviceVisualEvidenceV1;
global.epBoardVisualAuditV1=require('../board-visual-audit-v1.js').epBoardVisualAuditV1;
const {epCabinetArticleReconciliationV1:reconcile}=require('../cabinet-article-reconciliation-v1.js');
const project=()=>({railCount:1,railCapacity:6,lines:[{id:'L1',modules:1,catalogSku:'OLD'}],
 branchDevices:[{id:'B1',circuitId:'L1',modules:1,catalogSku:'NEW'}]});
const lookup=sku=>({sku,maker:'ABB',series:'S200',kind:'MCB',modules:1,poles:1,
 widthMm:18,heightMm:85,depthMm:70,source:'https://example.org/'+sku});
test('selected branch SKU is identical across board, BOM and visual',()=>{
 const r=reconcile(project(),lookup);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.counts.matched,1);
 assert.equal(r.rows[0].boardSku,'NEW');
 assert.equal(r.rows[0].bomSku,'NEW');
 assert.equal(r.rows[0].visualSku,'NEW');
 assert.equal(r.ready_for_installation,false);
});
test('fallback line SKU works when no explicit branch selection exists',()=>{
 const p=project();delete p.branchDevices[0].catalogSku;
 const r=reconcile(p,lookup);
 assert.equal(r.counts.matched,1);
 assert.equal(r.rows[0].boardSku,'OLD');
});
test('unknown selected branch SKU blocks reconciliation without silently falling back',()=>{
 const p=project();
 const r=reconcile(p,sku=>sku==='OLD'?lookup(sku):null);
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='CABINET_ARTICLE_BOM_BLOCKED'));
});
test('multiple distinct apparatus identities remain separate',()=>{
 const p=project();
 p.lines.push({id:'L2',modules:1,catalogSku:'OTHER'});
 p.branchDevices.push({id:'B2',circuitId:'L2',modules:1,catalogSku:'OTHER'});
 const r=reconcile(p,lookup);
 assert.equal(r.counts.board,2);
 assert.equal(r.counts.bom,2);
 assert.equal(r.counts.visual,2);
 assert.equal(r.counts.matched,2);
});
test('empty board is review required but never approved',()=>{
 const r=reconcile({railCount:1,railCapacity:6,lines:[]},lookup);
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.counts.matched,0);
});
test('invalid project is blocked',()=>assert.equal(reconcile(null,lookup).status,'BLOCKED'));
test('reconciliation is deterministic and does not mutate project',()=>{
 const p=project(),before=JSON.stringify(p);
 assert.deepEqual(reconcile(p,lookup),reconcile(p,lookup));
 assert.equal(JSON.stringify(p),before);
});
test('mismatched catalogue identity is not counted as a matched device',()=>{
 const r=reconcile(project(),sku=>({...lookup(sku),sku:'WRONG'}));
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.counts.matched,0);
});

test('catalogue lookup is snapshotted once per article across all three reports',()=>{
 const counts=new Map();
 const p=project();
 const r=reconcile(p,sku=>{
  counts.set(sku,(counts.get(sku)||0)+1);
  return {...lookup(sku),sku:counts.get(sku)===1?sku:'INCONSISTENT'};
 });
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.counts.matched,1);
 assert.equal(counts.get('NEW'),1);
});
test('unstable catalogue data cannot introduce cross-report identity drift',()=>{
 let counter=0;
 const r=reconcile(project(),sku=>({...lookup(sku),label:'Snapshot '+(++counter)}));
 assert.equal(r.counts.matched,1);
 assert.equal(counter,1);
});
test('lookup exceptions are cached within a reconciliation pass',()=>{
 let calls=0;
 const r=reconcile(project(),()=>{calls++;throw Error('offline');});
 assert.equal(r.status,'BLOCKED');
 assert.equal(calls,1);
});
