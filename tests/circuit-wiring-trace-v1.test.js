'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=['terminal-path-v2.js','endpoint-bridge-v1.js','circuit-wiring-trace-v1.js']
 .map(x=>fs.readFileSync(path.join(root,x),'utf8')).join('\n');
const trace=vm.runInNewContext(source+'\nepCircuitWiringTraceV1');
const project=()=>({lines:[{id:'L1',phase:'L1'},{id:'L2',phase:'L2'}],
 branchDevices:[{id:'BR1',circuitId:'L1'},{id:'BR2',circuitId:'L2'}],
 loads:[{id:'LD1',circuitId:'L1'}],
 terminalLinks:[{id:'T1',from:'BRANCH:BR1/L1',to:'LOAD:LD1/L1'}],
 feedLinks:[],groupInputLinks:[],
 endpointBindingsV1:[{symbolicRef:'BRANCH:BR1/L1',terminalId:'a'},
 {symbolicRef:'LOAD:LD1/L1',terminalId:'c'}],
 wiringModelV18:{terminals:[{id:'a',conductor:'L1'},{id:'b',conductor:'L1'},
 {id:'c',conductor:'L1'}],wires:[{from:'a',to:'b',state:'closed'},
 {from:'b',to:'c',state:'closed'}]}});
test('traces two-segment declared wire without approval',()=>{
 const p=project(),r=trace(p);
 assert.equal(r.rows[0].declaredPaths,1);
 assert.equal(r.rows[0].connections[0].status,'DECLARED_PATH');
 assert.equal(r.rows[0].connections[0].path.join('→'),'a→b→c');
 assert.equal(r.status,'UNKNOWN');assert.equal(r.engineeringApproved,false);
 assert(r.issues.some(i=>i.code==='DECLARED_WIRE_PATH_NOT_PHYSICALLY_VERIFIED'));
});
test('missing wire blocks only its circuit',()=>{
 const p=project();p.wiringModelV18.wires.pop();
 const r=trace(p);assert.equal(r.rows[0].status,'BLOCKED');assert.equal(r.rows[1].status,'UNKNOWN');
 assert(r.issues.some(i=>i.lineId==='L1'&&i.code==='DECLARED_WIRE_PATH_MISSING'));
});
test('unbound endpoint remains unknown',()=>{
 const p=project();p.endpointBindingsV1.pop();
 const r=trace(p);assert.equal(r.rows[0].connections[0].code,'SYMBOLIC_ENDPOINT_UNBOUND');
});
test('cross-role symbolic link blocks',()=>{
 const p=project();p.terminalLinks[0].to='LOAD:LD1/N';
 const r=trace(p);assert.equal(r.rows[0].connections[0].code,'SYMBOLIC_ROLE_MISMATCH');
});
test('unknown wire state never counted as continuous',()=>{
 const p=project();p.wiringModelV18.wires[0].state='unknown';
 const r=trace(p);assert.equal(r.rows[0].declaredPaths,0);
 assert.equal(r.rows[0].connections[0].status,'UNKNOWN');
});
test('two different outgoing circuits cannot be joined as a single circuit link',()=>{
 const p=project();p.terminalLinks=[{id:'CROSS',from:'BRANCH:BR1/L1',to:'BRANCH:BR2/L1'}];
 const r=trace(p);assert(r.issues.some(i=>i.code==='CROSS_CIRCUIT_SYMBOLIC_LINK'));
});
test('no wiring model reports unknown per circuit',()=>{
 const p=project();delete p.wiringModelV18;
 const r=trace(p);assert.equal(r.rows.length,2);assert.equal(r.status,'UNKNOWN');
});
test('bad binding schema fails closed',()=>{
 const p=project();p.endpointBindingsV1.push(p.endpointBindingsV1[0]);
 assert.equal(trace(p).status,'BLOCKED');
});
test('missing dependencies fail closed',()=>{
 const f=require('../circuit-wiring-trace-v1.js').epCircuitWiringTraceV1;
 assert.equal(f(project()).status,'BLOCKED');
});
test('trace never mutates project',()=>{
 const p=project(),before=JSON.stringify(p);trace(p);assert.equal(JSON.stringify(p),before);
});
