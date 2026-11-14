'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {epSingleLineDraftV1}=require('../single-line-draft-v1.js');
const article={maker:'Maker',series:'R',label:'RCD 40A',kind:'RCD',modules:2,poles:2,inA:40,icnKa:6};
const project={lines:[],sharedDevices:[{id:'G1',label:'Group 1',catalogSku:'RCD-A',modules:2,templateId:'RCD_2P',circuitIds:[]}]};
const review=(p=project,a=article)=>epSingleLineDraftV1(p,()=>a);
test('shared RCD is linked to its manufacturer series and nominal rating in schematic',()=>{
 const r=review();const node=r.nodes.find(x=>x.id==='RCD:G1');
 assert.equal(node.article.maker,'Maker');assert.equal(node.article.series,'R');
 assert.equal(node.article.inA,40);assert.equal(node.article.poles,2);
 assert.equal(r.issues.some(x=>x.code==='SINGLE_LINE_SHARED_ARTICLE_UNKNOWN'),false);
});
test('shared RCD missing catalogue SKU is explicit unknown',()=>{
 const p=structuredClone(project);delete p.sharedDevices[0].catalogSku;
 assert.ok(review(p).issues.some(x=>x.code==='SINGLE_LINE_SHARED_ARTICLE_MISSING'));
});
test('shared RCD unresolved catalogue SKU blocks schematic',()=>{
 const r=review(project,null);assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='SINGLE_LINE_SHARED_ARTICLE_UNKNOWN'));
});
test('shared RCD wrong width blocks schematic',()=>{
 const r=review(project,{...article,modules:3});
 assert.ok(r.issues.some(x=>x.code==='SINGLE_LINE_SHARED_WIDTH_MISMATCH'));
});
test('shared RCD wrong type blocks schematic',()=>{
 const r=review(project,{...article,kind:'MCB'});
 assert.ok(r.issues.some(x=>x.code==='SINGLE_LINE_SHARED_KIND_MISMATCH'));
});
test('shared RCD wrong pole count blocks schematic',()=>{
 const r=review(project,{...article,poles:4});
 assert.ok(r.issues.some(x=>x.code==='SINGLE_LINE_SHARED_POLE_MISMATCH'));
});
test('shared RCD catalogue lookup exception blocks schematic',()=>{
 const r=epSingleLineDraftV1(project,()=>{throw Error('catalogue unavailable');});
 assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.code==='SINGLE_LINE_SHARED_LOOKUP_FAILED'));
});
