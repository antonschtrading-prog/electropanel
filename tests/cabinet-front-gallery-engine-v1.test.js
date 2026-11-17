'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epCabinetFrontGalleryV1:gallery}=require('../cabinet-front-gallery-v1.js');
const device=sku=>({maker:sku==='B'?'ABB':'Hager',series:sku==='B'?'S200':'MBS',
 sku,kind:'MCB',modules:sku==='B'?2:1,widthMm:sku==='B'?36:18});
const audit={rows:[{deviceId:'B1',boardSku:'A'},{deviceId:'B2',boardSku:'B'},
 {deviceId:'B3',boardSku:'A'},{deviceId:'B4',boardSku:'B'}]};
test('gallery counts apparatus and groups articles by manufacturer and series',()=>{
 const r=gallery(audit,device,()=>({status:'STYLIZED_ONLY'}));
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.deepEqual(r.totals,{articles:2,apparatus:4,reviewedImages:0,vectorSketches:2,
  rejectedImages:0,missingArticles:0,unknownGeometry:0});
 assert.deepEqual(r.rows.find(x=>x.sku==='A').deviceIds,['B1','B3']);
 assert.equal(r.rows.find(x=>x.sku==='B').count,2);
 assert.equal(r.groups.length,2);
 assert.equal(r.engineeringApproved,false);
});
test('gallery only queries each catalogue article once',()=>{
 const calls=new Map();
 gallery(audit,sku=>{calls.set(sku,(calls.get(sku)||0)+1);return device(sku);},
  ()=>({status:'STYLIZED_ONLY'}));
 assert.equal(calls.get('A'),1);assert.equal(calls.get('B'),1);
});
test('gallery reports reviewed images without asserting factory fit',()=>{
 const r=gallery(audit,device,()=>({status:'REVIEWED_IMAGE',
  image:{src:'assets/device-fronts/approved.webp'}}));
 assert.equal(r.totals.reviewedImages,2);
 assert.equal(r.rows[0].imageSrc,'assets/device-fronts/approved.webp');
 assert.equal(r.manufacturerCabinetFitVerified,false);
});
test('gallery blocks missing catalogue entries and records absent identity',()=>{
 const r=gallery(audit,sku=>sku==='A'?null:device(sku),()=>({status:'STYLIZED_ONLY'}));
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.totals.missingArticles,1);
 assert.ok(r.rows.find(x=>x.sku==='A').issues.includes('FRONT_GALLERY_CATALOGUE_MISSING'));
});
test('gallery marks body wider than DIN slot as blocking',()=>{
 const r=gallery(audit,sku=>({...device(sku),widthMm:50}),
  ()=>({status:'STYLIZED_ONLY'}));
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.rows.every(x=>x.geometryStatus==='EXCEEDS_DIN_SLOT'));
});
test('gallery reports unknown dimensions without inventing measurements',()=>{
 const r=gallery(audit,sku=>({...device(sku),widthMm:null}),
  ()=>({status:'STYLIZED_ONLY'}));
 assert.equal(r.totals.unknownGeometry,2);
 assert.ok(r.rows.every(x=>x.widthMm===null&&x.geometryStatus==='UNKNOWN'));
});
test('gallery reports rejected manufacturer images separately from missing images',()=>{
 const r=gallery(audit,device,()=>({status:'ASSET_REJECTED',issues:['RIGHTS_MISSING']}));
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.totals.rejectedImages,2);
 assert.deepEqual(r.rows[0].issues,['RIGHTS_MISSING']);
});
test('gallery handles source lookup and image resolver exceptions without crashing',()=>{
 const r=gallery(audit,sku=>{if(sku==='A')throw Error('offline');return device(sku);},
  ()=>{throw Error('bad image');});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.totals.missingArticles,1);
 assert.equal(r.totals.rejectedImages,1);
});
test('gallery rejects malformed input and never mutates source',()=>{
 assert.equal(gallery(null,device,()=>({})).code,'FRONT_GALLERY_INPUT_INVALID');
 const before=JSON.stringify(audit);
 const r=gallery(audit,device,()=>({status:'STYLIZED_ONLY'}));
 assert.equal(JSON.stringify(audit),before);
 assert.deepEqual(r,gallery(audit,device,()=>({status:'STYLIZED_ONLY'})));
});
test('gallery ignores empty article keys and sorts deterministic by maker/series/SKU',()=>{
 const r=gallery({rows:[...audit.rows,{deviceId:'B5',boardSku:' '}]},
  device,()=>({status:'STYLIZED_ONLY'}));
 assert.equal(r.totals.articles,2);
 assert.deepEqual(r.rows.map(x=>x.sku),['B','A']);
});

test('gallery emits precise DIN-width conflict code per affected article',()=>{
 const r=gallery(audit,sku=>({...device(sku),widthMm:100}),
  ()=>({status:'STYLIZED_ONLY'}));
 assert.ok(r.rows.every(x=>x.issues.includes('FRONT_GALLERY_BODY_EXCEEDS_DIN_SLOT')));
 assert.equal(r.status,'BLOCKED');
});
test('gallery emits missing dimension evidence without guessing a manufacturer body',()=>{
 const r=gallery(audit,sku=>({...device(sku),modules:null}),
  ()=>({status:'STYLIZED_ONLY'}));
 assert.ok(r.rows.every(x=>x.issues.includes('FRONT_GALLERY_GEOMETRY_UNKNOWN')));
 assert.ok(r.rows.every(x=>x.nominalSlotWidthMm===null));
});
test('gallery blocks articles without a declared manufacturer or series',()=>{
 for(const missing of ['maker','series']){
  const r=gallery(audit,sku=>({...device(sku),[missing]:''}),
   ()=>({status:'STYLIZED_ONLY'}));
  assert.equal(r.status,'BLOCKED');
  assert.ok(r.rows.every(x=>x.issues.includes('FRONT_GALLERY_IDENTITY_INCOMPLETE')));
 }
});
