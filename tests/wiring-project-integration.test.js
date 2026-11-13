'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const start=app.indexOf('function normalizeWiring18Import(value){');
const end=app.indexOf('function normalizeLV43Import(value){',start);
assert.ok(start>=0&&end>start);
const normalize=vm.runInNewContext(app.slice(start,end)+'\nnormalizeWiring18Import');
const sample={terminals:[{id:'SRC.L1',device_id:'SRC',conductor:'L1'}],
 wires:[],internal_links:[],sources:[{terminal:'SRC.L1',conductor:'L1'}],loads:[]};
test('controlled wiring data survives JSON import and no silent custom metadata loss',()=>{
 const copy=normalize(sample);
 assert.equal(copy.terminals[0].id,'SRC.L1');
 assert.equal(copy.sources.length,1);
 assert.deepEqual(Object.keys(copy),['terminals','wires','internal_links','sources','loads']);
 assert.throws(()=>normalize({...sample,verified:true}),/Неподдерживаемое/);
 assert.throws(()=>normalize({...sample,terminals:[{...sample.terminals[0],hidden:'yes'}]}),/Неизвестные/);
});
test('empty endpoints cannot become installation approval',()=>{
 const wiring=fs.readFileSync(path.join(root,'wiring-audit-v18.js'),'utf8');
 const api=vm.runInNewContext(wiring+'\n({epWiringAuditCoreV18})');
 const r=api.epWiringAuditCoreV18(normalize(sample));
 assert.equal(r.ready_for_installation,false);
 assert.ok(Array.from(r.diagnostics,x=>x.code).includes('ENDPOINT_COVERAGE_MISSING'));
});
test('malformed input rejected before any project mutation',()=>{
 for(const bad of [null,[],{terminals:'wrong'},{
  ...sample,wires:[{id:'W1',from:'x',to:'y',unexpected:true}]
 },{...sample,terminals:Array.from({length:1001},()=>({id:'A',conductor:'L1'}))}]){
  assert.throws(()=>normalize(bad));
 }
});
