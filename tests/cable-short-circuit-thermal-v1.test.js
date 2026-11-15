'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCableShortCircuitThermalV1:calc}=require('../cable-short-circuit-thermal-v1.js');
const {epProtectionDecisionV1:decide}=require('../protection-decision-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const fault=require('../fault-route-design-v2.js');
global.epCableShortCircuitThermalV1=calc;
global.epMaximumFaultCurrentV2=fault.epMaximumFaultCurrentV2;
global.epFaultRouteReviewV2=fault.epFaultRouteReviewV2;
const device=()=>({sku:'A',inA:16,kind:'MCB',poles:1,icnKa:10,icnVoltageV:230,
 icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'});
function thermal(){
 return {method:'ADIABATIC_K2S2',currentBasis:'DECLARED_SCENARIO',
  conductorRole:'PHASE',conductorMaterial:'Cu',insulationType:'PVC',
  sectionMm2:6,kA_SqrtS_PerMm2:115,clearingTimeS:0.1,
  timeModel:'DECLARED_MAX_CLEARING_TIME',faultCurrentA:5000,
  faultModel:'SINGLE_PHASE_L_N',comparisonPoint:'END-L1',
  kSource:'engineer verified manufacturer temperature basis',
  timeSource:'declared maximum clearing time for named scenario',
  faultCurrentSource:'calculated current for named scenario',
  conductorSource:'recorded Cu PVC 6 square mm',
  methodSource:'adiabatic method and applicability review',
  temperatureBasisConfirmed:true,adiabaticApplicabilityConfirmed:true,
  clearingTimeGuaranteeConfirmed:true};
}
function project(){
 return {earthing:'TN-S',lines:[{id:'L1',phase:'L1',catalogSku:'A',
  cableDesignInput:{sectionMm2:6,material:'Cu'},
  overloadInput:{ibA:10,izA:25},shortCircuitThermalInput:thermal()}]};
}
test('reference arithmetic computes I²t, k²S² and minimum S without unit confusion',()=>{
 const p=project(),before=JSON.stringify(p),r=calc(p,p.lines[0],device());
 assert.equal(r.faultEnergyA2s,2500000);
 assert.equal(r.conductorCapacityA2s,476100);
 assert.ok(Math.abs(r.minimumSectionMm2-5000*Math.sqrt(.1)/115)<1e-9);
 assert.equal(r.numericalStatus,'FAIL');
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='THERMAL_SHORT_CIRCUIT_ENERGY_EXCEEDS_CAPACITY'));
 assert.equal(r.engineeringApproved,false);
 assert.equal(JSON.stringify(p),before);
});
test('larger conductor can pass arithmetic but never grant engineering approval',()=>{
 const p=project();p.lines[0].shortCircuitThermalInput.faultCurrentA=1000;
 const r=calc(p,p.lines[0],device());
 assert.equal(r.numericalStatus,'PRELIMINARY_PASS');
 assert.equal(r.status,'UNKNOWN');
 assert.equal(r.engineeringApproved,false);
});
test('phase section and material must match selected project conductor',()=>{
 for(const change of [x=>x.sectionMm2=10,x=>x.conductorMaterial='Al']){
  const p=project();change(p.lines[0].shortCircuitThermalInput);
  const r=calc(p,p.lines[0],device());
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.faultEnergyA2s,null);
 }
});
test('zero, negative, non-finite and >5s clearing time fail closed',()=>{
 for(const val of [0,-1,Infinity,'NaN',5.1,'1e2',true]){
  const p=project();p.lines[0].shortCircuitThermalInput.clearingTimeS=val;
  assert.equal(calc(p,p.lines[0],device()).status,'BLOCKED');
 }
});
test('PE conductor cannot be assessed using L-N or symmetrical 3ph path',()=>{
 const p=project(),x=p.lines[0].shortCircuitThermalInput;
 x.conductorRole='PE';
 for(const model of ['SINGLE_PHASE_L_N','THREE_PHASE_POSITIVE_SEQUENCE']){
  x.faultModel=model;
  const r=calc(p,p.lines[0],device());
  assert.equal(r.status,'BLOCKED');
  assert.ok(r.issues.some(i=>i.code==='THERMAL_PE_REQUIRES_L_PE_SCENARIO'));
 }
});
test('neutral conductor cannot be inferred in a symmetrical three-phase fault path',()=>{
 const p=project(),x=p.lines[0].shortCircuitThermalInput;
 x.conductorRole='NEUTRAL';x.faultModel='THREE_PHASE_POSITIVE_SEQUENCE';
 assert.ok(calc(p,p.lines[0],device()).issues.some(i=>
  i.code==='THERMAL_NEUTRAL_NOT_IN_THREE_PHASE_SYMMETRIC_PATH'));
});
test('missing sources and thermal basis prevent certification but preserve numeric result',()=>{
 for(const change of [x=>x.kSource='',x=>x.timeSource='',
  x=>x.temperatureBasisConfirmed=false,x=>x.clearingTimeGuaranteeConfirmed=false]){
  const p=project();change(p.lines[0].shortCircuitThermalInput);
  p.lines[0].shortCircuitThermalInput.faultCurrentA=1000;
  const r=calc(p,p.lines[0],device());
  assert.equal(r.numericalStatus,'PRELIMINARY_PASS');
  assert.equal(r.status,'UNKNOWN');
  assert.ok(r.issues.length);
 }
});
test('linked maximum uses independent Ikmax and exact matching model and point',()=>{
 const p=project(),l=p.lines[0],x=l.shortCircuitThermalInput;
 l.maximumFaultInput={model:'SINGLE_PHASE_L_N',u0V:230,cmax:1.1,
  comparisonPoint:'END-L1',sourceROhm:.1,sourceXOhm:.02,networkSource:'grid',
  segments:[{lengthM:20,phaseROhmKm:.5,neutralROhmKm:.5,
   phaseXOhmKm:.08,neutralXOhmKm:.08,source:'line',
   temperatureBasisConfirmed:true}]};
 x.currentBasis='LINKED_MAXIMUM';delete x.faultCurrentA;
 const r=calc(p,l,device());
 assert.ok(r.faultCurrentA>0);
 assert.equal(r.faultModel,'SINGLE_PHASE_L_N');
 assert.equal(r.faultCurrentA,r.linkedFault.ikMaxA);
 assert.equal(r.engineeringApproved,false);
 l.maximumFaultInput.comparisonPoint='OTHER';
 const mismatch=calc(p,l,device());
 assert.equal(mismatch.status,'BLOCKED');
 assert.ok(mismatch.issues.some(z=>z.code==='THERMAL_COMPARISON_POINT_MISMATCH'));
});
test('linked max not reused as PE minimum fault with assumed clearing time',()=>{
 const p=project(),x=p.lines[0].shortCircuitThermalInput;
 x.currentBasis='LINKED_MAXIMUM';x.conductorRole='PE';x.faultModel='L_PE';
 const r=calc(p,p.lines[0],device());
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.faultEnergyA2s,null);
});
test('unified protection decision and printed draft include thermal faults and provenance',()=>{
 const p=project(),r=decide(p,()=>device());
 assert.equal(r.rows[0].shortCircuitThermal.numericalStatus,'FAIL');
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='THERMAL_SHORT_CIRCUIT_ENERGY_EXCEEDS_CAPACITY'));
 const h=print({sections:{protectionDecision:r}});
 assert.match(h,/Термическая стойкость проводника при КЗ/);
 assert.match(h,/2500000/);
 assert.match(h,/declared maximum clearing time for named scenario/);
 assert.match(h,/476100/);
});
test('untrusted source is escaped in HTML',()=>{
 const p=project();
 p.lines[0].shortCircuitThermalInput.timeSource='<svg onload=alert(1)>';
 const h=print({sections:{protectionDecision:decide(p,()=>device())}});
 assert.doesNotMatch(h,/<svg /);
 assert.match(h,/&lt;svg /);
});
