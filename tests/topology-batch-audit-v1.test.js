'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const code=['terminal-path-v2.js','endpoint-bridge-v1.js','topology-batch-audit-v1.js']
 .map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const audit=vm.runInNewContext(code+'\nepTopologyBatchAuditV1');
const base=()=>({
 terminalLinks:[{id:'L1',from:'BRANCH:b/L1',to:'LOAD:l/L1'}],feedLinks:[],groupInputLinks:[],
 endpointBindingsV1:[{symbolicRef:'BRANCH:b/L1',terminalId:'a'},
 {symbolicRef:'LOAD:l/L1',terminalId:'c'}],
 wiringModelV18:{terminals:[{id:'a',conductor:'L1'},{id:'b',conductor:'L1'},
 {id:'c',conductor:'L1'}],wires:[{from:'a',to:'b'},{from:'b',to:'c'}]}
});
test('batch counts declared paths without approval',()=>{
 const r=audit(base());assert.equal(r.summary.declaredPaths,1);
 assert.equal(r.status,'UNKNOWN');assert.equal(r.engineeringApproved,false);
});
test('batch blocks missing segment',()=>{
 const p=base();p.wiringModelV18.wires.pop();
 const r=audit(p);assert.equal(r.status,'BLOCKED');assert.equal(r.summary.blocked,1);
});
test('batch reports missing endpoint without optimistic pass',()=>{
 const p=base();p.endpointBindingsV1.pop();
 const r=audit(p);assert.equal(r.status,'UNKNOWN');assert.equal(r.summary.unknown,1);
});
test('batch rejects duplicate endpoint mapping',()=>{
 const p=base();p.endpointBindingsV1.push(p.endpointBindingsV1[0]);
 assert.equal(audit(p).status,'BLOCKED');
});
test('batch handles absent wiring',()=>assert.equal(audit({}).status,'UNKNOWN'));
test('batch handles unknown wire state conservatively',()=>{
 const p=base();p.wiringModelV18.wires[0].state='unknown';
 assert.equal(audit(p).summary.unknown,1);
});
