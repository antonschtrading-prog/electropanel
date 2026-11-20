'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epDeviceSupplyValidateV1:validate,epDeviceSupplyUpdateV1:update,
 epDeviceSupplyIncomingV1:add,epDeviceSupplyRemoveIncomingV1:remove,
 epDeviceSupplyAuditV1:audit,epDeviceSupplyHtmlV1:html}=require('../device-supply-v1.js');
const project=()=>({lines:[{id:'L1',phase:'L1'},{id:'L2',phase:'L2'}],
 branchDevices:[{id:'B1',circuitId:'L1'},{id:'B2',circuitId:'L2'}],sharedDevices:[],
 feedLinks:[],groupInputLinks:[]});
const empty=()=>({version:1,incomingDevices:[],links:[]});
test('source -> incoming -> branch declarations roundtrip, without approval',()=>{
 const p=project();p.deviceSupplyV1=add(p,{id:'QF0',label:'Вводной'});
 p.deviceSupplyV1=update(p,'SOURCE:MAIN','INCOMING:QF0',['L1','L2','L3','N']);
 p.deviceSupplyV1=update(p,'INCOMING:QF0','BRANCH:B1',['L1','N']);
 const a=audit(p);
 assert.equal(a.edges.length,2);assert.equal(a.electricalPath,'DECLARED_NOT_VERIFIED');
 assert.equal(a.selectivityStatus,'NOT_ASSESSED');assert.equal(a.engineeringApproved,false);
 assert.equal(validate(p,p.deviceSupplyV1).links.length,2);
});
test('group RCD relationship uses real shared apparatus ID',()=>{
 const p=project();p.sharedDevices=[{id:'RCD1',circuitIds:['L1']}];
 p.deviceSupplyV1=update(p,'SOURCE:MAIN','GROUP:RCD1',['L1','N']);
 p.deviceSupplyV1=update(p,'GROUP:RCD1','BRANCH:B1',['L1','N']);
 assert.equal(audit(p).issues.some(x=>x.code==='DEVICE_SUPPLY_GROUP_PARENT_CONFLICT'),false);
});
test('multiple supply parents, self-links, cycles and unknown endpoints rejected atomically',()=>{
 const p=project();p.deviceSupplyV1=update(p,'SOURCE:MAIN','BRANCH:B1',['L1','N']);
 const old=JSON.stringify(p);
 for(const [from,to,kinds] of [
  ['BRANCH:B1','BRANCH:B1',['L1']],
  ['NONE','BRANCH:B2',['L2']],
  ['BRANCH:B1','SOURCE:MAIN',['L1']],
  ['BRANCH:B1','BRANCH:B2',['L1','N']]]){
  if(from==='BRANCH:B1'&&to==='BRANCH:B2')continue;
  assert.throws(()=>update(p,from,to,kinds),/DEVICE_SUPPLY_/);
  assert.equal(JSON.stringify(p),old);
 }
 assert.throws(()=>validate(p,{...p.deviceSupplyV1,
  links:[...p.deviceSupplyV1.links,{from:'SOURCE:MAIN',to:'BRANCH:B1',conductors:['L1']}] }),/MULTIPLE_SUPPLY_PARENTS/);
});
test('valid edges can still fail phase and group consistency',()=>{
 const p=project();p.deviceSupplyV1=update(p,'SOURCE:MAIN','BRANCH:B1',['L2','N']);
 assert.ok(audit(p).issues.some(x=>x.code==='DEVICE_SUPPLY_BRANCH_PHASE_MISMATCH'));
 p.sharedDevices=[{id:'RCD1',circuitIds:['L1']}];
 assert.ok(audit(p).issues.some(x=>x.code==='DEVICE_SUPPLY_GROUP_PARENT_CONFLICT'));
});
test('incoming removal cleans affected edges without mutating input',()=>{
 const p=project();p.deviceSupplyV1=add(p,{id:'QF0',label:'Главный'});
 p.deviceSupplyV1=update(p,'SOURCE:MAIN','INCOMING:QF0',['L1','L2','N']);
 p.deviceSupplyV1=update(p,'INCOMING:QF0','BRANCH:B1',['L1','N']);
 const old=JSON.stringify(p),next=remove(p,'QF0');
 assert.deepEqual(next.incomingDevices,[]);assert.deepEqual(next.links,[]);
 assert.equal(JSON.stringify(p),old);
});
test('malicious input cannot bypass validation or render raw HTML',()=>{
 const p=project();
 for(const bad of [
  {version:2,incomingDevices:[],links:[]},
  {version:1,incomingDevices:[{id:'Q!',label:'abc'}],links:[]},
  {version:1,incomingDevices:[],links:[{from:'SOURCE:MAIN',to:'BRANCH:B1',conductors:['N']}]},
  {version:1,incomingDevices:[],links:[{from:'SOURCE:MAIN',to:'BRANCH:B1',conductors:['L1','L1']}]},
  {version:1,incomingDevices:[],links:[{from:'SOURCE:MAIN',to:'BRANCH:B1',conductors:['PE','L1']}]}
 ])assert.throws(()=>validate(p,bad),/DEVICE_SUPPLY_/);
 p.deviceSupplyV1={...empty(),incomingDevices:[{id:'QF0',label:'<script>alert(1)</script>'}]};
 const h=html(p);assert.ok(h.includes('&lt;script&gt;'));
 assert.ok(!h.includes('<script>'));
});
test('unlinked devices remain unknown, not approved',()=>{
 const p=project();p.deviceSupplyV1=empty();
 const r=audit(p);assert.ok(r.issues.some(x=>x.code==='DEVICE_SUPPLY_PARENT_MISSING'));
 assert.equal(r.ready_for_installation,false);
});
