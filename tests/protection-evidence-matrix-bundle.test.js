'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
global.epDeviceSupplyAuditV1=require('../device-supply-v1.js').epDeviceSupplyAuditV1;
global.epDeviceFaultSupplyFingerprintV1=require('../device-fault-scenarios-v1.js').epDeviceFaultSupplyFingerprintV1;
global.epTransformerSourceV1=require('../transformer-source-v1.js').epTransformerSourceV1;
global.epMaximumFaultCurrentV2=require('../fault-route-design-v2.js').epMaximumFaultCurrentV2;
global.epIncomingMaximumAuditV1=require('../incoming-maximum-fault-v1.js').epIncomingMaximumAuditV1;
global.epCalculatedDeviceFaultAuditV1=require('../calculated-device-fault-bridge-v1.js').epCalculatedDeviceFaultAuditV1;
global.epDeviceFaultAuditV1=require('../device-fault-scenarios-v1.js').epDeviceFaultAuditV1;
global.epCoordAuditV1=require('../device-coordination-evidence-v1.js').epCoordAuditV1;
global.epProtectionEvidenceMatrixV1=require('../protection-evidence-matrix-v1.js').epProtectionEvidenceMatrixV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const {epProtectionEvidenceMatrixCsvV1:csv}=require('../protection-evidence-matrix-v1.js');
const project=()=>({title:'Apparatus actions',lines:[{id:'L1',phase:'L1',catalogSku:'MCB-1'}],
 branchDevices:[{id:'BR1',circuitId:'L1'}],sharedDevices:[],
 deviceSupplyV1:{version:1,incomingDevices:[{id:'Q0',label:'Main',catalogSku:'MCB-M'}],
 links:[{from:'SOURCE:MAIN',to:'INCOMING:Q0',conductors:['L1','N']},
 {from:'INCOMING:Q0',to:'BRANCH:BR1',conductors:['L1','N']}]}});
test('combined evidence matrix is visible in print with per-device gaps and remains draft',()=>{
 const p=project(),before=JSON.stringify(p),b=bundle(p,()=>null);
 assert.equal(b.sections.protectionEvidenceMatrix.rows.length,2);
 assert.ok(b.sections.protectionEvidenceMatrix.rows.some(x=>x.kind==='INCOMING'));
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='PROTECTION_MATRIX_INCOMING_MAX_STUDY_REQUIRED'));
 assert.match(print(b),/Матрица недостающих инженерных данных по аппаратам/);
 assert.equal(b.sections.protectionEvidenceMatrix.engineeringApproved,false);
 assert.equal(b.ready_for_installation,false);
 assert.equal(JSON.stringify(p),before);
});
test('matrix CSV preserves apparatus identity without fake selection approval',()=>{
 const b=bundle(project(),()=>null);
 const report=csv(b.sections.protectionEvidenceMatrix);
 assert.ok(report.includes('INCOMING:Q0'));assert.ok(report.includes('BRANCH:BR1'));
 assert.ok(report.includes('CALCULATED'));
 assert.ok(!report.includes('APPROVED'));
});
test('unknown project cannot become physically ready just because no user input was added',()=>{
 const p=project();p.deviceSupplyV1.links=[];
 const b=bundle(p,()=>null);
 assert.equal(b.sections.protectionEvidenceMatrix.engineeringApproved,false);
 assert.equal(b.sections.protectionEvidenceMatrix.ready_for_installation,false);
 assert.ok(b.sections.protectionEvidenceMatrix.issues.some(x=>x.code==='PROTECTION_MATRIX_SUPPLY_PARENT_REQUIRED'));
});
