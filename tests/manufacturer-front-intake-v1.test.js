'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {inspectRaster,auditManufacturerFrontAssets}=require('../manufacturer-front-intake-v1');
const visual=require('../manufacturer-visual-library-v1');
const d={maker:'ABB',series:'S200',sku:'A1',kind:'MCB',poles:1,modules:1,widthMm:17.5};
const a={...d,src:'assets/device-fronts/abb-a1.png',assetType:'FRONT_PHOTO',rightsStatus:'PERMISSION_RECORDED',
 rightsEvidenceUrl:'https://example.org/rights',productEvidenceUrl:'https://example.org/product',reviewedAt:'2026-11-16'};
const png=()=>{const b=Buffer.alloc(33);Buffer.from('89504e470d0a1a0a','hex').copy(b);b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(1,16);b.writeUInt32BE(1,20);return b;};
const fixture=t=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'ep-intake-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const file=path.join(root,'assets/device-fronts/abb-a1.png');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,png());return {root,file};};
test('valid PNG passes signature and dimension checks',t=>{const {file}=fixture(t);assert.equal(inspectRaster(file).ok,true);});
test('unavailable file is rejected',()=>assert.deepEqual(inspectRaster('/no/such/front.png').issues,['FILE_MISSING']));
test('empty raster is rejected',t=>{const {file}=fixture(t);fs.writeFileSync(file,'');assert.ok(inspectRaster(file).issues.includes('FILE_EMPTY'));});
test('oversized raster is rejected without reading payload',t=>{const {file}=fixture(t);fs.truncateSync(file,12*1024*1024+1);assert.ok(inspectRaster(file).issues.includes('FILE_TOO_LARGE'));});
test('symlink is rejected',t=>{const {root,file}=fixture(t);const link=path.join(root,'link.png');fs.symlinkSync(file,link);assert.ok(inspectRaster(link).issues.includes('NOT_REGULAR_FILE'));});
test('directories are rejected',t=>{const {root}=fixture(t);assert.ok(inspectRaster(root,'png').issues.includes('NOT_REGULAR_FILE'));});
test('unrecognized extension is rejected',t=>{const {file}=fixture(t);assert.ok(inspectRaster(file,'svg').issues.includes('EXTENSION_UNSUPPORTED'));});
test('PNG zero dimensions are rejected',t=>{const {file}=fixture(t),b=png();b.writeUInt32BE(0,16);fs.writeFileSync(file,b);assert.ok(inspectRaster(file).issues.includes('RASTER_DIMENSIONS_INVALID'));});
test('PNG extreme dimensions are rejected',t=>{const {file}=fixture(t),b=png();b.writeUInt32BE(12001,20);fs.writeFileSync(file,b);assert.ok(inspectRaster(file).issues.includes('RASTER_DIMENSIONS_INVALID'));});
test('PNG content mislabeled JPEG is rejected',t=>{const {file}=fixture(t);assert.ok(inspectRaster(file,'jpg').issues.includes('RASTER_SIGNATURE_MISMATCH'));});
test('full catalogue and asset intake accepts licensed exact article fixture',t=>{
 const {root}=fixture(t);const r=auditManufacturerFrontAssets(root,{'ABB-A1':d},{'abb|a1':a},visual.epManufacturerFrontResolveV1,visual.epManufacturerFrontKeyV1);
 assert.equal(r.ok,true);assert.deepEqual(r.files,[a.src]);
});
test('intake rejects absent catalogue match',t=>{const {root}=fixture(t);assert.equal(auditManufacturerFrontAssets(root,{}, {'abb|a1':a},visual.epManufacturerFrontResolveV1,visual.epManufacturerFrontKeyV1).ok,false);});
test('intake rejects ambiguous catalogue match',t=>{const {root}=fixture(t);assert.equal(auditManufacturerFrontAssets(root,{one:d,two:d},{'abb|a1':a},visual.epManufacturerFrontResolveV1,visual.epManufacturerFrontKeyV1).ok,false);});
test('intake rejects invalid registry',t=>{const {root}=fixture(t);assert.equal(auditManufacturerFrontAssets(root,{one:d},[],visual.epManufacturerFrontResolveV1,visual.epManufacturerFrontKeyV1).ok,false);});
test('intake rejects missing local raster',t=>{const {root,file}=fixture(t);fs.unlinkSync(file);assert.equal(auditManufacturerFrontAssets(root,{one:d},{'abb|a1':a},visual.epManufacturerFrontResolveV1,visual.epManufacturerFrontKeyV1).ok,false);});
test('intake rejects missing license evidence',t=>{const {root}=fixture(t);assert.equal(auditManufacturerFrontAssets(root,{one:d},{'abb|a1':{...a,rightsStatus:'UNKNOWN'}},visual.epManufacturerFrontResolveV1,visual.epManufacturerFrontKeyV1).ok,false);});
const wrong=[
 ['maker',{maker:'Other'}],['series',{series:'Other'}],['sku',{sku:'Other'}],
 ['kind',{kind:'RCD'}],['poles',{poles:2}],['modules',{modules:2}],
 ['width',{widthMm:22}],['source',{productEvidenceUrl:'http://example.org'}],
 ['rights',{rightsEvidenceUrl:'http://example.org'}],['review',{reviewedAt:'2999-01-01'}],
 ['path',{src:'../evil.png'}],['assetType',{assetType:'SVG'}],['status',{rightsStatus:'UNKNOWN'}],
 ['missing-maker',{maker:''}],['missing-series',{series:''}],['missing-sku',{sku:''}],
 ['missing-kind',{kind:''}],['negative-width',{widthMm:-1}],['fractional-modules',{modules:1.5}],
 ['zero-poles',{poles:0}],['date-invalid',{reviewedAt:'2026-02-30'}],
 ['credentials',{productEvidenceUrl:'https://user:pass@example.org'}],
 ['remote-image',{src:'https://example.org/x.png'}],['executable-image',{src:'assets/device-fronts/x.svg'}],
 ['path-traversal',{src:'assets/device-fronts/../x.png'}],['image-query',{src:'assets/device-fronts/a.png?q=1'}],
 ['bad-rights',{rightsStatus:'GRANTED'}],['missing-product',{productEvidenceUrl:''}],
 ['missing-review',{reviewedAt:''}],['wrong-license',{rightsEvidenceUrl:''}],
 ['wrong-photo-kind',{assetType:'UNKNOWN'}],['missing-poles',{poles:null}],
 ['missing-modules',{modules:null}],['missing-width',{widthMm:null}],
 ['source-credentials',{rightsEvidenceUrl:'https://a:b@example.org'}],
 ['source-control',{productEvidenceUrl:'https://example.org/\n'}],
 ['rights-control',{rightsEvidenceUrl:'https://example.org/\n'}],
 ['malformed-date',{reviewedAt:'2026/11/16'}],['non-string-date',{reviewedAt:20261116}],
 ['non-string-src',{src:42}],['non-string-sku',{sku:42}],
 ['non-string-series',{series:42}],['non-string-maker',{maker:42}],
 ['non-string-kind',{kind:42}],['array-entry',{assetType:[]}],
 ['too-long-path',{src:'assets/device-fronts/'+('a'.repeat(120))+'.png'}],
 ['bad-extension',{src:'assets/device-fronts/x.gif'}],['capital-path',{src:'assets/device-fronts/X.PNG?y'}],
 ['empty-path',{src:''}],['missing-image',{src:null}],
];
for(const [label,mutation] of wrong)test('exact image intake rejects '+label,t=>{
 const {root}=fixture(t),r=auditManufacturerFrontAssets(root,{one:d},{'abb|a1':{...a,...mutation}},visual.epManufacturerFrontResolveV1,visual.epManufacturerFrontKeyV1);
 assert.equal(r.ok,false,label);
});

test('JPEG with complete start and end markers passes',t=>{
 const {root}=fixture(t),file=path.join(root,'front.jpg');
 fs.writeFileSync(file,Buffer.from([255,216,255,224,0,0,255,217]));
 assert.equal(inspectRaster(file).ok,true);
});
test('JPEG without end marker is rejected',t=>{
 const {root}=fixture(t),file=path.join(root,'front.jpg');
 fs.writeFileSync(file,Buffer.from([255,216,255,224,0,0,0,0]));
 assert.ok(inspectRaster(file).issues.includes('RASTER_SIGNATURE_MISMATCH'));
});
test('WebP with RIFF length and VP8 marker passes',t=>{
 const {root}=fixture(t),file=path.join(root,'front.webp');
 const b=Buffer.alloc(20);b.write('RIFF',0);b.writeUInt32LE(12,4);b.write('WEBP',8);b.write('VP8 ',12);
 fs.writeFileSync(file,b);assert.equal(inspectRaster(file).ok,true);
});
test('WebP with incorrect RIFF length is rejected',t=>{
 const {root}=fixture(t),file=path.join(root,'front.webp');
 const b=Buffer.alloc(20);b.write('RIFF',0);b.writeUInt32LE(100,4);b.write('WEBP',8);b.write('VP8 ',12);
 fs.writeFileSync(file,b);assert.ok(inspectRaster(file).issues.includes('RASTER_SIGNATURE_MISMATCH'));
});
test('WebP with unsupported chunk marker is rejected',t=>{
 const {root}=fixture(t),file=path.join(root,'front.webp');
 const b=Buffer.alloc(20);b.write('RIFF',0);b.writeUInt32LE(12,4);b.write('WEBP',8);b.write('XXXX',12);
 fs.writeFileSync(file,b);assert.ok(inspectRaster(file).issues.includes('RASTER_SIGNATURE_MISMATCH'));
});
test('intake reports image reuse across distinct exact articles',t=>{
 const {root}=fixture(t);
 const other={...d,sku:'A2'};
 const second={...a,sku:'A2'};
 const r=auditManufacturerFrontAssets(root,{one:d,two:other},{'abb|a1':a,'abb|a2':second},
  visual.epManufacturerFrontResolveV1,visual.epManufacturerFrontKeyV1);
 assert.equal(r.ok,false);assert.ok(r.issues.some(x=>x.startsWith('IMAGE_REUSED:')));
});
test('intake rejects raster content that does not match extension',t=>{
 const {root,file}=fixture(t);fs.writeFileSync(file,Buffer.from('<script>bad</script>'));
 const r=auditManufacturerFrontAssets(root,{one:d},{'abb|a1':a},
  visual.epManufacturerFrontResolveV1,visual.epManufacturerFrontKeyV1);
 assert.equal(r.ok,false);assert.ok(r.issues.some(x=>x.startsWith('RASTER_SIGNATURE_MISMATCH:')));
});
test('empty registry leaves original stylized catalogue operational',t=>{
 const {root}=fixture(t);
 const r=auditManufacturerFrontAssets(root,{one:d},{},visual.epManufacturerFrontResolveV1,visual.epManufacturerFrontKeyV1);
 assert.equal(r.ok,true);assert.deepEqual(r.files,[]);
});
