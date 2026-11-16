'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({module:{exports:{}}});
for(const name of ['fire-control-v1.js','fire-control-design-v1.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),context,{filename:name});
const p=()=>({railCapacity:12,railCount:2,lines:[{id:'L1'}],loads:[{id:'A',circuitId:'L1'},{id:'B',circuitId:'L1'}],
 fireControlV1:{version:1,signals:[{id:'S',kind:'FIRE',zoneId:'Z',contactType:'NC'}],
 actions:[{id:'X',loadId:'A',signalId:'S',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'}]}});
const full=()=>({actionId:'X',deviceId:'K1',articleSku:'SKU1',controlVoltageV:24,controlSupplyId:'PS1',terminalIds:['T1','T2'],dinRailId:'R1',dinStartModule:1,moduleWidth:2,wireReference:'W1',reviewed:true});
const run=(patch)=>{const project=p();project.fireControlV1.design={assignments:[{...full(),...patch}]};return context.epFireControlDesignV1(project);};
test('missing design remains unknown rather than blocked',()=>assert.equal(context.epFireControlDesignV1(p()).status,'UNKNOWN'));
test('complete declared design still never claims engineering approval',()=>{const r=run({});assert.equal(r.status,'UNKNOWN');assert.equal(r.engineeringApproved,false);assert.equal(r.rows[0].articleSku,'SKU1');});
const invalid=[
 ['invalid action reference',{actionId:'MISSING'},'FIRE_DESIGN_ASSIGNMENT_INVALID'],
 ['invalid device id',{deviceId:'bad id'},'FIRE_DESIGN_DEVICE_ID_INVALID'],
 ['invalid SKU',{articleSku:'bad SKU'},'FIRE_DESIGN_ARTICLE_INVALID'],
 ['zero voltage',{controlVoltageV:0},'FIRE_DESIGN_VOLTAGE_INVALID'],
 ['negative voltage',{controlVoltageV:-24},'FIRE_DESIGN_VOLTAGE_INVALID'],
 ['excess voltage',{controlVoltageV:2000},'FIRE_DESIGN_VOLTAGE_INVALID'],
 ['invalid supply id',{controlSupplyId:'bad id'},'FIRE_DESIGN_SUPPLY_INVALID'],
 ['empty terminal list',{terminalIds:[]},'FIRE_DESIGN_TERMINALS_INVALID'],
 ['duplicate terminal',{terminalIds:['T1','T1']},'FIRE_DESIGN_TERMINALS_INVALID'],
 ['invalid rail id',{dinRailId:'bad id'},'FIRE_DESIGN_DIN_RAIL_INVALID'],
 ['zero module position',{dinStartModule:0},'FIRE_DESIGN_DIN_START_INVALID'],
 ['fractional module position',{dinStartModule:1.5},'FIRE_DESIGN_DIN_START_INVALID'],
 ['zero module width',{moduleWidth:0},'FIRE_DESIGN_MODULE_WIDTH_INVALID'],
 ['oversized width',{moduleWidth:25},'FIRE_DESIGN_MODULE_WIDTH_INVALID'],
 ['invalid wire reference',{wireReference:'bad ref'},'FIRE_DESIGN_WIRE_REFERENCE_INVALID'],
 ['invalid reviewed flag',{reviewed:'yes'},'FIRE_DESIGN_REVIEW_INVALID'],
 ['undeclared field',{unexpected:true},'FIRE_DESIGN_ASSIGNMENT_INVALID']
];
for(const [name,patch,code] of invalid)test(name,()=>assert.ok(run(patch).issues.some(x=>x.code===code)));
test('DIN boundary is checked',()=>assert.ok(run({dinStartModule:12,moduleWidth:2}).issues.some(x=>x.code==='FIRE_DESIGN_DIN_CAPACITY_EXCEEDED')));
test('unknown rail requires review',()=>assert.ok(run({dinRailId:'R9'}).issues.some(x=>x.code==='FIRE_DESIGN_DIN_RAIL_UNKNOWN')));
test('missing SKU is explicitly unresolved',()=>assert.ok(run({articleSku:undefined}).issues.some(x=>x.code==='FIRE_DESIGN_ARTICLESKU_MISSING')));
test('missing supply is explicitly unresolved',()=>assert.ok(run({controlSupplyId:undefined}).issues.some(x=>x.code==='FIRE_DESIGN_CONTROLSUPPLYID_MISSING')));
test('missing terminals explicitly unresolved',()=>assert.ok(run({terminalIds:undefined}).issues.some(x=>x.code==='FIRE_DESIGN_TERMINALIDS_MISSING')));
test('unreviewed design remains unresolved',()=>assert.ok(run({reviewed:false}).issues.some(x=>x.code==='FIRE_DESIGN_ENGINEER_REVIEW_REQUIRED')));
test('duplicate device IDs blocked',()=>{
 const project=p();project.fireControlV1.actions.push({...project.fireControlV1.actions[0],id:'Y',loadId:'B'});
 project.fireControlV1.design={assignments:[full(),{...full(),actionId:'Y',dinStartModule:5}]};
 assert.ok(context.epFireControlDesignV1(project).issues.some(x=>x.code==='FIRE_DESIGN_DUPLICATE_DEVICE_ID'));
});
test('DIN collision blocked',()=>{
 const project=p();project.fireControlV1.actions.push({...project.fireControlV1.actions[0],id:'Y',loadId:'B'});
 project.fireControlV1.design={assignments:[full(),{...full(),actionId:'Y',deviceId:'K2',dinStartModule:2}]};
 assert.ok(context.epFireControlDesignV1(project).issues.some(x=>x.code==='FIRE_DESIGN_DIN_COLLISION'));
});
test('unconfigured project has no design',()=>assert.equal(context.epFireControlDesignV1({}).status,'NOT_CONFIGURED'));
test('engineering bundle includes design section',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','engineering-bundle-v1.js'),'utf8'),/fireControlDesign/));
