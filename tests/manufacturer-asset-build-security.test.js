'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {buildSite}=require('../scripts/build-site');
const ROOT=path.resolve(__dirname,'..');
test('build output never overwrites project root or its parent',()=>{
 assert.throws(()=>buildSite(ROOT,ROOT),/Output must not overwrite/);
 assert.throws(()=>buildSite(ROOT,path.dirname(ROOT)),/Output must not overwrite/);
});
test('build rejects symlink destination',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ep-output-security-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const target=path.join(tmp,'target'),link=path.join(tmp,'link');
 fs.mkdirSync(target);
 try{fs.symlinkSync(target,link,'dir');}
 catch(e){if(['EPERM','EACCES'].includes(e.code))return t.skip('Symlinks unavailable');throw e;}
 assert.throws(()=>buildSite(ROOT,link),/must not be a symlink/);
});
test('build allows a separate temporary output without changing project sources',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ep-site-build-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const output=path.join(tmp,'dist');
 const result=buildSite(ROOT,output);
 assert.ok(result.scripts>1);
 assert.ok(fs.existsSync(path.join(output,'index.html')));
 assert.ok(fs.existsSync(path.join(output,'.nojekyll')));
});
