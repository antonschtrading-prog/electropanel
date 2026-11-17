'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const lib=require('../manufacturer-visual-library-v1');
const d={maker:'ABB',series:'S200',sku:'A1',kind:'MCB',poles:1,modules:1,widthMm:17.5};
const a={...d,src:'assets/device-fronts/abb-a1.webp',assetType:'FRONT_PHOTO',
 rightsStatus:'PERMISSION_RECORDED',rightsEvidenceUrl:'https://example.org/rights',
 productEvidenceUrl:'https://example.org/product',reviewedAt:'2026-11-16'};
const registry=()=>({'abb|a1':{...a}});
test('shipped registry is empty; no fake manufacturer photo',()=>{
 assert.equal(Object.keys(lib.EP_MANUFACTURER_FRONT_ASSETS_V1).length,0);
 assert.equal(lib.epManufacturerFrontResolveV1(d).status,'STYLIZED_ONLY');
});
test('fully matched registered local raster is available but not engineering approved',()=>{
 const r=lib.epManufacturerFrontResolveV1(d,registry());
 assert.equal(r.status,'REVIEWED_IMAGE');assert.equal(r.geometryVerified,false);
 assert.equal(r.manufacturerFaceVerified,false);assert.equal(r.engineeringApproved,false);
});
test('all article identity fields must match',()=>{
 for(const changes of [{maker:'IEK'},{series:'S201'},{kind:'RCD'},{poles:2},{modules:2},{widthMm:18}]){
  assert.notEqual(lib.epManufacturerFrontResolveV1({...d,...changes},registry()).status,'REVIEWED_IMAGE');
 }
});
test('rejects remote, untrusted and executable asset paths',()=>{
 for(const src of ['https://example.org/a.png','../a.jpg','assets/device-fronts/../a.jpg',
  'assets/device-fronts/a.svg','assets/device-fronts/a.webp?x=1','assets/device-fronts/a.jpg" onerror="1']){
  const r=lib.epManufacturerFrontResolveV1(d,{'abb|a1':{...a,src}});
  assert.ok(r.issues.includes('FRONT_ASSET_PATH_INVALID'));
 }
});
test('rejects missing license, source and article review',()=>{
 for(const change of [{rightsStatus:'UNKNOWN'},{rightsEvidenceUrl:'http://example.org'},
  {productEvidenceUrl:'https://secret:pass@example.org'},{reviewedAt:null}]){
  assert.equal(lib.epManufacturerFrontResolveV1(d,{'abb|a1':{...a,...change}}).status,'ASSET_REJECTED');
 }
});
test('safe img only for reviewed local asset',()=>{
 assert.doesNotMatch(lib.epManufacturerVisualHtmlV1(d),/<img/);
 const h=lib.epManufacturerVisualHtmlV1(d,'ID',registry());
 assert.match(h,/class="ep-manufacturer-front-image"/);
 assert.match(h,/src="assets\/device-fronts\/abb-a1.webp"/);
 assert.doesNotMatch(h,/onerror/);
});
test('registry tracks images, placeholders and rejected assets',()=>{
 const bad={...a,sku:'C3',reviewedAt:null};
 const r=lib.epManufacturerFrontLibraryAuditV1([d,{...d,sku:'B2'},{...d,sku:'C3'}],
  {'abb|a1':a,'abb|c3':bad});
 assert.equal(r.reviewedImages,1);assert.equal(r.stylizedOnly,1);assert.equal(r.rejected,1);
});
test('registry and device objects are not mutated',()=>{
 const r=registry(),before=JSON.stringify(r),input=JSON.stringify(d);
 lib.epManufacturerVisualHtmlV1(d,'A',r);
 assert.equal(JSON.stringify(r),before);assert.equal(JSON.stringify(d),input);
});
test('visual library loads ahead of board preview and app',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(s.indexOf('manufacturer-visual-library-v1.js')<s.indexOf('draft-board-preview-v1.js'));
 assert.ok(s.indexOf('manufacturer-visual-library-v1.js')<s.indexOf('app.js'));
});

test('missing manufacturer, series, SKU and kind are never approved as an exact visual',()=>{
 for(const change of [{maker:''},{series:''},{sku:''},{kind:''}]){
  assert.equal(lib.epManufacturerFrontResolveV1({...d,...change},registry()).status,'STYLIZED_ONLY');
 }
});
test('invalid calendar dates cannot be used as manufacturer review evidence',()=>{
 const r=lib.epManufacturerFrontResolveV1(d,{'abb|a1':{...a,reviewedAt:'2026-02-30'}});
 assert.equal(r.status,'ASSET_REJECTED');
});

test('future-dated review cannot establish manufacturer visual provenance',()=>{
 const future='2999-01-01';
 const r=lib.epManufacturerFrontResolveV1(d,{'abb|a1':{...a,reviewedAt:future}});
 assert.equal(r.status,'ASSET_REJECTED');
 assert.ok(r.issues.includes('FRONT_SOURCE_NOT_REVIEWED'));
 assert.equal(r.engineeringApproved,false);
});
