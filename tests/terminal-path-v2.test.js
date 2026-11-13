'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {epDeclaredWirePathV2:a}=require('../terminal-path-v2.js');
const t=(id,conductor)=>({id,conductor});
const w=(from,to)=>({from,to});
test('multi-segment path is only a declaration',()=>{
 const r=a({terminals:[t('a','PE'),t('b','PE'),t('c','PE')],wires:[w('a','b'),w('b','c')]},'a','c','PE');
 assert.equal(r.status,'DECLARED_PATH');assert.deepEqual(r.path,['a','b','c']);
 assert.equal(r.engineeringApproved,false);
});
test('no inferred contact conduction',()=>{
 const r=a({terminals:[t('a','L1'),t('contact-in','L1'),t('contact-out','L1'),t('z','L1')],wires:[w('a','contact-in'),w('contact-out','z')]},'a','z','L1');
 assert.equal(r.status,'BLOCKED');
});
test('cross-role wire blocks',()=>{
 const r=a({terminals:[t('a','N'),t('b','PE')],wires:[w('a','b')]},'a','b','N');
 assert.equal(r.status,'BLOCKED');
});
test('no path is blocked',()=>assert.equal(a({terminals:[t('a','N'),t('b','N')],wires:[]},'a','b','N').status,'BLOCKED'));
test('invalid and duplicate terminals cannot pass',()=>assert.equal(a({terminals:[t('a','N'),t('a','N')],wires:[]},'a','a','N').status,'UNKNOWN'));

test('unknown wire state cannot establish a path',()=>{
 const r=a({terminals:[t('a','L1'),t('b','L1')],wires:[{from:'a',to:'b',state:'unknown'}]},'a','b','L1');
 assert.equal(r.status,'UNKNOWN');assert.equal(r.engineeringApproved,false);
});
test('explicitly open wire cannot establish a path',()=>{
 const r=a({terminals:[t('a','L1'),t('b','L1')],wires:[{from:'a',to:'b',state:'open'}]},'a','b','L1');
 assert.equal(r.status,'UNKNOWN');
});
test('explicitly closed wire is a declared path',()=>{
 const r=a({terminals:[t('a','L1'),t('b','L1')],wires:[{from:'a',to:'b',state:'closed'}]},'a','b','L1');
 assert.equal(r.status,'DECLARED_PATH');assert.equal(r.ready_for_installation,false);
});
test('undeclared terminal conductor cannot establish a path',()=>{
 const r=a({terminals:[t('a','L1'),t('b','BOGUS')],wires:[w('a','b')]},'a','b','L1');
 assert.equal(r.status,'UNKNOWN');
});
test('cycle is finite and path search succeeds',()=>{
 const r=a({terminals:[t('a','N'),t('b','N'),t('c','N')],wires:[w('a','b'),w('b','c'),w('c','a')]},'a','c','N');
 assert.equal(r.status,'DECLARED_PATH');assert.deepEqual(r.path,['a','c']);
});
