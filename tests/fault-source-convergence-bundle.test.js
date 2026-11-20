'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
global.epDeviceSupplyAuditV1=require('../device-supply-v1.js').epDeviceSupplyAuditV1;
global.epDeviceFaultSupplyFingerprintV1=require('../device-fault-scenarios-v1.js').epDeviceFaultSupplyFingerprintV1;
global.epTransformerSourceV1=require('../transformer-source-v1.js').epTransformerSourceV1;
global.epMaximumFaultCurrentV2=require('../fault-route-design-v2.js').epMaximumFaultCurrentV2;
const incoming=require('../incoming-maximum-fault-v1.js');
const branch=require('../calculated-device-fault-bridge-v1.js');
global.epIncomingMaximumAuditV1=incoming.epIncomingMaximumAuditV1;
global.epCalculatedDeviceFaultAuditV1=branch.epCalculatedDeviceFaultAuditV1;
global.epFaultSourceConvergenceV1=require('../fault-source-convergence-v1.js').epFaultSourceConvergenceV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const catalogue=()=>({kind:'MCB',sku:'SKU',poles:3,icnKa:25,icnVoltageV:400,
 icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'});
const p=()=>{
 const input={sourceModel:'DECLARED_RX',uLLV:400,cmax:1.1,
  sourceROhm:0.04,sourceXOhm:0.03,networkSource:'Source equivalent at board incoming'};
 const project={earthing:'TN-S',title:'R/X source equivalence',
 lines:[{id:'L1',phase:'3Ф',catalogSku:'SKU',maximumFaultInput:{
  ...input,model:'THREE_PHASE_POSITIVE_SEQUENCE',comparisonPoint:'BRANCH:B1',
  segments:[{lengthM:30,r1OhmKm:0.4,x1OhmKm:0.08,source:'Conductor R/X',temperatureBasisConfirmed:true}]}}],
 branchDevices:[{id:'B1',circuitId:'L1'}],sharedDevices:[],feedLinks:[],groupInputLinks:[],
 deviceSupplyV1:{version:1,incomingDevices:[{id:'Q0',label:'In',catalogSku:'SKU'}],
 links:[{from:'SOURCE:MAIN',to:'INCOMING:Q0',conductors:['L1','L2','L3','N']},
 {from:'INCOMING:Q0',to:'BRANCH:B1',conductors:['L1','L2','L3','N']}]}};
 project.incomingMaximumStudiesV1=incoming.epIncomingMaximumDeclareV1(project,'INCOMING:Q0',input,catalogue);
 project.calculatedDeviceFaultBindingsV1=branch.epCalculatedDeviceFaultBindV1(project,'BRANCH:B1',catalogue);
 return project;
};
test('engineering report shares exact network basis for source/branch fault convergence',()=>{
 const project=p(),before=JSON.stringify(project),b=bundle(project,catalogue);
 const row=b.sections.faultSourceConvergence.rows[0];
 assert.equal(row.sourceConditions,'DECLARED_SAME_SOURCE');
 assert.ok(row.branchIkMaxKa<row.incomingIkMaxKa);
 assert.equal(b.sections.faultSourceConvergence.engineeringApproved,false);
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='FAULT_SOURCE_NUMERIC_ORDER_ONLY'));
 const rendered=print(b);assert.match(rendered,/Сравнение максимального КЗ: вводной и отходящая линия/);
 assert.equal(JSON.stringify(project),before);
 assert.equal(b.ready_for_installation,false);
});
test('mutated source segment is blocked throughout engineering dossier',()=>{
 const project=p();project.lines[0].maximumFaultInput.sourceROhm=0.03;
 const b=bundle(project,catalogue);
 assert.equal(b.statuses.faultSourceConvergence,'BLOCKED');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='FAULT_SOURCE_PAIR_STUDY_STALE'));
});
test('different source documentation cannot become comparable just by matching numbers',()=>{
 const project=p(),old=project.lines[0].maximumFaultInput;
 project.lines[0].maximumFaultInput={...old,networkSource:'A different source'};
 project.calculatedDeviceFaultBindingsV1=branch.epCalculatedDeviceFaultBindV1(project,'BRANCH:B1',catalogue);
 const row=bundle(project,catalogue).sections.faultSourceConvergence.rows[0];
 assert.equal(row.sourceConditions,'NOT_COMPARABLE');
});
