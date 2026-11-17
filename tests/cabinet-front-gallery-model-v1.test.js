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

test('gallery aggregates quantity for repeated installed article without repeated catalogue lookups',()=>{
 const calls=new Map();
 const r=model([{boardSku:'A'},{boardSku:'B'},{boardSku:'A'}],sku=>{
  calls.set(sku,(calls.get(sku)||0)+1);
  return {sku,maker:'ABB',series:'S200'};
 });
 assert.equal(r.total,2);
 assert.equal(r.items.find(x=>x.sku==='A').quantity,2);
 assert.equal(r.items.find(x=>x.sku==='B').quantity,1);
 assert.equal(calls.get('A'),1);
});

test('evidence filter separates reviewed images from original illustrations',()=>{
 const subset=rows.slice(0,4);
 const resolve=d=>d.sku==='SKU-00'?{status:'REVIEWED_IMAGE'}:
  d.sku==='SKU-01'?{status:'ASSET_REJECTED'}:{status:'STYLIZED_ONLY'};
 assert.equal(model(subset,lookup,{resolve,evidence:'REVIEWED_IMAGE'}).total,1);
 assert.equal(model(subset,lookup,{resolve,evidence:'ASSET_REJECTED'}).total,1);
 assert.equal(model(subset,lookup,{resolve,evidence:'STYLIZED_ONLY'}).total,2);
 assert.equal(model(subset,lookup,{resolve,evidence:'UNKNOWN'}).status,'BLOCKED');
});
test('missing catalogue article is discoverable through evidence filter',()=>{
 const r=model([{boardSku:'X'}],()=>null,{evidence:'CATALOGUE_MISSING'});
 assert.equal(r.total,1);
 assert.equal(r.items[0].frontStatus,'CATALOGUE_MISSING');
});
test('failed image evidence resolver does not crash gallery',()=>{
 const r=model([{boardSku:'X'}],lookup,{resolve:()=>{throw Error('bad');},
  evidence:'ASSET_REJECTED'});
 assert.equal(r.total,1);
 assert.equal(r.items[0].frontStatus,'ASSET_REJECTED');
});
