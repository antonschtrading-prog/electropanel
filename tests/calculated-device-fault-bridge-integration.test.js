'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
global.epDeviceFaultSupplyFingerprintV1=require('../device-fault-scenarios-v1.js').epDeviceFaultSupplyFingerprintV1;
global.epTransformerSourceV1=require('../transformer-source-v1.js').epTransformerSourceV1;
global.epMaximumFaultCurrentV2=require('../fault-route-design-v2.js').epMaximumFaultCurrentV2;
global.epCalculatedDeviceFaultAuditV1=require('../calculated-device-fault-bridge-v1.js').epCalculatedDeviceFaultAuditV1;
global.epCalculatedDeviceFaultNormalizeV1=require('../calculated-device-fault-bridge-v1.js').epCalculatedDeviceFaultNormalizeV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epRestoreProjectExtensionsV2:restore}=require('../project-state-v2.js');
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const {epCalculatedDeviceFaultBindV1:bind}=require('../calculated-device-fault-bridge-v1.js');
const verified=()=>({sku:'B1',kind:'MCB',poles:3,icnKa:16,icnVoltageV:400,
 icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'});
const project=()=>({earthing:'TN-S',title:'Ik from RX',
 lines:[{id:'L1',phase:'3Ф',catalogSku:'B1',
 maximumFaultInput:{model:'THREE_PHASE_POSITIVE_SEQUENCE',comparisonPoint:'BRANCH:BD1',
  sourceModel:'DECLARED_RX',uLLV:400,cmax:1.1,sourceROhm:.04,sourceXOhm:.03,
  networkSource:'Network model 2026/1',segments:[{lengthM:30,r1OhmKm:.4,
   x1OhmKm:.08,source:'Copper reference',temperatureBasisConfirmed:true}]}}],
 branchDevices:[{id:'BD1',circuitId:'L1'}],sharedDevices:[],
 deviceSupplyV1:{version:1,incomingDevices:[],
 links:[{from:'SOURCE:MAIN',to:'BRANCH:BD1',conductors:['L1','L2','L3','N']}]}});
test('existing calculated R/X study is saved through project restore and engineering print',()=>{
 const raw=project();raw.calculatedDeviceFaultBindingsV1=bind(raw,'BRANCH:BD1',verified);
 const before=JSON.stringify(raw),target=project();
 restore(raw,target);
 assert.deepEqual(target.calculatedDeviceFaultBindingsV1,raw.calculatedDeviceFaultBindingsV1);
 assert.equal(JSON.stringify(raw),before);
 const b=bundle(target,verified);
 assert.equal(b.sections.calculatedDeviceFault.rows.length,1);
 assert.ok(b.sections.calculatedDeviceFault.rows[0].ikMaxKa>0);
 assert.equal(b.sections.calculatedDeviceFault.rows[0].stale,false);
 assert.match(print(b),/Расчётные точки аппаратов: существующий движок R\/X/);
 assert.equal(b.ready_for_installation,false);
});
test('altered supply circuit survives import but is explicitly blocked as stale',()=>{
 const raw=project();raw.calculatedDeviceFaultBindingsV1=bind(raw,'BRANCH:BD1',verified);
 raw.deviceSupplyV1.links[0].conductors=['L1','L2','L3'];
 const target=project();restore(raw,target);
 const b=bundle(target,verified);
 assert.equal(b.statuses.calculatedDeviceFault,'BLOCKED');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='CALC_DEVICE_BINDING_STALE'));
});
test('reject forged approval and duplicate binding during project import',()=>{
 const raw=project();raw.calculatedDeviceFaultBindingsV1=bind(raw,'BRANCH:BD1',verified);
 for(const invalid of [
  [{...raw.calculatedDeviceFaultBindingsV1[0],engineeringApproved:true}],
  [...raw.calculatedDeviceFaultBindingsV1,raw.calculatedDeviceFaultBindingsV1[0]]]){
  assert.throws(()=>restore({...raw,calculatedDeviceFaultBindingsV1:invalid},project()),/CALC_DEVICE_BINDING_ENTRY_INVALID/);
 }
});
test('legacy project without bindings does not pretend that maximum R/X belongs to device',()=>{
 const raw=project(),target=project();restore(raw,target);
 const b=bundle(target,verified);assert.equal(b.sections.calculatedDeviceFault.rows.length,0);
 assert.ok(b.sections.calculatedDeviceFault.issues.some(x=>x.code==='CALC_DEVICE_EXPLICIT_POINT_BINDING_MISSING'));
});
