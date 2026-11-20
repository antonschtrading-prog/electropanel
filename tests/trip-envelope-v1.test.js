'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epTripEnvelopeV1}=require('../trip-envelope-v1.js');
const fault=require('../fault-route-design-v2.js');
global.epTripEnvelopeV1=epTripEnvelopeV1;
const article={kind:'MCB',inA:16,curve:'C',poles:1,sku:'TEST'};
const sample=()=>({catalogSku:'TEST',faultRouteInput:{tripEnvelope:{
 articleSku:'TEST',articleRatingA:16,curve:'C',source:'declared manufacturer maximum clearing envelope',
 guaranteeBasisConfirmed:true,faultType:'L_PE',
 points:[{currentA:100,maxTimeS:2},{currentA:160,maxTimeS:0.4},{currentA:320,maxTimeS:0.1}]}}});
test('selects first guaranteed threshold without interpolating points',()=>{
 const r=epTripEnvelopeV1(sample(),article,200,0.4);
 assert.equal(r.requiredCurrentA,160);
 assert.equal(r.guaranteedMaxTimeS,0.4);
 assert.equal(r.marginA,40);
 assert.equal(r.numericalStatus,'PRELIMINARY_WITHIN_ENVELOPE');
 assert.equal(r.status,'UNKNOWN');
 assert.equal(r.engineeringApproved,false);
});
test('does not extrapolate a guarantee below the first data point',()=>{
 const r=epTripEnvelopeV1(sample(),article,99,0.4);
 assert.equal(r.guaranteedMaxTimeS,null);
 assert.equal(r.numericalStatus,'NOT_DEMONSTRATED');
 assert.ok(r.issues.some(i=>i.code==='TRIP_ENVELOPE_DISCONNECTION_NOT_DEMONSTRATED'));
});
test('insufficient declared data is unknown, not a certified tripping failure',()=>{
 const r=epTripEnvelopeV1(sample(),article,150,0.4);
 assert.equal(r.requiredCurrentA,160);
 assert.equal(r.numericalStatus,'NOT_DEMONSTRATED');
 assert.equal(r.status,'UNKNOWN');
});
test('missing guarantee provenance does not imply verified disconnection',()=>{
 for(const edit of [x=>x.source='',x=>x.guaranteeBasisConfirmed=false]){
  const line=sample();edit(line.faultRouteInput.tripEnvelope);
  const r=epTripEnvelopeV1(line,article,200,0.4);
  assert.ok(r.issues.some(x=>x.code.includes('SOURCE_MISSING')||x.code.includes('BASIS_UNCONFIRMED')));
  assert.equal(r.status,'UNKNOWN');
  assert.equal(r.engineeringApproved,false);
 }
});
test('rejects impossible, unordered, or excessive envelope points',()=>{
 for(const edit of [
  x=>x.points[1].currentA=50,
  x=>x.points[1].maxTimeS=3,
  x=>x.points[0].currentA=0,
  x=>x.points=[...Array(41)].map((_,i)=>({currentA:i+1,maxTimeS:1})),
  x=>x.articleSku='OTHER',
  x=>x.articleRatingA=20,
  x=>x.curve='B',
  x=>x.faultType='L_N'
 ]){
  const line=sample();edit(line.faultRouteInput.tripEnvelope);
  const r=epTripEnvelopeV1(line,article,200,0.4);
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.engineeringApproved,false);
 }
});
test('L-PE route carries manufacturer envelope and remains a draft',()=>{
 const project={earthing:'TN-S',lines:[{id:'L1',phase:'L1',catalogSku:'TEST',
  cableDesignInput:{sectionMm2:2.5}}]};
 const input={u0V:230,cmin:0.95,sourceROhm:0.1,sourceXOhm:0.05,
  networkSource:'network study',iaA:160,requiredTimeS:0.4,
  tripSource:'manual Ia provenance',timeSource:'time applicability study',
  segments:[{lengthM:25,phaseROhmKm:8,peROhmKm:8,phaseXOhmKm:0.08,peXOhmKm:0.08,
   source:'cable data at design temperature',temperatureBasisConfirmed:true}],
  tripEnvelope:sample().faultRouteInput.tripEnvelope};
 const out=fault.epApplyFaultRouteV2(project,'L1',input,()=>article);
 assert.ok(out.project);
 assert.equal(out.report.tripEnvelope.requiredCurrentA,160);
 assert.equal(out.report.tripEnvelope.numericalStatus,'PRELIMINARY_WITHIN_ENVELOPE');
 assert.equal(out.report.thresholdStatus,'PRELIMINARY_PASS');
 assert.equal(out.report.engineeringApproved,false);
});
test('a malformed optional envelope is rejected atomically',()=>{
 const project={earthing:'TN-S',lines:[{id:'L1',phase:'L1',catalogSku:'TEST',
  cableDesignInput:{sectionMm2:2.5}}]};
 const input={u0V:230,cmin:0.95,sourceROhm:0.1,sourceXOhm:0.05,
  networkSource:'network study',iaA:160,requiredTimeS:0.4,
  tripSource:'curve',timeSource:'time basis',
  segments:[{lengthM:25,phaseROhmKm:8,peROhmKm:8,phaseXOhmKm:0.08,peXOhmKm:0.08,
   source:'cable data',temperatureBasisConfirmed:true}],
  tripEnvelope:sample().faultRouteInput.tripEnvelope};
 input.tripEnvelope.points[1].maxTimeS=3;
 const before=JSON.stringify(project);
 const result=fault.epApplyFaultRouteV2(project,'L1',input,()=>article);
 assert.equal(result.project,null);
 assert.equal(JSON.stringify(project),before);
});
