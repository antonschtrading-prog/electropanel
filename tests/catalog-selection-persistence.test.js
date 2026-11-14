'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function environment(){
 const ctx=vm.createContext({console,Date,Number,String,Array,Set,Map,Math,JSON,Object,BigInt,URL});
 for(const file of ['overload-v30.js','protection.js','catalog.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
 }
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 vm.runInContext(app.slice(0,app.indexOf("$('loadRows').addEventListener")),ctx);
 vm.runInContext('state=normalizeImport(demo())',ctx);
 return ctx;
}
const run=(c,script)=>vm.runInContext(script,c);
test('tier picker exposes all selected manufacturers but disables those without SKUs',()=>{
 const c=environment(),h=run(c,"catalogFilterControls()");
 assert.match(h,/id="catalogTier"/);assert.match(h,/>Бюджет<\/option>/);
 assert.match(h,/>Премиум<\/option>/);
 assert.match(h,/value="Panasonic"[^>]*disabled/);
 assert.match(h,/value="ABB"/);
 assert.match(h,/нет артикулов/);
});
test('tier filter is applied to actual catalogue SKU choices, not invented products',()=>{
 const c=environment();
 run(c,"catalogTierFilter='premium'");
 const h=run(c,"catalogChoices('', 'L1')");
 assert.match(h,/ABB/);assert.match(h,/Eaton/);
 assert.doesNotMatch(h,/IEK \/|CHINT \/|Schneider Electric \/|Panasonic \/ /);
});
test('atomic selection refuses invalid catalogue geometry before modifying the circuit',()=>{
 const c=environment();
 const before=run(c,'JSON.stringify(state)');
 run(c,"projectCatalogEntries=()=>[['BROKEN',{maker:'Test',series:'X',sku:'BROKEN',kind:'MCB',poles:1,modules:1,widthMm:50,inA:16,label:'X'}]]");
 assert.throws(()=>run(c,"applyCatalogueSku(state,'L1','BROKEN')"),/габариты|номинальный/i);
 assert.equal(run(c,'JSON.stringify(state)'),before);
});
test('article replacement records status and preserves current declarations',()=>{
 const c=environment();
 run(c,"state.lines[0].overloadInput={ibA:8,izA:22};state.lines[0].faultInput={ikKa:3};applyCatalogueSku(state,'L1','CH-814014')");
 const line=JSON.parse(run(c,'JSON.stringify(state.lines[0])'));
 assert.equal(line.catalogSku,'CH-814014');
 assert.deepEqual([line.overloadInput.ibA,line.overloadInput.izA,line.faultInput.ikKa],[8,22,3]);
 assert.equal(line.articleReplacementReview.required,true);
 assert.equal(line.articleReplacementReview.engineeringApproved,false);
 assert.ok(line.articleReplacementReview.warnings.includes('ICU_IS_NOT_ICN'));
 assert.ok(run(c,"catalogAudit(state).issues.some(x=>x.code==='ARTICLE_REPLACEMENT_REVIEW_REQUIRED')"));
});
test('catalogue comparison never calls Icu an Icn rating',()=>{
 const {EP_CATALOG,epCatalogueReplacementImpactV1}=require('../catalog.js');
 const impact=epCatalogueReplacementImpactV1(EP_CATALOG['EA-286533'],EP_CATALOG['CH-814014']);
 assert.ok(impact.changes.some(x=>x.field==='icnKa'));
 assert.ok(impact.changes.some(x=>x.field==='icuKa'));
 assert.ok(impact.warnings.includes('ICU_IS_NOT_ICN'));
 assert.equal(impact.engineeringApproved,false);
});
test('import restores unresolved replacement review and does not accept saved approval',()=>{
 const c=vm.createContext({URL,structuredClone});
 for(const file of ['catalog.js','project-catalog-workbench-v1.js','project-state-v2.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
 const source={lines:[{id:'L1',catalogSku:'CH-814014',articleReplacementReview:{
  required:true,from:'EA-286533',to:'CH-814014',warnings:['ICU_IS_NOT_ICN'],engineeringApproved:true}}]};
 const target={lines:[{id:'L1',catalogSku:'CH-814014'}]};
 c.raw=source;c.target=target;
 const result=vm.runInContext('epRestoreProjectExtensionsV2(raw,target)',c);
 assert.equal(result.lines[0].articleReplacementReview.required,true);
 assert.equal(result.lines[0].articleReplacementReview.engineeringApproved,false);
 assert.deepEqual(Array.from(result.lines[0].articleReplacementReview.warnings),['ICU_IS_NOT_ICN']);
});
test('malformed replacement review is rejected instead of silently cleared',()=>{
 const c=vm.createContext({URL});
 for(const file of ['catalog.js','project-catalog-workbench-v1.js','project-state-v2.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
 c.raw={lines:[{id:'L1',catalogSku:'CH-814014',articleReplacementReview:{required:false,to:'CH-814014',warnings:[]}}]};
 c.target={lines:[{id:'L1',catalogSku:'CH-814014'}]};
 assert.throws(()=>vm.runInContext('epRestoreProjectExtensionsV2(raw,target)',c),/articleReplacementReview/);
});
