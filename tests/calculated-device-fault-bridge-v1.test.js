'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
global.epDeviceFaultSupplyFingerprintV1=require('../device-fault-scenarios-v1.js').epDeviceFaultSupplyFingerprintV1;
global.epTransformerSourceV1=require('../transformer-source-v1.js').epTransformerSourceV1;
global.epMaximumFaultCurrentV2=require('../fault-route-design-v2.js').epMaximumFaultCurrentV2;
const api=require('../calculated-device-fault-bridge-v1.js');
const verified=()=>({kind:'MCB',sku:'SKU',poles:3,icnKa:16,icnVoltageV:400,
 icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'});
const input=()=>({model:'THREE_PHASE_POSITIVE_SEQUENCE',comparisonPoint:'BRANCH:B1',uLLV:400,
 cmax:1.1,sourceROhm:0.04,sourceXOhm:0.03,networkSource:'Supply RX study 2026',
 segments:[{lengthM:30,r1OhmKm:0.4,x1OhmKm:0.08,source:'Copper R/X at T',temperatureBasisConfirmed:true}]});
const project=()=>({earthing:'TN-S',
 lines:[{id:'L1',phase:'3Ф',catalogSku:'SKU',maximumFaultInput:input()}],
 branchDevices:[{id:'B1',circuitId:'L1'}],sharedDevices:[],
 deviceSupplyV1:{version:1,incomingDevices:[],links:[
  {from:'SOURCE:MAIN',to:'BRANCH:B1',conductors:['L1','L2','L3','N']}]}});
test('reuses existing maximum fault engine for an exact named protective-device location',()=>{
 const p=project(),before=JSON.stringify(p),next=api.epCalculatedDeviceFaultBindV1(p,'BRANCH:B1',verified);
 assert.equal(next.length,1);assert.equal(next[0].comparisonPoint,'BRANCH:B1');
 assert.ok(next[0].sourcePath.includes('SOURCE:MAIN'));
 assert.equal(JSON.stringify(p),before);
 p.calculatedDeviceFaultBindingsV1=next;
 const r=api.epCalculatedDeviceFaultAuditV1(p,verified);
 assert.equal(r.rows.length,1);assert.ok(r.rows[0].ikMaxKa>0);
 assert.equal(r.rows[0].calculationThreshold,'PRELIMINARY_PASS');
 assert.equal(r.rows[0].stale,false);assert.equal(r.engineeringApproved,false);
});
test('comparison point must name exact branch not just the circuit',()=>{
 const p=project();p.lines[0].maximumFaultInput.comparisonPoint='L1';
 assert.throws(()=>api.epCalculatedDeviceFaultBindV1(p,'BRANCH:B1',verified),/CALC_DEVICE_COMPARISON_POINT_DIFFERENT/);
});
test('missing path and missing maximum model cannot create calculated study',()=>{
 const p=project();p.deviceSupplyV1.links=[];
 assert.throws(()=>api.epCalculatedDeviceFaultBindV1(p,'BRANCH:B1',verified),/DEVICE_FAULT_SUPPLY_PATH_INCOMPLETE/);
 p.deviceSupplyV1.links=project().deviceSupplyV1.links;delete p.lines[0].maximumFaultInput;
 assert.throws(()=>api.epCalculatedDeviceFaultBindV1(p,'BRANCH:B1',verified),/CALC_DEVICE_MAXIMUM_FAULT_INPUT_MISSING/);
});
test('reparented branch, edited R/X, changed SKU or changed point causes blocker',()=>{
 for(const edit of [
  p=>p.deviceSupplyV1.links[0].conductors=['L1','L2','L3'],
  p=>p.lines[0].maximumFaultInput.sourceROhm=.03,
  p=>p.lines[0].catalogSku='OTHER',
  p=>p.lines[0].maximumFaultInput.comparisonPoint='L1',
  p=>p.lines[0].maximumFaultInput.segments[0].lengthM=34]){
  const p=project();p.calculatedDeviceFaultBindingsV1=api.epCalculatedDeviceFaultBindV1(p,'BRANCH:B1',verified);
  edit(p);
  const r=api.epCalculatedDeviceFaultAuditV1(p,verified);
  assert.equal(r.status,'BLOCKED');assert.equal(r.rows[0].ikMaxKa,null);
  assert.ok(r.issues.some(x=>x.code==='CALC_DEVICE_BINDING_STALE'));
 }
});
test('calculated prospective fault above Icn must remain a blocker',()=>{
 const p=project();p.calculatedDeviceFaultBindingsV1=api.epCalculatedDeviceFaultBindV1(p,'BRANCH:B1',()=>({...verified(),icnKa:4}));
 const r=api.epCalculatedDeviceFaultAuditV1(p,()=>({...verified(),icnKa:4}));
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='CALC_DEVICE_IK_EXCEEDS_ICN'));
});
test('existing manual study is not declared numerically comparable without fault model',()=>{
 const p=project();p.calculatedDeviceFaultBindingsV1=api.epCalculatedDeviceFaultBindV1(p,'BRANCH:B1',verified);
 p.deviceFaultScenariosV1=[{deviceNodeId:'BRANCH:B1',ikMaxKa:5}];
 const r=api.epCalculatedDeviceFaultAuditV1(p,verified);
 assert.ok(r.issues.some(x=>x.code==='CALC_DEVICE_MANUAL_STUDY_REQUIRES_MODEL_RECONCILIATION'));
 assert.equal(r.engineeringApproved,false);
});
test('incoming apparatus is not secretly treated as outgoing or an invented line',()=>{
 const p=project();p.deviceSupplyV1.incomingDevices.push({id:'Q0',label:'Main'});
 assert.throws(()=>api.epCalculatedDeviceFaultBindV1(p,'INCOMING:Q0',verified),/CALC_DEVICE_BRANCH_REQUIRED/);
});
test('strict normalized input forbids duplicate and forged status at top level',()=>{
 const p=project(),first=api.epCalculatedDeviceFaultBindV1(p,'BRANCH:B1',verified)[0];
 assert.throws(()=>api.epCalculatedDeviceFaultNormalizeV1(p,[first,first]),/CALC_DEVICE_BINDING_ENTRY_INVALID/);
 assert.throws(()=>api.epCalculatedDeviceFaultNormalizeV1(p,[{...first,engineeringApproved:true}]),/CALC_DEVICE_BINDING_ENTRY_INVALID/);
});
test('clear binding leaves project unchanged',()=>{
 const p=project();p.calculatedDeviceFaultBindingsV1=api.epCalculatedDeviceFaultBindV1(p,'BRANCH:B1',verified);
 const before=JSON.stringify(p),out=api.epCalculatedDeviceFaultClearV1(p,'BRANCH:B1');
 assert.deepEqual(out,[]);assert.equal(JSON.stringify(p),before);
});
test('old projects without a device supply graph are not erroneously marked approved',()=>{
 const p=project();delete p.deviceSupplyV1;
 const r=api.epCalculatedDeviceFaultAuditV1(p,verified);
 assert.equal(r.rows.length,0);assert.equal(r.engineeringApproved,false);
 assert.equal(r.status,'UNKNOWN');
});
test('UI labels escape malformed branch references',()=>{
 const p=project();p.branchDevices[0].circuitId='<script>alert(1)</script>';
 const html=api.epCalculatedDeviceFaultHtmlV1(p,verified);
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>'));
});
