'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyAuditV1=require('../device-supply-v1.js').epDeviceSupplyAuditV1;
const {epDeviceSupplyTerminalReconciliationV1:audit,epDeviceSupplyTerminalHtmlV1:html}=
 require('../device-supply-terminal-reconciliation-v1.js');
const p=()=>({lines:[{id:'L1',phase:'L1'}],
 branchDevices:[{id:'BR1',circuitId:'L1'}],sharedDevices:[],
 deviceSupplyV1:{version:1,incomingDevices:[],links:[
 {from:'SOURCE:MAIN',to:'BRANCH:BR1',conductors:['L1','N']}]},
 deviceModelV19:{devices:[{id:'D1',poles:1}],terminals:[
 {id:'T1',device_id:'D1',conductor:'L1'},
 {id:'T2',device_id:'D1',conductor:'N'}]},
 boardBindingsV1:[{boardDeviceId:'BR1',modelDeviceId:'D1'}],
 wiringModelV18:{terminals:[{id:'T1',device_id:'D1',conductor:'L1'},
 {id:'T2',device_id:'D1',conductor:'N'}],wires:[]}});
test('maps supply branch to explicit model identity without fabricating continuity',()=>{
 const project=p(),before=JSON.stringify(project),r=audit(project);
 assert.equal(r.rows.length,1);assert.equal(r.rows[0].toModelDeviceId,'D1');
 assert.equal(r.rows[0].declaredDirectWires,0);
 assert.equal(r.physicalContinuity,'NOT_VERIFIED');
 assert.equal(r.selectivityStatus,'NOT_ASSESSED');
 assert.equal(r.engineeringApproved,false);
 assert.equal(JSON.stringify(project),before);
});
test('missing binding and terminal model remain unknown, not a substitute for wires',()=>{
 const project=p();delete project.boardBindingsV1;
 assert.ok(audit(project).issues.some(x=>x.code==='SUPPLY_TERMINAL_BOARD_BINDINGS_UNDECLARED'));
 delete project.deviceModelV19;
 assert.ok(audit(project).issues.some(x=>x.code==='SUPPLY_TERMINAL_MODEL_UNDECLARED'));
});
test('explicit cross-role wire is a blocking model contradiction',()=>{
 const project=p();project.wiringModelV18.wires.push({from:'T1',to:'T2'});
 const r=audit(project);assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='SUPPLY_TERMINAL_WIRE_ROLE_CONFLICT'));
});
test('model identity referenced by binding must actually exist',()=>{
 const project=p();project.boardBindingsV1=[{boardDeviceId:'BR1',modelDeviceId:'GONE'}];
 const r=audit(project);assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='SUPPLY_TERMINAL_TARGET_MODEL_DEVICE_MISSING'));
});
test('incoming devices are not silently assigned a fictitious terminal model',()=>{
 const project=p();
 project.deviceSupplyV1={version:1,incomingDevices:[{id:'QF0',label:'Ввод'}],
 links:[{from:'SOURCE:MAIN',to:'INCOMING:QF0',conductors:['L1','N']},
 {from:'INCOMING:QF0',to:'BRANCH:BR1',conductors:['L1','N']}]};
 const r=audit(project);
 assert.equal(r.rows.length,2);assert.equal(r.rows[1].fromModelDeviceId,null);
 assert.ok(r.issues.some(x=>x.code==='SUPPLY_TERMINAL_INCOMING_BINDING_UNSUPPORTED'));
 assert.equal(r.physicalContinuity,'NOT_VERIFIED');
});
test('identical declared roles do not yield a successful normative verdict',()=>{
 const project=p();project.deviceSupplyV1.links[0].conductors=['L1'];
 const r=audit(project);
 assert.equal(r.status,'UNKNOWN');assert.equal(r.ready_for_installation,false);
});
test('HTML escapes untrusted identifiers and does not output raw tags',()=>{
 const x=html({status:'UNKNOWN',rows:[{from:'<svg onload=alert(1)>',
 to:'BRANCH:BR1',conductors:['L1'],fromModelDeviceId:null,
 toModelDeviceId:'D1',declaredDirectWires:0,verification:'NOT_VERIFIED'}]});
 assert.ok(x.includes('&lt;svg onload=alert(1)&gt;'));
 assert.ok(!x.includes('<svg onload=alert(1)>'));
});
