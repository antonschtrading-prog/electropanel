'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(paths){
 const ctx=vm.createContext({module:{exports:{}},console});
 for(const path of paths)vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',path),'utf8'),ctx,{filename:path});
 return ctx;
}
const project=()=>({lines:[{id:'L1',phase:'L1',power:2,modules:1}],loads:[{id:'AC1',circuitId:'L1',powerKw:2}],sharedDevices:[]});
const control=()=>({signals:[{id:'F1',kind:'FIRE',zoneId:'Z1',contactType:'NC'}],actions:[{id:'A1',loadId:'AC1',signalId:'F1',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'}]});
test('fire-linked group cannot be split without explicit redesign',()=>{
 const ctx=load(['fire-control-v1.js','consumer-group-split-v1.js']);
 const p=project();p.fireControlV1=control();
 assert.equal(ctx.epGroupSplitAllowedV1(p,p.lines[0]),'GROUP_SPLIT_FIRE_CONTROL_LINKED');
});
test('project extension restoration preserves declared fire interface',()=>{
 const ctx=load(['fire-control-v1.js','fire-control-design-v1.js','project-state-v2.js']);
 const p=project();ctx.epRestoreProjectExtensionsV2({lines:p.lines,fireControlV1:control()},p);
 assert.equal(p.fireControlV1.actions[0].loadId,'AC1');
});
test('project extension restoration rejects orphaned fire interface',()=>{
 const ctx=load(['fire-control-v1.js','fire-control-design-v1.js','project-state-v2.js']);
 const bad=control();bad.actions[0].loadId='MISSING';
 assert.throws(()=>ctx.epRestoreProjectExtensionsV2({lines:project().lines,fireControlV1:bad},project()),/FIRE_CONTROL_IMPORT_INVALID/);
});
test('engineering bundle exposes fire control section',()=>{
 const src=fs.readFileSync(require('node:path').join(__dirname,'..','engineering-bundle-v1.js'),'utf8');
 assert.match(src,/const fireControl=section\('FIRE_CONTROL'/);
 assert.match(src,/const sections=\{fireControl,/);
});
test('browser loads fire module before project state',()=>{
 const src=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
 assert.ok(src.indexOf('fire-control-v1.js')<src.indexOf('project-state-v2.js'));
});
