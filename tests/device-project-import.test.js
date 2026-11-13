'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=app.indexOf('function normalizeDevice19Import(value){'),end=app.indexOf('function normalizeWiring18Import(value){',start);
assert.ok(start>=0&&end>start);
const normalize=vm.runInNewContext(app.slice(start,end)+'\nnormalizeDevice19Import');
const base=()=>({devices:[{id:'Q1',kind:'breaker',poles:2,evidence:{
 manufacturer:'Test',model:'Q1',document_id:'doc',revision:'1',source_url:'https://example.org'}}],
 terminals:[{id:'N1',device_id:'Q1',conductor:'N'}],internal_links:[],wires:[],
 neutral_zones:[{id:'Z1',terminals:['N1']}]});
test('device and neutral-zone JSON survives strict normalization without inferred certificates',()=>{
 const p=normalize(base());
 assert.equal(p.devices[0].poles,2);
 assert.equal(p.neutral_zones[0].terminals[0],'N1');
 assert.equal(p.devices[0].evidence.source_url,'https://example.org');
});
test('unknown and malformed apparatus claims must not be silently dropped',()=>{
 const changes=[
  p=>p.verified=true,
  p=>p.devices[0].evidence.approved='yes',
  p=>p.devices[0].poles='2',
  p=>p.devices[0].evidence.sha256=true,
  p=>p.neutral_zones[0].terminals=[5],
  p=>p.terminals[0].unexpected='x'
 ];
 for(const modify of changes){const p=base();modify(p);assert.throws(()=>normalize(p));}
});
test('normalizer refuses oversized arrays and payloads',()=>{
 const p=base();p.devices=Array.from({length:1001},()=>({id:'Q'}));
 assert.throws(()=>normalize(p));
 assert.throws(()=>normalize(null));
 assert.throws(()=>normalize([]));
});
