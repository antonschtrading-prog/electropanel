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

test('role validation rejects CONTROL and unknown roles',()=>{
 const model={terminals:[t('a','CONTROL'),t('b','CONTROL')],wires:[w('a','b')]};
 for(const role of ['CONTROL','L4',null])assert.equal(a(model,'a','b',role).code,'ROLE_INVALID');
});
test('endpoint mismatch and absent endpoints are explicit',()=>{
 const model={terminals:[t('a','L1'),t('b','N')],wires:[]};
 assert.equal(a(model,'a','missing','L1').code,'ENDPOINT_NOT_FOUND');
 assert.equal(a(model,'a','b','L1').code,'ENDPOINT_ROLE_MISMATCH');
 assert.equal(a(model,'a','a','L1').code,'SAME_TERMINAL');
});
test('invalid model structures fail closed',()=>{
 for(const model of [null,{}, {terminals:[],wires:null},{terminals:[null],wires:[]},
  {terminals:[{id:'a',conductor:'L1'},{id:'a',conductor:'L1'}],wires:[]}]){
  const r=a(model,'a','b','L1');assert.equal(r.status,'UNKNOWN');assert.equal(r.engineeringApproved,false);
 }
});
test('broken references, self loops and unsupported wire states fail closed',()=>{
 const terminals=[t('a','PE'),t('b','PE')];
 for(const wire of [{from:'a',to:'missing'},{from:'a',to:'a'},{from:'a',to:'b',state:'open'},
  {from:'a',to:'b',state:'pending'},null]){
  const r=a({terminals,wires:[wire]},'a','b','PE');
  assert.equal(r.status,'UNKNOWN');assert.equal(r.ready_for_installation,false);
 }
});
test('separate declared networks are not silently bridged',()=>{
 const model={terminals:['a','b','c','d'].map(id=>t(id,'N')),wires:[w('a','b'),w('c','d')]};
 assert.equal(a(model,'a','d','N').code,'DECLARED_WIRE_PATH_MISSING');
});
test('long multi-segment declared chain remains bounded and unapproved',()=>{
 const count=1200,terminals=Array.from({length:count},(_,i)=>t('T'+i,'L2'));
 const wires=Array.from({length:count-1},(_,i)=>w('T'+i,'T'+(i+1)));
 const r=a({terminals,wires},'T0','T'+(count-1),'L2');
 assert.equal(r.status,'DECLARED_PATH');assert.equal(r.path.length,count);
 assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
});
test('oversized model fails before graph construction',()=>{
 const terminals=Array.from({length:5001},(_,i)=>t('T'+i,'L1'));
 assert.equal(a({terminals,wires:[]},'T0','T1','L1').code,'MODEL_INVALID');
});
