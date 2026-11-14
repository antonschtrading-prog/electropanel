'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const c=vm.runInNewContext(fs.readFileSync(path.join(root,'catalog.js'),'utf8')+'\n({EP_BRAND_TIERS,epBrandTier,epBrandCoverage,EP_CATALOG})');
test('brand taxonomy contains 14 distinct approved names in three tiers',()=>{
 const grouped=Object.fromEntries(Object.entries(c.EP_BRAND_TIERS).map(([k,v])=>[k,Array.from(v)]));
 assert.deepEqual(Object.keys(grouped),['budget','comfort','premium']);
 assert.deepEqual(Object.values(grouped).map(a=>a.length),[5,3,6]);
 assert.equal(new Set(Object.values(grouped).flat()).size,14);
 assert.equal(c.epBrandTier('КЭАЗ'),'premium');
 assert.equal(c.epBrandTier('Panasonic'),'comfort');
 assert.equal(c.epBrandTier('Unknown'),null);
});
test('coverage reports empty manufacturers without inventing products',()=>{
 const coverage=c.epBrandCoverage();
 assert.equal(coverage.reduce((n,g)=>n+g.makers.length,0),14);
 const chint=coverage.flatMap(g=>g.makers).find(m=>m.maker==='CHINT');
 assert.equal(chint.articles,1);assert.equal(chint.series,1);
 const abb=coverage.flatMap(g=>g.makers).find(m=>m.maker==='ABB');
 assert.ok(abb.articles>0);
 assert.equal(Object.keys(c.EP_CATALOG).length,11);
});
test('project records counted by manufacturer with no cross-tier inference',()=>{
 const groups=c.epBrandCoverage({x:{maker:'CHINT',series:'Test declaration'},y:{maker:'Custom',series:'X'}});
 assert.equal(groups.find(g=>g.tier==='budget').makers.find(m=>m.maker==='CHINT').articles,1);
 assert.equal(groups.reduce((n,g)=>n+g.makers.reduce((v,m)=>v+m.articles,0),0),1);
});
test('catalogue interface wires tier and query filters with explicit row tiers',()=>{
 const ui=fs.readFileSync(path.join(root,'project-catalog-workbench-v1.js'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(ui,/catalogTierFilter/);assert.match(ui,/data-catalog-tier/);
 assert.match(app,/filterProjectCatalogue/);assert.match(app,/row\.dataset\.catalogTier!==tier/);
});
