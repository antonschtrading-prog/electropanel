'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyAuditV1=require('../device-supply-v1.js').epDeviceSupplyAuditV1;
const {epDeviceSupplyCrossEvidenceV1:audit,epDeviceSupplyCrossEvidenceHtmlV1:html}=
 require('../device-supply-cross-evidence-v1.js');
function fixture(){return {
 lines:[{id:'L1',phase:'L1'}],sharedDevices:[],
 branchDevices:[{id:'BD1',circuitId:'L1'}],
 deviceSupplyV1:{version:1,incomingDevices:[],links:[
 {from:'SOURCE:MAIN',to:'BRANCH:BD1',conductors:['L1','N']}]},
 conductorRoutes:[{circuitId:'L1',phaseConductors:['L1']}],
 feedLinks:[{circuitId:'L1',kind:'L1',from:'SOURCE:MAIN/L1'},
 {circuitId:'L1',kind:'N',from:'SOURCE:MAIN/N'}],groupInputLinks:[]};}
test('phase and source declarations reconcile without claiming proof',()=>{
 const p=fixture(),before=JSON.stringify(p),r=audit(p);
 assert.equal(r.rows.length,1);assert.equal(r.rows[0].legacyCount,2);
 assert.equal(r.physicalContinuity,'NOT_VERIFIED');
 assert.equal(r.selectivityStatus,'NOT_ASSESSED');assert.equal(r.engineeringApproved,false);
 assert.equal(JSON.stringify(p),before);
});
test('stale legacy origin is a blocking cross-view error',()=>{
 const p=fixture();p.feedLinks[0].from='GROUP:RCD9/OUT-L1';
 const r=audit(p);assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='SUPPLY_CROSS_LEGACY_ORIGIN_STALE'));
});
test('phase disagreement between route and device graph blocks',()=>{
 const p=fixture();p.conductorRoutes[0].phaseConductors=['L2'];
 const r=audit(p);assert.ok(r.issues.some(x=>x.code==='SUPPLY_CROSS_ROUTE_PHASE_CONFLICT'));
});
test('legacy phase declaration incompatible with supply edge blocks',()=>{
 const p=fixture();p.feedLinks.push({circuitId:'L1',kind:'L2',from:'SOURCE:MAIN/L2'});
 const r=audit(p);assert.ok(r.issues.some(x=>x.code==='SUPPLY_CROSS_LEGACY_PHASE_CONFLICT'));
});
test('incoming chain remains a declared review item, never a false mismatch',()=>{
 const p=fixture();
 p.deviceSupplyV1.incomingDevices=[{id:'Q0',label:'Главный ввод'}];
 p.deviceSupplyV1.links=[
 {from:'SOURCE:MAIN',to:'INCOMING:Q0',conductors:['L1','N']},
 {from:'INCOMING:Q0',to:'BRANCH:BD1',conductors:['L1','N']}];
 const r=audit(p);assert.equal(r.status,'UNKNOWN');assert.equal(r.ready_for_installation,false);
});
test('unsafe user text must be escaped in report',()=>{
 const x=html({status:'UNKNOWN',rows:[{circuitId:'<script>alert(1)</script>',upstream:null,
 deviceConductors:['L1'],legacyCount:0,routeDeclared:false}]});
 assert.ok(x.includes('&lt;script&gt;'));assert.ok(!x.includes('<script>'));
});
