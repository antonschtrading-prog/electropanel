'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epBreakerLetThroughV1:calc}=require('../breaker-let-through-v1.js');
const {epProtectionDecisionV1:decision}=require('../protection-decision-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const {epBreakerLetThroughHtmlV1:ui}=require('../breaker-let-through-ui-v1.js');
const fault=require('../fault-route-design-v2.js');
global.epBreakerLetThroughV1=calc;
global.epMaximumFaultCurrentV2=fault.epMaximumFaultCurrentV2;
global.epFaultRouteReviewV2=fault.epFaultRouteReviewV2;
global.epBreakerLetThroughV1=calc;
const article=()=>({sku:'A',kind:'MCB',poles:1,inA:16,icnKa:10,
 icnVoltageV:230,icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'});
function input(){
 return {articleSku:'A',articleInA:16,deviceStandard:'IEC 60898-1',
  testVoltageV:230,testFrequencyHz:50,applicationVoltageV:230,
  applicationFrequencyHz:50,protectionPoles:1,
  faultModel:'SINGLE_PHASE_L_N',comparisonPoint:'END-L1',
  currentBasis:'DECLARED_SCENARIO',prospectiveCurrentA:5000,
  prospectiveSource:'named upstream fault study',conductorRole:'PHASE',
  conductorMaterial:'Cu',sectionMm2:6,kA_SqrtS_PerMm2:115,
  manufacturerSource:'declared manufacturer upper-bound I2t datasheet',
  testConditionSource:'declared 230V 50Hz IEC device conditions',
  cableSource:'Cu 6mm2 cable specification',kSource:'Cu/PVC temperature basis',
  manufacturerEnvelopeConfirmed:true,conductorApplicationReviewed:true,
  temperatureBasisConfirmed:true,
  bands:[{minProspectiveA:1000,maxProspectiveA:6000,
   maxLetThroughA2s:200000,source:'declared manufacturer guaranteed range'}]};
}
const project=()=>({earthing:'TN-S',lines:[{id:'L1',catalogSku:'A',phase:'L1',
 cableDesignInput:{sectionMm2:6,material:'Cu'},
 overloadInput:{ibA:10,izA:25},letThroughInput:input()}]});
test('manufacturer upper-bound at 5000 A checks cable capacity without multiplying time',()=>{
 const p=project(),original=JSON.stringify(p),r=calc(p,p.lines[0],article());
 assert.equal(r.prospectiveCurrentA,5000);
 assert.equal(r.letThroughUpperBoundA2s,200000);
 assert.equal(r.conductorCapacityA2s,476100);
 assert.equal(r.energyMarginA2s,276100);
 assert.equal(r.numericalStatus,'PRELIMINARY_PASS');
 assert.equal(r.status,'UNKNOWN');
 assert.equal(r.engineeringApproved,false);
 assert.equal(JSON.stringify(p),original);
});
test('a guaranteed energy bound above k²S² is a blocking failure',()=>{
 const p=project();p.lines[0].letThroughInput.bands[0].maxLetThroughA2s=700000;
 const r=decision(p,()=>article());
 assert.equal(r.rows[0].breakerLetThrough.numericalStatus,'FAIL');
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='LET_THROUGH_CABLE_CAPACITY_EXCEEDED'&&x.level==='BLOCKED'));
});
test('an uncovered prospective current cannot be considered a safe extrapolation',()=>{
 const p=project();p.lines[0].letThroughInput.prospectiveCurrentA=7000;
 const r=calc(p,p.lines[0],article());
 assert.equal(r.numericalStatus,'UNKNOWN');
 assert.equal(r.letThroughUpperBoundA2s,null);
 assert.ok(r.issues.some(x=>x.code==='LET_THROUGH_NO_GUARANTEED_BAND'));
});
test('unsorted, overlapping and incomplete bands are rejected',()=>{
 for(const mutate of [
  x=>x.bands.push({minProspectiveA:5000,maxProspectiveA:9000,
   maxLetThroughA2s:90000,source:'overlap'}),
  x=>x.bands[0].minProspectiveA=7000,
  x=>x.bands[0].maxLetThroughA2s=-1,
  x=>x.bands=[...Array(31)].map((_,i)=>({minProspectiveA:2*i+1,
   maxProspectiveA:2*i+2,maxLetThroughA2s:1000,source:'range'}))
 ]){
  const p=project();mutate(p.lines[0].letThroughInput);
  const r=calc(p,p.lines[0],article());
  assert.equal(r.status,'BLOCKED');
 }
});
test('wrong article, test voltage, frequency, poles or protection standard rejects evidence',()=>{
 for(const mutate of [
  x=>x.articleSku='OTHER',x=>x.articleInA=20,
  x=>x.testVoltageV=400,x=>x.testFrequencyHz=60,
  x=>x.protectionPoles=3,x=>x.deviceStandard='OTHER',
  x=>x.faultModel='L_PE',x=>x.conductorRole='PE'
 ]){
  const p=project();mutate(p.lines[0].letThroughInput);
  assert.equal(calc(p,p.lines[0],article()).status,'BLOCKED');
 }
});
test('missing manufacturer source, guarantee or k basis never approve energy arithmetic',()=>{
 for(const mutate of [
  x=>x.manufacturerSource='',x=>x.manufacturerEnvelopeConfirmed=false,
  x=>x.temperatureBasisConfirmed=false,x=>x.testConditionSource='',
  x=>x.bands[0].source=''
 ]){
  const p=project();mutate(p.lines[0].letThroughInput);
  const r=calc(p,p.lines[0],article());
  assert.equal(r.numericalStatus,'PRELIMINARY_PASS');
  assert.equal(r.status,'UNKNOWN');
  assert.ok(r.issues.length>0);
  assert.equal(r.engineeringApproved,false);
 }
});
test('linked maximum only uses exact model, location and voltage',()=>{
 const p=project(),l=p.lines[0],x=l.letThroughInput;
 l.maximumFaultInput={model:'SINGLE_PHASE_L_N',comparisonPoint:'END-L1',
  u0V:230,cmax:1.1,sourceROhm:.1,sourceXOhm:.02,networkSource:'declared grid',
  segments:[{lengthM:20,phaseROhmKm:.5,neutralROhmKm:.5,
   phaseXOhmKm:.08,neutralXOhmKm:.08,source:'cable',temperatureBasisConfirmed:true}]};
 x.currentBasis='LINKED_MAXIMUM';delete x.prospectiveCurrentA;
 const r=calc(p,l,article());
 assert.ok(r.prospectiveCurrentA>0);
 assert.equal(r.linkedFault.ikMaxA,r.prospectiveCurrentA);
 l.maximumFaultInput.comparisonPoint='BUS';
 const mismatch=calc(p,l,article());
 assert.equal(mismatch.status,'BLOCKED');
 assert.ok(mismatch.issues.some(y=>y.code==='LET_THROUGH_FAULT_SCENARIO_MISMATCH'));
});
test('prints manufacturer energy source, safe ranges and escapes untrusted HTML',()=>{
 const p=project();p.lines[0].letThroughInput.manufacturerSource='<img src=x onerror=alert(1)>';
 const d=decision(p,()=>article()),html=print({sections:{protectionDecision:d}}),
  form=ui(p,'L1',()=>article());
 assert.match(html,/Энергия пропускания аппарата/);
 assert.match(html,/276100/);
 assert.match(html,/declared manufacturer guaranteed range/);
 for(const h of [html,form]){
  assert.doesNotMatch(h,/<img /);
  assert.match(h,/&lt;img /);
 }
});
test('JSON import keeps input, not a fabricated approval',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const p=project(),dest={lines:[{id:'L1',catalogSku:'A'}]};
 const ctx=vm.createContext({});ctx.p=p;ctx.dest=dest;
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','project-state-v2.js'),'utf8'),ctx);
 const got=vm.runInContext('epRestoreProjectExtensionsV2(p,dest)',ctx);
 assert.equal(got.lines[0].letThroughInput.bands.length,1);
 assert.equal(got.lines[0].letThroughInput.articleSku,'A');
});
test('changes to guaranteed energy bounds invalidate cable and device evidence',()=>{
 const {epDesignChangeImpactV1}=require('../design-change-impact-v1.js');
 const before=project(),after=structuredClone(before);
 after.lines[0].letThroughInput.bands[0].maxLetThroughA2s=700000;
 const impact=epDesignChangeImpactV1(before,after);
 assert.ok(impact.changed.includes('cable'));
 assert.ok(impact.affected.includes('device'));
 assert.equal(impact.engineeringApproved,false);
});
