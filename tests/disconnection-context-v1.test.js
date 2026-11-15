'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epDisconnectionContextV1:check}=require('../disconnection-context-v1.js');
const fault=require('../fault-route-design-v2.js');
global.epDisconnectionContextV1=check;
const article={sku:'TEST',kind:'MCB',inA:16,curve:'C',poles:1,modules:1};
const project=()=>({earthing:'TN-S',lines:[{id:'L1',phase:'L1',catalogSku:'TEST',cableDesignInput:{sectionMm2:2.5}}]});
const context=()=>({circuitClass:'FINAL_CIRCUIT',protectiveMeasure:'ADS_OVERCURRENT',
 earthing:'TN-S',phase:'L1',u0V:230,maxAllowedTimeS:0.4,
 standardReference:'Engineer-selected edition and clause',
 timeBasisSource:'Documented applicable time requirement',
 circuitClassSource:'Approved circuit designation',applicabilityReviewed:true});
const input=()=>({u0V:230,cmin:0.95,sourceROhm:0.1,sourceXOhm:0.05,
 networkSource:'source R/X',iaA:160,requiredTimeS:0.4,
 tripSource:'manufacturer current/time data',timeSource:'engineer time classification',
 disconnectionContext:context(),
 segments:[{lengthM:25,phaseROhmKm:8,peROhmKm:8,phaseXOhmKm:0.08,peXOhmKm:0.08,
 source:'cable manufacturer at fault temperature',temperatureBasisConfirmed:true}]});
test('explicit time basis compares only declared numbers without inventing limits',()=>{
 const p=project();p.lines[0].faultRouteInput=input();
 const r=check(p,p.lines[0],article);
 assert.equal(r.numericalStatus,'PRELIMINARY_WITHIN_DECLARED_LIMIT');
 assert.equal(r.maxAllowedTimeS,0.4);
 assert.equal(r.declaredTimeS,0.4);
 assert.equal(r.timeMarginS,0);
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.status,'UNKNOWN');
});
test('an engineer-selected time longer than allowed is a retained blocking design condition',()=>{
 const p=project(),x=input();x.disconnectionContext.maxAllowedTimeS=0.2;
 const out=fault.epApplyFaultRouteV2(p,'L1',x,()=>article);
 assert.ok(out.project,'numerical failure must remain editable');
 assert.equal(out.report.status,'BLOCKED');
 assert.equal(out.report.disconnectionContext.numericalStatus,'FAIL');
 assert.ok(out.report.issues.some(y=>y.code==='FAULT_ROUTE_DISCONNECTION_REQUESTED_TIME_EXCEEDS_LIMIT'&&y.level==='BLOCKED'));
 assert.equal(out.report.engineeringApproved,false);
});
test('incorrect earthing, voltage, circuit class and phase fail without mutating project',()=>{
 const changes=[
  x=>x.earthing='TT',
  x=>x.u0V=400,
  x=>x.circuitClass='MADE_UP',
  x=>x.phase='3Ф',
  x=>x.protectiveMeasure='RCD'
 ];
 for(const change of changes){
  const p=project(),x=input(),original=JSON.stringify(p);
  change(x.disconnectionContext);
  const out=fault.epApplyFaultRouteV2(p,'L1',x,()=>article);
  assert.equal(out.project,null);
  assert.equal(JSON.stringify(p),original);
 }
});
test('missing edition, scope documentation or review cannot produce approval',()=>{
 for(const mutate of [
  x=>x.standardReference='',
  x=>x.timeBasisSource='',
  x=>x.circuitClassSource='',
  x=>x.applicabilityReviewed=false
 ]){
  const p=project();p.lines[0].faultRouteInput=input();
  mutate(p.lines[0].faultRouteInput.disconnectionContext);
  const r=check(p,p.lines[0],article);
  assert.ok(r.issues.length);
  assert.equal(r.status,'UNKNOWN');
  assert.equal(r.engineeringApproved,false);
 }
});
test('oversized source and invalid time cannot pass the project transaction',()=>{
 for(const mutate of [
  x=>x.standardReference='x'.repeat(2001),
  x=>x.maxAllowedTimeS=-1,
  x=>x.maxAllowedTimeS='NaN'
 ]){
  const p=project(),x=input();mutate(x.disconnectionContext);
  const out=fault.epApplyFaultRouteV2(p,'L1',x,()=>article);
  assert.equal(out.project,null);
 }
});
test('context remains independent of minimum fault arithmetic and original current',()=>{
 const p=project(),x=input(),before=JSON.stringify(p);
 const out=fault.epApplyFaultRouteV2(p,'L1',x,()=>article);
 assert.ok(out.project);
 assert.ok(out.report.ikMinA>0);
 assert.equal(out.report.disconnectionContext.maxAllowedTimeS,0.4);
 assert.equal(out.report.thresholdStatus,'PRELIMINARY_PASS');
 assert.equal(JSON.stringify(p),before);
});
