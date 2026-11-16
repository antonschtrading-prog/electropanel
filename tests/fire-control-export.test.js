'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({module:{exports:{}}});
for(const f of ['fire-control-v1.js','fire-control-trace-v1.js','fire-control-design-v1.js','fire-control-schedule-v1.js','fire-control-export-v1.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
const project=()=>({lines:[{id:'L1'}],loads:[{id:'AC',circuitId:'L1'}],fireControlV1:{signals:[{id:'S1',kind:'FIRE',zoneId:'Z1',contactType:'NC'}],
 actions:[{id:'A1',loadId:'AC',signalId:'S1',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'}],
 design:{assignments:[{actionId:'A1',deviceId:'K1',articleSku:'SKU1',controlVoltageV:24,controlSupplyId:'PS1',terminalIds:['T1'],
 dinRailId:'R1',dinStartModule:1,moduleWidth:2,wireReference:'W1',reviewed:true}]}}});
test('wire CSV has expected heading and row',()=>{
 const r=ctx.epFireControlCsvV1(project());assert.match(r.csv,/action_id/);assert.match(r.csv,/"A1";"S1";"Z1";"AC";"L1"/);
});
test('wire CSV preserves declared supply and wire reference',()=>{
 const r=ctx.epFireControlCsvV1(project());assert.match(r.csv,/"PS1";"24";"W1"/);
});
test('BOM CSV counts exact SKU',()=>{
 const r=ctx.epFireControlBomCsvV1(project());assert.match(r.csv,/"SKU1";"CONTACTOR";"1";"1"/);
});
test('CSV remains draft and unapproved',()=>{
 assert.equal(ctx.epFireControlCsvV1(project()).engineeringApproved,false);
 assert.equal(ctx.epFireControlBomCsvV1(project()).ready_for_installation,false);
});
test('CSV export handles unconfigured project without inventing rows',()=>{
 const r=ctx.epFireControlCsvV1({});assert.equal(r.status,'NOT_CONFIGURED');assert.ok(!r.csv.includes('"A1"'));
});
test('browser exposes CSV actions',()=>{
 const src=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(src,/fireControlWiringCsvBtn/);assert.match(src,/fireControlBomCsvBtn/);
});
