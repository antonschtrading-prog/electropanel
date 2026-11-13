'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const code=['terminal-path-v2.js','endpoint-bridge-v1.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const audit=vm.runInNewContext(code+'\nepEndpointBridgeAuditV1');
function project(){
 return {branchDevices:[{id:'BD1'}],sharedDevices:[],loads:[{id:'LD1'}],
  boardBindingsV1:[{boardDeviceId:'BD1',modelDeviceId:'Q1'}],
  terminalLinks:[{id:'L',from:'BRANCH:BD1/L1',to:'LOAD:LD1/L1'}],
  feedLinks:[],groupInputLinks:[],
  endpointBindingsV1:[{symbolicRef:'BRANCH:BD1/L1',terminalId:'a'},
   {symbolicRef:'LOAD:LD1/L1',terminalId:'z'}],
  wiringModelV18:{terminals:[{id:'a',device_id:'Q1',conductor:'L1'},
   {id:'mid',device_id:'TB1',conductor:'L1'},
   {id:'z',device_id:'LD1',conductor:'L1'}],
   wires:[{from:'a',to:'mid'},{from:'mid',to:'z'}]}};
}
const codes=r=>Array.from(r.issues,x=>x.code);
test('legacy default remains blocked for non-direct wires',()=>{
 const r=audit(project());assert.equal(r.status,'BLOCKED');
 assert.ok(codes(r).includes('DIRECT_WIRE_UNDECLARED'));
});
test('opt-in path is recognized but never engineering approved',()=>{
 const r=audit(project(),{allowDeclaredMultiSegment:true});
 assert.equal(r.status,'UNKNOWN');
 assert.ok(codes(r).includes('MULTI_SEGMENT_DECLARED_ONLY'));
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.ready_for_installation,false);
});
test('missing segment blocks even in opt-in',()=>{
 const p=project();p.wiringModelV18.wires.pop();
 const r=audit(p,{allowDeclaredMultiSegment:true});
 assert.equal(r.status,'BLOCKED');
 assert.ok(codes(r).includes('DIRECT_WIRE_UNDECLARED'));
});
test('wrong role blocks',()=>{
 const p=project();p.wiringModelV18.terminals[1].conductor='PE';
 const r=audit(p,{allowDeclaredMultiSegment:true});
 assert.equal(r.status,'BLOCKED');
});
test('no implicit contact bridge',()=>{
 const p=project();p.wiringModelV18.terminals.splice(1,1,
 {id:'in',device_id:'SW',conductor:'L1'},
 {id:'out',device_id:'SW',conductor:'L1'});
 p.wiringModelV18.wires=[{from:'a',to:'in'},{from:'out',to:'z'}];
 const r=audit(p,{allowDeclaredMultiSegment:true});
 assert.equal(r.status,'BLOCKED');
});
