'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epFireControlAuditV1}=require('../fire-control-v1');
const {epFireControlDesignV1}=require('../fire-control-design-v1');
const {epFireControlChecklistV1}=require('../fire-control-checklist-v1');
const project=()=>({lines:[{id:'L1'}],loads:[{id:'AC',circuitId:'L1'}],fireControlV1:{
 signals:[{id:'S1',kind:'FIRE',zoneId:'Z1',contactType:'NC'}],
 actions:[{id:'A1',loadId:'AC',signalId:'S1',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'}],
 design:{assignments:[{actionId:'A1',deviceId:'K1',articleSku:'SKU1',controlVoltageV:24,controlSupplyId:'PS1',
 terminalIds:['T1','T2'],dinRailId:'R1',dinStartModule:1,moduleWidth:2,wireReference:'W1',reviewed:true}]}}});
const pins=()=>[{terminalId:'T1',devicePin:'A1',role:'COIL_A1',verifiedSource:'https://manufacturer.example/K1'},
 {terminalId:'T2',devicePin:'A2',role:'COIL_A2',verifiedSource:'https://manufacturer.example/K1'}];
const check=(p,code)=>epFireControlDesignV1(p).issues.some(x=>x.code===code);
test('no pin data remains an allowed draft',()=>assert.equal(epFireControlDesignV1(project()).status,'UNKNOWN'));
test('manufacturer pin data appears in design projection',()=>{
 const p=project();p.fireControlV1.design.assignments[0].pins=pins();
 assert.equal(epFireControlDesignV1(p).rows[0].pins.length,2);
});
test('pin mapping checklist remains unresolved without pin data',()=>{
 const p=project();assert.equal(epFireControlChecklistV1(p).checks.find(x=>x.code==='FCHK_50_TERMINAL_PIN_MAPPING').status,'REVIEW_REQUIRED');
});
test('complete explicit pin evidence resolves checklist criterion 50',()=>{
 const p=project();p.fireControlV1.design.assignments[0].pins=pins();
 assert.equal(epFireControlChecklistV1(p).checks.find(x=>x.code==='FCHK_50_TERMINAL_PIN_MAPPING').status,'PASS');
});
const invalid=[
 ['non-array pins',p=>p.fireControlV1.design.assignments[0].pins='A1','FIRE_DESIGN_PIN_MAPPING_INVALID'],
 ['missing terminal',p=>p.fireControlV1.design.assignments[0].pins=[{devicePin:'A1',role:'COIL_A1',verifiedSource:'https://example.com'}],'FIRE_DESIGN_PIN_MAPPING_INVALID'],
 ['missing device pin',p=>p.fireControlV1.design.assignments[0].pins=[{terminalId:'T1',role:'COIL_A1',verifiedSource:'https://example.com'}],'FIRE_DESIGN_PIN_MAPPING_INVALID'],
 ['missing role',p=>p.fireControlV1.design.assignments[0].pins=[{terminalId:'T1',devicePin:'A1',verifiedSource:'https://example.com'}],'FIRE_DESIGN_PIN_MAPPING_INVALID'],
 ['unrecognised role',p=>p.fireControlV1.design.assignments[0].pins=[{terminalId:'T1',devicePin:'A1',role:'GUESS',verifiedSource:'https://example.com'}],'FIRE_DESIGN_PIN_MAPPING_INVALID'],
 ['no source',p=>p.fireControlV1.design.assignments[0].pins=[{terminalId:'T1',devicePin:'A1',role:'COIL_A1'}],'FIRE_DESIGN_PIN_MAPPING_INVALID'],
 ['non HTTPS source',p=>p.fireControlV1.design.assignments[0].pins=[{terminalId:'T1',devicePin:'A1',role:'COIL_A1',verifiedSource:'http://example.com'}],'FIRE_DESIGN_PIN_MAPPING_INVALID'],
 ['unrecognized property',p=>p.fireControlV1.design.assignments[0].pins=[{...pins()[0],approval:true}],'FIRE_DESIGN_PIN_MAPPING_INVALID'],
 ['duplicate terminals',p=>p.fireControlV1.design.assignments[0].pins=[pins()[0],{...pins()[1],terminalId:'T1'}],'FIRE_DESIGN_PIN_TERMINAL_REUSED'],
 ['duplicate device pins',p=>p.fireControlV1.design.assignments[0].pins=[pins()[0],{...pins()[1],devicePin:'A1'}],'FIRE_DESIGN_DEVICE_PIN_REUSED'],
 ['undeclared terminal',p=>p.fireControlV1.design.assignments[0].pins=[{...pins()[0],terminalId:'T99'}],'FIRE_DESIGN_PIN_TERMINAL_UNDECLARED'],
 ['malformed device pin',p=>p.fireControlV1.design.assignments[0].pins=[{...pins()[0],devicePin:'A 1'}],'FIRE_DESIGN_PIN_MAPPING_INVALID']
];
for(const [name,mutate,code] of invalid)test('reject '+name,()=>{
 const p=project();mutate(p);assert.ok(check(p,code),code);
});
test('pin evidence does not automatically approve engineering',()=>{
 const p=project();p.fireControlV1.design.assignments[0].pins=pins();
 assert.equal(epFireControlDesignV1(p).engineeringApproved,false);
});
test('pin evidence does not automatically approve installation',()=>{
 const p=project();p.fireControlV1.design.assignments[0].pins=pins();
 assert.equal(epFireControlDesignV1(p).ready_for_installation,false);
});
