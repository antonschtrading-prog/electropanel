'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyAuditV1=require('../device-supply-v1.js').epDeviceSupplyAuditV1;
global.epDeviceSupplyTerminalReconciliationV1=
 require('../device-supply-terminal-reconciliation-v1.js').epDeviceSupplyTerminalReconciliationV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const project=()=>({title:'Terminal audit',lines:[{id:'L1',phase:'L1'}],
 sharedDevices:[],branchDevices:[{id:'BR1',circuitId:'L1'}],
 deviceSupplyV1:{version:1,incomingDevices:[],links:[
 {from:'SOURCE:MAIN',to:'BRANCH:BR1',conductors:['L1']}]},
 deviceModelV19:{devices:[{id:'DEV1',poles:1}],terminals:[
 {id:'T1',device_id:'DEV1',conductor:'L1'},
 {id:'T2',device_id:'DEV1',conductor:'N'}]},
 boardBindingsV1:[{boardDeviceId:'BR1',modelDeviceId:'DEV1'}],
 wiringModelV18:{terminals:[{id:'T1',device_id:'DEV1',conductor:'L1'},
 {id:'T2',device_id:'DEV1',conductor:'N'}],wires:[]}});
test('terminal reconciliation flows through bundle, issue register and print',()=>{
 const p=project(),before=JSON.stringify(p),b=bundle(p,()=>null);
 const r=b.sections.supplyTerminals;
 assert.equal(r.rows.length,1);assert.equal(r.rows[0].toModelDeviceId,'DEV1');
 assert.equal(r.physicalContinuity,'NOT_VERIFIED');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='SUPPLY_TERMINAL_DIRECT_WIRE_UNPROVEN'));
 assert.match(print(b),/Сверка с терминальной моделью/);
 assert.equal(JSON.stringify(p),before);
 assert.equal(b.ready_for_installation,false);
});
test('known cross-role wire remains blocking in exported engineering dossier',()=>{
 const p=project();p.wiringModelV18.wires=[{from:'T1',to:'T2'}];
 const b=bundle(p,()=>null);
 assert.equal(b.statuses.supplyTerminals,'BLOCKED');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='SUPPLY_TERMINAL_WIRE_ROLE_CONFLICT'&&x.level==='BLOCKED'));
});
