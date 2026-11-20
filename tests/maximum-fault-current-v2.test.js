'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {epMaximumFaultCurrentV2:maximum,epFaultRouteProjectV2:projectReview,epApplyMaximumFaultV2:applyMaximum}=require('../fault-route-design-v2.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
function project(model='THREE_PHASE_POSITIVE_SEQUENCE'){
 const three=model==='THREE_PHASE_POSITIVE_SEQUENCE';
 return {earthing:'TN-S',lines:[{id:'L1',phase:three?'3Ф':'L1',catalogSku:'A',
  maximumFaultInput:{model,uLLV:400,u0V:230,cmax:1.1,sourceROhm:0.04,sourceXOhm:0.03,
   networkSource:'declared upstream transformer equivalent',segments:[three?
    {lengthM:30,r1OhmKm:0.4,x1OhmKm:0.08,source:'cable data for max temperature basis',temperatureBasisConfirmed:true}:
    {lengthM:30,phaseROhmKm:0.4,neutralROhmKm:0.6,phaseXOhmKm:0.08,neutralXOhmKm:0.09,
     source:'L+N cable impedance',temperatureBasisConfirmed:true}]}}]};
}
const verified=(three=true)=>({kind:'MCB',poles:three?3:1,icnKa:6,
 icnVoltageV:three?400:230,icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'});
test('three phase reference computes positive sequence Ik3 without mixing PE route',()=>{
 const p=project(),r=maximum(p,p.lines[0],()=>verified());
 assert.equal(r.model,'THREE_PHASE_POSITIVE_SEQUENCE');
 assert.ok(Math.abs(r.rOhm-0.052)<1e-12);
 assert.ok(Math.abs(r.xOhm-0.0324)<1e-12);
 const z=Math.hypot(0.052,0.0324),expected=1.1*400/(Math.sqrt(3)*z)/1000;
 assert.ok(Math.abs(r.ikMaxKa-expected)<1e-12);
 assert.equal(r.thresholdStatus,'PRELIMINARY_PASS');
 assert.equal(r.numericComparison,'BELOW_OR_EQUAL_ICN');
 assert.equal(r.engineeringApproved,false);
});
test('single phase L-N uses declared phase and neutral path, never PE',()=>{
 const p=project('SINGLE_PHASE_L_N'),r=maximum(p,p.lines[0],()=>verified(false));
 const z=Math.hypot(0.07,0.0351);
 assert.ok(Math.abs(r.ikMaxKa-(1.1*230/z/1000))<1e-12);
 assert.equal(r.thresholdStatus,'PRELIMINARY_PASS');
});
test('overcurrent above rated Icn blocks without changing the project',()=>{
 const p=project(),prior=JSON.stringify(p);
 const r=maximum(p,p.lines[0],()=>({...verified(),icnKa:4}));
 assert.equal(r.thresholdStatus,'FAIL');
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='MAX_FAULT_EXCEEDS_ICN'));
 assert.equal(JSON.stringify(p),prior);
});
test('unknown manufacturer verification never implies rated suitability',()=>{
 const p=project(),r=maximum(p,p.lines[0],()=>({...verified(),verificationStatus:'UNVERIFIED'}));
 assert.equal(r.status,'UNKNOWN');
 assert.equal(r.thresholdStatus,'UNKNOWN');
 assert.equal(r.numericComparison,'BELOW_OR_EQUAL_ICN');
 assert.ok(r.issues.some(x=>x.code==='MAX_FAULT_ARTICLE_VERIFICATION_PENDING'));
});
test('Icu alone cannot replace missing Icn',()=>{
 const p=project(),r=maximum(p,p.lines[0],()=>({...verified(),icnKa:null,icuKa:10}));
 assert.equal(r.thresholdStatus,'UNKNOWN');
 assert.equal(r.numericComparison,'UNAVAILABLE');
 assert.ok(r.issues.some(x=>x.code==='MAX_FAULT_ICN_UNDECLARED'));
});
test('wrong fault topology, voltage or invalid impedance blocks',()=>{
 for(const mutate of [
  p=>p.lines[0].phase='L1',p=>p.lines[0].maximumFaultInput.cmax=1.4,
  p=>p.lines[0].maximumFaultInput.sourceROhm=-1,
  p=>p.lines[0].maximumFaultInput.segments[0].r1OhmKm='abc',
  p=>p.lines[0].maximumFaultInput.uLLV=0
 ]){
  const p=project();mutate(p);
  assert.equal(maximum(p,p.lines[0],()=>verified()).status,'BLOCKED');
 }
});
test('missing source or conductor temperature basis prevents preliminary pass',()=>{
 for(const mutate of [x=>x.networkSource='',x=>x.segments[0].source='',
  x=>x.segments[0].temperatureBasisConfirmed=false]){
  const p=project();mutate(p.lines[0].maximumFaultInput);
  const r=maximum(p,p.lines[0],()=>verified());
  assert.equal(r.thresholdStatus,'UNKNOWN');
  assert.ok(r.ikMaxKa>0);
 }
});
test('project fault report and print expose max and min as separate results',()=>{
 const p=project(),r=projectReview(p,()=>verified());
 assert.equal(r.rows.length,1);
 assert.equal(r.rows[0].ikMinA,null);
 assert.ok(r.rows[0].maximum.ikMaxKa>0);
 assert.equal(r.engineeringApproved,false);
 const html=print({overallStatus:'UNKNOWN',sections:{faultRoutes:r}});
 assert.match(html,/Максимальный заявленный ток КЗ/);
 assert.match(html,/Ik,max, кА/);
 assert.match(html,/THREE_PHASE_POSITIVE_SEQUENCE/);
 assert.match(html,/Минимальный ток замыкания L–PE/);
});
test('maximumFaultInput is preserved by versioned project restore',()=>{
 const source=project(),dest={lines:[{id:'L1',catalogSku:'A'}]};
 const ctx=vm.createContext({URL,Date});
 for(const name of ['catalog.js','project-catalog-workbench-v1.js','project-state-v2.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx);
 ctx.source=source;ctx.dest=dest;
 const restored=vm.runInContext('epRestoreProjectExtensionsV2(source,dest)',ctx);
 assert.equal(restored.lines[0].maximumFaultInput.cmax,1.1);
 assert.equal(restored.lines[0].maximumFaultInput.segments.length,1);
 assert.equal(restored.lines[0].maximumFaultInput.networkSource,source.lines[0].maximumFaultInput.networkSource);
});

test('numeric short-circuit overrun is never hidden by unverified manufacturer evidence',()=>{
 const p=project(),r=maximum(p,p.lines[0],()=>({...verified(),icnKa:4,verificationStatus:'UNVERIFIED'}));
 assert.equal(r.thresholdStatus,'FAIL');
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='MAX_FAULT_EXCEEDS_ICN'&&x.level==='BLOCKED'));
 assert.ok(r.issues.some(x=>x.code==='MAX_FAULT_ARTICLE_VERIFICATION_PENDING'));
});

test('maximum fault calculation is persisted atomically with source basis',()=>{
 const p=project(),original=JSON.stringify(p);
 const out=applyMaximum(p,'L1',p.lines[0].maximumFaultInput,()=>verified());
 assert.ok(out.project);
 assert.equal(out.report.thresholdStatus,'PRELIMINARY_PASS');
 assert.equal(out.project.lines[0].maximumFaultInput.basis.catalogSku,'A');
 assert.equal(out.project.lines[0].maximumFaultInput.basis.article.icnKa,6);
 assert.equal(out.project.lines[0].calculationReview.required,true);
 assert.equal(JSON.stringify(p),original);
});
test('changed article, cable or phase marks prior maximum fault result stale',()=>{
 const changes=[
  p=>p.lines[0].catalogSku='OTHER',
  p=>p.lines[0].cableDesignInput={sectionMm2:4},
  p=>p.lines[0].phase='L1',
  p=>p.earthing='TN-C-S'
 ];
 for(const edit of changes){
  const base=project(),stored=applyMaximum(base,'L1',base.lines[0].maximumFaultInput,()=>verified()).project;
  edit(stored);
  const r=maximum(stored,stored.lines[0],()=>verified());
  assert.ok(r.issues.some(x=>x.code==='MAX_FAULT_BASIS_STALE'));
  assert.notEqual(r.thresholdStatus,'PRELIMINARY_PASS');
 }
});
test('changed catalogue breaker Icn invalidates input basis',()=>{
 const p=project(),stored=applyMaximum(p,'L1',p.lines[0].maximumFaultInput,()=>verified()).project;
 const r=maximum(stored,stored.lines[0],()=>({...verified(),icnKa:5}));
 assert.ok(r.issues.some(x=>x.code==='MAX_FAULT_BASIS_STALE'));
 assert.equal(r.engineeringApproved,false);
});
test('structural maximum fault failures do not change source project',()=>{
 for(const mutate of [x=>x.cmax=1.5,x=>x.segments[0].r1OhmKm=-1,
   x=>x.model='UNSUPPORTED']){
  const p=project(),before=JSON.stringify(p),input=structuredClone(p.lines[0].maximumFaultInput);
  mutate(input);
  const out=applyMaximum(p,'L1',input,()=>verified());
  assert.equal(out.project,null);
  assert.equal(JSON.stringify(p),before);
 }
});
