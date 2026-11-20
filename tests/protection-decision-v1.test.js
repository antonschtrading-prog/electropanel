'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fault=require('../fault-route-design-v2.js');
const {epTripEnvelopeV1}=require('../trip-envelope-v1.js');
const {epDisconnectionContextV1}=require('../disconnection-context-v1.js');
const {epProtectionDecisionV1:decide}=require('../protection-decision-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
global.epMaximumFaultCurrentV2=fault.epMaximumFaultCurrentV2;
global.epFaultRouteReviewV2=fault.epFaultRouteReviewV2;
global.epTripEnvelopeV1=epTripEnvelopeV1;
global.epDisconnectionContextV1=epDisconnectionContextV1;
const device=()=>({kind:'MCB',sku:'A',label:'C16',poles:1,modules:1,
 inA:16,icnKa:6,icnVoltageV:230,icnStandard:'IEC 60898-1',curve:'C',
 verificationStatus:'VERIFIED'});
function fixture(){
 const p={earthing:'TN-S',lines:[{id:'L1',phase:'L1',catalogSku:'A',device:'C16',modules:1,
  overloadInput:{ibA:10,izA:20},faultInput:{ikKa:3,voltageV:230},
  maximumFaultInput:{model:'SINGLE_PHASE_L_N',u0V:230,cmax:1.1,
   sourceROhm:0.05,sourceXOhm:0.02,networkSource:'declared grid',
   segments:[{lengthM:20,phaseROhmKm:0.5,neutralROhmKm:0.5,
    phaseXOhmKm:0.08,neutralXOhmKm:0.08,source:'declared cable',
    temperatureBasisConfirmed:true}]}}]};
 const x={u0V:230,cmin:0.95,sourceROhm:0.1,sourceXOhm:0.05,
  networkSource:'declared network',iaA:160,requiredTimeS:0.4,
  tripSource:'manufacturer catalogue',timeSource:'engineer-selected time',
  segments:[{lengthM:20,phaseROhmKm:5,peROhmKm:5,phaseXOhmKm:0.08,
   peXOhmKm:0.08,source:'cable R/X',temperatureBasisConfirmed:true}],
  tripEnvelope:{articleSku:'A',articleRatingA:16,curve:'C',source:'manufacturer upper-bound time',
   guaranteeBasisConfirmed:true,faultType:'L_PE',
   points:[{currentA:100,maxTimeS:2},{currentA:160,maxTimeS:0.4}]},
  disconnectionContext:{circuitClass:'FINAL_CIRCUIT',protectiveMeasure:'ADS_OVERCURRENT',
   earthing:'TN-S',phase:'L1',u0V:230,maxAllowedTimeS:0.4,
   standardReference:'declared revision and clause',
   timeBasisSource:'engineer disconnection requirement',
   circuitClassSource:'final circuit classification',applicabilityReviewed:true}};
 const saved=fault.epApplyFaultRouteV2(p,'L1',x,()=>device());
 assert.ok(saved.project);
 return saved.project;
}
test('unified decision covers cable current, maximum and minimum fault, and ADS independently',()=>{
 const p=fixture(),before=JSON.stringify(p),r=decide(p,()=>device());
 assert.equal(r.rows.length,1);
 const line=r.rows[0];
 assert.equal(line.currentChecks.ibVsIn,'PRELIMINARY_PASS');
 assert.equal(line.currentChecks.inVsIz,'PRELIMINARY_PASS');
 assert.equal(line.breaking.status,'PRELIMINARY_PASS');
 assert.equal(line.minimum.tripTimeStatus,'PRELIMINARY_WITHIN_ENVELOPE');
 assert.equal(line.minimum.allowedTimeStatus,'PRELIMINARY_WITHIN_DECLARED_LIMIT');
 assert.equal(line.status,'UNKNOWN','even complete declared arithmetic is not certification');
 assert.equal(line.engineeringApproved,false);
 assert.equal(r.engineeringApproved,false);
 assert.equal(JSON.stringify(p),before);
});
test('Ib above In remains blocking despite provisionally good fault arithmetic',()=>{
 const p=fixture();p.lines[0].overloadInput.ibA=30;
 const r=decide(p,()=>device());
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.rows[0].currentChecks.ibVsIn,'FAIL');
 assert.ok(r.issues.some(x=>x.code==='PROTECTION_IB_EXCEEDS_IN'&&x.level==='BLOCKED'));
});
test('In above Iz fails while Ib <= In',()=>{
 const p=fixture();p.lines[0].overloadInput.izA=12;
 const r=decide(p,()=>device());
 assert.equal(r.rows[0].currentChecks.ibVsIn,'PRELIMINARY_PASS');
 assert.equal(r.rows[0].currentChecks.inVsIz,'FAIL');
 assert.ok(r.issues.some(x=>x.code==='PROTECTION_IN_EXCEEDS_IZ'));
});
test('independently computed Ikmax over Icn fails even when manual Ik is smaller',()=>{
 const p=fixture();
 const r=decide(p,()=>({...device(),icnKa:3}));
 assert.equal(r.rows[0].breaking.status,'FAIL');
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='PROTECTION_IKMAX_EXCEEDS_ICN'));
});
test('Icu is not an admissible replacement for missing Icn',()=>{
 const r=decide(fixture(),()=>({...device(),icnKa:null,icuKa:15}));
 assert.equal(r.rows[0].breaking.status,'UNKNOWN');
 assert.ok(r.issues.some(x=>x.code==='PROTECTION_IKMAX_OR_ICN_MISSING'));
});
test('minimum L-PE current below Ia is blocking, not masked by other checks',()=>{
 const p=fixture();p.lines[0].faultRouteInput.iaA=1000;
 const r=decide(p,()=>device());
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='FAULT_ROUTE_CURRENT_BELOW_IA'&&x.level==='BLOCKED'));
});
test('declared maximum disconnection time violation propagates to protection decision',()=>{
 const p=fixture();p.lines[0].faultRouteInput.disconnectionContext.maxAllowedTimeS=0.2;
 const r=decide(p,()=>device());
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='PROTECTION_ADS_TIME_LIMIT_EXCEEDED'));
});
test('missing calculations never grant positive decision',()=>{
 const p=fixture();delete p.lines[0].maximumFaultInput;delete p.lines[0].faultRouteInput;
 const r=decide(p,()=>device());
 assert.equal(r.rows[0].breaking.status,'UNKNOWN');
 assert.equal(r.rows[0].minimum.status,'UNKNOWN');
 assert.equal(r.rows[0].status,'UNKNOWN');
 assert.equal(r.engineeringApproved,false);
});
test('unknown, duplicated, unsupported and unverified articles fail closed',()=>{
 const p=fixture();
 assert.equal(decide(p,()=>null).status,'BLOCKED');
 assert.equal(decide(p,()=>({...device(),kind:'RCD'})).status,'BLOCKED');
 assert.equal(decide(p,()=>({...device(),verificationStatus:'UNVERIFIED'})).engineeringApproved,false);
 p.lines.push({...p.lines[0]});
 assert.equal(decide(p,()=>device()).status,'BLOCKED');
 assert.ok(decide(p,()=>device()).issues.some(x=>x.code==='PROTECTION_LINE_INVALID_OR_DUPLICATED'));
});
test('print presents the same decision matrix without modifying project',()=>{
 const p=fixture(),before=JSON.stringify(p);
 const decision=decide(p,()=>device());
 const html=print({sections:{protectionDecision:decision}});
 assert.match(html,/Единая проверка защиты/);
 assert.match(html,/PRELIMINARY_WITHIN_ENVELOPE/);
 assert.match(html,/PRELIMINARY_WITHIN_DECLARED_LIMIT/);
 assert.match(html,/не подтверждают соответствие требованиям/);
 assert.equal(JSON.stringify(p),before);
});
