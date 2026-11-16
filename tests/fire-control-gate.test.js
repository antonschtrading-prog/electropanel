'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({module:{exports:{}}});
for(const f of ['fire-control-v1.js','fire-control-design-v1.js','fire-control-trace-v1.js','fire-control-schedule-v1.js','fire-catalog-reconcile-v1.js','fire-din-reconcile-v1.js','fire-control-gate-v1.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
const project=()=>({railCapacity:12,lines:[{id:'L1'}],loads:[{id:'AC',circuitId:'L1'}],fireControlV1:{
 signals:[{id:'S',kind:'FIRE',zoneId:'Z',contactType:'NC'}],
 actions:[{id:'A',loadId:'AC',signalId:'S',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'}],
 design:{assignments:[{actionId:'A',deviceId:'K1',articleSku:'SKU1',controlVoltageV:24,controlSupplyId:'PS1',
 terminalIds:['T1'],dinRailId:'R1',dinStartModule:1,moduleWidth:2,wireReference:'W1',reviewed:true}]}}});
const article=()=>({sku:'SKU1',kind:'CONTACTOR',modules:2,controlVoltageV:24,maker:'Example',series:'X',source:'https://example.com',verificationStatus:'VERIFIED'});
test('gate lists six independent engineering sections',()=>assert.equal(ctx.epFireControlGateV1(project(),()=>article()).checks.length,6));
test('valid declared data still requires engineering review',()=>{
 const r=ctx.epFireControlGateV1(project(),()=>article());
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.engineeringApproved,false);
});
test('gate blocks catalogue mismatch',()=>{
 const r=ctx.epFireControlGateV1(project(),()=>({...article(),kind:'MCB'}));
 assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.source==='CATALOGUE'));
});
test('gate blocks DIN collision',()=>{
 const p=project();p.dinPlacementsV1=[{deviceId:'Q1',railId:'R1',startModule:2,widthModules:2}];
 const r=ctx.epFireControlGateV1(p,()=>article());
 assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.source==='DIN'));
});
test('gate rejects orphan consumer',()=>{
 const p=project();p.fireControlV1.actions[0].loadId='MISSING';
 assert.equal(ctx.epFireControlGateV1(p,()=>article()).status,'BLOCKED');
});
test('gate preserves no configuration state',()=>assert.equal(ctx.epFireControlGateV1({}).status,'NOT_CONFIGURED'));
test('gate never claims installation readiness',()=>assert.equal(ctx.epFireControlGateV1(project(),()=>article()).ready_for_installation,false));
test('gate is present in engineering bundle',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','engineering-bundle-v1.js'),'utf8'),/fireGate/));
test('gate is loaded before application script',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(html.indexOf('fire-control-gate-v1.js')<html.indexOf('app.js'));
});
