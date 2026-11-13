'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('GitHub Pages deployment copies every HTML script, not a stale manual subset',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const publish=fs.readFileSync(path.join(root,'.github/workflows/publish.yml'),'utf8');
 const validation=fs.readFileSync(path.join(root,'.github/workflows/electropanel-validation.yml'),'utf8');
 const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(scripts.length>=10);
 assert.equal(new Set(scripts).size,scripts.length);
 for(const file of scripts){
  assert.match(file,/^[A-Za-z0-9_.-]+\.js$/);
  assert.ok(fs.existsSync(path.join(root,file)),'missing: '+file);
  assert.ok(fs.statSync(path.join(root,file)).size>0,'empty: '+file);
 }
 assert.match(publish,/html\.matchAll/);
 assert.match(publish,/fs\.copyFileSync\(name,'dist\/'\+name\)/);
 assert.match(validation,/\*\.js/);
});
test('v4.14 calculation modules load before app.js without external Python',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(scripts.at(-1),'app.js');
 const expected=['overload-v30.js','tt-screen-v45.js','cable-evidence-v45.js',
  'cable-tables-v31.js','reference-ampacity-v38.js','reference-cable-v39.js',
  'typical-lv-v43.js','route-impedance-v44.js'];
 for(const file of expected)assert.ok(scripts.includes(file),file);
});
