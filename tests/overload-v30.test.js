'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','overload-v30.js'),'utf8');
const {epOverloadGuardV30,epV30Decimal,epV30Compare,EP_V30_EVIDENCE}=
 vm.runInNewContext(src+'\n({epOverloadGuardV30,epV30Decimal,epV30Compare,EP_V30_EVIDENCE})');
const GOOD={ib_a:12,in_a:16,base_iz_a:20,i2_a:28,factors:[{name:'group',value:1}]};
const guard=x=>epOverloadGuardV30({...GOOD,...x});
test('reference PASS/FAIL and equality boundary match Python v4.14 test_v30.py',()=>{
 assert.equal(guard({}).numeric_status,'PASS');
 assert.equal(guard({i2_a:30}).numeric_status,'FAIL');
 assert.equal(guard({i2_a:29}).numeric_status,'PASS');
 assert.equal(guard({}).ready_for_installation,false);
 assert.equal(guard({}).evidence_status,'UNVERIFIED');
});
test('missing/invalid values fail closed',()=>{
 assert.equal(guard({i2_a:null}).numeric_status,'UNKNOWN');
 assert.equal(guard({in_a:true}).numeric_status,'UNKNOWN');
 assert.equal(guard({ib_a:NaN}).numeric_status,'UNKNOWN');
 assert.equal(guard({factors:[]}).numeric_status,'UNKNOWN');
 assert.equal(guard({factors:[{name:'temp',value:1.1}]}).numeric_status,'UNKNOWN');
});
test('overflow/underflow cases match Python without IEEE-754 arithmetic',()=>{
 assert.equal(guard({base_iz_a:1e308}).numeric_status,'PASS');
 assert.equal(guard({base_iz_a:1e-300,factors:[{name:'tiny',value:1e-300}]}).numeric_status,'FAIL');
 const low=epV30Decimal('1e-600');
 assert.ok(low&&epV30Compare(low,epV30Decimal('1e-300'))<0);
});
test('self-provided evidence is never independently authenticated',()=>{
 const evidence=Object.fromEntries(Array.from(EP_V30_EVIDENCE,k=>[k,'self-certified']));
 const r=guard({evidence});
 assert.equal(r.missing_evidence.length,0);
 assert.equal(r.evidence_status,'UNVERIFIED');
 assert.equal(r.ready_for_installation,false);
 assert.equal(r.standards_certified,false);
});
test('unbounded/malformed factor input never reaches PASS',()=>{
 assert.equal(guard({factors:Array.from({length:33},(_,i)=>({name:'F'+i,value:1}))}).numeric_status,'UNKNOWN');
 assert.equal(guard({factors:[{name:'',value:1}]}).numeric_status,'UNKNOWN');
 assert.equal(guard({factors:[{name:'a',value:'Infinity'}]}).numeric_status,'UNKNOWN');
});
