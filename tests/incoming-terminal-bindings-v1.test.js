'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epIncomingTerminalBindingSetV1:set,epIncomingTerminalBindingClearV1:clear,
 epIncomingTerminalBindingsNormalizeV1:normalize,epIncomingTerminalBindingsAuditV1:audit,
 epIncomingTerminalBindingsHtmlV1:html}=require('../incoming-terminal-bindings-v1.js');
const p=()=>({deviceSupplyV1:{version:1,incomingDevices:[{id:'Q0',label:'Главный ввод',catalogSku:null}],links:[]},
 deviceModelV19:{devices:[{id:'D0',kind:'MCB',poles:2},{id:'D1',kind:'MCB',poles:1}],
 terminals:[{id:'T1',device_id:'D0',conductor:'L1'},{id:'T2',device_id:'D0',conductor:'N'},
 {id:'T3',device_id:'D1',conductor:'L1'}]},
 boardBindingsV1:[]});
test('binding is explicit, canonical and does not mutate original',()=>{
 const x=p(),before=JSON.stringify(x),out=set(x,'Q0','D0');
 assert.equal(out[0].modelDeviceId,'D0');assert.equal(out[0].snapshot.model.terminals.length,2);
 assert.equal(JSON.stringify(x),before);
 x.incomingTerminalBindingsV1=out;
 assert.equal(audit(x).status,'UNKNOWN');assert.equal(audit(x).rows[0].snapshotStale,false);
 assert.equal(audit(x).engineeringApproved,false);
});
test('changing catalogue, label, terminal role or model poles invalidates snapshot',()=>{
 for(const mutate of [
  x=>x.deviceSupplyV1.incomingDevices[0].catalogSku='NEW',
  x=>x.deviceSupplyV1.incomingDevices[0].label='Другой ввод',
  x=>x.deviceModelV19.terminals[0].conductor='L2',
  x=>x.deviceModelV19.devices[0].poles=1]){
  const x=p();x.incomingTerminalBindingsV1=set(x,'Q0','D0');mutate(x);
  assert.equal(audit(x).status,'BLOCKED');
  assert.ok(audit(x).issues.some(i=>i.code==='INCOMING_BINDING_SNAPSHOT_STALE'));
 }
});
test('same terminal model cannot be assigned to board apparatus and incoming',()=>{
 const x=p();x.boardBindingsV1=[{modelDeviceId:'D0',boardDeviceId:'BR1'}];
 assert.throws(()=>set(x,'Q0','D0'),/INCOMING_BINDING_MODEL_USED_BY_BOARD_DEVICE/);
 x.boardBindingsV1=[];x.incomingTerminalBindingsV1=set(x,'Q0','D0');
 x.boardBindingsV1=[{modelDeviceId:'D0',boardDeviceId:'BR1'}];
 assert.equal(audit(x).status,'BLOCKED');
});
test('duplicate incoming and model bindings never import',()=>{
 const x=p(),one=set(x,'Q0','D0')[0];
 assert.throws(()=>normalize(x,[one,one]),/DUPLICATED/);
 assert.throws(()=>normalize(x,[{...one,modelDeviceId:'MISSING'}]),/ENTITY_NOT_FOUND/);
});
test('clearing binding leaves source unchanged',()=>{
 const x=p();x.incomingTerminalBindingsV1=set(x,'Q0','D0');
 const old=JSON.stringify(x),next=clear(x,'Q0');
 assert.deepEqual(next,[]);assert.equal(JSON.stringify(x),old);
});
test('incoming UI labels are escaped',()=>{
 const x=p();x.deviceSupplyV1.incomingDevices[0].label='<img src=x onerror=alert(1)>';
 const out=html(x);assert.match(out,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.ok(!out.includes('<img src=x onerror=alert(1)>'));
});
test('missing binding stays incomplete, never approved',()=>{
 const r=audit(p());assert.equal(r.status,'UNKNOWN');
 assert.ok(r.issues.some(i=>i.code==='INCOMING_BINDING_REQUIRED'));
 assert.equal(r.ready_for_installation,false);
});
