'use strict';
// 50 independent, named regression scenarios: five realistic cabinet sizes × ten
// catalogue/placement consistency changes. Each test exercises the full
// draft board -> BOM -> visual audit -> reconciliation pipeline.
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
global.epDeviceVisualEvidenceV1=require('../device-visual-evidence-v1.js').epDeviceVisualEvidenceV1;
global.epBoardVisualAuditV1=require('../board-visual-audit-v1.js').epBoardVisualAuditV1;
const {epCabinetArticleReconciliationV1:run}=require('../cabinet-article-reconciliation-v1.js');
const article=sku=>({sku,maker:'ABB',series:'S200',kind:'MCB',modules:1,poles:1,
 widthMm:18,heightMm:85,depthMm:70,source:'https://manufacturer.example/'+sku});
function fixture(n){
 return {railCount:Math.ceil(n/12),railCapacity:12,
  lines:Array.from({length:n},(_,i)=>({id:'L'+i,modules:1,catalogSku:'OLD'+i})),
  branchDevices:Array.from({length:n},(_,i)=>({
   id:'B'+i,circuitId:'L'+i,modules:1,catalogSku:'NEW'+i}))};
}
const scenarios=[
 {name:'selected branch article',change:()=>{},verify:(r,n)=>{
  assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.counts.matched,n);
  assert.equal(r.rows[0].boardSku,'NEW0');assert.equal(r.rows[0].bomSku,'NEW0');
  assert.equal(r.rows[0].visualSku,'NEW0');}},
 {name:'line fallback when branch SKU is omitted',change:p=>{delete p.branchDevices[0].catalogSku;},
  verify:(r,n)=>{assert.equal(r.counts.matched,n);assert.equal(r.rows[0].boardSku,'OLD0');}},
 {name:'replace selected article',change:p=>{p.branchDevices[0].catalogSku='REPLACEMENT';},
  verify:(r,n)=>{assert.equal(r.counts.matched,n);assert.equal(r.rows[0].boardSku,'REPLACEMENT');}},
 {name:'missing catalogue record',change:()=>{},
  lookup:sku=>sku==='NEW0'?null:article(sku),
  verify:r=>{assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.code==='CABINET_ARTICLE_BOARD_BLOCKED'));}},
 {name:'catalogue record has conflicting SKU',change:()=>{},
  lookup:sku=>sku==='NEW0'?{...article(sku),sku:'WRONG'}:article(sku),
  verify:r=>{assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.code==='CABINET_ARTICLE_CATALOGUE_IDENTITY_MISMATCH'));}},
 {name:'invalid catalogue modules',change:()=>{},
  lookup:sku=>sku==='NEW0'?{...article(sku),modules:0}:article(sku),
  verify:r=>{assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.code==='CABINET_ARTICLE_BOARD_BLOCKED'));}},
 {name:'lookup exception',change:()=>{},
  lookup:sku=>{if(sku==='NEW0')throw Error('catalogue unavailable');return article(sku);},
  verify:r=>{assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.code==='CABINET_ARTICLE_BOM_BLOCKED'));}},
 {name:'branch width conflicts with line',change:p=>{p.branchDevices[0].modules=2;},
  verify:r=>{assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.code==='CABINET_ARTICLE_BOARD_BLOCKED'));}},
 {name:'orphan branch device',change:p=>{p.branchDevices[0].circuitId='NO_SUCH_CIRCUIT';},
  verify:r=>{assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.code==='CABINET_ARTICLE_BOM_BLOCKED'));}},
 {name:'duplicate branch circuit mapping',change:p=>{p.branchDevices.push({
  id:'DUP',circuitId:'L0',modules:1,catalogSku:'NEW0'});},
  verify:r=>{assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.code==='CABINET_ARTICLE_BOARD_BLOCKED'));}}
];
for(const count of [1,2,6,12,24]){
 for(const scenario of scenarios){
  test('cabinet '+count+' apparatus: '+scenario.name,()=>{
   const p=fixture(count),before=JSON.stringify(p);
   scenario.change(p);
   const changed=JSON.stringify(p),lookup=scenario.lookup||article;
   const result=run(p,lookup);
   scenario.verify(result,count);
   assert.equal(JSON.stringify(p),changed,'audit must not modify project');
   assert.equal(result.engineeringApproved,false);
   assert.equal(result.ready_for_installation,false);
   assert.equal(result.manufacturerCabinetFitVerified,false);
   assert.equal(result.counts.matched+result.counts.unmatched,result.counts.expected);
   assert.ok(result.counts.matched<=result.counts.board);
   assert.ok(result.counts.matched<=result.counts.bom);
   assert.ok(result.counts.matched<=result.counts.visual);
   assert.deepEqual(run(p,lookup),result,'audit must be deterministic');
  });
 }
}
