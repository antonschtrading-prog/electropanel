'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
global.epDeviceSupplyAuditV1=require('../device-supply-v1.js').epDeviceSupplyAuditV1;
global.epDeviceFaultSupplyFingerprintV1=require('../device-fault-scenarios-v1.js').epDeviceFaultSupplyFingerprintV1;
global.epTransformerSourceV1=require('../transformer-source-v1.js').epTransformerSourceV1;
global.epMaximumFaultCurrentV2=require('../fault-route-design-v2.js').epMaximumFaultCurrentV2;
global.epCalculatedDeviceFaultAuditV1=require('../calculated-device-fault-bridge-v1.js').epCalculatedDeviceFaultAuditV1;
global.epIncomingMaximumAuditV1=require('../incoming-maximum-fault-v1.js').epIncomingMaximumAuditV1;
global.epDeviceFaultAuditV1=require('../device-fault-scenarios-v1.js').epDeviceFaultAuditV1;
global.epCoordAuditV1=require('../device-coordination-evidence-v1.js').epCoordAuditV1;
const {epProtectionEvidenceMatrixV1}=require('../protection-evidence-matrix-v1.js');
const {epIncomingMaximumNormalizeV1}=require('../incoming-maximum-fault-v1.js');
const {epCalculatedDeviceFaultNormalizeV1}=require('../calculated-device-fault-bridge-v1.js');
const make=()=>{
 const lines=Array.from({length:400},(_,i)=>({id:'C'+i,phase:'L1',catalogSku:'SKU'}));
 const branches=lines.map((x,i)=>({id:'B'+i,circuitId:x.id}));
 const incoming=Array.from({length:50},(_,i)=>({id:'Q'+i,label:'Input '+i,catalogSku:'SKU-M'}));
 const links=[...incoming.map(x=>({from:'SOURCE:MAIN',to:'INCOMING:'+x.id,conductors:['L1','N']})),
  ...branches.map((b,i)=>({from:'INCOMING:Q'+(i%50),to:'BRANCH:'+b.id,conductors:['L1','N']}))];
 return {lines,branchDevices:branches,sharedDevices:[],
  deviceSupplyV1:{version:1,incomingDevices:incoming,links}};
};
test('400 outgoing and 50 incoming devices produce bounded non-approved evidence matrix',()=>{
 const p=make();p.designRequirementsV1={externalNetwork:true};
 const report=epProtectionEvidenceMatrixV1(p,()=>null);
 assert.equal(report.rows.length,450);
 assert.equal(report.engineeringApproved,false);
 assert.equal(report.ready_for_installation,false);
 assert.ok(report.issues.some(x=>x.code==='PROTECTION_MATRIX_BRANCH_RX_BINDING_REQUIRED'));
});
test('maximum incoming study array hard cap rejects oversize import',()=>{
 const p=make();assert.throws(()=>epIncomingMaximumNormalizeV1(p,Array(51).fill({})),/INCOMING_MAX_LIST_INVALID/);
});
test('400 branch binding records cannot smuggle an extra duplicate or invented approval',()=>{
 const p=make();
 assert.throws(()=>epCalculatedDeviceFaultNormalizeV1(p,Array(401).fill({})),/CALC_DEVICE_BINDINGS_INVALID/);
});
test('corrupt repeated edge parent remains blocked at scale',()=>{
 const p=make();p.deviceSupplyV1.links.push(p.deviceSupplyV1.links[50]);
 const r=epProtectionEvidenceMatrixV1(p,()=>null);
 assert.equal(r.engineeringApproved,false);
});
