'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyAuditV1=require('../device-supply-v1.js').epDeviceSupplyAuditV1;
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
global.epDeviceFaultSupplyFingerprintV1=require('../device-fault-scenarios-v1.js').epDeviceFaultSupplyFingerprintV1;
global.epTransformerSourceV1=require('../transformer-source-v1.js').epTransformerSourceV1;
global.epMaximumFaultCurrentV2=require('../fault-route-design-v2.js').epMaximumFaultCurrentV2;
global.epCalculatedDeviceFaultAuditV1=require('../calculated-device-fault-bridge-v1.js').epCalculatedDeviceFaultAuditV1;
global.epIncomingMaximumAuditV1=require('../incoming-maximum-fault-v1.js').epIncomingMaximumAuditV1;
global.epDeviceFaultAuditV1=require('../device-fault-scenarios-v1.js').epDeviceFaultAuditV1;
global.epCoordAuditV1=require('../device-coordination-evidence-v1.js').epCoordAuditV1;
const {epProtectionEvidenceMatrixV1:matrix,epProtectionEvidenceMatrixHtmlV1:html,
 epProtectionEvidenceMatrixCsvV1:csv}=require('../protection-evidence-matrix-v1.js');
const p=()=>({lines:[{id:'L1',phase:'L1',catalogSku:'A'}],branchDevices:[{id:'BD1',circuitId:'L1'}],
 sharedDevices:[],deviceSupplyV1:{version:1,incomingDevices:[{id:'Q0',label:'Main',catalogSku:'B'}],
 links:[{from:'SOURCE:MAIN',to:'INCOMING:Q0',conductors:['L1','N']},
 {from:'INCOMING:Q0',to:'BRANCH:BD1',conductors:['L1','N']}]}});
test('matrix shows actionable missing studies per actual apparatus',()=>{
 const project=p(),before=JSON.stringify(project),r=matrix(project,()=>null);
 assert.equal(r.rows.length,2);
 assert.ok(r.rows.find(x=>x.kind==='INCOMING').actions.includes('PROTECTION_MATRIX_INCOMING_MAX_STUDY_REQUIRED'));
 assert.ok(r.rows.find(x=>x.kind==='BRANCH').actions.includes('PROTECTION_MATRIX_BRANCH_RX_BINDING_REQUIRED'));
 assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
 assert.equal(JSON.stringify(project),before);
});
test('missing graph never grants readiness',()=>{
 const project=p();delete project.deviceSupplyV1;
 const r=matrix(project,()=>null);assert.equal(r.engineeringApproved,false);
 assert.ok(r.issues.some(x=>x.code==='PROTECTION_MATRIX_SUPPLY_PARENT_REQUIRED'));
});
test('external components unavailable are blockers, not hidden gaps',()=>{
 const old=global.epCoordAuditV1;
 global.epCoordAuditV1=undefined;
 try{const r=matrix(p(),()=>null);assert.equal(r.status,'BLOCKED');
  assert.ok(r.issues.some(x=>x.code==='PROTECTION_MATRIX_MANUFACTURER_PAIR_UNAVAILABLE'));
 }finally{global.epCoordAuditV1=old;}
});
test('HTML escapes device IDs and review actions',()=>{
 const result=html({status:'UNKNOWN',rows:[{deviceNodeId:'<img src=x onerror=1>',
 kind:'BRANCH',calculatedIkMaxKa:null,coordinationRecords:0,
 actions:['REVIEW'],status:'UNKNOWN'}]});
 assert.ok(result.includes('&lt;img src=x onerror=1&gt;'));
 assert.ok(!result.includes('<img src=x onerror=1>'));
});
test('CSV quotes formulas and serializes per-device actions',()=>{
 const result=csv({rows:[{deviceNodeId:'=HYPERLINK("x")',kind:'BRANCH',sku:'A',
 declaredSupply:false,calculatedIkMaxKa:null,manualIkMaxKa:null,coordinationRecords:0,
 evidenceStale:false,status:'UNKNOWN',actions:['REVIEW']}]});
 assert.equal(result.charCodeAt(0),0xfeff);
 assert.ok(result.includes("'=HYPERLINK"));
 assert.ok(result.includes('REVIEW'));
});
