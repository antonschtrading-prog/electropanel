'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'..','protection.js'),'utf8');
const api=vm.runInNewContext(js+'\n({epEngineeringPreflight})');
const catalog={A:{kind:'MCB',icnKa:6}};
const lookup=id=>catalog[id]||null;
const calc=x=>!x?{numericStatus:'UNKNOWN'}:{numericStatus:x.valid===true?'PASS':x.valid===false?'FAIL':'UNKNOWN'};
const line=overrides=>({id:'L1',catalogSku:'A',
 overloadInput:{valid:true},faultInput:{ikKa:'3',source:'Report 1'},...overrides});
const evaluate=x=>api.epEngineeringPreflight({lines:[x]},lookup,calc);
test('preflight remains UNKNOWN even when arithmetic and Icn comparisons pass',()=>{
 const r=evaluate(line());
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.status,'UNKNOWN');
 assert.equal(r.lines[0].status,'UNKNOWN');
 assert.ok(Array.from(r.lines[0].rules,x=>x.code).includes('APPLICABILITY'));
});
test('calculation failure blocks even when source is supplied',()=>{
 const r=evaluate(line({overloadInput:{valid:false}}));
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.counts.BLOCKED,1);
});
test('short circuit current above Icn blocks',()=>{
 const r=evaluate(line({faultInput:{ikKa:'6.001',source:'Report 2'}}));
 assert.equal(r.status,'BLOCKED');
 assert.ok(Array.from(r.lines[0].rules,x=>x.code).includes('FAULT_CAPACITY'));
});
test('stale declared currents block reuse of old approval',()=>{
 const r=evaluate(line({calculationReview:{required:true,reason:'ARTICLE_CHANGED'}}));
 assert.equal(r.status,'BLOCKED');
 assert.ok(Array.from(r.lines[0].rules,x=>x.code).includes('STALE_CALCULATION'));
});
test('unknown catalogue cannot accidentally create valid protection check',()=>{
 const r=evaluate(line({catalogSku:'MISSING'}));
 assert.equal(r.status,'BLOCKED');
 assert.ok(Array.from(r.lines[0].rules,x=>x.code).includes('ARTICLE'));
});
test('missing values and missing source are explicit unknowns',()=>{
 const r=evaluate(line({faultInput:{ikKa:'4',source:''},overloadInput:undefined}));
 assert.equal(r.status,'UNKNOWN');
 const codes=Array.from(r.lines[0].rules,x=>x.code);
 assert.ok(codes.includes('FAULT_SOURCE'));
 assert.ok(codes.includes('OVERLOAD_ARITHMETIC'));
});
test('multiple circuits count statuses independently',()=>{
 const r=api.epEngineeringPreflight({lines:[
  line(),{...line({id:'L2',faultInput:{ikKa:'9',source:'Report 3'}})}
 ]},lookup,calc);
 assert.equal(r.counts.BLOCKED,1);
 assert.equal(r.counts.UNKNOWN,1);
 assert.equal(r.lines.length,2);
});
