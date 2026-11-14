'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function env(){
 const c=vm.createContext({console,URL,structuredClone});
 for(const file of ['catalog.js','project-catalog-workbench-v1.js','load-current-v1.js','cable-reference-v1.js','voltage-drop-design-v1.js','circuit-design-review-v1.js','draft-board-plan-v1.js','design-reconciliation-v1.js','project-state-v2.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),c);
 return c;
}
const fixture=()=>({schema:'electropanel.web.entities.2',railCount:2,railCapacity:12,lines:[{id:'L1',name:'Light',phase:'L1',power:2.3,modules:1,catalogSku:'SE-A9F74116',overloadInput:{ibA:10,izA:20},faultInput:{ikKa:3}}],branchDevices:[{id:'Q1',circuitId:'L1',modules:1}],sharedDevices:[]});
function run(c,code,p=fixture()){c.p=p;return vm.runInContext(code,c);}
test('complete persisted model restores inputs and recomputes derived current',()=>{
 const c=env();const out=run(c,`p=epApplyLoadCurrentV1(p,'L1',{mode:'single_phase',powerSource:'circuit',voltageV:230,powerFactor:1,efficiency:1,demandFactor:1}).project;
 p=epApplyCableReferenceInputV1(p,'L1',{installationMethod:'C',confirmContext:true}).project;
 p=epApplyCableSectionV1(p,'L1','2.5').project;
 p.voltageDropDesignInput={};p.evidence={load:{status:'unknown',source:'test'}};
 const target={lines:p.lines.map(x=>({id:x.id,phase:x.phase,overloadInput:x.overloadInput}))};
 epRestoreProjectExtensionsV2(JSON.parse(JSON.stringify(p)),target);`);
 assert.equal(out.lines[0].loadCurrentCalculation.roundedIbA,10);assert.equal(out.lines[0].cableDesignInput.sectionMm2,2.5);assert.equal(out.lines[0].loadCurrentCalculation.powerSource,'circuit');assert.equal(out.evidence.load.source,'test');
});
test('linked current updates after circuit power change, then feeds voltage drop',()=>{
 const c=env();const out=run(c,`p=epApplyLoadCurrentV1(p,'L1',{mode:'single_phase',powerSource:'circuit',voltageV:230,powerFactor:1,efficiency:1,demandFactor:1}).project;
 p.lines[0].power=4.6;epRefreshLinkedCurrentsV1(p);p.lines[0]`);
 assert.equal(out.overloadInput.ibA,20);assert.equal(out.loadCurrentCalculation.stale,false);
 assert.equal(run(c,'epReconcileProjectV2(p,epCatalogSku).rows[0].calculation.current',c.p),'FAIL');
});
test('manual current override disables automatic overwrite',()=>{
 const c=env();const out=run(c,`p=epApplyLoadCurrentV1(p,'L1',{mode:'single_phase',powerSource:'circuit',voltageV:230,powerFactor:1,efficiency:1,demandFactor:1}).project;p.lines[0].overloadInput.ibA=7;p.lines[0].power=4.6;epRefreshLinkedCurrentsV1(p);p.lines[0]`);
 assert.equal(out.overloadInput.ibA,7);assert.equal(out.loadCurrentCalculation.powerSource,'manual');assert.equal(out.loadCurrentCalculation.stale,true);
});
test('phase conversion requires explicit voltage, never guesses',()=>{
 const c=env();const out=run(c,`p=epApplyLoadCurrentV1(p,'L1',{mode:'single_phase',powerSource:'circuit',voltageV:230,powerFactor:1,efficiency:1,demandFactor:1}).project;p.lines[0].phase='3Ф';epRefreshLinkedCurrentsV1(p);p.lines[0]`);
 assert.equal(out.overloadInput.ibA,10);assert.equal(out.loadCurrentCalculation.stale,true);
});
test('tampered serialized current is recomputed and marked for review',()=>{
 const c=env();const out=run(c,`p=epApplyLoadCurrentV1(p,'L1',{mode:'single_phase',powerKw:2.3,voltageV:230,powerFactor:1,efficiency:1,demandFactor:1}).project;p.lines[0].loadCurrentCalculation.roundedIbA=1;
 epRestoreProjectExtensionsV2(p,{lines:[{id:'L1',phase:'L1',overloadInput:{ibA:1}}]})`);
 assert.equal(out.lines[0].loadCurrentCalculation.roundedIbA,10);assert.equal(out.lines[0].loadCurrentCalculation.stale,true);
});
test('unsafe extensions and future versions reject atomically',()=>{
 for(const extension of [{projectExtensionsVersion:2},{evidence:[]},{catalogArticles:[{}]}, {evidence:JSON.parse('{"__proto__":{"polluted":true}}')}]){
  const c=env();assert.throws(()=>run(c,'epRestoreProjectExtensionsV2(p,{lines:[]})',{lines:[],...extension}));
 }
 assert.equal({}.polluted,undefined);
});
test('manual move persists exact position in native reconciliation',()=>{
 const c=env();const out=run(c,`const result=epMoveBoardDeviceV1(p,'Q1',1,4,epCatalogSku);epReconcileProjectV2(result.project,epCatalogSku)`);
 assert.equal(out.rows[0].placement.railIndex,1);assert.equal(out.rows[0].placement.startModule,4);assert.equal(out.rows[0].article.sku,'A9F74116');assert.equal(out.engineeringApproved,false);
});
test('move into occupied space, negative and fractional coordinates are rejected',()=>{
 const c=env(),p=fixture();p.lines.push({...p.lines[0],id:'L2'});p.branchDevices.push({id:'Q2',circuitId:'L2',modules:1});
 for(const [r,s] of [[0,1],[-1,0],[1,12],[0,.5]])assert.equal(run(c,`epMoveBoardDeviceV1(p,'Q1',${r},${s},epCatalogSku).project`,p),null);
 assert.equal(p.manualLayoutV1,undefined);
});
test('manual placements reserve holes before auto packing new devices',()=>{
 const c=env(),p=fixture();p.manualLayoutV1=[{deviceId:'Q1',railIndex:0,startModule:2}];p.lines.push({...p.lines[0],id:'L2'});p.branchDevices.push({id:'Q2',circuitId:'L2',modules:1});
 const plan=run(c,'epDraftBoardPlanV1(p,epCatalogSku)',p);assert.equal(plan.placements[1].startModule,0);
});
test('native project table escapes circuit and manufacturer strings',()=>{
 const c=env(),p=fixture();p.lines[0].name='<img src=x onerror=x>';
 const html=run(c,'epReconcileProjectHtmlV2(epReconcileProjectV2(p,epCatalogSku))',p);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
});
