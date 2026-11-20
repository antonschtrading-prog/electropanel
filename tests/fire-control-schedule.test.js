'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({module:{exports:{}}});
for(const name of ['fire-control-v1.js','fire-control-trace-v1.js','fire-control-design-v1.js','fire-control-schedule-v1.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx);
const project=()=>({railCapacity:12,railCount:2,lines:[{id:'L1'}],loads:[{id:'AC',circuitId:'L1'},{id:'MUSIC',circuitId:'L1'}],
 fireControlV1:{version:1,signals:[{id:'F1',kind:'FIRE',zoneId:'Z1',contactType:'NC'}],
 actions:[{id:'A1',loadId:'AC',signalId:'F1',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'}],
 design:{assignments:[{actionId:'A1',deviceId:'K1',articleSku:'SKU1',controlVoltageV:24,controlSupplyId:'PS1',
 terminalIds:['T1','T2'],dinRailId:'R1',dinStartModule:1,moduleWidth:2,wireReference:'W1',reviewed:true}]}}});
test('control schedule retains consumer circuit and zone',()=>{
 const r=ctx.epFireControlScheduleV1(project());assert.equal(r.circuits[0].zoneId,'Z1');
 assert.equal(r.circuits[0].consumerId,'AC');assert.equal(r.circuits[0].circuitId,'L1');
});
test('control schedule preserves declared supply and voltage',()=>{
 const r=ctx.epFireControlScheduleV1(project());assert.equal(r.circuits[0].controlSupplyId,'PS1');
 assert.equal(r.circuits[0].controlVoltageV,24);
});
test('terminal schedule contains only declared terminals',()=>{
 const r=ctx.epFireControlScheduleV1(project());assert.equal(r.terminals.length,2);
 assert.equal(r.terminals[0].terminalId,'T1');
});
test('DIN device list preserves placement',()=>{
 const r=ctx.epFireControlScheduleV1(project());assert.equal(r.devices[0].railId,'R1');
 assert.equal(r.devices[0].widthModules,2);
});
test('preliminary BOM counts selected article',()=>{
 const r=ctx.epFireControlScheduleV1(project());assert.equal(r.preliminaryBom[0].articleSku,'SKU1');
 assert.equal(r.preliminaryBom[0].quantity,1);
});
test('duplicate terminal assignment is blocked',()=>{
 const p=project();p.fireControlV1.actions.push({...p.fireControlV1.actions[0],id:'A2',loadId:'MUSIC'});
 p.fireControlV1.design.assignments.push({...p.fireControlV1.design.assignments[0],actionId:'A2',deviceId:'K2',dinStartModule:4});
 assert.ok(ctx.epFireControlScheduleV1(p).issues.some(x=>x.code==='FIRE_SCHEDULE_TERMINAL_REUSED'));
});
test('no fire control is explicitly not configured',()=>assert.equal(ctx.epFireControlScheduleV1({}).status,'NOT_CONFIGURED'));
test('schedule cannot claim approved or installed',()=>{
 const r=ctx.epFireControlScheduleV1(project());assert.equal(r.engineeringApproved,false);
 assert.equal(r.ready_for_installation,false);
});
test('schedule included in bundle',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','engineering-bundle-v1.js'),'utf8'),/fireControlSchedule/));
