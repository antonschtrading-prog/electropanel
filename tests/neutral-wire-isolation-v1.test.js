'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epDeclaredWirePathV2=require('../terminal-path-v2.js').epDeclaredWirePathV2;
const {epNeutralWireIsolationV1:a}=require('../neutral-wire-isolation-v1');
const project=()=>({sharedDevices:[{id:'RCD1'},{id:'RCD2'}],
 endpointBindingsV1:[
 {symbolicRef:'BUS:N_MAIN/N',terminalId:'main'},
 {symbolicRef:'BUS:N_RCD1/N',terminalId:'rcd1'},
 {symbolicRef:'BUS:N_RCD2/N',terminalId:'rcd2'}],
 wiringModelV18:{terminals:[
 {id:'main',conductor:'N'},{id:'rcd1',conductor:'N'},
 {id:'rcd2',conductor:'N'},{id:'junction',conductor:'N'}],
 wires:[]}});
test('separate downstream neutral buses have no declared cross-path, still unknown',()=>{
 const r=a(project());assert.equal(r.status,'UNKNOWN');assert.equal(r.pairs.length,3);
 assert.equal(r.engineeringApproved,false);
});
test('direct N wire between RCD groups is blocked',()=>{
 const p=project();p.wiringModelV18.wires.push({from:'rcd1',to:'rcd2',state:'closed'});
 const r=a(p);assert.equal(r.status,'BLOCKED');
 assert(r.issues.some(x=>x.code==='N_ISOLATION_CROSS_BUS_DECLARED_PATH'&&x.fromBus==='N_RCD1'));
});
test('two-segment N connection across RCD groups is blocked',()=>{
 const p=project();p.wiringModelV18.wires.push(
 {from:'rcd1',to:'junction',state:'closed'},{from:'junction',to:'rcd2',state:'closed'});
 const r=a(p);assert.equal(r.status,'BLOCKED');
 assert(r.pairs.some(x=>x.path.join('>')==='rcd1>junction>rcd2'));
});
test('downstream N connected to main N is blocked',()=>{
 const p=project();p.wiringModelV18.wires.push({from:'main',to:'rcd1',state:'closed'});
 assert(a(p).issues.some(x=>x.code==='N_ISOLATION_CROSS_BUS_DECLARED_PATH'));
});
test('same physical terminal mapped to two N buses is blocked',()=>{
 const p=project();p.endpointBindingsV1[2].terminalId='rcd1';
 assert(a(p).issues.some(x=>x.code==='N_ISOLATION_CROSS_BUS_DECLARED_PATH'));
});
test('unknown wire state is never assumed closed',()=>{
 const p=project();p.wiringModelV18.wires.push({from:'rcd1',to:'rcd2',state:'unknown'});
 assert.equal(a(p).status,'UNKNOWN');
});
test('missing bus terminal mapping remains unknown',()=>{
 const p=project();p.endpointBindingsV1.pop();
 assert(a(p).issues.some(x=>x.code==='N_ISOLATION_ENDPOINT_UNBOUND'));
});
test('missing terminal reference blocks',()=>{
 const p=project();p.endpointBindingsV1[2].terminalId='MISSING';
 assert(a(p).issues.some(x=>x.code==='N_ISOLATION_TERMINAL_MISSING'));
});
test('wrong conductor role blocks',()=>{
 const p=project();p.wiringModelV18.terminals[2].conductor='PE';
 assert.equal(a(p).status,'BLOCKED');
});
test('duplicate binding fails closed',()=>{
 const p=project();p.endpointBindingsV1.push({...p.endpointBindingsV1[0]});
 assert.equal(a(p).status,'BLOCKED');
});
test('absent wiring model remains unknown',()=>{
 const p=project();delete p.wiringModelV18;
 assert.equal(a(p).status,'UNKNOWN');
});
test('missing tracer dependency fails closed',()=>{
 const p=project();delete global.epDeclaredWirePathV2;
 try{assert.equal(a(p).status,'BLOCKED');}
 finally{global.epDeclaredWirePathV2=require('../terminal-path-v2.js').epDeclaredWirePathV2;}
});
test('isolation audit never mutates project',()=>{
 const p=project(),before=JSON.stringify(p);a(p);assert.equal(JSON.stringify(p),before);
});
