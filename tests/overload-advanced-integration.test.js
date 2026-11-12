'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(base,'app.js'),'utf8');
const v30=fs.readFileSync(path.join(base,'overload-v30.js'),'utf8');
const protection=fs.readFileSync(path.join(base,'protection.js'),'utf8');
const start=app.indexOf('function normalizeV30Import(value){');
const end=app.indexOf('function normalizeFaultImport(value){',start);
assert.ok(start>=0&&end>start);
const api=vm.runInNewContext(v30+'\n'+protection+'\n'+app.slice(start,end)+
 '\n({normalizeV30Import,epOverloadGuardV30,epEngineeringPreflight})');
const input=()=>({ib_a:'12',in_a:'16',base_iz_a:'20',i2_a:'28',
 factors:[{name:'group',value:'1'}],evidence:{}});
test('advanced port record survives safe JSON normalization',()=>{
 const entry=api.normalizeV30Import(input());
 assert.equal(api.epOverloadGuardV30(entry).numeric_status,'PASS');
 assert.equal(entry.base_iz_a,'20');
});
test('advanced guard remains fail-closed without evidence',()=>{
 const p={lines:[{id:'L1',overloadV30:api.normalizeV30Import(input())}]};
 const r=api.epEngineeringPreflight(p,()=>null,()=>({numericStatus:'UNKNOWN'}));
 assert.equal(r.engineeringApproved,false);
 assert.ok(Array.from(r.lines[0].rules,x=>x.code).includes('V30_EVIDENCE'));
});
test('unsafe advanced calculation is blocked in the shared audit',()=>{
 const v=input();v.i2_a='35';
 const line={id:'L1',overloadV30:api.normalizeV30Import(v)};
 const r=api.epEngineeringPreflight({lines:[line]},()=>null,()=>({numericStatus:'UNKNOWN'}));
 assert.ok(Array.from(r.lines[0].rules,x=>x.code).includes('V30_OVERLOAD'));
 assert.equal(r.lines[0].status,'BLOCKED');
});
test('unexpected fields and invalid evidence never silently pass',()=>{
 assert.throws(()=>api.normalizeV30Import({...input(),custom:'hidden'}));
 assert.throws(()=>api.normalizeV30Import({...input(),evidence:{fake:'approved'}}));
 assert.throws(()=>api.normalizeV30Import({...input(),factors:[{name:'group',value:{danger:1}}]}));
});
