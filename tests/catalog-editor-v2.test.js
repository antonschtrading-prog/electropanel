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
