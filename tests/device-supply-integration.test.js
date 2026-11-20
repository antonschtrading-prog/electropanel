'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const mod=require('../device-supply-v1.js');
global.epDeviceSupplyValidateV1=mod.epDeviceSupplyValidateV1;
global.epDeviceSupplyAuditV1=mod.epDeviceSupplyAuditV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epRestoreProjectExtensionsV2:restore}=require('../project-state-v2.js');
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const project=()=>({title:'Electrical graph',lines:[{id:'L1',phase:'L1'}],
 branchDevices:[{id:'B1',circuitId:'L1'}],sharedDevices:[],
 projectExtensionsVersion:1,feedLinks:[],groupInputLinks:[]});
test('version 1 device supply survives project restoration and bundle/print',()=>{
 const raw={...project(),deviceSupplyV1:{version:1,incomingDevices:[{id:'Q0',label:'Ввод'}],
 links:[{from:'SOURCE:MAIN',to:'INCOMING:Q0',conductors:['L1','N']},
 {from:'INCOMING:Q0',to:'BRANCH:B1',conductors:['L1','N']}]}};
 const target=project(),before=JSON.stringify(raw);
 restore(raw,target);assert.deepEqual(target.deviceSupplyV1,{...raw.deviceSupplyV1,
 incomingDevices:[{id:'Q0',label:'Ввод',catalogSku:null}]});
 assert.equal(JSON.stringify(raw),before);
 const b=bundle(target,()=>null);assert.equal(b.sections.deviceSupply.edges.length,2);
 assert.equal(b.sections.deviceSupply.selectivityStatus,'NOT_ASSESSED');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='DEVICE_SUPPLY_SELECTIVITY_EVIDENCE_MISSING'));
 const h=print(b);assert.match(h,/Питание между конкретными аппаратами/);assert.match(h,/INCOMING:Q0/);
 assert.equal(b.ready_for_installation,false);
});
test('malformed device supply import is rejected, never repaired silently',()=>{
 const p=project();
 for(const value of [{version:2,incomingDevices:[],links:[]},
 {version:1,incomingDevices:[],links:[{from:'X',to:'BRANCH:B1',conductors:['L1']}]},
 {version:1,incomingDevices:[],links:[{from:'SOURCE:MAIN',to:'BRANCH:B1',conductors:['N']}]}]){
  assert.throws(()=>restore({...p,deviceSupplyV1:value},project()),/DEVICE_SUPPLY_/);
 }
});
test('legacy project lacking new graph is preserved without synthetic supply links',()=>{
 const p=project(),r=restore(p,project());assert.equal(r.deviceSupplyV1,undefined);
});
