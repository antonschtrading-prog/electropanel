'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epProjectCatalogV1,epUpsertProjectArticleV2:save,epDeleteProjectArticleV2:del}=require('../project-catalog-workbench-v1');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1').epDraftBoardPlanV1;
const a=()=>({id:'USER',sku:'U16',maker:'Manufacturer',series:'Series',kind:'MCB',label:'C16',modules:1,widthMm:18,poles:1,inA:16,icnKa:6,curve:'C',source:'https://example.org/passport'});
const p=()=>({railCount:1,railCapacity:12,lines:[{id:'L1',phase:'L1',catalogSku:'USER',modules:1,device:'C16',overloadInput:{ibA:10}}],branchDevices:[{id:'Q1',circuitId:'L1',modules:1,label:'C16'}],catalogArticles:[a()]});
test('create, edit and delete unused catalogue entries without altering seeds',()=>{
 const seed={S:{...a(),id:'S',sku:'seed'}},project={lines:[]};const created=save(project,a(),seed);assert.ok(created.project);assert.equal(project.catalogArticles,undefined);
 const edited=save(created.project,{...a(),inA:20},seed,'USER');assert.equal(edited.project.catalogArticles[0].inA,20);assert.equal(seed.S.inA,16);
 assert.deepEqual(del(edited.project,'USER').project.catalogArticles,[]);
});
test('used article deletion and pole-incompatible replacement are blocked',()=>{
 assert.equal(del(p(),'USER').code,'ARTICLE_IN_USE');assert.equal(save(p(),{...a(),poles:3},{},'USER').code,'USED_ARTICLE_POLE_CONFLICT');
});
test('replacement updates linked geometry and labels atomically, preserving current inputs',()=>{
 const project=p(),before=JSON.stringify(project),r=save(project,{...a(),label:'Updated',modules:2,widthMm:36},{},'USER');
 assert.ok(r.project);assert.equal(r.project.lines[0].modules,2);assert.equal(r.project.branchDevices[0].modules,2);assert.equal(r.project.lines[0].device,'Updated');assert.equal(r.project.lines[0].overloadInput.ibA,10);assert.equal(r.project.lines[0].calculationReview.required,true);assert.equal(JSON.stringify(project),before);
});
test('replacement rejects overlap with fixed neighbour without partial updates',()=>{
 const project=p();project.lines.push({id:'L2',phase:'L1',modules:1});project.branchDevices.push({id:'Q2',circuitId:'L2',modules:1});project.manualLayoutV1=[{deviceId:'Q1',railIndex:0,startModule:0},{deviceId:'Q2',railIndex:0,startModule:1}];
 const before=JSON.stringify(project);const r=save(project,{...a(),modules:2,widthMm:36},{},'USER');assert.equal(r.project,null);assert.equal(r.code,'MANUAL_LAYOUT_OVERLAP');assert.equal(JSON.stringify(project),before);
});
test('reserved IDs, seed collisions, bad sources and impossible envelopes reject',()=>{
 for(const id of ['__proto__','constructor','prototype'])assert.equal(save({lines:[]},{...a(),id}).project,null);
 assert.equal(save({lines:[]},a(),{USER:a()}).project,null);
 assert.equal(save({lines:[]},{...a(),source:'javascript:alert(1)'}).project,null);
 assert.equal(save({lines:[]},{...a(),widthMm:100}).code,'ARTICLE_WIDTH_EXCEEDS_MODULES');
 assert.equal(save(p(),{...a(),id:'new'},{},'USER').code,'ARTICLE_ID_IMMUTABLE');
});
test('custom record cannot self-assert verified catalogue status',()=>{
 const project=save({lines:[]},{...a(),verificationStatus:'VERIFIED'}).project;
 assert.equal(epProjectCatalogV1(project).lookup('USER').verificationStatus,'UNVERIFIED');
});

const {epCatalogDinBridgeV1:bridge}=require('../catalog-din-bridge-v1');
const {epCatalogEvidenceAuditV1:sourceAudit}=require('../catalog-evidence-audit-v1');
test('editable article body dimensions survive catalogue, DIN and provenance projections',()=>{
 const original=p(),before=JSON.stringify(original);
 const r=save(original,{...a(),heightMm:85,depthMm:78.5},{},'USER');
 assert.ok(r.project);assert.equal(JSON.stringify(original),before);
 const stored=r.project.catalogArticles[0],resolved=epProjectCatalogV1(r.project).lookup('USER');
 assert.equal(stored.heightMm,85);assert.equal(stored.depthMm,78.5);
 assert.equal(resolved.heightMm,85);assert.equal(resolved.depthMm,78.5);
 const din=bridge(resolved);
 assert.deepEqual(din.record.geometry,{widthMm:18,heightMm:85,depthMm:78.5});
 const evidence=sourceAudit(r.project,()=>resolved);
 assert.equal(evidence.items[0].heightMm,85);assert.equal(evidence.items[0].depthMm,78.5);
 assert.equal(evidence.issues.some(x=>x.code==='CATALOG_BODY_DIMENSIONS_UNDECLARED'),false);
 assert.equal(evidence.engineeringApproved,false);
});
test('partial body geometry remains unknown, not an inferred physical envelope',()=>{
 const r=save({lines:[]},{...a(),heightMm:85});
 assert.ok(r.project);
 const resolved=epProjectCatalogV1(r.project).lookup('USER');
 assert.equal(resolved.heightMm,85);assert.equal(resolved.depthMm,null);
 const evidence=sourceAudit({lines:[{id:'L1',catalogSku:'USER'}]},()=>resolved);
 assert.ok(evidence.issues.some(x=>x.code==='CATALOG_BODY_DIMENSIONS_UNDECLARED'));
});
test('invalid body dimensions fail closed without mutating catalogue or board',()=>{
 for(const [name,value] of [['heightMm',0],['heightMm',-1],['heightMm',2001],
  ['heightMm',Infinity],['heightMm','85'],['depthMm',-1],['depthMm',2001],['depthMm','78.5']]){
  const source=p(),before=JSON.stringify(source),result=save(source,{...a(),[name]:value},{},'USER');
  assert.equal(result.project,null,name+'='+String(value));
  assert.equal(result.code,'CATALOG_BODY_DIMENSIONS_INVALID');
  assert.equal(JSON.stringify(source),before);
 }
});
test('malformed project branch and shared collections cannot mutate catalogue',()=>{
 for(const defect of [{branchDevices:{bad:true}},{branchDevices:[null]},{sharedDevices:{bad:true}},
  {sharedDevices:[null]},{lines:[null]},{catalogArticles:[null]}]){
  const source={...p(),...defect},before=JSON.stringify(source);
  assert.equal(save(source,{...a(),heightMm:85},{},'USER').code,'PROJECT_COLLECTION_INVALID');
  assert.equal(JSON.stringify(source),before);
 }
 for(const source of [null,{}, {lines:[],catalogArticles:[],sharedDevices:[null]}])
  assert.equal(del(source,'USER').project,null);
});
