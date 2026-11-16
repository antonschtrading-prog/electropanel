'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epFireControlAuditV1:audit,epFireControlAffectedCircuitsV1:affected,epFireControlConsumerDeleteV1:deleteLoad,epFireControlCircuitDeleteV1:deleteLine,epFireControlBillV1:bill}=require('../fire-control-v1');
const project=()=>({lines:[{id:'L1'},{id:'L2'}],loads:[{id:'AC',circuitId:'L1'},{id:'FAN',circuitId:'L2'}]});
const signal=()=>({id:'FIRE',kind:'FIRE',zoneId:'Z1',contactType:'NC'});
const action=()=>({id:'A1',loadId:'AC',signalId:'FIRE',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'});
const run=(change=()=>{},extra=[])=>{const p=project(),s=signal(),a=action();change(a,s,p);return audit(p,{signals:[s],actions:[a,...extra]});};
const cases=[
 ['shunt trip cannot enable',a=>{a.action='ENABLE';a.actuator='SHUNT_TRIP';},'FIRE_CONTROL_SHUNT_CANNOT_ENABLE'],
 ['UVR cannot enable',a=>{a.action='ENABLE';a.actuator='UNDERVOLTAGE_RELEASE';},'FIRE_CONTROL_UVR_CANNOT_ENABLE'],
 ['UVR cannot maintain',a=>{a.action='MAINTAIN';a.actuator='UNDERVOLTAGE_RELEASE';},'FIRE_CONTROL_MAINTAIN_UVR_CONFLICT'],
 ['shunt cannot maintain',a=>{a.action='MAINTAIN';a.actuator='SHUNT_TRIP';},'FIRE_CONTROL_MAINTAIN_SHUNT_CONFLICT'],
 ['UVR energized on loss conflicts',a=>{a.actuator='UNDERVOLTAGE_RELEASE';a.onSignalLoss='ENERGIZED';},'FIRE_CONTROL_UVR_LOSS_CONFLICT'],
 ['shunt loss requires review',a=>{a.actuator='SHUNT_TRIP';},'FIRE_CONTROL_SHUNT_TRIP_LOSS_NOT_PROVEN'],
 ['reset trip requires review',(a,s)=>{s.kind='RESET';},'FIRE_CONTROL_RESET_TRIP_REVIEW'],
 ['external unspecified loss review',a=>{a.action='EXTERNAL_CONTROL';a.actuator='EXTERNAL';a.onSignalLoss='UNSPECIFIED';},'FIRE_CONTROL_EXTERNAL_LOSS_STATE_REVIEW'],
 ['invalid action ID',a=>{a.id='bad id';},'FIRE_CONTROL_ACTION_INVALID'],
 ['orphan signal',a=>{a.signalId='MISSING';},'FIRE_CONTROL_SIGNAL_ORPHAN'],
 ['orphan load',a=>{a.loadId='MISSING';},'FIRE_CONTROL_LOAD_ORPHAN'],
 ['invalid zone',(a,s)=>{s.zoneId='bad zone';},'FIRE_CONTROL_SIGNAL_INVALID'],
 ['invalid contact',(a,s)=>{s.contactType='X';},'FIRE_CONTROL_SIGNAL_INVALID'],
 ['invalid signal kind',(a,s)=>{s.kind='OTHER';},'FIRE_CONTROL_SIGNAL_INVALID'],
 ['missing loss state',a=>{a.onSignalLoss='UNSPECIFIED';},'FIRE_CONTROL_LOSS_STATE_UNDECLARED'],
 ['external actuator mismatch',a=>{a.action='EXTERNAL_CONTROL';},'FIRE_CONTROL_EXTERNAL_INTERFACE_CONFLICT'],
 ['actuator undeclared',a=>{a.actuator='EXTERNAL';},'FIRE_CONTROL_ACTUATOR_UNDECLARED']
];
for(const [name,change,code] of cases)test(name,()=>assert.ok(run(change).issues.some(x=>x.code===code)));
test('linked circuit and consumer cannot be removed',()=>{
 const p=project();p.fireControlV1={signals:[signal()],actions:[action()]};
 assert.deepEqual(affected(p),['L1']);
 assert.throws(()=>deleteLoad(p,'AC'),/FIRE_CONTROL_CONSUMER_LINKED/);
 assert.throws(()=>deleteLine(p,'L1'),/FIRE_CONTROL_CIRCUIT_LINKED/);
 assert.doesNotThrow(()=>deleteLoad(p,'FAN'));
 assert.doesNotThrow(()=>deleteLine(p,'L2'));
});
test('bill lists preliminary devices without inventing catalogue articles',()=>{
 const p=project();p.fireControlV1={signals:[signal()],actions:[action()]};
 const b=bill(p);assert.equal(b.items[0].kind,'CONTACTOR');assert.equal(b.items[0].quantity,1);
 assert.equal(b.items[0].articleSku,null);assert.equal(b.engineeringApproved,false);
});
test('conflicting command per load and signal blocked',()=>{
 const a=action();assert.equal(run(()=>{},[{...a,id:'A2',action:'ENABLE'}]).status,'BLOCKED');
});
test('unknown field in schema blocks audit',()=>{
 const p=project();assert.equal(audit(p,{signals:[signal()],actions:[action()],unsafe:true}).status,'BLOCKED');
});
test('wrong version blocks audit',()=>{
 const p=project();assert.equal(audit(p,{version:2,signals:[signal()],actions:[action()]}).status,'BLOCKED');
});
test('unconfigured bill is not an approval',()=>{
 assert.equal(bill(project()).status,'NOT_CONFIGURED');
});
