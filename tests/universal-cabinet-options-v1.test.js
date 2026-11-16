'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epUniversalCabinetOptionsV1:plan}=require('../universal-cabinet-options-v1.js');
const base=()=>({lines:[{id:'L1',modules:8},{id:'L2',modules:8},{id:'L3',modules:4}]});
test('three orientation options use identical engineering device input',()=>{
 const p=base(),original=JSON.stringify(p),r=plan(p);
 assert.equal(r.status,'REVIEW_REQUIRED');assert.deepEqual(r.options.map(o=>o.id),['TALL','BALANCED','WIDE']);
 for(const o of r.options){assert.equal(o.usedModules,20);assert.equal(o.unplaced.length,0);
  assert.ok(o.reserveModules>=4);assert.equal(o.engineeringApproved,false);}
 assert.equal(JSON.stringify(p),original);
});
test('never splits an individual multi-module appliance',()=>{
 const r=plan(base());
 for(const o of r.options)for(const rail of o.rails)for(const d of rail.devices){
  assert.ok(d.startModule+d.modules<=o.modulesPerRail);
  assert.equal(o.rails.flatMap(x=>x.devices).filter(x=>x.deviceId===d.deviceId).length,1);
 }
});
test('wide device blocks only alternatives that cannot contain it',()=>{
 const r=plan({lines:[{id:'L',modules:19}]});
 assert.equal(r.options[0].status,'BLOCKED');assert.equal(r.options[1].status,'BLOCKED');
 assert.equal(r.options[2].status,'REVIEW_REQUIRED');
});
test('source article dimension conflict blocks all recommendations',()=>{
 const r=plan({lines:[{id:'L',modules:1,catalogSku:'A'}]},()=>({article:'A',modules:2}));
 assert.equal(r.status,'BLOCKED');assert.deepEqual(r.options,[]);
});
test('manufacturer article depth missing remains explicitly unknown',()=>{
 const r=plan({lines:[{id:'L',modules:1,catalogSku:'A'}]},()=>({article:'A',modules:1}));
 assert.equal(r.options[0].envelope.preliminaryUsableDepthMm,null);
 assert.ok(r.options[0].issues.some(i=>i.code==='CABINET_DEPTH_UNKNOWN'));
});
test('confirmed depth gives preliminary usable interior depth only',()=>{
 const r=plan({lines:[{id:'L',modules:1,catalogSku:'A'}]},()=>({article:'A',modules:1,geometry:{depthMm:80}}));
 assert.equal(r.options[0].envelope.preliminaryUsableDepthMm,140);
 assert.equal(r.confirmedCabinetFit,false);
});
test('rejects invalid reserve and clearance settings',()=>{
 assert.equal(plan(base(),null,{reserveFraction:-1}).status,'BLOCKED');
 assert.equal(plan(base(),null,{sideAllowanceMm:NaN}).status,'BLOCKED');
 assert.equal(plan(base(),null,{fakeSetting:100}).status,'BLOCKED');
});
test('reject duplicate device identifiers and inconsistent branches',()=>{
 const p=base();p.sharedDevices=[{id:'L1',modules:1}];
 assert.equal(plan(p).status,'BLOCKED');
 const q=base();q.branchDevices=[{id:'B',circuitId:'L1',modules:8}];
 assert.equal(plan(q).status,'BLOCKED');
});
test('reserve uses allocated modules and never falsely promises minimum width of external enclosure',()=>{
 const r=plan(base());for(const o of r.options){
  assert.equal(o.reserveModules,o.allocatedModules-o.usedModules);
  assert.equal(o.envelope.basis,'ASSUMED_PLANNING_ALLOWANCES_NOT_MANUFACTURER_DIMENSIONS');
  assert.ok(o.envelope.preliminaryUsableWidthMm>=o.envelope.nominalDinSpanMm);
 }
});
