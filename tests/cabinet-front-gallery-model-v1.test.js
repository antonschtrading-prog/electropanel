'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epCabinetFrontGalleryModelV1:model}=require('../cabinet-front-gallery-model-v1.js');
const rows=Array.from({length:37},(_,i)=>({boardSku:'SKU-'+String(i).padStart(2,'0')}));
const lookup=sku=>({sku,maker:Number(sku.slice(-2))%2?'ABB':'Schneider Electric',
 series:Number(sku.slice(-2))%2?'S200':'Acti9',kind:'MCB',modules:1});
test('gallery model returns unique, deterministically sorted catalogue identities',()=>{
 const r=model([...rows,rows[0]],lookup);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.allArticles,37);
 assert.equal(r.total,37);
 assert.equal(r.items.length,12);
 assert.equal(r.hasMore,true);
 assert.equal(r.engineeringApproved,false);
 assert.deepEqual(r.makerOptions,['ABB','Schneider Electric']);
});
test('gallery supports every page, not just the first 48 articles',()=>{
 const many=Array.from({length:73},(_,i)=>({boardSku:'X'+i}));
 const r=model(many,sku=>({maker:'ABB',series:'S',sku}),{page:6,pageSize:12});
 assert.equal(r.items.length,1);
 assert.equal(r.hasMore,false);
 assert.equal(r.total,73);
});
test('manufacturer filter is exact and case-insensitive',()=>{
 const r=model(rows,lookup,{maker:'aBb'});
 assert.equal(r.total,18);
 assert.ok(r.items.every(x=>x.maker==='ABB'));
});
test('search matches article, manufacturer, series and device kind',()=>{
 assert.equal(model(rows,lookup,{search:'SKU-00'}).total,1);
 assert.equal(model(rows,lookup,{search:'actI9'}).total,19);
 assert.equal(model(rows,lookup,{search:'MCB'}).total,37);
 assert.equal(model(rows,lookup,{search:'not-present'}).total,0);
});
test('gallery handles unknown article without silently hiding it',()=>{
 const r=model([{boardSku:'MISSING'}],()=>null);
 assert.equal(r.items[0].status,'CATALOGUE_MISSING');
 assert.equal(r.items[0].device,null);
});
test('gallery safely handles throwing lookup',()=>{
 const r=model([{boardSku:'X'}],()=>{throw Error('offline');});
 assert.equal(r.items[0].status,'CATALOGUE_MISSING');
});
test('gallery rejects unbounded source rows and oversized filters',()=>{
 assert.equal(model(Array.from({length:5001},()=>({boardSku:'X'})),lookup).status,'BLOCKED');
 assert.equal(model(rows,lookup,{search:'x'.repeat(201)}).code,'FRONT_GALLERY_FILTER_INVALID');
 assert.equal(model({},lookup).code,'FRONT_GALLERY_INPUT_INVALID');
});
test('gallery ignores duplicate and malformed SKU values',()=>{
 const r=model([{boardSku:'X'},{boardSku:'X'},{boardSku:''},{boardSku:null}],lookup);
 assert.equal(r.total,1);
});
test('gallery does not mutate input board rows',()=>{
 const source=structuredClone(rows),before=JSON.stringify(source);
 model(source,lookup,{search:'ABB'});
 assert.equal(JSON.stringify(source),before);
});
