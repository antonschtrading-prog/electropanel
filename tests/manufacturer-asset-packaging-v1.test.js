'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {buildSite}=require('../scripts/build-site.js');
const libPath=path.resolve(__dirname,'..','manufacturer-visual-library-v1.js');
function fixture(change={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ep-manuf-build-'));
 const device={maker:'ABB',series:'S200',sku:'A1',kind:'MCB',poles:1,modules:1,widthMm:17.5};
 const asset={...device,src:'assets/device-fronts/abb-a1.png',assetType:'FRONT_PHOTO',
  rightsStatus:'PERMISSION_RECORDED',rightsEvidenceUrl:'https://example.org/license',
  productEvidenceUrl:'https://example.org/product',reviewedAt:'2026-11-16',...change};
 const registry={'abb|a1':asset};
 const dest=path.join(root,'dist');
 const writeRegistry=reg=>fs.writeFileSync(path.join(root,'manufacturer-visual-library-v1.js'),
  'module.exports={...require('+JSON.stringify(libPath)+'),EP_MANUFACTURER_FRONT_ASSETS_V1:'+JSON.stringify(reg)+'}');
 fs.writeFileSync(path.join(root,'index.html'),'<script src="catalog.js"></script><script src="manufacturer-visual-library-v1.js"></script>');
 fs.writeFileSync(path.join(root,'styles.css'),'body { color: black; }');
 fs.writeFileSync(path.join(root,'browser_check.html'),'<!doctype html>');
 fs.writeFileSync(path.join(root,'catalog.js'),'module.exports={EP_CATALOG:'+JSON.stringify({one:device})+'}');
 writeRegistry(registry);
 const d=path.join(root,'assets','device-fronts');fs.mkdirSync(d,{recursive:true});
 fs.writeFileSync(path.join(d,'abb-a1.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9JDSwAAAAASUVORK5CYII=','base64'));
 return {root,dest,device,asset,writeRegistry,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
test('licensed exact-article raster is copied into the published site',()=>{
 const f=fixture();
 try{const r=buildSite(f.root,f.dest);assert.ok(r.files.includes(f.asset.src));
  assert.ok(fs.existsSync(path.join(f.dest,f.asset.src)));
  assert.equal(fs.statSync(path.join(f.dest,f.asset.src)).size,fs.statSync(path.join(f.root,f.asset.src)).size);
 }finally{f.cleanup();}
});
test('image omitted on disk blocks publication',()=>{
 const f=fixture();
 try{fs.unlinkSync(path.join(f.root,f.asset.src));assert.throws(()=>buildSite(f.root,f.dest),/Missing\/empty published asset/);}
 finally{f.cleanup();}
});
test('missing permission or date blocks publication',()=>{
 for(const change of [{rightsStatus:'UNKNOWN'},{reviewedAt:'2026-02-30'},{src:'https://example.org/tracker.png'}]){
  const f=fixture(change);
  try{assert.throws(()=>buildSite(f.root,f.dest),/Manufacturer asset rejected/);}
  finally{f.cleanup();}
 }
});
test('an image cannot impersonate a different SKU',()=>{
 const f=fixture({sku:'OTHER'});
 try{assert.throws(()=>buildSite(f.root,f.dest),/Manufacturer asset rejected/);}
 finally{f.cleanup();}
});
test('unlisted factory article is prohibited even with self-declared valid fields',()=>{
 const f=fixture();
 try{f.writeRegistry({'abb|unlisted':{...f.asset,sku:'UNLISTED'}});
  assert.throws(()=>buildSite(f.root,f.dest),/Unlinked manufacturer image article/);
 }finally{f.cleanup();}
});
test('empty image registry works and prevents an orphaned factory image from shipping',()=>{
 const f=fixture();
 try{f.writeRegistry({});const r=buildSite(f.root,f.dest);
  assert.equal(r.files.some(p=>p.startsWith('assets/device-fronts')),false);
  assert.equal(fs.existsSync(path.join(f.dest,f.asset.src)),false);
 }finally{f.cleanup();}
});
test('one image path cannot silently represent two different manufacturer models',()=>{
 const f=fixture();
 try{const other={...f.device,sku:'B2'};fs.writeFileSync(path.join(f.root,'catalog.js'),
  'module.exports={EP_CATALOG:'+JSON.stringify({one:f.device,two:other})+'}');
  f.writeRegistry({'abb|a1':f.asset,'abb|b2':{...f.asset,sku:'B2'}});
  assert.throws(()=>buildSite(f.root,f.dest),/Manufacturer image duplicated/);
 }finally{f.cleanup();}
});
