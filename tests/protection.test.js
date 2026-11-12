'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','protection.js'),'utf8');
const api=vm.runInNewContext(code+'\n({epParsePositiveCurrentKa,epBreakingCapacityCheck,epCurrentInputCompleteness})');
const device={kind:'MCB',icnKa:6};
const check=value=>api.epBreakingCapacityCheck(device,value);
test('declared prospective fault current parsing is restrictive',()=>{
 assert.equal(api.epParsePositiveCurrentKa('5,5'),5.5);
 assert.equal(api.epParsePositiveCurrentKa('0'),null);
 assert.equal(api.epParsePositiveCurrentKa('-1'),null);
 assert.equal(api.epParsePositiveCurrentKa('1e3'),null);
 assert.equal(api.epParsePositiveCurrentKa('2.1234'),null);
 assert.equal(api.epParsePositiveCurrentKa('3 kA'),null);
});
test('Icn comparison distinguishes missing, invalid, exceedance and preliminary success',()=>{
 assert.equal(check('').status,'UNKNOWN');
 assert.equal(check('abc').status,'INVALID');
 assert.equal(check('6.001').status,'FAIL');
 assert.equal(check('6').status,'PRELIMINARY_PASS');
 assert.equal(check('5.999').status,'PRELIMINARY_PASS');
 assert.equal(check('100').engineeringApproved,false);
 assert.equal(check('3').engineeringApproved,false);
});
test('unknown article and incompatible rating never become approved',()=>{
 assert.equal(api.epBreakingCapacityCheck(null,'4').status,'UNKNOWN');
 assert.equal(api.epBreakingCapacityCheck({kind:'RCD',icnKa:6},'4').status,'UNKNOWN');
 assert.equal(api.epBreakingCapacityCheck({kind:'MCB'},'4').status,'UNKNOWN');
});

test('overload input may be absent when fault current is declared independently',()=>{
 const status=v=>api.epCurrentInputCompleteness(v);
 assert.equal(status({ibA:'',inA:'',izA:'',i2A:''}),'EMPTY');
 assert.equal(status({ibA:'11',inA:'',izA:'',i2A:''}),'PARTIAL');
 assert.equal(status({ibA:'11',inA:'16',izA:'20',i2A:'23'}),'COMPLETE');
});
