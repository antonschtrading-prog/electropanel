'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const incoming=require('../incoming-terminal-bindings-v1.js');
global.epIncomingTerminalBindingsNormalizeV1=incoming.epIncomingTerminalBindingsNormalizeV1;
global.epIncomingTerminalBindingsAuditV1=incoming.epIncomingTerminalBindingsAuditV1;
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
global.epDeviceSupplyAuditV1=require('../device-supply-v1.js').epDeviceSupplyAuditV1;
global.epDeviceSupplyTerminalReconciliationV1=
 require('../device-supply-terminal-reconciliation-v1.js').epDeviceSupplyTerminalReconciliationV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epRestoreProjectExtensionsV2:restore}=require('../project-state-v2.js');
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const p=()=>({title:'Incoming terminal provenance',
 lines:[{id:'L1',phase:'L1'}],branchDevices:[{id:'B1',circuitId:'L1'}],
 sharedDevices:[],boardBindingsV1:[],
 deviceSupplyV1:{version:1,incomingDevices:[{id:'QF0',label:'Главный',catalogSku:null}],
 links:[{from:'SOURCE:MAIN',to:'INCOMING:QF0',conductors:['L1','N']},
 {from:'INCOMING:QF0',to:'BRANCH:B1',conductors:['L1','N']}]},
 deviceModelV19:{devices:[{id:'MODEL-IN',kind:'MCB',poles:2}],
 terminals:[{id:'X-L',device_id:'MODEL-IN',conductor:'L1'},
 {id:'X-N',device_id:'MODEL-IN',conductor:'N'}]},
 wiringModelV18:{terminals:[{id:'X-L',device_id:'MODEL-IN',conductor:'L1'},
 {id:'X-N',device_id:'MODEL-IN',conductor:'N'}],wires:[]}});
test('saved incoming binding roundtrip preserves evidence snapshot and never asserts approval',()=>{
 const raw=p();raw.incomingTerminalBindingsV1=incoming.epIncomingTerminalBindingSetV1(raw,'QF0','MODEL-IN');
 const target=p(),before=JSON.stringify(raw);restore(raw,target);
 assert.deepEqual(target.incomingTerminalBindingsV1,raw.incomingTerminalBindingsV1);
 assert.equal(JSON.stringify(raw),before);
 const b=bundle(target,()=>null);
 assert.equal(b.sections.incomingTerminalBindings.rows.length,1);
 assert.equal(b.sections.incomingTerminalBindings.rows[0].snapshotStale,false);
 assert.equal(b.sections.supplyTerminals.rows[0].toModelDeviceId,'MODEL-IN');
 assert.equal(b.sections.supplyTerminals.rows[1].fromModelDeviceId,'MODEL-IN');
 assert.equal(b.ready_for_installation,false);
 const h=print(b);assert.match(h,/Привязки вводных аппаратов/);
 assert.match(h,/MODEL-IN/);
});
test('stale snapshot survives import so audit rejects stale technical assertions',()=>{
 const raw=p();raw.incomingTerminalBindingsV1=incoming.epIncomingTerminalBindingSetV1(raw,'QF0','MODEL-IN');
 raw.deviceSupplyV1.incomingDevices[0].catalogSku='CHANGED';
 const target=p();target.deviceSupplyV1.incomingDevices[0].catalogSku='CHANGED';
 restore(raw,target);
 const b=bundle(target,()=>null);
 assert.equal(b.statuses.incomingTerminalBindings,'BLOCKED');
 assert.equal(b.statuses.supplyTerminals,'BLOCKED');
 assert.ok(b.sections.issueRegister.entries.some(i=>i.code==='INCOMING_BINDING_SNAPSHOT_STALE'&&i.level==='BLOCKED'));
});
test('invalid missing incoming object in saved binding is rejected at import',()=>{
 const raw=p();raw.incomingTerminalBindingsV1=[
  {incomingId:'MISSING',modelDeviceId:'MODEL-IN',snapshot:{incoming:{},model:{terminals:[]}}}];
 assert.throws(()=>restore(raw,p()),/INCOMING_BINDING_ENTITY_NOT_FOUND/);
});
