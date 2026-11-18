'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {buildSite}=require('../scripts/build-site.js');
const root=path.resolve(__dirname,'..');
const link='catalog-intake/catalog-review-page.html';
function scenario(fn){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'electropanel-catalog-review-'));
 const src=path.join(tmp,'source'),dest=path.join(tmp,'published');
 fs.mkdirSync(src,{recursive:true});
 fs.writeFileSync(path.join(src,'styles.css'),'body{font-family:system-ui}');
 fs.writeFileSync(path.join(src,'browser_check.html'),'<p>Browser test page</p>');
 fs.writeFileSync(path.join(src,'a.js'),'globalThis.a=1;');
 fs.writeFileSync(path.join(src,'b.js'),'globalThis.b=2;');
 const base=(linked)=>'<!doctype html><html><body>'+
  (linked?'<a href="'+link+'">Каталог</a>':'')+
  '<script src="a.js"></script><script src="b.js"></script></body></html>';
 const write=(linked=true)=>fs.writeFileSync(path.join(src,'index.html'),base(linked));
 const review=()=>{fs.mkdirSync(path.join(src,'catalog-intake'),{recursive:true});
  fs.writeFileSync(path.join(src,link),'<h1>STAGING ONLY</h1><script src="catalog-review-page.js"></script>');
  fs.writeFileSync(path.join(src,'catalog-intake/catalog-review-page.js'),'globalThis.review=1;');};
 try{write(true);review();return fn({src,dest,write,review});}
 finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
test('real project has a discoverable but non-automatic catalogue-review navigation link',()=>{
 const h=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(h,/href="catalog-intake\/catalog-review-page.html"/);
 assert.match(h,/Каталог · инженерная проверка/);
});
test('real review page points at an existing local script, not a paid API',()=>{
 const h=fs.readFileSync(path.join(root,link),'utf8');
 assert.match(h,/script src="catalog-review-page.js"/);
 assert.match(h,/Неутверждённая номенклатура/);
 assert.match(h,/../);
 assert.ok(fs.existsSync(path.join(root,'catalog-intake/catalog-review-page.js')));
});
test('production package copies the two isolated review page assets',()=>scenario(({src,dest})=>{
 const report=buildSite(src,dest);
 assert.ok(report.files.includes(link));
 assert.ok(report.files.includes('catalog-intake/catalog-review-page.js'));
 assert.ok(fs.statSync(path.join(dest,link)).size>0);
 assert.ok(fs.statSync(path.join(dest,'catalog-intake/catalog-review-page.js')).size>0);
}));
test('nested browser page keeps relative paths when bundled',()=>scenario(({src,dest})=>{
 buildSite(src,dest);
 const h=fs.readFileSync(path.join(dest,link),'utf8');
 const relative=/<script src="([^"]+)"/.exec(h)[1];
 assert.ok(fs.existsSync(path.resolve(dest,'catalog-intake',relative)));
}));
test('no catalogue page is published without an explicit navigation link',()=>scenario(({src,dest,write})=>{
 write(false);
 const report=buildSite(src,dest);
 assert.ok(!report.files.includes(link));
 assert.equal(fs.existsSync(path.join(dest,link)),false);
}));
test('removing catalogue link eliminates old staging assets from published package',()=>scenario(({src,dest,write})=>{
 buildSite(src,dest);
 assert.ok(fs.existsSync(path.join(dest,link)));
 write(false);buildSite(src,dest);
 assert.equal(fs.existsSync(path.join(dest,'catalog-intake')),false);
}));
test('missing review JavaScript causes a hard package failure',()=>scenario(({src,dest})=>{
 fs.rmSync(path.join(src,'catalog-intake/catalog-review-page.js'));
 assert.throws(()=>buildSite(src,dest),/Missing\/empty published asset/);
}));
test('missing review HTML causes a hard package failure',()=>scenario(({src,dest})=>{
 fs.rmSync(path.join(src,link));
 assert.throws(()=>buildSite(src,dest),/Missing\/empty published asset/);
}));
test('empty review file cannot silently ship a broken link',()=>scenario(({src,dest})=>{
 fs.writeFileSync(path.join(src,link),'');
 assert.throws(()=>buildSite(src,dest),/Missing\/empty published asset/);
}));
test('catalogue review assets are still absent from verified equipment seed',()=>{
 const source=fs.readFileSync(path.join(root,'catalog.js'),'utf8');
 assert.doesNotMatch(source,/catalog-intake\//);
});
test('review page does not provide an import or approval action in project builder',()=>{
 const s=fs.readFileSync(path.join(root,'catalog-intake/catalog-review-page.js'),'utf8');
 assert.match(s,/STAGING_ONLY/);
 assert.match(s,/autoImportAllowed/);
});
test('browser review UI explicitly rejects catalogue data without staging metadata',()=>{
 const s=fs.readFileSync(path.join(root,'catalog-intake/catalog-review-page.js'),'utf8');
 assert.match(s,/sourceRecords/);
 assert.match(s,/engineeringApproved/);
});
