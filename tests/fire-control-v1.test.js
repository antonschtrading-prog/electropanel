'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {epFireControlAuditV1}=require('../fire-control-v1');
const project={lines:[{id:'L1'}],loads:[{id:'AC1',circuitId:'L1'}]};
const signal={id:'F1',kind:'FIRE',zoneId:'Z1',contactType:'NC'};
const action={id:'A1',loadId:'AC1',signalId:'F1',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'};
test('valid declared fire interface stays draft, never approved',()=>{
 const result=epFireControlAuditV1(project,{signals:[signal],actions:[action]});
 assert.equal(result.status,'DRAFT');assert.equal(result.engineeringApproved,false);
});
test('orphan consumer is blocked',()=>{
 assert.equal(epFireControlAuditV1(project,{signals:[signal],actions:[{...action,loadId:'missing'}]}).status,'BLOCKED');
});
test('conflicting commands are blocked',()=>{
 const result=epFireControlAuditV1(project,{signals:[signal],actions:[action,{...action,id:'A2',action:'ENABLE'}]});
 assert.ok(result.issues.some(x=>x.code==='FIRE_CONTROL_CONFLICTING_COMMANDS'));
});
test('unknown loss state requires review',()=>{
 const result=epFireControlAuditV1(project,{signals:[signal],actions:[{...action,onSignalLoss:'UNSPECIFIED'}]});
 assert.equal(result.status,'UNKNOWN');
});
test('duplicate signal IDs are blocked',()=>{
 assert.equal(epFireControlAuditV1(project,{signals:[signal,signal],actions:[action]}).status,'BLOCKED');
});
