'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCableOverloadCoordinationV1:calc}=require('../cable-overload-coordination-v1.js');
const {epProtectionDecisionV1:decide}=require('../protection-decision-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const {epCableOverloadHtmlV1:form}=require('../cable-overload-ui-v1.js');
global.epCableOverloadCoordinationV1=calc;
const fault=require('../fault-route-design-v2.js');
global.epMaximumFaultCurrentV2=fault.epMaximumFaultCurrentV2;
global.epFaultRouteReviewV2=fault.epFaultRouteReviewV2;
const article=()=>({sku:'A',inA:16,kind:'MCB',verificationStatus:'VERIFIED',label:'C16'});
const input=()=>({model:'CABLE_DECLARED_BASE_WITH_CORRECTIONS',articleSku:'A',articleInA:16,
 baseIzA:30,baseIzSource:'Cable rating with reference installation conditions',
 factors:[{id:'ambient',value:.8,source:'declared table correction'},
  {id:'group',value:.9,source:'declared circuit grouping'}],
 i2A:23,i2Source:'manufacturer guaranteed conventional response',
 i2Standard:'manufacturer device standard and edition',
 applicabilitySource:'engineer reviewed installation conditions',applicationReviewed:true});
const project=()=>({earthing:'TN-S',lines:[{id:'L1',phase:'L1',catalogSku:'A',device:'C16',
 overloadInput:{ibA:12,izA:21.6},overloadCoordinationInput:input()}]});
test('multiplicative cable derating and I2 limit use declared source values',()=>{
 const p=project(),before=JSON.stringify(p),r=calc(p,p.lines[0],article());
 assert.ok(Math.abs(r.correctedIzA-21.6)<1e-12);
 assert.ok(Math.abs(r.i2LimitA-31.32)<1e-12);
 assert.equal(r.ibInStatus,'PRELIMINARY_PASS');
 assert.equal(r.inIzStatus,'PRELIMINARY_PASS');
 assert.equal(r.i2IzStatus,'PRELIMINARY_PASS');
 assert.equal(r.status,'UNKNOWN');
 assert.equal(r.engineeringApproved,false);
 assert.equal(JSON.stringify(p),before);
});
test('I2 above 1.45 Iz is blocking even if Ib<=In<=Iz',()=>{
 const p=project();p.lines[0].overloadCoordinationInput.i2A=35;
 const r=decide(p,()=>article());
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.rows[0].overloadCoordination.i2IzStatus,'FAIL');
 assert.ok(r.issues.some(x=>x.code==='CABLE_OVERLOAD_I2_EXCEEDS_1_45_IZ'));
 assert.equal(r.rows[0].currentChecks.ibVsIn,'PRELIMINARY_PASS');
 assert.equal(r.rows[0].currentChecks.inVsIz,'PRELIMINARY_PASS');
});
test('conservative lower Iz wins; inflated manual Iz is flagged',()=>{
 const p=project();p.lines[0].overloadInput.izA=30;
 const r=calc(p,p.lines[0],article());
 assert.equal(r.comparisonIzA,21.6);
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='CABLE_OVERLOAD_DECLARED_IZ_EXCEEDS_CORRECTED'));
});
test('derated Iz below In produces a blocking error',()=>{
 const p=project();
 p.lines[0].overloadCoordinationInput.factors[0].value=.4;
 const r=calc(p,p.lines[0],article());
 assert.equal(r.inIzStatus,'FAIL');
 assert.ok(r.issues.some(x=>x.code==='CABLE_OVERLOAD_IN_EXCEEDS_IZ'));
});
test('invalid numeric values, unsupported increase factors and duplicate correction keys are rejected',()=>{
 for(const mutate of [
  x=>x.factors[0].value=1.1,x=>x.factors[0].value=0,
  x=>x.factors[0].value=true,x=>x.factors[1].id='ambient',
  x=>x.i2A='1e5',x=>x.baseIzA=-1,x=>x.model='UNKNOWN',
  x=>x.factors.push(...Array(12).fill({id:'extra',value:.9,source:'source'}))
 ]){
  const p=project();mutate(p.lines[0].overloadCoordinationInput);
  const r=calc(p,p.lines[0],article());
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.engineeringApproved,false);
 }
});
test('article change, unsupported kind and missing manufacturer source do not approve',()=>{
 const p=project();
 assert.equal(calc(p,p.lines[0],{...article(),inA:20}).status,'BLOCKED');
 p.lines[0].catalogSku='OTHER';
 assert.equal(calc(p,p.lines[0],article()).status,'BLOCKED');
 p.lines[0].catalogSku='A';
 assert.equal(calc(p,p.lines[0],{...article(),kind:'RCD'}).status,'BLOCKED');
 p.lines[0].overloadCoordinationInput.i2Source='';
 const r=calc(p,p.lines[0],article());
 assert.ok(r.issues.some(x=>x.code==='CABLE_OVERLOAD_I2_SOURCE_MISSING'));
 assert.equal(r.engineeringApproved,false);
});
test('missing I2 proof remains unknown in overall protection decision',()=>{
 const p=project();delete p.lines[0].overloadCoordinationInput;
 const r=decide(p,()=>article());
 assert.equal(r.status,'UNKNOWN');
 assert.ok(r.issues.some(x=>x.code==='PROTECTION_OVERLOAD_I2_EVIDENCE_MISSING'));
});
test('print includes corrected Iz, operating I2, 1.45 Iz and source provenance',()=>{
 const p=project(),report=decide(p,()=>article());
 const html=print({sections:{protectionDecision:report}});
 assert.match(html,/Защита кабеля от перегрузки/);
 assert.match(html,/declared table correction/);
 assert.match(html,/manufacturer guaranteed conventional response/);
 assert.match(html,/31\.32/);
});
test('untrusted factor source is HTML escaped in editor and report',()=>{
 const p=project();p.lines[0].overloadCoordinationInput.factors[0].source='<img src=x onerror=alert(1)>';
 const h=form(p,'L1',()=>article());
 const printable=print({sections:{protectionDecision:decide(p,()=>article())}});
 for(const s of [h,printable]){
  assert.doesNotMatch(s,/<img /);
  assert.match(s,/&lt;img/);
 }
});

test('declared overload input survives project JSON import without trusting derived results',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const source=project(),dest={lines:[{id:'L1',catalogSku:'A'}]};
 const context=vm.createContext({});context.raw=source;context.dest=dest;
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','project-state-v2.js'),'utf8'),context);
 const restored=vm.runInContext('epRestoreProjectExtensionsV2(raw,dest)',context);
 assert.equal(restored.lines[0].overloadCoordinationInput.i2A,23);
 assert.equal(restored.lines[0].overloadCoordinationInput.factors[1].value,.9);
 assert.equal(restored.lines[0].overloadCoordinationInput.baseIzSource,
  'Cable rating with reference installation conditions');
});
test('change-impact invalidates cable and protective calculations when I2 changes',()=>{
 const {epDesignChangeImpactV1}=require('../design-change-impact-v1.js');
 const old=project(),next=structuredClone(old);
 next.lines[0].overloadCoordinationInput.i2A=35;
 const impact=epDesignChangeImpactV1(old,next);
 assert.ok(impact.changed.includes('cable'));
 assert.ok(impact.affected.includes('device'));
 assert.equal(impact.engineeringApproved,false);
});
