'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx=vm.createContext({module:{exports:{}}});
for(const file of ['fire-control-v1.js','fire-control-trace-v1.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
const p=()=>({lines:[{id:'L1',name:'Air conditioning'}],loads:[{id:'AC1',circuitId:'L1'}],fireControlV1:{version:1,signals:[{id:'S1',kind:'FIRE',zoneId:'Z1',contactType:'NC'}],actions:[{id:'A1',loadId:'AC1',signalId:'S1',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'}]}});
test('trace connects signal zone consumer and circuit',()=>{
 const r=ctx.epFireControlTraceV1(p());
 assert.equal(r.rows[0].zoneId,'Z1');assert.equal(r.rows[0].circuitId,'L1');
 assert.equal(r.rows[0].consumerId,'AC1');assert.equal(r.rows[0].contactType,'NC');
});
test('trace does not invent terminal or control power',()=>{
 const r=ctx.epFireControlTraceV1(p());
 assert.equal(r.rows[0].terminalAssignment,'NOT_DECLARED');
 assert.equal(r.rows[0].controlPower,'NOT_DECLARED');
 assert.equal(r.rows[0].wiringStatus,'NOT_DESIGNED');
});
test('trace does not invent DIN placements or catalogue articles',()=>{
 const r=ctx.epFireControlTraceV1(p());
 assert.equal(r.rows[0].articleSku,null);
 assert.equal(r.rows[0].dinStatus,'NOT_PLACED');
});
test('trace requires engineer review',()=>{
 const r=ctx.epFireControlTraceV1(p());
 assert.equal(r.engineeringApproved,false);assert.equal(r.status,'UNKNOWN');
 assert.ok(r.issues.some(x=>x.code==='FIRE_TRACE_CONTROL_POWER_UNDECLARED'));
});
test('trace rejects orphan consumer',()=>{
 const x=p();x.fireControlV1.actions[0].loadId='MISSING';
 assert.equal(ctx.epFireControlTraceV1(x).status,'BLOCKED');
});
test('trace handles unconfigured project',()=>{
 assert.equal(ctx.epFireControlTraceV1({lines:[],loads:[]}).status,'NOT_CONFIGURED');
});
