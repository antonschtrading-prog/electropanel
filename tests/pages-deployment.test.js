'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {buildSite}=require('../scripts/build-site.js');
const root=path.join(__dirname,'..');
test('CI and GitHub Pages both invoke the same static packager',()=>{
 const publish=fs.readFileSync(path.join(root,'.github/workflows/publish.yml'),'utf8');
 const validation=fs.readFileSync(path.join(root,'.github/workflows/electropanel-validation.yml'),'utf8');
 assert.match(publish,/node scripts\/build-site\.js/);
 assert.match(validation,/node scripts\/build-site\.js/);
 assert.match(validation,/path: dist\//);
});
test('static site builder ships every script referenced by real HTML',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'electropanel-pages-'));
 try{
  const result=buildSite(root,tmp);
  assert.equal(result.scripts,scripts.length);
  assert.equal(new Set(scripts).size,scripts.length);
  for(const name of [...scripts,'index.html','styles.css','browser_check.html']){
   assert.ok(fs.existsSync(path.join(tmp,name)),'missing '+name);
   assert.deepEqual(fs.readFileSync(path.join(tmp,name)),
    fs.readFileSync(path.join(root,name)),'asset mismatch '+name);
  }
  assert.ok(fs.existsSync(path.join(tmp,'.nojekyll')));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('builder refuses missing, duplicate, or unsafe script references',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'electropanel-bad-pages-'));
 const output=path.join(dir,'dist');
 try{
  for(const name of ['index.html','styles.css','browser_check.html','app.js','catalog.js'])
   fs.writeFileSync(path.join(dir,name),'TEST');
  fs.writeFileSync(path.join(dir,'index.html'),
   '<script src="app.js"></script><script src="missing.js"></script>');
  assert.throws(()=>buildSite(dir,output),/Missing\/empty/);
  fs.writeFileSync(path.join(dir,'index.html'),
   '<script src="app.js"></script><script src="app.js"></script>');
  assert.throws(()=>buildSite(dir,output),/Duplicate/);
  fs.writeFileSync(path.join(dir,'index.html'),
   '<script src="../bad.js"></script><script src="app.js"></script>');
  assert.throws(()=>buildSite(dir,output),/Unsafe/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('v4.14 calculations load before app.js with no Python runtime',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(scripts.at(-1),'app.js');
 for(const name of ['overload-v30.js','tt-screen-v45.js','cable-evidence-v45.js',
  'cable-tables-v31.js','reference-ampacity-v38.js','reference-cable-v39.js',
  'typical-lv-v43.js','route-impedance-v44.js'])
  assert.ok(scripts.includes(name),name);
});
