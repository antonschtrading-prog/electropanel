'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
global.epDeviceFaultNormalizeV1=require('../device-fault-scenarios-v1.js').epDeviceFaultNormalizeV1;
global.epDeviceFaultAuditV1=require('../device-fault-scenarios-v1.js').epDeviceFaultAuditV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epRestoreProjectExtensionsV2:restore}=require('../project-state-v2.js');
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const {epDeviceFaultDeclareV1:declare}=require('../device-fault-scenarios-v1.js');
const project=()=>({title:'Fault study',lines:[{id:'L1',phase:'L1',catalogSku:'MCB-A'}],
 branchDevices:[{id:'B1',circuitId:'L1'}],sharedDevices:[],groupInputLinks:[],feedLinks:[],
 deviceSupplyV1:{version:1,incomingDevices:[],
 links:[{from:'SOURCE:MAIN',to:'BRANCH:B1',conductors:['L1','N']}]}});
const article={kind:'MCB',icnKa:6,icnVoltageV:230,icnStandard:'IEC 60898-1',
 verificationStatus:'VERIFIED'};
test('project import retains device-specific fault scenario and engineering print',()=>{
 const raw=project();raw.deviceFaultScenariosV1=declare(raw,'BRANCH:B1',5,230,'Design study D-1','2026/A');
 const p=project(),before=JSON.stringify(raw);restore(raw,p);
 assert.deepEqual(p.deviceFaultScenariosV1,raw.deviceFaultScenariosV1);
 assert.equal(JSON.stringify(raw),before);
 const b=bundle(p,()=>article);
 assert.equal(b.sections.deviceFaultScenarios.rows.length,1);
 assert.equal(b.sections.deviceFaultScenarios.rows[0].numericalComparison,'PRELIMINARY_NUMERIC_WITHIN_ICN');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='DEVICE_FAULT_LOCATION_STUDY_REQUIRES_INDEPENDENT_REVIEW'));
 assert.match(print(b),/Исследования максимального тока КЗ в точках защитных аппаратов/);
 assert.equal(b.ready_for_installation,false);
});
test('wrong fault location or supply path becomes blocking after importing stale record',()=>{
 const raw=project();raw.deviceFaultScenariosV1=declare(raw,'BRANCH:B1',8,230,'Study','Revision A');
 raw.deviceSupplyV1.incomingDevices.push({id:'Q0',label:'Input'});
 raw.deviceSupplyV1.links=[{from:'SOURCE:MAIN',to:'INCOMING:Q0',conductors:['L1','N']},
 {from:'INCOMING:Q0',to:'BRANCH:B1',conductors:['L1','N']}];
 const p=project();p.deviceSupplyV1=raw.deviceSupplyV1;
 restore(raw,p);
 const b=bundle(p,()=>article);
 assert.equal(b.statuses.deviceFaultScenarios,'BLOCKED');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='DEVICE_FAULT_SUPPLY_PATH_CHANGED'));
 assert.equal(b.ready_for_installation,false);
});
test('tampered, unsupported and duplicate fault evidence is rejected at project import',()=>{
 const raw=project();raw.deviceFaultScenariosV1=declare(raw,'BRANCH:B1',5,230,'Source','A');
 const p=project();
 for(const list of [
  [{...raw.deviceFaultScenariosV1[0],approval:true}],
  [raw.deviceFaultScenariosV1[0],raw.deviceFaultScenariosV1[0]],
  [{...raw.deviceFaultScenariosV1[0],ikMaxKa:Infinity}],
  [{...raw.deviceFaultScenariosV1[0],sourceDocument:''}]
 ]){
  assert.throws(()=>restore({...raw,deviceFaultScenariosV1:list},p),/DEVICE_FAULT_/);
 }
});
test('legacy project without fault study remains valid but contains no fabricated results',()=>{
 const p=project(),r=restore(p,project());assert.equal(r.deviceFaultScenariosV1,undefined);
 const b=bundle(r,()=>article);assert.equal(b.sections.deviceFaultScenarios.rows.length,0);
 assert.ok(b.sections.deviceFaultScenarios.issues.some(x=>x.code==='DEVICE_FAULT_LOCATION_STUDY_MISSING'));
});
