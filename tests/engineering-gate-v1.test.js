'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=['terminal-path-v2.js','endpoint-bridge-v1.js','topology-batch-audit-v1.js',
 'board-binding-v1.js','engineering-gate-v1.js']
 .map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const gate=vm.runInNewContext(source+'\nepEngineeringGateV1');
test('empty project cannot become engineering approved',()=>{
 const r=gate({});assert.equal(r.engineeringApproved,false);
 assert.equal(r.ready_for_installation,false);assert.equal(r.status,'UNKNOWN');
});
test('invalid board binding blocks combined gate',()=>{
 const r=gate({boardBindingsV1:[null]});
 assert.equal(r.status,'BLOCKED');assert.equal(r.engineeringApproved,false);
});
test('missing model and wiring remain unverified',()=>{
 const r=gate({branchDevices:[],sharedDevices:[],lines:[]});
 assert.ok(r.issues.some(x=>x.code==='MODELS_NOT_BOTH_DECLARED'||x.code==='MODEL_CONSISTENCY_UNAVAILABLE'));
});
test('audit errors fail closed',()=>{
 const r=gate({terminalLinks:[null],wiringModelV18:{terminals:[],wires:[]}});
 assert.equal(r.status,'BLOCKED');
});
test('component statuses never authorize installation',()=>{
 const r=gate({wiringModelV18:{terminals:[],wires:[]},deviceModelV19:{devices:[],terminals:[],wires:[],internal_links:[]},
  branchDevices:[],sharedDevices:[],lines:[],terminalLinks:[],feedLinks:[],groupInputLinks:[]});
 assert.equal(r.ready_for_installation,false);
});
