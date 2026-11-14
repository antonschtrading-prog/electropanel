'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function environment(){
 const ctx=vm.createContext({console,Date,Number,String,Array,Set,Map,Math,JSON,Object,BigInt,URL});
 for(const file of ['overload-v30.js','protection.js','catalog.js','project-catalog-workbench-v1.js','draft-board-plan-v1.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
 }
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 vm.runInContext(app.slice(0,app.indexOf("$('loadRows').addEventListener")),ctx);
 vm.runInContext('state=demo();ensureV2(state)',ctx);
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

test('engineering design review exports replacement uncertainty and blocks stale mapping',()=>{
 const {epCircuitDesignReviewV1}=require('../circuit-design-review-v1.js');
 const {EP_CATALOG}=require('../catalog.js');
 const line={id:'L1',name:'Load',phase:'L1',catalogSku:'CH-814014',device:'NXB-63 C16 1P',
  modules:1,overloadInput:{ibA:10,izA:25},faultInput:{ikKa:3,voltageV:230},
  articleReplacementReview:{required:true,from:'EA-286533',to:'CH-814014',warnings:['ICU_IS_NOT_ICN','BODY_GEOMETRY_INCOMPLETE']}};
 const p={lines:[line],branchDevices:[{id:'BD1',circuitId:'L1',modules:1,label:line.device}]};
 const r=epCircuitDesignReviewV1(p,sku=>EP_CATALOG[sku]);
 assert.ok(r.issues.some(x=>x.code==='ARTICLE_REPLACEMENT_REVIEW_REQUIRED'));
 assert.ok(r.issues.some(x=>x.code==='ARTICLE_REPLACEMENT_ICU_IS_NOT_ICN'));
 assert.equal(r.engineeringApproved,false);
 line.articleReplacementReview.to='EA-286533';
 const stale=epCircuitDesignReviewV1(p,sku=>EP_CATALOG[sku]);
 assert.ok(stale.issues.some(x=>x.code==='ARTICLE_REPLACEMENT_SELECTION_STALE'&&x.level==='BLOCKED'));
 assert.equal(stale.status,'BLOCKED');
});

test('locked DIN layout rejects wider replacement atomically',()=>{
 const c=environment();
 run(c,`state.railCount=1;state.railCapacity=12;
  state.lines=state.lines.slice(0,2);
  state.lines[0].catalogSku='SE-A9F74116';state.lines[0].device='iC60N C16';state.lines[0].modules=1;
  state.lines[1].catalogSku='IEK-MVA20-1-016-C';state.lines[1].device='ВА47-29 C16';state.lines[1].modules=1;
  state.branchDevices=state.branchDevices.slice(0,2);
  state.branchDevices[0].label=state.lines[0].device;state.branchDevices[0].modules=1;
  state.branchDevices[1].label=state.lines[1].device;state.branchDevices[1].modules=1;
  state.manualLayoutV1=state.branchDevices.map((b,i)=>({deviceId:b.id,railIndex:0,startModule:i}));
 `);
 const before=run(c,'JSON.stringify(state)');
 run(c,`projectCatalogEntries=(project)=>Object.entries(EP_CATALOG).concat([['WIDE-CUSTOM',{maker:'Declared',series:'Custom',sku:'WIDE',kind:'MCB',label:'Wide C16',poles:1,modules:2,widthMm:36,inA:16,icnKa:6,source:'https://example.org/device'}]])`);
 assert.throws(()=>run(c,"applyCatalogueSku(state,'L1','WIDE-CUSTOM')"),/DIN-компоновку/);
 assert.equal(run(c,'JSON.stringify(state)'),before);
});
test('locked DIN layout permits fit-safe width increase and retains positions',()=>{
 const c=environment();
 run(c,`state.railCount=1;state.railCapacity=12;
  state.lines=state.lines.slice(0,2);state.branchDevices=state.branchDevices.slice(0,2);
  state.loads=(state.loads||[]).filter(x=>state.lines.some(l=>l.id===x.circuitId));
  state.manualLayoutV1=state.branchDevices.map((b,i)=>({deviceId:b.id,railIndex:0,startModule:i*4}));
  projectCatalogEntries=()=>Object.entries(EP_CATALOG).concat([['WIDE-CUSTOM',{maker:'Declared',series:'Custom',sku:'WIDE',kind:'MCB',label:'Wide C16',poles:1,modules:2,widthMm:36,inA:16,icnKa:6,source:'https://example.org/device'}]]);
 `);
 run(c,"applyCatalogueSku(state,'L1','WIDE-CUSTOM')");
 const out=JSON.parse(run(c,'JSON.stringify(state)'));
 assert.equal(out.lines[0].modules,2);
 assert.equal(out.lines[0].catalogSku,'WIDE-CUSTOM');
 assert.equal(out.manualLayoutV1[0].startModule,0);
 assert.equal(out.manualLayoutV1[1].startModule,4);
 assert.equal(out.lines[0].articleReplacementReview.engineeringApproved,false);
});

test('live catalogue audit distinguishes Icu-only article and voltage conflicts',()=>{
 const c=environment();
 run(c,"applyCatalogueSku(state,'L1','CH-814014');state.lines[0].faultInput={ikKa:3,voltageV:230,source:'engineer'}");
 assert.ok(run(c,"catalogAudit(state).issues.some(x=>x.code==='CATALOG_ICN_UNDECLARED')"));
 run(c,"applyCatalogueSku(state,'L1','HA-MBN116');state.lines[0].faultInput={ikKa:3,voltageV:400,source:'engineer'}");
 assert.ok(run(c,"catalogAudit(state).issues.some(x=>x.code==='CATALOG_ICN_VOLTAGE_INSUFFICIENT')"));
 assert.equal(run(c,"catalogAudit(state).engineeringApproved"),false);
});

test('automatic DIN placement refuses wider SKU when rail is at capacity',()=>{
 const c=environment();
 run(c,`state.railCount=1;state.railCapacity=2;
  state.lines=state.lines.slice(0,2);
  state.branchDevices=state.branchDevices.slice(0,2);
  state.loads=(state.loads||[]).filter(x=>state.lines.some(l=>l.id===x.circuitId));
  state.sharedDevices=[];delete state.manualLayoutV1;
  state.lines[0].modules=1;state.lines[0].device='iC60N C16';state.lines[0].catalogSku='SE-A9F74116';
  state.lines[1].modules=1;state.lines[1].device='ВА47-29 C16';state.lines[1].catalogSku='IEK-MVA20-1-016-C';
  for(let i=0;i<2;i++){state.branchDevices[i].modules=1;state.branchDevices[i].label=state.lines[i].device;}
  projectCatalogEntries=()=>Object.entries(EP_CATALOG).concat([['WIDE-CUSTOM',{maker:'Declared',series:'Custom',sku:'WIDE',kind:'MCB',label:'Wide C16',poles:1,modules:2,widthMm:36,inA:16,icnKa:6,source:'https://example.org/device'}]]);
 `);
 const before=run(c,'JSON.stringify(state)');
 assert.throws(()=>run(c,"applyCatalogueSku(state,'L1','WIDE-CUSTOM')"),/DIN-компоновку/);
 assert.equal(run(c,'JSON.stringify(state)'),before);
});
