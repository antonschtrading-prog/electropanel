'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epNeutralSegregationV1:a}=require('../neutral-segregation-v1');
const p=()=>({lines:[{id:'L1'},{id:'L2'},{id:'L3'}],
 sharedDevices:[{id:'RCD1',circuitIds:['L1','L2']}],
 conductorRoutes:[{circuitId:'L1',neutralBus:'N_RCD1',protectiveBus:'PE_MAIN'},
 {circuitId:'L2',neutralBus:'N_RCD1',protectiveBus:'PE_MAIN'},
 {circuitId:'L3',neutralBus:'N_MAIN',protectiveBus:'PE_MAIN'}],
 groupInputLinks:[{groupId:'RCD1',kind:'N',from:'SOURCE:MAIN/N',to:'GROUP:RCD1/IN-N'}]});
test('separate RCD and main N buses remain unknown, never approved',()=>{
 const x=a(p());assert.equal(x.status,'UNKNOWN');assert.equal(x.rows.length,3);
 assert.equal(x.issues.length,1);assert.equal(x.engineeringApproved,false);
});
test('crossed RCD and main N buses are blocked',()=>{
 const x=p();x.conductorRoutes[0].neutralBus='N_MAIN';
 const r=a(x);assert(r.issues.some(i=>i.code==='RCD_NEUTRAL_BUS_MISMATCH'));
 assert(r.issues.some(i=>i.code==='RCD_NEUTRAL_SHARED_BETWEEN_GROUPS'));
});
test('missing PE route is unknown rather than invented',()=>{
 const x=p();x.conductorRoutes[0].protectiveBus=null;
 assert(a(x).issues.some(i=>i.code==='PE_ROUTE_UNVERIFIED'));
});
test('missing N group input is explicitly unknown',()=>{
 const x=p();x.groupInputLinks=[];
 assert(a(x).issues.some(i=>i.code==='RCD_NEUTRAL_INPUT_UNDECLARED'));
});
test('duplicate N input is blocked',()=>{
 const x=p();x.groupInputLinks.push({...x.groupInputLinks[0]});
 assert(a(x).issues.some(i=>i.code==='RCD_NEUTRAL_INPUT_DUPLICATE'));
});
test('stale N input endpoint is blocked',()=>{
 const x=p();x.groupInputLinks[0].to='GROUP:OTHER/IN-N';
 assert(a(x).issues.some(i=>i.code==='RCD_NEUTRAL_INPUT_STALE'));
});
test('one circuit cannot belong to two RCD groups',()=>{
 const x=p();x.sharedDevices.push({id:'RCD2',circuitIds:['L1']});
 assert(a(x).issues.some(i=>i.code==='CIRCUIT_IN_MULTIPLE_RCD_GROUPS'));
});
test('orphan conductor route is blocked',()=>{
 const x=p();x.conductorRoutes.push({circuitId:'MISSING',neutralBus:'N_MAIN'});
 assert(a(x).issues.some(i=>i.code==='NEUTRAL_ROUTE_ORPHAN'));
});
test('duplicate conductor route is blocked',()=>{
 const x=p();x.conductorRoutes.push({...x.conductorRoutes[0]});
 assert(a(x).issues.some(i=>i.code==='NEUTRAL_ROUTE_DUPLICATE'));
});
test('invalid project fails closed',()=>assert.equal(a({lines:[]}).status,'BLOCKED'));
test('segregation audit is pure',()=>{
 const x=p(),before=JSON.stringify(x);a(x);assert.equal(JSON.stringify(x),before);
});
