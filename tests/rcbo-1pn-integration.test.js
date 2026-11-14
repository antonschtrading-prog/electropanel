'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epProjectCatalogV1:catalogue,epUpsertProjectArticleV2:upsert}=require('../project-catalog-workbench-v1.js');
const {epProtectiveDeviceShortlistV1:shortlist}=require('../protective-device-shortlist-v1.js');
global.epProtectiveDeviceShortlistV1=shortlist;
const {epProtectionWorkbenchV1:workbench}=require('../protection-workbench-v1.js');
const {epCircuitDesignReviewV1:designReview}=require('../circuit-design-review-v1.js');
const {epSingleLineDraftV1:singleLine}=require('../single-line-draft-v1.js');
const {epDraftBomV1:bom}=require('../draft-bom-v1.js');
const {epDraftBoardPlanV1:board}=require('../draft-board-plan-v1.js');
function article(kind='RCBO',poles=2){
 return {id:'RCBO-1PN',sku:'R16-2P',maker:'Declared maker',series:'1P+N sample',
  kind,label:'RCBO 16A',modules:poles===1?1:poles,widthMm:(poles===1?1:poles)*18,
  poles,inA:16,icnKa:6,residualCurrentMa:kind==='RCBO'?30:undefined,
  residualType:kind==='RCBO'?'A':undefined,
  source:'https://example.org/manufacturer-datasheet'};
}
function project(phase='L1',a=article()){
 return {railCount:1,railCapacity:12,
  lines:[{id:'L1',name:'Sockets',phase,device:a.label,modules:a.modules,catalogSku:a.id,
   overloadInput:{ibA:10,izA:25},faultInput:{ikKa:5}}],
  branchDevices:[{id:'BD1',circuitId:'L1',label:a.label,modules:a.modules}],
  sharedDevices:[],catalogArticles:[a]};
}
test('declared RCBO 1P+N two-pole catalogue selection reconciles all draft representations',()=>{
 const a=article(),p=project('L1',a),c=catalogue(p),lookup=c.lookup;
 assert.equal(c.issues.length,0);
 const potentials=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates;
 assert.equal(potentials[0].status,'POTENTIAL');
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 assert.equal(work.reasons.includes('ARTICLE_POLES_MISMATCH'),false);
 assert.equal(work.reasons.includes('POLES_INCOMPATIBLE'),false);
 assert.equal(work.status,'UNKNOWN');
 const review=designReview(p,lookup).rows[0];
 assert.equal(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'),false);
 const graph=singleLine(p,lookup);
 assert.equal(graph.nodes.find(x=>x.id==='CIRCUIT:L1').article.poles,2);
 assert.equal(board(p,lookup).placements.find(x=>x.deviceId==='BD1').modules,2);
 assert.equal(bom(p,lookup).items.find(x=>x.key===a.id).modules,2);
 assert.equal(graph.engineeringApproved,false);
});
test("single phase L1 allows 1P+N RCBO",()=>{
 const a=article("RCBO",2),p=project("L1",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.equal(shortlistRow.status,'POTENTIAL',JSON.stringify(shortlistRow));
 assert.equal(work.reasons.includes('ARTICLE_POLES_MISMATCH'),false);
 assert.equal(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'),false);
});
test("single phase L2 allows 1P+N RCBO",()=>{
 const a=article("RCBO",2),p=project("L2",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.equal(shortlistRow.status,'POTENTIAL',JSON.stringify(shortlistRow));
 assert.equal(work.reasons.includes('ARTICLE_POLES_MISMATCH'),false);
 assert.equal(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'),false);
});
test("single phase L3 allows 1P+N RCBO",()=>{
 const a=article("RCBO",2),p=project("L3",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.equal(shortlistRow.status,'POTENTIAL',JSON.stringify(shortlistRow));
 assert.equal(work.reasons.includes('ARTICLE_POLES_MISMATCH'),false);
 assert.equal(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'),false);
});
test("single phase L1 allows single-pole RCBO",()=>{
 const a=article("RCBO",1),p=project("L1",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.equal(shortlistRow.status,'POTENTIAL',JSON.stringify(shortlistRow));
 assert.equal(work.reasons.includes('ARTICLE_POLES_MISMATCH'),false);
 assert.equal(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'),false);
});
test("single phase rejects three-pole RCBO",()=>{
 const a=article("RCBO",3),p=project("L1",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.ok(shortlistRow.reasons.includes('POLES_INCOMPATIBLE'));
 assert.ok(work.reasons.includes('ARTICLE_POLES_MISMATCH'));
 assert.ok(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'));
});
test("single phase rejects four-pole RCBO",()=>{
 const a=article("RCBO",4),p=project("L2",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.ok(shortlistRow.reasons.includes('POLES_INCOMPATIBLE'));
 assert.ok(work.reasons.includes('ARTICLE_POLES_MISMATCH'));
 assert.ok(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'));
});
test("single phase rejects two-pole MCB",()=>{
 const a=article("MCB",2),p=project("L1",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.ok(shortlistRow.reasons.includes('POLES_INCOMPATIBLE'));
 assert.ok(work.reasons.includes('ARTICLE_POLES_MISMATCH'));
 assert.ok(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'));
});
test("single phase accepts one-pole MCB",()=>{
 const a=article("MCB",1),p=project("L1",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.equal(shortlistRow.status,'POTENTIAL',JSON.stringify(shortlistRow));
 assert.equal(work.reasons.includes('ARTICLE_POLES_MISMATCH'),false);
 assert.equal(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'),false);
});
test("three-phase accepts three-pole RCBO",()=>{
 const a=article("RCBO",3),p=project("3Ф",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.equal(shortlistRow.status,'POTENTIAL',JSON.stringify(shortlistRow));
 assert.equal(work.reasons.includes('ARTICLE_POLES_MISMATCH'),false);
 assert.equal(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'),false);
});
test("three-phase accepts four-pole RCBO",()=>{
 const a=article("RCBO",4),p=project("3Ф",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.equal(shortlistRow.status,'POTENTIAL',JSON.stringify(shortlistRow));
 assert.equal(work.reasons.includes('ARTICLE_POLES_MISMATCH'),false);
 assert.equal(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'),false);
});
test("three-phase rejects two-pole RCBO",()=>{
 const a=article("RCBO",2),p=project("3Ф",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.ok(shortlistRow.reasons.includes('POLES_INCOMPATIBLE'));
 assert.ok(work.reasons.includes('ARTICLE_POLES_MISMATCH'));
 assert.ok(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'));
});
test("three-phase accepts three-pole MCB",()=>{
 const a=article("MCB",3),p=project("3Ф",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.equal(shortlistRow.status,'POTENTIAL',JSON.stringify(shortlistRow));
 assert.equal(work.reasons.includes('ARTICLE_POLES_MISMATCH'),false);
 assert.equal(review.reasons.some(x=>x.code==='CATALOG_PHASE_POLES_MISMATCH'),false);
});
test("unspecified phase cannot create potential protection",()=>{
 const a=article("RCBO",2),p=project("?",a),c=catalogue(p),lookup=c.lookup;
 const shortlistRow=shortlist(p.lines[0],[{id:a.id,device:lookup(a.id)}]).candidates[0];
 const work=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).selected;
 const review=designReview(p,lookup).rows[0];
 assert.equal(shortlistRow.status,'REJECTED');
 assert.ok(shortlistRow.reasons.includes('PHASE_UNDECLARED'));
});

test('used RCBO article is allowed to grow from one pole to two after a catalogue edit',()=>{
 const a=article('RCBO',1),p=project('L1',a);
 const updated={...a,poles:2,modules:2,widthMm:36};
 const result=upsert(p,updated,{},a.id);
 assert.ok(result.project,JSON.stringify(result));
 assert.equal(result.project.lines[0].modules,2);
 assert.equal(result.project.branchDevices[0].modules,2);
 assert.equal(result.project.lines[0].calculationReview.required,true);
 assert.equal(p.lines[0].modules,1);
});
test('same two-pole change is blocked for an MCB without touching original',()=>{
 const a=article('MCB',1),p=project('L1',a),before=JSON.stringify(p);
 const updated={...a,poles:2,modules:2,widthMm:36};
 const result=upsert(p,updated,{},a.id);
 assert.equal(result.project,null);
 assert.equal(result.code,'USED_ARTICLE_POLE_CONFLICT');
 assert.equal(JSON.stringify(p),before);
});
test('RCBO article three poles remains blocked for single-phase circuit',()=>{
 const a=article('RCBO',1),p=project('L1',a);
 const r=upsert(p,{...a,poles:3,modules:3,widthMm:54},{},a.id);
 assert.equal(r.project,null);
 assert.equal(r.code,'USED_ARTICLE_POLE_CONFLICT');
});
test('two-pole RCBO remains a draft requiring residual protection verification',()=>{
 const a=article(),p=project('L1',a),c=catalogue(p);
 const row=workbench(p,c.lookup,[{id:a.id,device:c.lookup(a.id)}]).selected;
 assert.ok(row.reasons.includes('RCBO_RESIDUAL_PROTECTION_UNVERIFIED'));
 assert.equal(row.engineeringApproved,false);
});
