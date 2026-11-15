'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epTransformerSourceV1}=require('../transformer-source-v1.js');
const {epMaximumFaultCurrentV2,epApplyMaximumFaultV2}=require('../fault-route-design-v2.js');
global.epTransformerSourceV1=epTransformerSourceV1;
const transformer=()=>({ratedPowerKva:1000,ratedVoltageV:400,ukPercent:6,
 loadLossW:9000,upstreamROhm:0.001,upstreamXOhm:0.002,
 source:'transformer manufacturer short-circuit losses',upstreamSource:'network study referred to LV',
 lossBasisConfirmed:true});
const device=()=>({kind:'MCB',poles:3,inA:16,icnKa:6,
 icnVoltageV:400,icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'});
function project(){
 return {earthing:'TN-S',lines:[{id:'L1',phase:'3Ф',catalogSku:'A',
  maximumFaultInput:{model:'THREE_PHASE_POSITIVE_SEQUENCE',
   sourceModel:'TRANSFORMER_WITH_UPSTREAM',uLLV:400,cmax:1.1,
   transformer:transformer(),segments:[{lengthM:30,r1OhmKm:0.4,x1OhmKm:0.08,
    source:'declared 30m line',temperatureBasisConfirmed:true}]}}]};
}
test('rated transformer short-circuit loss yields R, X and Z in ohms',()=>{
 const x=epTransformerSourceV1(transformer());
 assert.ok(Math.abs(x.transformerZOhm-0.0096)<1e-14);
 assert.ok(Math.abs(x.transformerROhm-0.00144)<1e-14);
 assert.ok(Math.abs(x.transformerXOhm-Math.sqrt(0.0096**2-0.00144**2))<1e-14);
 assert.ok(Math.abs(x.sourceROhm-0.00244)<1e-14);
 assert.equal(x.status,'UNKNOWN');
 assert.equal(x.engineeringApproved,false);
});
test('three-phase maximum fault combines transformer, upstream and cable R/X',()=>{
 const p=project(),r=epMaximumFaultCurrentV2(p,p.lines[0],()=>device());
 const z=Math.hypot(0.00244+0.012,Math.sqrt(.0096**2-.00144**2)+.002+.0024);
 const expected=1.1*400/(Math.sqrt(3)*z)/1000;
 assert.ok(Math.abs(r.ikMaxKa-expected)<1e-10);
 assert.equal(r.sourceModel,'TRANSFORMER_WITH_UPSTREAM');
 assert.equal(r.thresholdStatus,'FAIL','6 kA is below this declared transformer calculation');
 assert.equal(r.numericComparison,'EXCEEDS_ICN');
 assert.equal(r.status,'BLOCKED');
});
test('zero upstream impedance requires explicit source even when numeric zeros are valid',()=>{
 const x=transformer();x.upstreamROhm=0;x.upstreamXOhm=0;x.upstreamSource='';
 const r=epTransformerSourceV1(x);
 assert.ok(r.sourceROhm>0);
 assert.ok(r.issues.some(i=>i.code==='TRANSFORMER_UPSTREAM_SOURCE_MISSING'));
 assert.equal(r.engineeringApproved,false);
});
test('physical impossibility: copper loss cannot exceed |Z|',()=>{
 const x=transformer();x.loadLossW=100000;
 const r=epTransformerSourceV1(x);
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(i=>i.code==='TRANSFORMER_LOSS_EXCEEDS_IMPEDANCE'));
 assert.equal(r.sourceROhm,null);
});
test('transformer voltage mismatch and unsupported single-phase scope block',()=>{
 const p=project();p.lines[0].maximumFaultInput.uLLV=380;
 assert.equal(epMaximumFaultCurrentV2(p,p.lines[0],()=>device()).status,'BLOCKED');
 assert.ok(epMaximumFaultCurrentV2(p,p.lines[0],()=>device()).issues.some(i=>i.code==='MAX_FAULT_TRANSFORMER_VOLTAGE_MISMATCH'));
 p.lines[0].maximumFaultInput.model='SINGLE_PHASE_L_N';
 const q=epMaximumFaultCurrentV2(p,p.lines[0],()=>device());
 assert.ok(q.issues.some(i=>i.code==='MAX_FAULT_TRANSFORMER_THREE_PHASE_ONLY'));
});
test('missing source or loss-basis evidence cannot generate preliminary rating pass',()=>{
 for(const change of [x=>x.source='',x=>x.upstreamSource='',x=>x.lossBasisConfirmed=false]){
  const p=project();change(p.lines[0].maximumFaultInput.transformer);
  const report=epMaximumFaultCurrentV2(p,p.lines[0],()=>({...device(),icnKa:25}));
  assert.equal(report.thresholdStatus,'UNKNOWN');
  assert.equal(report.numericComparison,'BELOW_OR_EQUAL_ICN');
  assert.ok(report.issues.some(i=>i.code.startsWith('MAX_FAULT_TRANSFORMER_')));
 }
});
test('inconsistent transformer inputs are rejected without changing original project',()=>{
 for(const mutation of [x=>x.ukPercent=-3,x=>x.ratedPowerKva=0,x=>x.loadLossW=100000]){
  const p=project(),before=JSON.stringify(p),input=structuredClone(p.lines[0].maximumFaultInput);
  mutation(input.transformer);
  const out=epApplyMaximumFaultV2(p,'L1',input,()=>device());
  assert.equal(out.project,null);
  assert.equal(JSON.stringify(p),before);
 }
});
test('valid transformer assumptions survive project update without granting approval',()=>{
 const p=project(),out=epApplyMaximumFaultV2(p,'L1',p.lines[0].maximumFaultInput,()=>device());
 assert.ok(out.project);assert.equal(out.project.lines[0].maximumFaultInput.transformer.ratedPowerKva,1000);
 assert.equal(out.report.thresholdStatus,'FAIL');
 assert.equal(out.report.engineeringApproved,false);
 assert.equal(out.project.lines[0].calculationReview.required,true);
});

test('engineering print preserves transformer upstream provenance and numeric equivalent',()=>{
 const {epFaultRouteProjectV2}=require('../fault-route-design-v2.js');
 const {epEngineeringPrintV1}=require('../engineering-print-v1.js');
 const p=project(),r=epFaultRouteProjectV2(p,()=>device());
 const t=r.rows[0].maximum.transformer;
 assert.equal(t.source,'transformer manufacturer short-circuit losses');
 assert.equal(t.upstreamSource,'network study referred to LV');
 assert.equal(t.lossBasisConfirmed,true);
 const h=epEngineeringPrintV1({overallStatus:'UNKNOWN',sections:{faultRoutes:r}});
 assert.match(h,/Эквивалент трансформатора/);
 assert.match(h,/transformer manufacturer short-circuit losses/);
 assert.match(h,/network study referred to LV/);
 assert.match(h,/9000/);
});
test('untrusted transformer provenance is escaped by the printed dossier',()=>{
 const {epFaultRouteProjectV2}=require('../fault-route-design-v2.js');
 const {epEngineeringPrintV1}=require('../engineering-print-v1.js');
 const p=project();p.lines[0].maximumFaultInput.transformer.source='<script>alert(1)</script>';
 const h=epEngineeringPrintV1({sections:{faultRoutes:epFaultRouteProjectV2(p,()=>device())}});
 assert.doesNotMatch(h,/<script>/);
 assert.match(h,/&lt;script&gt;/);
});
